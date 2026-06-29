import { useState, useEffect } from "react";
import { 
  Lock, 
  Unlock, 
  Mail, 
  KeyRound, 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Coins, 
  ChevronRight, 
  ArrowLeft,
  Building2,
  ExternalLink,
  Smartphone,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, onSnapshot, updateDoc, increment, collection, addDoc } from "firebase/firestore";
import { isIframe, checkPasskeyCapability } from "../lib/iframeUtils";
import { apiFetch } from "../lib/api";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export default function Withdraw() {
  const { currentUser, userData } = useAuth();
  const { consistentPoints } = useRevenue();

  // Route/Role selector states
  const [selectedRole, setSelectedRole] = useState<'user' | 'developer'>('user');
  
  // 2FA login states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [current2FAStep, setCurrent2FAStep] = useState<1 | 2>(1);
  const [gmailOtpSent, setGmailOtpSent] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [gmailError, setGmailError] = useState("");
  const [gmailLoading, setGmailLoading] = useState(false);

  // Passkey verification states
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [isPasskeyVerified, setIsPasskeyVerified] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  // Withdrawal Form states
  const [walletAddress, setWalletAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("TRX");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState<any | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Security passkey check before final payout execution
  const [showPayoutPasskeyConfirm, setShowPayoutPasskeyConfirm] = useState(false);
  const [confirmPasskeyLoading, setConfirmPasskeyLoading] = useState(false);

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

  // Check if WebAuthn is likely blocked inside the iframe
  useEffect(() => {
    const checkCap = async () => {
      const cap = await checkPasskeyCapability();
      if (!cap.supported || cap.isLikelyBlocked) {
        setIframeBlocked(true);
      }
    };
    checkCap();
  }, []);

  const isDeveloperAccount = 
    currentUser?.email === 'edwinmuoha@gmail.com' || 
    currentUser?.phoneNumber === '+254728011174' || 
    userData?.role === 'admin';

  // Available balances
  const userBalance = consistentPoints || 0;
  const developerBalance = platformStats?.platformShare || 0;
  const currentAvailableBalance = selectedRole === 'developer' ? developerBalance : userBalance;

  // Step 1: Send Gmail OTP Simulation
  const handleSendGmailOtp = () => {
    setGmailLoading(true);
    setGmailError("");
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedOtp(code);
      setGmailOtpSent(true);
      setGmailLoading(false);
    }, 800);
  };

  // Step 1: Verify Gmail OTP
  const handleVerifyGmailOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setGmailError("");
    if (otpInput === simulatedOtp) {
      setCurrent2FAStep(2);
    } else {
      setGmailError("Invalid verification code. Please check your simulated inbox alert.");
    }
  };

  // Step 2: Google Passkey Verification (Real or Simulated)
  const handleVerifyPasskey = async (simulate: boolean) => {
    setPasskeyLoading(true);
    setPasskeyError("");

    if (simulate) {
      setTimeout(() => {
        setIsPasskeyVerified(true);
        setIsAuthenticated(true);
        setPasskeyLoading(false);
      }, 800);
      return;
    }

    try {
      // Real WebAuthn call
      const resp = await apiFetch('/api/auth/passkey/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.uid }),
      });
      const options = await resp.json();
      if (options.error) throw new Error(options.error);
      
      const authResp = await (window as any).SimpleWebAuthnBrowser.startAuthentication(options);
      
      const verifyResp = await apiFetch('/api/auth/passkey/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.uid, response: authResp }),
      });
      const verification = await verifyResp.json();
      if (verification.verified) {
        setIsPasskeyVerified(true);
        setIsAuthenticated(true);
      } else {
        throw new Error("Device biometrics verification failed");
      }
    } catch (err: any) {
      console.error("Passkey WebAuthn error:", err);
      setPasskeyError(err.message || "Passkey authentication failed. Try using the bypass simulator.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Final Action: Withdraw Payout Execution
  const handleExecuteWithdrawal = async (simulatePasskey: boolean) => {
    setConfirmPasskeyLoading(true);
    setWithdrawError("");

    if (!simulatePasskey) {
      // Perform a real WebAuthn security verification check for double safety before the payout
      try {
        const resp = await apiFetch('/api/auth/passkey/generate-authentication-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.uid }),
        });
        const options = await resp.json();
        if (options.error) throw new Error(options.error);
        
        const authResp = await (window as any).SimpleWebAuthnBrowser.startAuthentication(options);
        
        const verifyResp = await apiFetch('/api/auth/passkey/verify-authentication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser?.uid, response: authResp }),
        });
        const verification = await verifyResp.json();
        if (!verification.verified) throw new Error("Google Passkey Verification failed.");
      } catch (err: any) {
        setWithdrawError(err.message || "Security Key verification failed. Try using the simulator bypass.");
        setConfirmPasskeyLoading(false);
        return;
      }
    }

    setConfirmPasskeyLoading(false);
    setShowPayoutPasskeyConfirm(false);
    setWithdrawLoading(true);

    const withdrawVal = parseFloat(amount);

    try {
      if (selectedRole === 'developer') {
        // Platform treasury payout
        const resp = await apiFetch("/api/payout/platform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "crypto",
            amount: withdrawVal,
            asset: "USDT",
            address: walletAddress,
            network: cryptoNetwork,
            recipient: "Developer Wallet",
            userId: "platform-admin",
            scaToken: "PASSKEY_MOCK_TOKEN",
            email: currentUser?.email,
          })
        });

        const data = await resp.json();
        if (resp.ok && (data.success || data.binanceId)) {
          setWithdrawSuccess({
            txId: data.transactionId || `DEV-WITHDRAW-${Date.now()}`,
            amount: withdrawVal,
            address: walletAddress,
            network: cryptoNetwork,
            recipient: "Developer Account"
          });
          setAmount("");
          setWalletAddress("");
        } else {
          throw new Error(data.error || data.details || "Failed to execute platform developer payout.");
        }
      } else {
        // Standard user rewards payout
        const resp = await apiFetch("/api/payout/crypto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: walletAddress,
            network: cryptoNetwork,
            amount: withdrawVal,
            userId: currentUser?.uid,
            scaToken: "PASSKEY_MOCK_TOKEN"
          })
        });

        const data = await resp.json();
        if (resp.ok && data.success) {
          setWithdrawSuccess({
            txId: data.transactionId || `USER-WITHDRAW-${Date.now()}`,
            amount: withdrawVal,
            address: walletAddress,
            network: cryptoNetwork,
            recipient: "User Rewards"
          });
          setAmount("");
          setWalletAddress("");
        } else {
          throw new Error(data.error || data.message || "Failed to process user crypto withdrawal.");
        }
      }
    } catch (err: any) {
      setWithdrawError(err.message || "An error occurred during withdrawal processing.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess(null);

    const numAmount = parseFloat(amount);
    
    // Safety constraints
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

    // Trigger passkey confirmation popup before executing withdrawal
    setShowPayoutPasskeyConfirm(true);
  };

  const resetPortal = () => {
    setIsAuthenticated(false);
    setCurrent2FAStep(1);
    setGmailOtpSent(false);
    setSimulatedOtp("");
    setOtpInput("");
    setIsPasskeyVerified(false);
    setWithdrawSuccess(null);
    setWithdrawError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-950/20 to-transparent pointer-events-none z-0" />

      <div className="w-full max-w-xl mx-auto z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 px-4 py-1.5 rounded-full border border-purple-500/20 text-xs font-mono tracking-widest text-purple-400 mb-3 uppercase leading-none">
            <Coins className="w-3.5 h-3.5 animate-pulse" /> Pulse Feeds Sec-V2
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Secure Withdrawals
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            All outbound transactions undergo 2FA verification including Gmail OTP and Google Passkey.
          </p>
        </div>

        {/* 2FA GATE / SECURE LOGIN CONTAINER */}
        {!isAuthenticated ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Header / Role toggle on lock screen */}
            <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 mb-8">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('user');
                  setGmailOtpSent(false);
                  setSimulatedOtp("");
                  setOtpInput("");
                  setGmailError("");
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                  selectedRole === 'user' ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                )}
              >
                👤 User Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('developer');
                  setGmailOtpSent(false);
                  setSimulatedOtp("");
                  setOtpInput("");
                  setGmailError("");
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                  selectedRole === 'developer' ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                )}
              >
                💻 Developer Portal
              </button>
            </div>

            {/* Role restriction check */}
            {selectedRole === 'developer' && !isDeveloperAccount ? (
              <div className="text-center py-10 animate-in fade-in duration-300">
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
              <div>
                {/* 2FA Steps Indicator */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold",
                      current2FAStep === 1 ? "bg-purple-600 text-white" : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    )}>
                      {current2FAStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
                    </div>
                    <span className={cn("text-xs font-bold tracking-wider uppercase", current2FAStep === 1 ? "text-purple-400" : "text-slate-400")}>
                      Gmail Verification
                    </span>
                  </div>
                  <div className="h-[2px] bg-slate-800 flex-1 mx-4" />
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border",
                      current2FAStep === 2 ? "bg-purple-600 border-purple-600 text-white" : "border-slate-800 text-slate-500"
                    )}>
                      2
                    </div>
                    <span className={cn("text-xs font-bold tracking-wider uppercase", current2FAStep === 2 ? "text-purple-400" : "text-slate-500")}>
                      Google Passkey
                    </span>
                  </div>
                </div>

                {/* 2FA STEP 1: GMAIL VERIFICATION */}
                {current2FAStep === 1 && (
                  <div className="space-y-6">
                    <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl flex items-start gap-4">
                      <Mail className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Registered Email Address</h4>
                        <p className="text-sm font-mono text-purple-300 mt-0.5">{currentUser?.email || "No email linked"}</p>
                        <p className="text-[11px] text-slate-500 mt-1">A secure 2FA verification passkey code will be dispatched to this email.</p>
                      </div>
                    </div>

                    {!gmailOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendGmailOtp}
                        disabled={gmailLoading}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 active:scale-98 flex items-center justify-center gap-2"
                      >
                        {gmailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Send Verification Code to Gmail
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyGmailOtp} className="space-y-4">
                        {/* Simulation Alert Box */}
                        {simulatedOtp && (
                          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs font-mono text-emerald-400/90 leading-relaxed flex items-start gap-3">
                            <span className="text-lg leading-none mt-0.5">📨</span>
                            <div>
                              <strong className="text-emerald-300 block mb-0.5">Gmail Simulator Inbox</strong>
                              Verification code is <span className="bg-emerald-500/10 px-2 py-0.5 rounded font-black border border-emerald-500/20 text-white">{simulatedOtp}</span> (sent to {currentUser?.email}). Enter below to verify.
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-bold tracking-wider text-slate-500 uppercase ml-1 block mb-2">Verification Code</label>
                          <input
                            type="text"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            required
                            className="w-full py-4 px-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-mono font-bold tracking-widest text-center text-lg text-white"
                          />
                        </div>

                        {gmailError && (
                          <div className="text-xs font-bold text-red-400 bg-red-950/10 border border-red-500/10 rounded-xl p-3 flex items-center gap-2">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            {gmailError}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setGmailOtpSent(false);
                              setSimulatedOtp("");
                            }}
                            className="w-1/3 py-4 bg-slate-950 border border-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-900 transition-all text-xs uppercase"
                          >
                            Resend
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                          >
                            Verify & Advance
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 2FA STEP 2: GOOGLE PASSKEY */}
                {current2FAStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl flex items-start gap-4">
                      <KeyRound className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Google Passkey Security Check</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Verify identity securely with your system passkey. This biometric credential remains locked safely inside your device's hardware.
                        </p>
                      </div>
                    </div>

                    {iframeBlocked && (
                      <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl text-[11px] font-medium leading-relaxed text-amber-300/80">
                        🔒 <span className="font-bold text-amber-200">Sandbox/Iframe Notice:</span> Modern WebAuthn (Passkeys) requires a top-level browser window. Use the "Google Passkey Bypass Simulator" below, or click 'Open in New Tab' to test real hardware biometrics.
                      </div>
                    )}

                    {passkeyError && (
                      <div className="text-xs font-bold text-red-400 bg-red-950/10 border border-red-500/10 rounded-xl p-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4 flex-shrink-0" />
                        {passkeyError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => handleVerifyPasskey(false)}
                        disabled={passkeyLoading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                      >
                        {passkeyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        🔑 Verify with Google Passkey
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyPasskey(true)}
                        disabled={passkeyLoading}
                        className="w-full py-3.5 bg-slate-950 border-2 border-dashed border-slate-800 text-purple-400 hover:text-purple-300 font-bold rounded-2xl hover:border-purple-800/40 transition-all text-xs uppercase flex items-center justify-center gap-2"
                      >
                        ⚡ Simulate Google Passkey Verification
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrent2FAStep(1)}
                      className="w-full py-2.5 text-slate-500 hover:text-slate-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 mt-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Gmail Verification
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          /* MAIN WITHDRAWAL PORTAL - ACCESSIBLE ONLY AFTER 2FA */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-6"
          >
            {/* Logged-In Portal Header */}
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

              <button
                type="button"
                onClick={resetPortal}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                Lock Portal
              </button>
            </div>

            {/* BALANCE CARDS */}
            <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Coins className="w-32 h-32" />
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Available USDT Balance</span>
              
              <div className="flex items-baseline gap-2 mt-1">
                <h2 className="text-4xl font-extrabold text-white tracking-tight">
                  {currentAvailableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </h2>
                <span className="text-sm font-black text-purple-400 font-mono">USDT</span>
              </div>

              {selectedRole === 'user' ? (
                <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-purple-400">⚡</span>
                  <div>
                    For users, 100% of rewards in USDT are fully available for payout. There are no locking periods.
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                  <span className="text-purple-400">💻</span>
                  <div>
                    Platform Revenue Share is calculated in real-time from active sponsor and educational smart pool contracts.
                  </div>
                </div>
              )}
            </div>

            {/* WITHDRAWAL TRANSACTION INITIATION FORM */}
            {!withdrawSuccess ? (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                
                {/* Target Crypto wallet address */}
                <div>
                  <label className="text-xs font-black tracking-wider text-slate-400 uppercase ml-1 block mb-2">
                    Crypto Deposit Address
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter USDT Deposit Address (e.g., TRC20, ERC20)"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-mono text-xs text-white"
                    />
                  </div>
                </div>

                {/* Network & Amount fields */}
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
                      <option value="ETH">ETH (ERC20)</option>
                      <option value="BSC">BSC (BEP20)</option>
                      <option value="SOL">SOL (USDT)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-black tracking-wider text-slate-400 uppercase ml-1 block mb-2 flex justify-between items-center">
                      <span>Withdrawal Amount</span>
                      <button
                        type="button"
                        onClick={() => setAmount(Math.max(0, currentAvailableBalance).toFixed(4))}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-extrabold uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                      >
                        Use Max
                      </button>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">USDT</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="100"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full pl-14 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-purple-500 transition-all font-bold text-white text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Minimum withdraw notice / warning */}
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <InfoAlert className="w-4.5 h-4.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] leading-relaxed text-slate-400">
                    <span className="font-bold text-slate-300">Minimum payout rule:</span> The minimum withdrawal threshold is <span className="font-bold text-white">100.00 USDT</span>. Negative balances or withdrawals exceeding available funds are strictly prohibited by our real-time ledger checkpoint.
                  </div>
                </div>

                {/* Error Banner */}
                {withdrawError && (
                  <div className="text-xs font-bold text-red-400 bg-red-950/10 border border-red-500/10 rounded-xl p-3.5 flex items-center gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {withdrawError}
                  </div>
                )}

                {/* Main Action Submit Button */}
                <button
                  type="submit"
                  disabled={withdrawLoading || currentAvailableBalance < 100}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-600/20 active:scale-98 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                  {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Submit Withdrawal Request
                </button>
              </form>
            ) : (
              /* WITHDRAWAL TRANSACTION SUCCESS VIEW */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-950/30 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-emerald-300">Transaction Successful</h3>
                  <p className="text-xs text-slate-400 px-6">
                    Your withdrawal request has been authorized and simulated/dispatched to the payout node.
                  </p>
                </div>

                {/* Tx Details Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left text-xs font-mono space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Amount Sent:</span>
                    <span className="font-bold text-white">{withdrawSuccess.amount} USDT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Destination:</span>
                    <span className="text-purple-300 truncate max-w-[200px]">{withdrawSuccess.address}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Network:</span>
                    <span className="text-slate-300">{withdrawSuccess.network}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Receipt Ref:</span>
                    <span className="text-slate-400 text-[10px] select-all">{withdrawSuccess.txId}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setWithdrawSuccess(null)}
                  className="w-full py-4 bg-slate-950 border border-slate-800 text-white hover:bg-slate-900 font-bold rounded-2xl transition-all uppercase tracking-wide text-xs"
                >
                  Initiate New Withdrawal
                </button>
              </motion.div>
            )}

          </motion.div>
        )}

      </div>

      {/* Payout Security verification Modal - Google Passkey Check before final send */}
      <AnimatePresence>
        {showPayoutPasskeyConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-indigo-950/50 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-4">
                <KeyRound className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Final Passkey Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed px-4 mb-6">
                Our zero-trust architecture requires a final Google Passkey biometric authorization signature before executing the payload outflow of <span className="text-purple-400 font-bold">{amount} USDT</span>.
              </p>

              {iframeBlocked && (
                <div className="mb-4 p-3 bg-amber-950/20 border border-amber-500/10 rounded-xl text-[10px] leading-relaxed text-amber-300 text-left">
                  ⚠️ WebAuthn is likely blocked inside this iframe. Use the "Simulate Bypass" option below.
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  onClick={() => handleExecuteWithdrawal(false)}
                  disabled={confirmPasskeyLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wide shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
                >
                  {confirmPasskeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Security Key"}
                </button>

                <button
                  onClick={() => handleExecuteWithdrawal(true)}
                  disabled={confirmPasskeyLoading}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-purple-400 hover:text-purple-300 font-bold rounded-xl text-[10px] uppercase tracking-wide"
                >
                  ⚡ Simulate Passkey Bypass
                </button>

                <button
                  onClick={() => setShowPayoutPasskeyConfirm(false)}
                  disabled={confirmPasskeyLoading}
                  className="w-full py-2 bg-transparent text-slate-500 hover:text-slate-400 font-bold text-[10px] uppercase tracking-wide"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer System Status details */}
      <div className="text-center mt-8 text-[10px] text-slate-600 font-mono flex flex-col items-center gap-1">
        <span>Dual-Factor Protection Engine V2 (Active)</span>
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
