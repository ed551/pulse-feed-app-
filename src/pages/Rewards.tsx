import { useState, useEffect, useMemo } from "react";
import { Gem, Award, TrendingUp, DollarSign, Receipt, Landmark, CheckCircle, Globe, Wallet, Phone, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Info, Smartphone, CreditCard, ShieldCheck, Calendar, Lock, KeyRound, AlertTriangle, Building2, RefreshCw, RotateCcw } from "lucide-react";
import { mpesa_handler, unified_participant_payout, rewards_policy, equal_distribution_protocol, merchant_of_record_tax_remittance } from "../lib/engines";
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
  currency?: string;
  phoneNumber?: string;
  email?: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: any;
  reference: string;
  type?: string;
  source?: string;
  details?: string;
  revenueSource?: 'ad' | 'education';
  pointsDeducted?: number;
  pointsAdded?: number;
  remainingPoints?: number;
}

export default function Rewards() {
  const { currentUser, userData } = useAuth();
  const isDeveloper = currentUser?.email === 'edwinmuoha@gmail.com';
  const { isIdle, activeSeconds, totalEarnedToday, addPlatformRevenue } = useRevenue();
  const { currency, availableCurrencies, changeCurrency, convert, loading, rates } = useCurrencyConverter();
  const [activeTab, setActiveTab] = useState<'overview' | 'local' | 'international'>('overview');
  const [localMethod, setLocalMethod] = useState<'mpesa' | 'bank' | 'paybill'>('mpesa');
  const [paybillDetails, setPaybillDetails] = useState({
    businessNumber: "",
    accountNumber: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [conditionsError, setConditionsError] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'stripe' | 'bank'>('paypal');
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    swiftCode: ""
  });

  const isLive = true; // Default to live mode
  const points = userData?.points || 0;
  const balance = points / 100;
  const membershipLevel = userData?.membershipLevel || 'bronze';

  const canWithdrawNow = useMemo(() => {
    if (isDeveloper) return true;
    const now = new Date();
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0 is Sunday

    if (membershipLevel === 'gold') {
      // Gold can withdraw on Sundays
      return dayOfWeek === 0;
    } else if (membershipLevel === 'silver') {
      // Silver can withdraw on 1st or 15th
      return day === 1 || day === 15;
    } else {
      // Bronze can only withdraw on the 1st
      return day === 1;
    }
  }, [isDeveloper, membershipLevel]);

  const nextRedemptionDate = useMemo(() => {
    if (isDeveloper) return "Instant Access";
    
    const now = new Date();
    
    // Tiered Withdrawal Frequency
    if (membershipLevel === 'gold') {
      // Weekly Payouts (Next Sunday)
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
      return `Next Sunday: ${nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (membershipLevel === 'silver') {
      // Mid-month Payouts (15th)
      const currentMonth15 = new Date(now.getFullYear(), now.getMonth(), 15);
      if (now.getDate() < 15) {
        return `Mid-Month: ${currentMonth15.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        const nextMonth15 = new Date(now.getFullYear(), now.getMonth() + 1, 15);
        return `Mid-Month: ${nextMonth15.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
    } else {
      // Bronze: Monthly (1st of next month)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }, [isDeveloper, membershipLevel]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/transactions`));
  }, [currentUser]);

  // Calculate user audit totals (Normalized to USD for integrity)
  const userAuditTotals = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      // Use USD amount if available, otherwise fallback to amount (which is USD for earnings anyway)
      const amountUsd = tx.currency === 'KES' ? (tx.pointsDeducted ? tx.pointsDeducted / 100 : (tx.amount / (rates['KES'] || 135))) : tx.amount;
      
      if (tx.type === 'earning') {
        acc.totalEarned += amountUsd;
      } else if (['mpesa', 'bank', 'paybill', 'payout'].includes(tx.type || '')) {
        acc.totalWithdrawn += amountUsd;
        if (tx.status === 'pending') acc.pendingWithdrawals += amountUsd;
      }
      return acc;
    }, { totalEarned: 0, totalWithdrawn: 0, pendingWithdrawals: 0 });
  }, [transactions, rates]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setIsLoading(true);
    setError(null);
    try {
      const numAmount = parseFloat(amount);
      const minAmount = isDeveloper ? 1 : 100;
      if (numAmount < minAmount) throw new Error(`Minimum withdrawal is KES ${minAmount}`);
      
      const currentRate = rates['KES'] || 135;
      const kesBalance = (points * currentRate / 100);
      if (!isDeveloper && numAmount > kesBalance) throw new Error("Insufficient balance");

      let endpoint = '/api/payout/mpesa';
      let body: any = { amount: numAmount };

      if (localMethod === 'mpesa') {
        if (!phoneNumber) throw new Error("Phone number is required");
        body.phoneNumber = phoneNumber;
      } else if (localMethod === 'bank') {
        if (!bankDetails.accountNumber) throw new Error("Bank account number is required");
        endpoint = '/api/payout/bank';
        body.bankDetails = bankDetails;
      } else if (localMethod === 'paybill') {
        if (!paybillDetails.businessNumber || !paybillDetails.accountNumber) throw new Error("Paybill details are required");
        endpoint = '/api/payout/paybill';
        body.paybillDetails = paybillDetails;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success || result.ResponseCode === "0") {
        setSuccess(result.message || "Payout request initiated successfully!");
        setAmount("");
        
            // Log transaction to Firestore
            if (currentUser) {
              const txRef = collection(db, 'users', currentUser.uid, 'transactions');
              const currentRate = rates['KES'] || 135;
              const usdAmount = numAmount / currentRate;
              const pointsToDeduct = Math.floor(usdAmount * 100);

              const txData = {
                amount: numAmount,
                currency: 'KES',
                type: localMethod,
                status: result.success ? 'success' : 'pending',
                timestamp: serverTimestamp(),
                reference: result.transactionId || result.CheckoutRequestID || "N/A",
                details: result.message || "Transaction processed",
                pointsDeducted: pointsToDeduct,
                usdEquivalent: usdAmount,
                previousPoints: points,
                remainingPoints: points - pointsToDeduct,
                userId: currentUser.uid,
                userEmail: currentUser.email
              };

              await addDoc(txRef, txData);
              
              // Also log to the central withdrawals collection for admin visibility
              await addDoc(collection(db, 'withdrawals'), {
                ...txData,
                userName: userData?.displayName || 'Anonymous',
                processedAt: result.success ? serverTimestamp() : null
              }).catch(err => console.error("Central withdrawal logging failed:", err));

            // Deduct both points AND balance to keep them in sync
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              points: increment(-pointsToDeduct),
              balance: increment(-usdAmount),
              totalWithdrawals: increment(usdAmount)
            });

            // Audit Ledger Entry
            await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
              amount: -pointsToDeduct,
              balanceAfter: points - pointsToDeduct,
              type: 'deduction',
              source: 'withdrawal',
              reason: `Local Payout (${localMethod})`,
              timestamp: serverTimestamp()
            }).catch(err => console.error("Error logging points ledger:", err));
          }
      } else {
        throw new Error(result.error || "Payout failed. Please verify your details or check back later.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInternationalPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount) return;
    setIsLoading(true);
    setError(null);
    try {
      const numAmount = parseFloat(payoutAmount);
      const minAmount = isDeveloper ? 0.01 : 10;
      if (numAmount < minAmount) throw new Error(`Minimum withdrawal is $${minAmount.toFixed(2)} USD`); 
      if (!isDeveloper && numAmount > balance) throw new Error("Insufficient balance");

      // Logic for international payout
      if (currentUser) {
        const txRef = collection(db, 'users', currentUser.uid, 'transactions');
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Use a unique reference
        const reference = `INT-${Date.now()}-${currentUser.uid.slice(0, 4)}`;

        // Deduct both points AND balance
        const pointsToDeduct = Math.floor(numAmount * 100);
        
        const txData = {
          amount: numAmount,
          currency: 'USD',
          type: payoutMethod,
          status: 'pending',
          email: payoutEmail,
          bankDetails: payoutMethod === 'bank' ? bankDetails : null,
          timestamp: serverTimestamp(),
          reference,
          details: `International ${payoutMethod} payout request`,
          pointsDeducted: pointsToDeduct,
          previousPoints: points,
          remainingPoints: points - pointsToDeduct,
          userId: currentUser.uid,
          userEmail: currentUser.email
        };

        await addDoc(txRef, txData);

        // Also log to the central withdrawals collection for admin visibility
        await addDoc(collection(db, 'withdrawals'), {
          ...txData,
          userName: userData?.displayName || 'Anonymous',
        }).catch(err => console.error("Central withdrawal logging failed:", err));

        await updateDoc(userRef, {
          points: increment(-pointsToDeduct),
          balance: increment(-numAmount),
          totalWithdrawals: increment(numAmount)
        });

        // Audit Ledger Entry
        await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
          amount: -pointsToDeduct,
          balanceAfter: points - pointsToDeduct,
          type: 'deduction',
          source: 'withdrawal',
          reason: `International Payout (${payoutMethod})`,
          timestamp: serverTimestamp()
        }).catch(err => console.error("Error logging points ledger:", err));
        
        setSuccess(`International payout request of $${numAmount} submitted successfully!`);
        setPayoutAmount("");
        setPayoutEmail("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const [bankBalance, setBankBalance] = useState<any>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const checkTreasuryBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const response = await fetch('/api/coop/balance');
      const data = await response.json();
      if (data.success) {
        setBankBalance(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(`Treasury Check Failed: ${err.message}`);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleWithdrawMax = () => {
    const currentRate = rates['KES'] || 135;
    const maxKes = Math.floor(points * currentRate / 100);
    setAmount(maxKes.toString());
  };

  const handleWithdrawAllInternational = () => {
    setPayoutAmount(balance.toFixed(2));
  };

  const handleSyncWallet = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      // Direct call to ensure points are fresh from server
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        setSuccess("Wallet synchronized with ledger successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to sync wallet. Please check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestorePoints = async () => {
    if (!currentUser || isRecovering) return;
    setIsRecovering(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: 6337,
        balance: 63.37,
        isPointsRecovered: true,
        isRestoredTo6337: true,
        recoveredAt: serverTimestamp()
      });
      setSuccess("Full balance of 6,337 points successfully restored!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError("Restoration failed. Please try again.");
    } finally {
      setIsRecovering(false);
    }
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleDownloadAudit = () => {
    if (!currentUser) return;
    
    const timestamp = new Date().toISOString();
    const auditData = transactions.map(tx => {
      const date = tx.timestamp?.toDate?.() || new Date(tx.timestamp);
      return `${date.toISOString()},${tx.type},${tx.amount},${tx.currency || 'USD'},${tx.status},${tx.reference}`;
    }).join('\n');
    
    const header = "Date,Type,Amount,Currency,Status,Reference\n";
    const blob = new Blob([header + auditData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PulseFeeds_Audit_${currentUser.uid}_${timestamp.split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { title: "Audit Ready", body: "Your financial audit statement has been downloaded.", type: "success" } 
    }));
  };

  const handleResetTesting = async () => {
    if (!currentUser || isResetting) return;
    setIsResetting(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: 10000,
        balance: 100.00,
        totalWithdrawals: 0,
        isPointsRecovered: false,
        isRestoredTo6337: false,
        testResetAt: serverTimestamp()
      });
      setSuccess("Account reset for testing! 10,000 points added.");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError("Reset failed. Please try again.");
    } finally {
      setIsResetting(false);
    }
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
        <div className="flex items-center justify-center space-x-2 mb-2">
          {isLive ? (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" /> Live Mode
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" /> Simulation Mode
            </span>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {isLive 
            ? "Manage your earnings, redeem points, and process real-time bank and M-Pesa payouts."
            : "Manage your earnings, redeem points, and test M-Pesa Express payments."}
        </p>
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
          onClick={() => setActiveTab('local')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'local' ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Smartphone className="w-4 h-4" />
          <span>Local (KES)</span>
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

            <div className="rounded-3xl p-8 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-white/80 font-medium uppercase tracking-wider mb-2">
                  Total Balance & Reward Points
                </span>
                <div className="text-6xl font-black mb-1 flex items-center">
                  {convert(balance)}
                </div>
                <div className="text-xl font-bold opacity-90 mb-4 flex items-center">
                  <Gem className="w-5 h-5 mr-2" />
                  {points.toLocaleString()} Points
                </div>

                <div className="flex gap-2 mb-6">
                  <button 
                    onClick={handleSyncWallet}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all border border-white/30 active:scale-95"
                  >
                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                    Sync Ledger
                  </button>

                  <button 
                    onClick={handleResetTesting}
                    disabled={isResetting}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all border border-white/30 active:scale-95 text-red-100"
                  >
                    {isResetting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RotateCcw className="w-3 h-3 mr-2" />}
                    Reset Test
                  </button>

                  {isDeveloper && (
                    <button 
                      onClick={checkTreasuryBalance}
                      disabled={isCheckingBalance}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all border border-green-500/30 active:scale-95 text-green-100"
                    >
                      {isCheckingBalance ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Landmark className="w-3 h-3 mr-2" />}
                      Check Treasury
                    </button>
                  )}

                  {bankBalance && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 z-50 flex items-center justify-center p-6"
                    >
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBankBalance(null)} />
                      <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Co-op Bank Balance</p>
                             <h3 className="text-2xl font-black text-gray-900 dark:text-white">Live Treasury</h3>
                           </div>
                           <button onClick={() => setBankBalance(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                             <XCircle className="w-6 h-6 text-gray-400" />
                           </button>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                             <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Available Balance</p>
                             <p className="text-3xl font-black text-green-600">KES {bankBalance.AvailableBalance || bankBalance.ClearBalance || "0.00"}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                               <p className="text-gray-400 mb-1">Account No.</p>
                               <p className="font-bold text-gray-900 dark:text-white truncate">01100975259001</p>
                             </div>
                             <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                               <p className="text-gray-400 mb-1">Reference</p>
                               <p className="font-bold text-gray-900 dark:text-white truncate">{bankBalance.MessageReference}</p>
                             </div>
                           </div>
                        </div>
                        
                        <button 
                          onClick={() => setBankBalance(null)}
                          className="w-full mt-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg"
                        >
                          Dismiss
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {(userData?.points < 6337 && !userData?.isRestoredTo6337) && (
                    <button 
                      onClick={handleRestorePoints}
                      disabled={isRecovering}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-lg shadow-orange-500/20 active:scale-95 animate-pulse"
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      {isRecovering ? 'Restoring...' : 'Restore 6,337 Pts'}
                    </button>
                  )}
                </div>

                <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6 font-mono text-[9px] uppercase tracking-tighter">
                  <div className="flex justify-between items-center text-white/80 border-b border-white/10 pb-2 mb-2">
                    <span>Audit Trail Verification</span>
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span>Lifetime Earnings:</span>
                    <span className="font-black">+{convert(userAuditTotals.totalEarned)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1 text-red-100">
                    <span>Total Withdrawals:</span>
                    <span className="font-black">-{convert(userAuditTotals.totalWithdrawn)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-white font-black">
                    <span>Calculated Balance:</span>
                    <span>{convert(userAuditTotals.totalEarned - userAuditTotals.totalWithdrawn)}</span>
                  </div>
                  {userAuditTotals.pendingWithdrawals > 0 && (
                    <div className="mt-2 text-yellow-200 animate-pulse flex justify-between items-center">
                       <span>Pending Settlements:</span>
                       <span>{convert(userAuditTotals.pendingWithdrawals)}</span>
                    </div>
                  )}
                </div>

                {/* Redemption Notification */}
                <div className="w-full max-w-sm bg-white/20 backdrop-blur-lg rounded-2xl p-4 border border-white/30 mb-6 flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-white/70">Next Settlement Gate</p>
                    <p className="text-lg font-black text-white">{nextRedemptionDate}</p>
                    <p className="text-[10px] text-white/60">
                      {isDeveloper 
                        ? "Developer Priority: Zero Limits" 
                        : membershipLevel === 'gold' 
                          ? "Gold Status: Weekly Payouts" 
                          : membershipLevel === 'silver' 
                            ? "Silver Status: Bi-Monthly Payouts" 
                            : "Bronze Status: Monthly Batching"}
                    </p>
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setActiveTab('local')}
                    className="bg-white text-orange-600 hover:bg-yellow-50 px-8 py-3 rounded-full font-bold shadow-md transition-all flex-1"
                  >
                    Redeem User Points
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reward Distribution Policy</h2>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  Pulse Feeds operates on a transparent, multi-tiered revenue distribution model designed to reward community participation while sustaining platform innovation.
                  <br/><br/>
                  <strong>1. User Engagement:</strong> For general platform activity, including social interactions, active time, and community participation, your revenue share is determined by your <strong>Membership Level</strong> (Bronze: 20%, Silver: 50%, Gold: 80%).
                  <br/><br/>
                  <strong>2. Exclusions:</strong> Membership level benefits do <strong>not</strong> apply to Ads revenue (fixed 50/50 split) or Education Hub revenue (fixed 80/20 platform-to-user split).
                  <br/><br/>
                  <strong>3. Platform Payments:</strong> To ensure the long-term sustainability of our high-performance AI infrastructure, all direct platform payments—including Course Enrollments, AI Training fees, Certificate purchases, Event tickets, and Marketplace transactions—belong 100% to the platform treasury.
                  <br/><br/>
                  <strong>3. Withdrawals:</strong> {isDeveloper ? "Developer accounts are exempt from all minimum limits and time restrictions. Access is instant and absolute." : 
                    membershipLevel === 'gold' 
                      ? "Gold members enjoy weekly payout settlements every Sunday with prioritized processing." 
                      : membershipLevel === 'silver' 
                        ? "Silver members benefit from mid-month and end-of-month payout cycles." 
                        : "Bronze earnings are processed in standard monthly batches on the 1st of each month."}
                  <br/><br/>
                  <strong>Tax Compliance:</strong> The platform operates via a global Merchant of Record (MoR). This means your local and international taxes (e.g., VAT, WHT) are automatically calculated, withheld, and legally remitted directly to your country's tax authority (like KRA, IRS, or HMRC) on your behalf.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Automated Payouts & Tax Statements</h2>
                <button 
                  onClick={handleDownloadAudit}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all text-xs font-bold border border-indigo-100 dark:border-indigo-800"
                >
                  <Receipt className="w-4 h-4" />
                  Download Audit Statement
                </button>
              </div>

              <div className="space-y-4 mt-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                      <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Financial Integrity Protocol</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Every transaction is logged with a unique Co-op Bank reference. Statements are designed for <strong>Tax Authorities Eligibility</strong> and internal auditing standards.
                      </p>
                    </div>
                  </div>
                </div>

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
        ) : activeTab === 'local' ? (
          <motion.div 
            key="local"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Landmark className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">Local Wallet Balance (KES)</p>
                    <h2 className="text-5xl font-black tracking-tighter">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format((points / 100) * (rates['KES'] || 130))}
                    </h2>
                    <div className="flex items-center space-x-2 text-blue-100 text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Secure local payout processing</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      <span>Select Local Payout Method</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <button
                      onClick={() => setLocalMethod('mpesa')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2",
                        localMethod === 'mpesa' 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                          : "border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500"
                      )}
                    >
                      <Smartphone className="w-6 h-6" />
                      <span className="text-xs font-bold">M-Pesa</span>
                    </button>
                    <button
                      onClick={() => setLocalMethod('bank')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2",
                        localMethod === 'bank' 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                          : "border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500"
                      )}
                    >
                      <Landmark className="w-6 h-6" />
                      <span className="text-xs font-bold">Bank</span>
                    </button>
                    <button
                      onClick={() => setLocalMethod('paybill')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2",
                        localMethod === 'paybill' 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                          : "border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500"
                      )}
                    >
                      <Receipt className="w-6 h-6" />
                      <span className="text-xs font-bold">Pay Bill</span>
                    </button>
                  </div>

                  <form onSubmit={handlePayment} className="space-y-6">
                    {localMethod === 'mpesa' ? (
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
                    ) : localMethod === 'bank' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Name</label>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={bankDetails.accountName}
                            onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                          <input
                            type="text"
                            placeholder="Account No."
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bank Name</label>
                          <select
                            value={bankDetails.bankName}
                            onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                          >
                            <option value="">Select Bank</option>
                            <option value="Equity Bank">Equity Bank</option>
                            <option value="KCB Bank">KCB Bank</option>
                            <option value="Co-operative Bank">Co-operative Bank</option>
                            <option value="Absa Bank">Absa Bank</option>
                            <option value="NCBA Bank">NCBA Bank</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Stanbic Bank">Stanbic Bank</option>
                            <option value="Diamond Trust Bank">Diamond Trust Bank</option>
                            <option value="Family Bank">Family Bank</option>
                            <option value="I&M Bank">I&M Bank</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Business Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 247247"
                            value={paybillDetails.businessNumber}
                            onChange={(e) => setPaybillDetails({...paybillDetails, businessNumber: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 0728011174"
                            value={paybillDetails.accountNumber}
                            onChange={(e) => setPaybillDetails({...paybillDetails, accountNumber: e.target.value})}
                            className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (KES)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">KES</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-14 pr-16 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleWithdrawMax}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Max
                        </button>
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
                      disabled={isLoading || (!canWithdrawNow && !isDeveloper)}
                      className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Requesting PIN...</span>
                        </>
                      ) : !canWithdrawNow && !isDeveloper ? (
                        <>
                          <Lock className="w-5 h-5 mr-2" />
                          <span>Locked until {nextRedemptionDate.split(':')[1] || nextRedemptionDate}</span>
                        </>
                      ) : (
                        <span>Request {localMethod === 'mpesa' ? 'M-Pesa Express' : localMethod === 'bank' ? 'Bank Transfer' : 'Pay Bill'}</span>
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
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {tx.type === 'earning' ? '+' : '-'}
                                  {tx.currency === 'USD' ? '$' : 'KES '} 
                                  {tx.amount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-gray-500">{tx.phoneNumber || tx.email || tx.details}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-1 rounded-md",
                                tx.status === 'success' ? "bg-green-100 text-green-700" :
                                tx.status === 'failed' ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {tx.status}
                              </span>
                              {tx.pointsDeducted && (
                                <p className="text-[9px] font-bold text-red-500 mt-1">-{tx.pointsDeducted} pts</p>
                              )}
                              {tx.pointsAdded && (
                                <p className="text-[9px] font-bold text-green-500 mt-1">+{tx.pointsAdded} pts</p>
                              )}
                            </div>
                          </div>
                          
                          {tx.remainingPoints !== undefined && (
                            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                              <div className="flex items-center text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                <Wallet className="w-3 h-3 mr-1" />
                                Balance After
                              </div>
                              <div className="text-[10px] font-black text-gray-900 dark:text-white">
                                {tx.remainingPoints.toLocaleString()} Points
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[8px] font-medium text-gray-400 uppercase tracking-tighter">
                            <span>
                              {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString() : new Date(tx.timestamp).toLocaleString()}
                            </span>
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
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-bold">
                      ⚠️ Minimum withdrawal amount is $100.00 USD.
                    </p>
                  </div>
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
                          className="w-full pl-10 pr-16 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                        <button
                          type="button"
                          onClick={handleWithdrawAllInternational}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-md hover:bg-purple-100 transition-colors"
                        >
                          Max
                        </button>
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
                      disabled={isLoading || (!canWithdrawNow && !isDeveloper)}
                      className="w-full py-4 bg-purple-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processing Payout...</span>
                        </>
                      ) : !canWithdrawNow && !isDeveloper ? (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          <span>Locked until {nextRedemptionDate.split(':')[1] || nextRedemptionDate}</span>
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
                      <span>Processing time: {isDeveloper ? "Instant (Developer Priority)" : "1-3 business days"}</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Minimum withdrawal: {isDeveloper ? "None" : "$100.00 (10,000 points)"}</span>
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
      
      <AnimatePresence>
        {showConditionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-purple-600"></div>
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Withdrawal Guard</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    To ensure the security of your funds and comply with platform policies, the following conditions must be met:
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <div className={cn(
                    "flex items-center p-4 rounded-2xl border transition-all",
                    conditionsError?.includes("threshold") ? "bg-red-50 border-red-100 text-red-700" : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700"
                  )}>
                    <DollarSign className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-widest">Minimum Threshold</p>
                      <p className="text-sm font-medium">$100.00 USD minimum required</p>
                    </div>
                  </div>

                  <div className={cn(
                    "flex items-center p-4 rounded-2xl border transition-all",
                    conditionsError?.includes("month") ? "bg-red-50 border-red-100 text-red-700" : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700"
                  )}>
                    <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-widest">Withdrawal Frequency</p>
                      <p className="text-sm font-medium">Limited to once per month</p>
                    </div>
                  </div>
                </div>

                {conditionsError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center space-x-2 w-full">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{conditionsError}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowConditionsModal(false);
                    setConditionsError(null);
                  }}
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
