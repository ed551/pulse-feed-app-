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
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw'>('overview');

  // Rewards State (from Firestore)
  const points = userData?.points || 0;
  const balance = userData?.balance || 0;
  const adRevenue = userData?.adRevenue || 0;
  const kesRate = rates['KES'] || 130;
  const totalBalance = (points / 100) + adRevenue + (balance / kesRate);

  // M-Pesa State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // International Payout State
  const [payoutMethod, setPayoutMethod] = useState<'mpesa' | 'paypal' | 'stripe' | 'bank'>('mpesa');
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

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setSuccess(null);

    const numAmount = parseFloat(payoutAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (numAmount > totalBalance) {
      setError(`Insufficient total balance. You have $${totalBalance.toFixed(2)} available.`);
      return;
    }

    if (payoutMethod === 'mpesa') {
      if (!phoneNumber.match(/^(?:254|\+254|0)?(7|1)\d{8}$/)) {
        setError("Please enter a valid M-Pesa phone number");
        return;
      }
    } else if (payoutMethod === 'paypal' || payoutMethod === 'stripe') {
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
      // Logic to deduct from balances in order: Points -> Ad Revenue -> Cash Balance
      let remainingToDeduct = numAmount;
      const updates: any = {};
      
      // 1. Deduct from points
      const pointsValue = points / 100;
      if (remainingToDeduct > 0 && pointsValue > 0) {
        const pointsToDeductValue = Math.min(remainingToDeduct, pointsValue);
        const pointsToDeduct = Math.round(pointsToDeductValue * 100);
        updates.points = increment(-pointsToDeduct);
        remainingToDeduct -= pointsToDeductValue;
      }
      
      // 2. Deduct from adRevenue
      if (remainingToDeduct > 0 && adRevenue > 0) {
        const adRevToDeduct = Math.min(remainingToDeduct, adRevenue);
        updates.adRevenue = increment(-adRevToDeduct);
        remainingToDeduct -= adRevToDeduct;
      }
      
      // 3. Deduct from balance (KES)
      if (remainingToDeduct > 0) {
        const kesRate = rates['KES'] || 130;
        const kesToDeduct = remainingToDeduct * kesRate;
        updates.balance = increment(-kesToDeduct);
      }

      // Simulate API call for withdrawal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newTransaction = {
        amount: numAmount,
        phoneNumber: payoutMethod === 'bank' ? bankDetails.accountNumber : payoutMethod === 'mpesa' ? phoneNumber : payoutEmail,
        status: 'success',
        timestamp: new Date().toISOString(),
        reference: "WITHDRAW-" + Date.now(),
        type: 'withdrawal',
        method: payoutMethod
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newTransaction);
      await updateDoc(doc(db, 'users', currentUser.uid), updates);

      setSuccess(`Withdrawal of $${numAmount.toFixed(2)} initiated successfully via ${payoutMethod.toUpperCase()}!`);
      setPayoutAmount("");
      setPayoutEmail("");
      setBankDetails({ accountName: "", accountNumber: "", bankName: "", swiftCode: "" });
    } catch (err: any) {
      setError(err.message || "Failed to process withdrawal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!currentUser || points <= 0) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const cashValue = points / 100; // 100 points = $1
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        points: 0,
        adRevenue: increment(cashValue)
      });

      const newTransaction = {
        amount: cashValue,
        phoneNumber: "Internal Redemption",
        status: 'success',
        timestamp: new Date().toISOString(),
        reference: "REDEEM-" + Date.now(),
        type: 'points_redemption',
        method: 'points'
      };

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newTransaction);
      
      setSuccess(`Successfully redeemed ${points.toLocaleString()} points for $${cashValue.toFixed(2)}!`);
    } catch (err: any) {
      setError(err.message || "Failed to redeem points. Please try again.");
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

      {/* Tabs removed for single-view refactoring */}

      <AnimatePresence mode="wait">
        <motion.div 
          key="rewards-main"
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
          <span className="text-yellow-100 font-medium uppercase tracking-wider mb-2">Total Combined Balance</span>
          <div className="text-6xl font-black mb-4 flex items-center">
            {convert(totalBalance)}
          </div>
          
          <div className="flex space-x-4 mb-6">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-70">Points Value</p>
              <p className="text-sm font-black">{convert(points / 100)}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-70">Ad Revenue</p>
              <p className="text-sm font-black">{convert(adRevenue)}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold opacity-70">Cash Balance</p>
              <p className="text-sm font-black">{convert(balance / kesRate)}</p>
            </div>
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

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => {
                setShowDeposit(!showDeposit);
                setShowWithdraw(false);
              }}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-full font-bold shadow-md transition-all text-sm border border-blue-100"
            >
              {showDeposit ? "Hide Deposit" : "Deposit (M-Pesa)"}
            </button>
            <button 
              onClick={handleRedeemPoints}
              disabled={isLoading || points <= 0}
              className="bg-white text-orange-600 hover:bg-yellow-50 px-6 py-3 rounded-full font-bold shadow-md transition-all text-sm disabled:opacity-50"
            >
              {isLoading ? "Redeeming..." : "Redeem Points"}
            </button>
            <button 
              onClick={() => {
                setShowWithdraw(!showWithdraw);
                setShowDeposit(false);
              }}
              className="bg-orange-600 text-white hover:bg-orange-700 px-6 py-3 rounded-full font-bold shadow-md transition-all text-sm border border-white/20"
            >
              {showWithdraw ? "Hide Withdraw" : "Withdraw Funds"}
            </button>
          </div>

          {/* Deposit Form */}
          <AnimatePresence>
            {showDeposit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-sm mt-6 overflow-hidden"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    M-Pesa Express Deposit
                  </h3>
                  <div className="space-y-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                      <input
                        type="text"
                        placeholder="07XX XXX XXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/50 outline-none text-white placeholder:text-white/40 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white/60">KES</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-white/50 outline-none text-white placeholder:text-white/40 text-sm"
                      />
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isLoading}
                      className="w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 text-sm"
                    >
                      {isLoading ? "Processing..." : "Deposit Now"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Withdraw Form */}
          <AnimatePresence>
            {showWithdraw && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-md mt-6 overflow-hidden"
              >
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span>Initiate Withdrawal</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                      { id: 'paypal', label: 'PayPal', icon: DollarSign },
                      { id: 'stripe', label: 'Stripe', icon: CreditCard },
                      { id: 'bank', label: 'Bank', icon: Landmark }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPayoutMethod(method.id as any)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1",
                          payoutMethod === method.id 
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
                            : "border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 text-gray-500"
                        )}
                      >
                        <method.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleWithdrawal} className="space-y-4">
                    {payoutMethod === 'mpesa' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">M-Pesa Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="07XX XXX XXX"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    ) : payoutMethod !== 'bank' ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {payoutMethod === 'paypal' ? 'PayPal Email' : 'Stripe Email'}
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={payoutEmail}
                            onChange={(e) => setPayoutEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Name</label>
                          <input
                            type="text"
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                            className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                          <input
                            type="text"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                          <input
                            type="text"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SWIFT Code</label>
                          <input
                            type="text"
                            value={bankDetails.swiftCode}
                            onChange={(e) => setBankDetails({...bankDetails, swiftCode: e.target.value})}
                            className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20 text-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Withdraw Funds</span>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          tx.type === 'withdrawal' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}>
                          {tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{tx.type || 'Transaction'}</p>
                          <p className="text-[10px] text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black",
                          tx.type === 'withdrawal' ? "text-red-600" : "text-green-600"
                        )}>
                          {tx.type === 'withdrawal' ? '-' : '+'}{convert(tx.amount)}
                        </p>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          tx.status === 'success' ? "bg-green-100 text-green-700" : 
                          tx.status === 'pending' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                        )}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm italic">No recent activity found.</div>
                )}
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
        ) : (
          <motion.div 
            key="withdraw"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Wallet className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-green-100 font-bold uppercase tracking-widest text-xs">Available for Withdrawal</p>
                    <h2 className="text-5xl font-black tracking-tighter">
                      {convert(totalBalance)}
                    </h2>
                    <div className="flex items-center space-x-2 text-green-100 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Unified Balance (Points + Ad Revenue + Cash)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span>Select Withdrawal Method</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                      { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
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
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" 
                            : "border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 text-gray-500"
                        )}
                      >
                        <method.icon className="w-6 h-6" />
                        <span className="text-xs font-bold">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleWithdrawal} className="space-y-6">
                    {payoutMethod === 'mpesa' ? (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">M-Pesa Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="07XX XXX XXX"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    ) : payoutMethod !== 'bank' ? (
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
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
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
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Number / IBAN</label>
                          <input
                            type="text"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                          <input
                            type="text"
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SWIFT / BIC Code</label>
                          <input
                            type="text"
                            value={bankDetails.swiftCode}
                            onChange={(e) => setBankDetails({...bankDetails, swiftCode: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
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
                          className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                      </div>
                      {payoutMethod === 'mpesa' && payoutAmount && !isNaN(parseFloat(payoutAmount)) && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Approx. KES {(parseFloat(payoutAmount) * (rates['KES'] || 130)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      )}
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
                      className="w-full py-4 bg-green-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg shadow-green-500/20"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing Withdrawal...</span>
                        </>
                      ) : (
                        <span>Withdraw Funds</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Withdrawal Information</h3>
                  <ul className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <span>Processing time: 1-3 business days</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <span>Minimum withdrawal: $5.00</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                      <span>Transaction fees may apply depending on the provider</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Recent Withdrawals</h3>
                  <div className="space-y-3">
                    {transactions.filter(tx => tx.type === 'withdrawal').length > 0 ? (
                      transactions.filter(tx => tx.type === 'withdrawal').map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
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
                      <p className="text-[10px] text-gray-400 text-center py-4">No withdrawals yet</p>
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
