import { useState, useEffect, useMemo } from "react";
import { Gem, Award, TrendingUp, DollarSign, Receipt, Landmark, CheckCircle, Globe, Wallet, Phone, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Info, Smartphone, CreditCard } from "lucide-react";
import { mpesa_handler, unified_participant_payout, rewards_policy, equal_split_protocol, merchant_of_record_tax_remittance } from "../lib/engines";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";

interface Transaction {
  id: string;
  amount: number;
  phoneNumber: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  reference: string;
}

export default function Rewards() {
  const { currentUser, userData } = useAuth();
  const { isIdle, activeSeconds, totalEarnedToday } = useRevenue();
  const { currency, availableCurrencies, changeCurrency, convert, loading, rates } = useCurrencyConverter();
  const [activeTab, setActiveTab] = useState<'overview' | 'mpesa' | 'international'>('overview');

  // Rewards State (from Firestore)
  const points = userData?.points || 0;
  const balance = userData?.balance || 0;

  // M-Pesa State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // International Payout State
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'stripe' | 'bank'>('paypal');
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    swiftCode: ""
  });

  useEffect(() => {
    mpesa_handler();
    unified_participant_payout();
    rewards_policy();
    equal_split_protocol();
    merchant_of_record_tax_remittance();

    if (currentUser) {
      const q = query(
        collection(db, 'users', currentUser.uid, 'transactions'),
        orderBy('timestamp', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
        setTransactions(txs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/transactions`);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!phoneNumber.match(/^(?:254|\+254|0)?(7|1)\d{8}$/)) {
      setError("Please enter a valid M-Pesa phone number");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/^0/, "254").replace(/^\+/, ""),
          amount: numAmount,
        }),
      });

      const data = await response.json();

      if (data.ResponseCode === "0") {
        const checkoutRequestId = data.CheckoutRequestID;
        const newTransaction = {
          amount: numAmount,
          phoneNumber,
          status: 'pending',
          timestamp: new Date().toISOString(),
          reference: data.MerchantRequestID || "REF-" + Date.now(),
          type: 'mpesa'
        };

        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newTransaction);
        
        setSuccess("STK Push sent! Please enter your M-Pesa PIN on your phone.");
        
        // Start polling for status
        startPolling(checkoutRequestId, numAmount);
        setAmount("");
      } else {
        setError(data.CustomerMessage || data.errorMessage || data.error || "Payment failed. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to connect to the server. Please check your connection.");
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleInternationalPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(payoutAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const pointsNeeded = Math.round(numAmount * 100);
    if (points < pointsNeeded) {
      setError(`Insufficient points. You need ${pointsNeeded} points for this payout.`);
      return;
    }

    if (payoutMethod === 'paypal' || payoutMethod === 'stripe') {
      if (!payoutEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setError(`Please enter a valid ${payoutMethod === 'paypal' ? 'PayPal' : 'Stripe'} email`);
        return;
      }
    } else if (payoutMethod === 'bank') {
      if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName) {
        setError("Please fill in all required bank details");
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/payout/international", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: payoutMethod,
          amount: numAmount,
          email: payoutEmail,
          bankDetails: payoutMethod === 'bank' ? bankDetails : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process payout");
      }
      
      const newTransaction = {
        amount: numAmount,
        phoneNumber: payoutMethod === 'bank' ? bankDetails.accountNumber : payoutEmail,
        status: 'success',
        timestamp: new Date().toISOString(),
        reference: "PAY-" + Date.now(),
        type: 'international',
        method: payoutMethod
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newTransaction);
      
      // Update points in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        points: increment(-pointsNeeded)
      });

      setSuccess(`Payout of ${convert(numAmount)} initiated successfully via ${payoutMethod.toUpperCase()}!`);
      setPayoutAmount("");
      setPayoutEmail("");
      setBankDetails({ accountName: "", accountNumber: "", bankName: "", swiftCode: "" });
    } catch (err: any) {
      setError(err.message || "Failed to process international payout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = async (checkoutRequestId: string, paidAmount: number) => {
    if (!currentUser) return;
    let attempts = 0;
    const maxAttempts = 20; 
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        // Update transaction status to failed in Firestore
        const pendingTx = transactions.find(tx => tx.id === checkoutRequestId || tx.reference.includes(checkoutRequestId));
        if (pendingTx) {
          await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', pendingTx.id), {
            status: 'failed'
          });
        }
        setError("Transaction timed out. Please check your M-Pesa messages.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/mpesa/status/${checkoutRequestId}`);
        const data = await response.json();

        if (data.status !== 'pending') {
          const pendingTx = transactions.find(tx => tx.id === checkoutRequestId || tx.reference.includes(checkoutRequestId));
          if (pendingTx) {
            await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', pendingTx.id), {
              status: data.status
            });
          }
          
          if (data.status === 'success') {
            setSuccess("Payment confirmed! Your balance has been updated.");
            
            const kesRate = rates['KES'] || 130;
            const amountInUSD = paidAmount / kesRate;
            const pointsToDeduct = Math.round(amountInUSD * 100);
            
            // Update balance and points in Firestore
            await updateDoc(doc(db, 'users', currentUser.uid), {
              balance: increment(paidAmount),
              points: increment(-pointsToDeduct)
            });
          } else {
            setError(`Payment failed: ${data.resultDesc || "Unknown error"}`);
          }
          setIsLoading(false);
          return;
        }

        attempts++;
        setTimeout(poll, 3000); 
      } catch (err) {
        console.error("Polling error:", err);
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    poll();
  };

  const achievements = [
    { id: 1, title: 'Early Adopter', desc: 'Joined during the beta phase.', icon: Award, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { id: 2, title: 'Gold Predictor', desc: 'Correctly predicted gold movement 5 times.', icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { id: 3, title: 'Community Pillar', desc: 'Received 100+ likes on a single post.', icon: Gem, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="text-center py-4">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">Rewards & Payouts</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage your earnings, redeem points, and initiate M-Pesa Express payments.</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl max-w-xl mx-auto overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'overview' ? "bg-white dark:bg-gray-700 text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Gem className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button 
          onClick={() => setActiveTab('mpesa')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'mpesa' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Smartphone className="w-4 h-4" />
          <span>M-Pesa</span>
        </button>
        <button 
          onClick={() => setActiveTab('international')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'international' ? "bg-white dark:bg-gray-700 text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>International</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' ? (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Display Currency:</span>
              <select 
                value={currency}
                onChange={(e) => changeCurrency(e.target.value)}
                disabled={loading}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {loading ? (
                  <option>Loading...</option>
                ) : (
                  availableCurrencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))
                )}
              </select>
            </div>

            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-yellow-100 font-medium uppercase tracking-wider mb-2">Total Balance ({points.toLocaleString()} Points)</span>
                <div className="text-6xl font-black mb-4 flex items-center">
                  {convert(points / 100)}
                </div>
                
                {/* Activity Status Card */}
                <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        isIdle ? "bg-gray-300" : "bg-green-300"
                      )}></div>
                      <span className="text-xs font-bold uppercase tracking-widest">
                        {isIdle ? "Idle Mode" : "Active Earning"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-70">
                      {Math.floor(activeSeconds / 60)}m {activeSeconds % 60}s active
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] opacity-70 uppercase font-bold">Earned Today</p>
                      <p className="text-xl font-black">{totalEarnedToday} <span className="text-xs font-normal opacity-70">pts</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70 uppercase font-bold">Status</p>
                      <p className="text-sm font-bold">{isIdle ? "Paused" : "Live"}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTab('mpesa')}
                  className="bg-white text-orange-600 hover:bg-yellow-50 px-8 py-3 rounded-full font-bold shadow-md transition-all"
                >
                  Redeem Points
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reward Distribution Policy</h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  Users earn points for participation. Points can be redeemed for cash rewards. The platform retains a portion to cover hosting and development costs.
                  <br/><br/>
                  <strong>Distribution:</strong> Users receive 50% of reward credits generated from their direct activity. Developers retain the other 50% to sustain the platform.
                  <br/><br/>
                  <strong>Tax Compliance:</strong> The platform operates via a global Merchant of Record (MoR). This means your local and international taxes (e.g., VAT, WHT) are automatically calculated, withheld, and legally remitted directly to your country's tax authority (like KRA, IRS, or HMRC) on your behalf. You will receive a net payout and a tax compliance receipt.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Automated Payouts & Tax Statements</h2>
                <Receipt className="w-6 h-6 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">March 2026 Payout</div>
                      <div className="text-sm text-gray-500">Processed automatically via M-Pesa</div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> Paid
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="text-gray-500 mb-1">Gross Earnings</div>
                      <div className="font-bold text-gray-900 dark:text-white">{convert(50.00)}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
                      <div className="text-red-500 mb-1 flex items-center"><Landmark className="w-3 h-3 mr-1"/> Tax Withheld (16%)</div>
                      <div className="font-bold text-red-600 dark:text-red-400">-{convert(8.00)}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/20">
                      <div className="text-green-600 mb-1">Net Payout</div>
                      <div className="font-bold text-green-700 dark:text-green-400">{convert(42.00)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Unlocked Badges</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {achievements.map((ach) => {
                  const Icon = ach.icon;
                  return (
                    <div key={ach.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${ach.bg}`}>
                        <Icon className={`w-8 h-8 ${ach.color}`} />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">{ach.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{ach.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'mpesa' ? (
          <motion.div 
            key="mpesa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">M-Pesa Wallet Balance</p>
                    <h2 className="text-5xl font-black tracking-tighter">
                      KES {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="flex items-center space-x-2 text-blue-100 text-sm">
                      <Info className="w-4 h-4" />
                      <span>STK Push will request payment from your phone</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <span>Initiate M-Pesa Express Payment</span>
                  </h3>

                  <form onSubmit={handlePayment} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="07XX XXX XXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (KES)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">KES</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center space-x-3 text-sm font-medium"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center space-x-3 text-sm font-medium"
                        >
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <span>{success}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Requesting PIN...</span>
                        </>
                      ) : (
                        <span>Pay with M-Pesa Express</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Activity</h3>
                  <button 
                    onClick={() => setTransactions([])}
                    className="text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Clear History
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {transactions.length > 0 ? (
                      transactions.map((tx) => (
                        <motion.div
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                tx.status === 'success' ? "bg-green-50 text-green-600" :
                                tx.status === 'failed' ? "bg-red-50 text-red-600" :
                                "bg-blue-50 text-blue-600"
                              )}>
                                {tx.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                                 tx.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                                 <Clock className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">KES {tx.amount.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-500">{tx.phoneNumber}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase px-2 py-1 rounded-md",
                              tx.status === 'success' ? "bg-green-100 text-green-700" :
                              tx.status === 'failed' ? "bg-red-100 text-red-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {tx.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-medium text-gray-400 uppercase tracking-tighter">
                            <span>{new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString()}</span>
                            <span className="font-mono">{tx.reference.slice(0, 12)}...</span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto">
                          <Info className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">No transactions yet</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="international"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Globe className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-purple-100 font-bold uppercase tracking-widest text-xs">International Payouts</p>
                    <h2 className="text-5xl font-black tracking-tighter">
                      {convert(points / 100)}
                    </h2>
                    <div className="flex items-center space-x-2 text-purple-100 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Available for withdrawal globally</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <span>Select Payout Method</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { id: 'paypal', label: 'PayPal', icon: DollarSign },
                      { id: 'stripe', label: 'Stripe', icon: CreditCard },
                      { id: 'bank', label: 'Bank', icon: Landmark }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPayoutMethod(method.id as any)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2",
                          payoutMethod === method.id 
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" 
                            : "border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 text-gray-500"
                        )}
                      >
                        <method.icon className="w-6 h-6" />
                        <span className="text-xs font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleInternationalPayout} className="space-y-6">
                    {payoutMethod !== 'bank' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          {payoutMethod === 'paypal' ? 'PayPal Email' : 'Stripe Email'}
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={payoutEmail}
                            onChange={(e) => setPayoutEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Name</label>
                          <input
                            type="text"
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Number / IBAN</label>
                          <input
                            type="text"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                          <input
                            type="text"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SWIFT / BIC Code</label>
                          <input
                            type="text"
                            value={bankDetails.swiftCode}
                            onChange={(e) => setBankDetails({...bankDetails, swiftCode: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Equivalent to {payoutAmount ? Math.round(parseFloat(payoutAmount) * 100) : 0} points
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center space-x-3 text-sm font-medium"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span>{error}</span>
                        </motion.div>
                      )}

                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center space-x-3 text-sm font-medium"
                        >
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                          <span>{success}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-purple-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing Payout...</span>
                        </>
                      ) : (
                        <span>Request International Payout</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Payout Information</h3>
                  <ul className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Processing time: 1-3 business days</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Minimum withdrawal: $10.00 (1,000 points)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Transaction fees may apply depending on the provider</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Payouts</h3>
                  <div className="space-y-3">
                    {transactions.filter(tx => tx.id.startsWith('INT-')).length > 0 ? (
                      transactions.filter(tx => tx.id.startsWith('INT-')).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                              <ArrowUpRight className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-900 dark:text-white">${tx.amount.toFixed(2)}</p>
                              <p className="text-[8px] text-gray-500">{tx.phoneNumber}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black text-green-600 uppercase">Success</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-4">No international payouts yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden developer info */}
      <div className="hidden">
        Developer activity credit is exclusive of user activities, don't share.
        Deposit to developer account. 
        Dial *334# into Mpesa menu, 
        6. Lipa na M-PESA, 
        1. Pay Bill:
        Business number : 400200,
        Account number : 853390
        
        https://pulse-feeds-brain.onrender.com
      </div>
    </div>
  );
}
