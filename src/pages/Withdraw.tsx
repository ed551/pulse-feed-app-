import { useState, useEffect } from "react";
import { 
  Unlock, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Coins,
  History
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { db } from "../lib/firebase";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { apiFetch } from "../lib/api";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function Withdraw() {
  const { currentUser, userData } = useAuth();
  const { consistentPoints } = useRevenue();

  const formatCurrency = (amount: number) => {
    return `USDT ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  // Route/Role selector states
  const [selectedRole, setSelectedRole] = useState<'user' | 'developer'>('user');
  
  // Withdrawal Form states
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRX");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState<any | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  // Live platform stats for Developer role
  const [platformStats, setPlatformStats] = useState<any>(null);

  // Fetch real-time platform statistics for the developer balance
  useEffect(() => {
    if (!currentUser) return;
    const statsRef = doc(db, "platform", "stats");
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlatformStats(snapshot.data());
      }
    }, (error) => {
      console.error("Error loading platform stats:", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch withdrawal history
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "withdrawals"),
      where("userId", "==", currentUser.uid),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setWithdrawalHistory(history);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const isDeveloperAccount = 
    currentUser?.email === 'edwinmuoha@gmail.com' || 
    currentUser?.phoneNumber === '+254728011174' || 
    userData?.role === 'admin';

  // Available balances
  const userBalance = Number(consistentPoints || 0);
  const developerBalance = Number(platformStats?.platformShare || 0);
  const currentAvailableBalance = selectedRole === 'developer' ? developerBalance : userBalance;

  const executePayoutRequest = async (tokenValue: string, amountToWithdraw: number) => {
    setWithdrawLoading(true);
    setWithdrawError("");
    const withdrawVal = amountToWithdraw;

    try {
      const endpoint = selectedRole === 'developer' ? "/api/payout/platform" : "/api/payout/crypto";
      
      const payload: any = {
        amount: withdrawVal,
        network: cryptoNetwork,
        userId: currentUser?.uid,
        scaToken: tokenValue,
      };

      if (selectedRole === 'developer') {
        payload.method = "crypto";
        payload.asset = "USDT";
        payload.address = walletAddress;
        payload.recipient = "Developer Wallet";
        payload.userId = currentUser?.uid;
        payload.email = currentUser?.email;
      } else {
        payload.walletAddress = walletAddress;
      }

      const resp = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const contentType = resp.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        console.error("[Withdraw] Received non-JSON response:", text);
        throw new Error(`Server returned unexpected response (${resp.status}). It might be a configuration issue.`);
      }

      if (resp.status === 401 && data.error === "SCA_REQUIRED") {
        setWithdrawError("Google Security Verification is required. Please try again.");
        setWithdrawLoading(false);
        return;
      }

      if (resp.ok && (data.success || data.binanceId)) {
        setWithdrawSuccess({
          txId: data.transactionId || `${selectedRole.toUpperCase()}-WITHDRAW-${Date.now()}`,
          amount: withdrawVal,
          address: walletAddress,
          network: cryptoNetwork,
          recipient: selectedRole === 'developer' ? "Developer Account" : "User Rewards"
        });
        setAmount("");
        setWalletAddress("");
      } else {
        throw new Error(data.message || data.error || data.details || "Failed to execute payout.");
      }
    } catch (err: any) {
      setWithdrawError(err.message || "An error occurred during withdrawal processing.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess(null);

    const numAmount = parseFloat(amount);
    
    if (currentAvailableBalance <= 0) {
      setWithdrawError("No withdraw from a negative or zero balance.");
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount.");
      return;
    }

    if (numAmount > currentAvailableBalance) {
      setWithdrawError("Cannot withdraw more than your available balance.");
      return;
    }

    if (numAmount < 100) {
      setWithdrawError("Minimum withdraw balance is 100 USDT.");
      return;
    }

    if (!walletAddress || walletAddress.trim().length < 10) {
      setWithdrawError("Please enter a valid crypto wallet deposit address.");
      return;
    }

    // Google Login Security Verification for Withdrawal
    setWithdrawLoading(true);
    try {
      const { GoogleAuthProvider, reauthenticateWithPopup } = await import("firebase/auth");
      const { auth } = await import("../lib/firebase");
      
      if (!auth.currentUser) throw new Error("Authentication session expired.");

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        await reauthenticateWithPopup(auth.currentUser, provider);
      } catch (reauthErr: any) {
        console.error("Google Verification Failed:", reauthErr);
        if (reauthErr.code === 'auth/wrong-password') {
          throw new Error("Google verification failed. Please use the correct Google account.");
        } else if (reauthErr.code === 'auth/popup-closed-by-user') {
          throw new Error("Verification cancelled. Google login is required to authorize withdrawals.");
        } else {
          throw new Error("Google Security Verification failed. Please try again.");
        }
      }

      await executePayoutRequest("GOOGLE_VERIFIED", numAmount);
    } catch (err: any) {
      setWithdrawError(err.message || "Security verification failed.");
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-950/20 to-transparent pointer-events-none z-0" />

      <div className="w-full max-w-xl mx-auto z-10">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 px-4 py-1.5 rounded-full border border-purple-500/20 text-xs font-mono tracking-widest text-purple-400 mb-3 uppercase leading-none">
            <Coins className="w-3.5 h-3.5 animate-pulse" /> Pulse Feeds Sec-V3
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Withdraw Funds
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Verify your identity with Google Login to authorize outbound transactions.
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-950/40 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider leading-none text-white">
                  {selectedRole === 'developer' ? "💻 Platform Vault unlocked" : "👤 User Payouts Unlocked"}
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1 inline-block">
                  ● Authenticated Session
                </span>
              </div>
            </div>
            
            {isDeveloperAccount && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole(selectedRole === 'user' ? 'developer' : 'user')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Switch to {selectedRole === 'user' ? 'Developer' : 'User'}
                </button>
              </div>
            )}
          </div>

          {selectedRole === 'developer' && !isDeveloperAccount ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-red-950/30 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-red-200 uppercase tracking-wide">Developer Access Denied</h3>
              <p className="text-xs text-slate-400 mt-2 px-6">
                Only certified developer profiles can initiate withdrawals from the global platform treasury.
              </p>
              <button
                onClick={() => setSelectedRole('user')}
                className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Return to User Portal
              </button>
            </div>
          ) : (
            <>
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Coins className="w-32 h-32" />
                </div>

                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {selectedRole === 'developer' ? 'Amount Available for Withdraw (Treasury)' : 'Amount Available for Withdraw'}
                </span>
                
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="text-4xl font-extrabold text-white tracking-tight">
                    {Number(currentAvailableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </h2>
                  <span className="text-sm font-black text-purple-400 font-mono">USDT</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Time Spent Revenue</p>
                    <p className="text-sm font-bold text-slate-300">USDT {Number(userData?.timeSpentRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Activity Revenue</p>
                    <p className="text-sm font-bold text-emerald-400">USDT {Number(userData?.activityRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                  </div>
                </div>

                {selectedRole === 'developer' && platformStats && isDeveloperAccount && (
                  <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 gap-4 bg-indigo-500/5 -mx-6 px-6 pb-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Platform Inflow</p>
                      <p className="text-sm font-bold text-slate-300">USDT {Number(platformStats.totalInflow || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Platform Net Profit</p>
                      <p className="text-sm font-bold text-indigo-400">USDT {Number(platformStats.platformShare || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {!withdrawSuccess ? (
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-black tracking-wider text-slate-400 uppercase ml-1 block mb-2">
                      USDT Deposit Address (TRC20/ERC20/SOL)
                    </label>
                    <div className="relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Paste your USDT wallet address"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="text-xs font-black tracking-wider text-slate-400 uppercase ml-1 block mb-2">
                        Network
                      </label>
                      <select
                        value={cryptoNetwork}
                        onChange={(e) => setCryptoNetwork(e.target.value)}
                        className="w-full py-4 px-3 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-bold text-xs uppercase text-slate-300"
                      >
                        <option value="TRX">TRX (TRC20)</option>
                        <option value="SOL">SOL (USDT)</option>
                        <option value="ETH">ETH (ERC20)</option>
                        <option value="BSC">BSC (BEP20)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="text-xs font-black tracking-wider text-slate-400 uppercase ml-1 block mb-2 flex justify-between items-center">
                        <span>Withdraw Amount</span>
                        <button
                          type="button"
                          onClick={() => setAmount(Math.max(0, currentAvailableBalance).toFixed(4))}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-extrabold uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                        >
                          Max
                        </button>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">USDT</span>
                        <input
                          type="number"
                          step="0.01"
                          min="100"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Min 100 USDT"
                          required
                          className="w-full pl-14 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-bold text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {withdrawError && (
                    <div className="text-xs font-bold text-red-400 bg-red-950/10 border border-red-500/10 rounded-xl p-3.5 flex items-center gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {withdrawError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={withdrawLoading || currentAvailableBalance < 100}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 active:scale-98 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                  >
                    {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Confirm Withdrawal
                  </button>
                  
                  {currentAvailableBalance < 100 && (
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
                      Threshold: 100 USDT Required
                    </p>
                  )}
                </form>
              ) : (
                <div className="py-8 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Withdrawal Initiated</h3>
                  <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
                    Your request for {withdrawSuccess.amount} USDT has been submitted to the blockchain queue.
                  </p>
                  
                  <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-4 mb-8 text-left space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Transaction ID</span>
                      <span className="text-slate-300 font-mono truncate ml-4">{withdrawSuccess.txId}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Network</span>
                      <span className="text-slate-300 font-bold uppercase">{withdrawSuccess.network}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setWithdrawSuccess(null)}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Withdrawal Record */}
        <div className="mt-12 bg-slate-900/50 rounded-3xl border border-slate-800/50 overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-500" />
              Withdrawal Record
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-bold">
              {withdrawalHistory.length} Total
            </span>
          </div>

          {withdrawalHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {withdrawalHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[10px] text-slate-300 font-bold">
                          {tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : 'Processing'}
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-[100px]">ID: {tx.id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-white">
                        {tx.amount} <span className="text-[9px] text-slate-500">USDT</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                          tx.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          tx.status === 'rejected' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-orange-500/10 text-orange-400 border-orange-500/20"
                        )}>
                          {tx.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-600 mx-auto mb-3">
                <History className="w-6 h-6" />
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">No previous withdrawals found</p>
            </div>
          )}
        </div>

      </div>

      <div className="text-center mt-8 text-[10px] text-slate-600 font-mono flex flex-col items-center gap-1">
        <span>Google Security Authentication (Active)</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Platform Nodes Synchronized</span>
      </div>
    </div>
  );
}

// Icon fallbacks inside file for extreme robustness
function InfoAlert(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={{ width: "1.25rem", height: "1.25rem" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
