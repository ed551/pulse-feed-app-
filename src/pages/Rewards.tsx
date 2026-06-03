import { useState, useEffect, useMemo } from "react";
import { 
  Layers, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  Landmark, 
  CheckCircle, 
  Globe, 
  Wallet, 
  Phone, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Info, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  ShieldOff, 
  Calendar, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  Building2, 
  RefreshCw, 
  RotateCcw, 
  Trash2, 
  ShieldAlert, 
  Zap, 
  Gem,
  Database
} from "lucide-react";
import { mpesa_handler, unified_participant_payout, rewards_policy, equal_distribution_protocol, merchant_of_record_tax_remittance } from "../lib/engines";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { isIframe, getPasskeyErrorLinkMessage, checkPasskeyCapability } from "../lib/iframeUtils";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs } from "firebase/firestore";

import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  amount: number;
  currency?: string;
  phoneNumber?: string;
  email?: string;
  status: 'pending' | 'success' | 'failed' | 'queued';
  timestamp: any;
  reference: string;
  type?: string;
  source?: string;
  details?: string;
  revenueSource?: 'ad' | 'commission';
  pointsDeducted?: number;
  pointsAdded?: number;
  remainingPoints?: number;
}

export default function Rewards() {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const isDeveloper = currentUser?.email === 'edwinmuoha@gmail.com';
  const { isIdle, activeSeconds, totalEarnedToday, addPlatformRevenue, syncActiveTimeRewards } = useRevenue();
  const { currency, availableCurrencies, changeCurrency, convert, loading, rates } = useCurrencyConverter();
  const [activeTab, setActiveTab] = useState<'overview' | 'local' | 'international' | 'history'>('overview');
  const [showSCAModal, setShowSCAModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<'pin' | 'passkey' | 'totp' | 'sms' | 'password'>('pin');
  const [passwordInput, setPasswordInput] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isPasskeyAuthenticating, setIsPasskeyAuthenticating] = useState(false);
  const [scaToken, setScaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [scaError, setScaError] = useState<string | null>(null);
  const [scaPendingAction, setScaPendingAction] = useState<((pin: string, usePasskey?: boolean, totp?: string) => void) | null>(null);
  const [passkeyBlocked, setPasskeyBlocked] = useState(false);

  useEffect(() => {
    const checkCap = async () => {
      const cap = await checkPasskeyCapability();
      if (!cap.supported && cap.reason === 'blocked_by_iframe') {
        setPasskeyBlocked(true);
      }
    };
    checkCap();
  }, []);
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
  const [payoutMethod, setPayoutMethod] = useState<'paypal' | 'stripe' | 'bank' | 'binance'>('binance');
  const [binanceAddress, setBinanceAddress] = useState('');
  const [binanceCoin, setBinanceCoin] = useState<'PAXG'>('PAXG');
  const [binanceNetwork, setBinanceNetwork] = useState('ETH');
  const [paxgBtcRate, setPaxgBtcRate] = useState<number | null>(null);
  const [paxgPrice, setPaxgPrice] = useState<number | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPaxgBtc = async () => {
      try {
        const resp = await fetch('/api/binance/prices');
        const data = await resp.json();
        if (data.success) {
          const paxgUsdt = data.prices.find((p: any) => p.symbol === 'PAXGUSDT')?.price;
          const btcUsdt = data.prices.find((p: any) => p.symbol === 'BTCUSDT')?.price;
          if (paxgUsdt && btcUsdt) {
            const p = parseFloat(paxgUsdt);
            const b = parseFloat(btcUsdt);
            setPaxgPrice(p);
            setBtcPrice(b);
            setPaxgBtcRate(p / b);
          }
        }
      } catch (e) {
        console.error("Failed to fetch PAXG/BTC rate:", e);
      }
    };
    fetchPaxgBtc();
    const interval = setInterval(fetchPaxgBtc, 60000);
    return () => clearInterval(interval);
  }, []);
  const [payoutEmail, setPayoutEmail] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    bankName: "",
    swiftCode: ""
  });

  const isLive = true; // Default to live mode
  const points = userData?.points || 0; // Gold g
  const goldBalance = points;
  const balanceKES = points * 100; // 1g Gold = 100 KES (Since 10mg was 1 KES)
  const balanceUSD = points / 1.3; // 1.3g Gold = 1 USD
  const membershipLevel = userData?.membershipLevel || 'bronze';

  const canWithdrawNow = true; // 1st of month no longer mandatory

  const nextRedemptionDate = useMemo(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + (now.getDate() === 1 ? 0 : 1), 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;
    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      // Ensure unique IDs
      const uniqueData = data.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setTransactions(uniqueData);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/transactions`));
  }, [currentUser, db]);

  // Calculate user audit totals (Normalized to KES for integrity)
  const userAuditTotals = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      // Use KES amount if available, otherwise convert from USD
      // Note: rates['KES'] is now 130 (relative to USD base)
      let amountKes = 0;
      if (tx.currency === 'KES') {
        amountKes = tx.amount;
      } else {
        // Assume USD if not KES, use current rate of 130
        amountKes = tx.amount * (rates['KES'] || 130);
      }
      
      if (tx.type === 'earning') {
        acc.totalEarned += amountKes;
      } else if (['mpesa', 'bank', 'paybill', 'payout', 'paypal', 'stripe'].includes(tx.type || '')) {
        acc.totalWithdrawn += amountKes;
        if (tx.status === 'pending' || tx.status === 'queued') acc.pendingWithdrawals += amountKes;
      }
      return acc;
    }, { totalEarned: 0, totalWithdrawn: 0, pendingWithdrawals: 0 });
  }, [transactions, rates]);

  const handlePayment = async (e?: React.FormEvent, pin?: string, usePasskey?: boolean, totp?: string) => {
    if (e) e.preventDefault();
    if (!amount) return;
    
    // Trigger SCA if not provided
    if (!pin && !usePasskey && !totp && !isDeveloper && !process.env.SKIP_SCA) {
      setScaPendingAction(() => (p: string, up?: boolean, t?: string) => handlePayment(undefined, p, up, t));
      setShowSCAModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Security Check: Email & Phone Verification
      if (!currentUser?.emailVerified && currentUser?.email) {
        throw new Error("Please verify your email address before making a withdrawal.");
      }
      if (!userData?.phoneNumber) {
        throw new Error("Please link and verify locally your phone number in Settings before making a withdrawal.");
      }

      const numAmount = parseFloat(amount);
      
      // Balance Check: 100 USD equivalent in gold (130 g)
      const MIN_BALANCE_FOR_WITHDRAWAL = 130;
      if (points < MIN_BALANCE_FOR_WITHDRAWAL) {
        throw new Error(`A minimum balance of 100 USD equivalent in gold (130 g) is required in the account to enable withdrawals. Your current balance is ${points.toLocaleString()} g.`);
      }

      const minAmount = isDeveloper ? 1 : 100;
      if (numAmount < minAmount) throw new Error(`Minimum withdrawal is KES ${minAmount}`);
      
      const currentRate = rates['KES'] || 130;
      const kesBalance = points * 100;

      const last24h = Date.now() - (24 * 60 * 60 * 1000);
      const recentWithdrawalsKES = transactions
        .filter(tx => ['mpesa', 'bank', 'paybill', 'payout', 'paypal', 'stripe'].includes(tx.type || '') && (tx.timestamp?.toMillis?.() || 0) > last24h)
        .reduce((sum, tx) => {
          const txAmountKES = (tx.currency === 'KES') ? tx.amount : (tx.amount * (rates['KES'] || 130));
          return sum + txAmountKES;
        }, 0);

      // Velocity Limit Check
      const requestedKES = numAmount;
      let limitKES = 6500; // ~50 USD
      if (isDeveloper) limitKES = 1300000; // Unrestricted for system fixes (Adjusted scaling)
      else if ((userData as any)?.kycVerified || (userData as any)?.isKycVerified) limitKES = 65000; // ~500 USD
          
      if (recentWithdrawalsKES + requestedKES > limitKES && !totp && !usePasskey) {
        setScaError(`Daily velocity limit reach with PIN code. If you hit a limit, you MUST 'Authorize with a higher security method' (like a TOTP Code or Passkey) to continue. Authorized limit with Passkeys/TOTP is KES 650,000.`);
      }

      const balanceKESCheck = points * 100;
      if (!isDeveloper && numAmount > balanceKESCheck) throw new Error("Insufficient reserve for this withdrawal request.");

      const isQueued = !canWithdrawNow;
      
      let result: any = { success: true, message: isQueued ? "Withdrawal queued for 1st of month" : "Processing..." };
      
      if (!isQueued) {
        let endpoint = '/api/payout/mpesa';
        let body: any = { 
          amount: numAmount, 
          userId: currentUser?.uid,
          scaToken: pin,
          usePasskey,
          totpCode: totp
        };

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

        result = await response.json();
        
        if (result.status === 'SOFT_DECLINE') {
          setScaError(result.message);
          if (result.requiredLevel >= 2 && authMethod === 'pin') {
            setAuthMethod('totp');
          }
          setShowSCAModal(true);
          setScaPendingAction(() => (p: string, up?: boolean, t?: string) => handlePayment(undefined, p, up, t));
          return;
        }
      }

      if (result.success || result.ResponseCode === "0" || isQueued) {
        setSuccess(isQueued ? `Success! ${numAmount} KES queued for payment on ${nextRedemptionDate}.` : (result.message || "Payout request initiated successfully!"));
        setAmount("");
        
            // Log transaction to Firestore
            if (currentUser && db) {
              const txRef = collection(db, 'users', currentUser.uid, 'transactions');
              const pointsToDeduct = numAmount / 100; // 1g Gold = 100 KES
              const usdAmount = numAmount / 130; // 130 KES = 1 USD

              const txData = {
                amount: numAmount,
                currency: 'KES',
                type: localMethod,
                status: isQueued ? 'queued' : (result.status || (result.success ? 'success' : 'pending')),
                scheduledDate: isQueued ? nextRedemptionDate : null,
                timestamp: serverTimestamp(),
                reference: result.transactionId || result.CheckoutRequestID || `Q-${Date.now()}`,
                details: isQueued ? `Queued for Monthly Batch (${nextRedemptionDate})` : (result.message || (result.status === 'blocked' ? 'Blocked by Bank Firewall' : 'Transaction processed')),
                pointsDeducted: pointsToDeduct,
                usdEquivalent: usdAmount,
                previousPoints: points,
                remainingPoints: points - pointsToDeduct,
                userId: currentUser.uid,
                userEmail: currentUser.email
              };

              await addDoc(txRef, txData);
              
              // Also log to the central withdrawals collection for admin visibility
              import('firebase/firestore').then(({ doc, setDoc }) => {
                setDoc(doc(db, 'withdrawals', txData.reference), {
                  ...txData,
                  userName: userData?.displayName || 'Anonymous',
                  processedAt: (result.success && !isQueued) ? serverTimestamp() : null
                }, { merge: true }).catch(err => console.error("Central withdrawal logging failed:", err));
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
          } else if (currentUser && !db) {
            console.warn("Firestore not available for payout logging.");
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

  const [binanceBalance, setBinanceBalance] = useState<{ free: string, locked: string } | null>(null);
  const [isCheckingBinanceBalance, setIsCheckingBinanceBalance] = useState(false);

  const checkBinanceAssetBalance = async (asset: string) => {
    setIsCheckingBinanceBalance(true);
    try {
      const response = await fetch(`/api/binance/balance/${asset}`);
      const data = await response.json();
      if (data.success) {
        setBinanceBalance({ free: data.free, locked: data.locked });
      } else {
        throw new Error(data.error || "Failed to fetch balance");
      }
    } catch (err: any) {
      setError(`Binance Balance Check Failed: ${err.message}`);
    } finally {
      setIsCheckingBinanceBalance(false);
    }
  };

  const handleBinanceWithdraw = async (e?: React.FormEvent, pin?: string, usePasskey?: boolean, totp?: string) => {
    if (e) e.preventDefault();
    if (!payoutAmount) return;

    if (!pin && !usePasskey && !totp && !isDeveloper && !process.env.SKIP_SCA) {
      setScaPendingAction(() => (p: string, up?: boolean, t?: string) => handleBinanceWithdraw(undefined, p, up, t));
      setShowSCAModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!binanceAddress) throw new Error("Binance Wallet Address is required");
      
      const numAmount = parseFloat(payoutAmount);

      // Balance Check: 100 USD equivalent in gold (130 g)
      const MIN_BALANCE_FOR_WITHDRAWAL = 130;
      if (points < MIN_BALANCE_FOR_WITHDRAWAL) {
        throw new Error(`A minimum balance of 100 USD equivalent in gold (130 g) is required in the account to enable withdrawals. Your current balance is ${points.toLocaleString()} g.`);
      }

      if (numAmount < 10 && !isDeveloper) throw new Error("Minimum Binance withdrawal is $10");

      // Calculation: If withdrawing PAXG, we must convert USD to PAXG Units (1 PAXG = 1 Ounce)
      let withdrawQuantity = numAmount;
      if (binanceCoin === 'PAXG' && paxgPrice) {
        withdrawQuantity = numAmount / paxgPrice;
      }

      const response = await fetch('/api/binance/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: binanceCoin,
          address: binanceAddress,
          amount: withdrawQuantity,
          network: binanceNetwork,
          scaToken: pin,
          usePasskey,
          totpCode: totp,
          userId: currentUser?.uid
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Binance withdrawal failed");

      if (currentUser && db) {
        const txRef = collection(db, 'users', currentUser.uid, 'transactions');
        const pointsToDeduct = numAmount * 1.3; // 1.3g Gold = $1 USD approx

        const txData = {
          amount: numAmount,
          currency: binanceCoin,
          type: 'binance',
          status: 'pending',
          address: binanceAddress,
          network: binanceNetwork,
          timestamp: serverTimestamp(),
          reference: result.data.id || `BIN-${Date.now()}`,
          details: `Binance ${binanceCoin} withdrawal`,
          pointsDeducted: pointsToDeduct,
          previousPoints: points,
          remainingPoints: points - pointsToDeduct,
          userId: currentUser.uid,
          userEmail: currentUser.email
        };

        await addDoc(txRef, txData);
        
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          points: increment(-pointsToDeduct),
          balance: increment(-numAmount)
        });
      }

      setSuccess(`Success! ${numAmount} ${binanceCoin} withdrawal initiated to ${binanceAddress}`);
      setPayoutAmount("");
      setBinanceAddress("");

      // Automatically refresh balance after 5 seconds to show update on Binance
      setTimeout(() => checkBinanceAssetBalance(binanceCoin), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInternationalPayout = async (e?: React.FormEvent, pin?: string, usePasskey?: boolean, totp?: string) => {
    if (payoutMethod === 'binance') {
      return handleBinanceWithdraw(e, pin, usePasskey, totp);
    }
    if (e) e.preventDefault();
    if (!payoutAmount) return;

    // Trigger SCA if not provided
    if (!pin && !usePasskey && !totp && !isDeveloper && !process.env.SKIP_SCA) {
      setScaPendingAction(() => (p: string, up?: boolean, t?: string) => handleInternationalPayout(undefined, p, up, t));
      setShowSCAModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Security Check: Email & Phone Verification
      if (!currentUser?.emailVerified && currentUser?.email) {
        throw new Error("Please verify your email address before making a withdrawal.");
      }
      if (!userData?.phoneNumber) {
        throw new Error("Please link and verify locally your phone number in Settings before making a withdrawal.");
      }

      const numAmount = parseFloat(payoutAmount);

      // Balance Check: 100 USD equivalent in gold (130 g)
      const MIN_BALANCE_FOR_WITHDRAWAL = 130;
      if (points < MIN_BALANCE_FOR_WITHDRAWAL) {
        throw new Error(`A minimum balance of 100 USD equivalent in gold (130 g) is required in the account to enable withdrawals. Your current balance is ${points.toLocaleString()} g.`);
      }

      const minAmount = isDeveloper ? 1 : 1300; 
      if (numAmount < minAmount) throw new Error(`Minimum withdrawal is KES ${minAmount}`); 
      
      const last24h = Date.now() - (24 * 60 * 60 * 1000);
      const recentWithdrawalsKES = transactions
        .filter(tx => ['mpesa', 'bank', 'paybill', 'payout', 'paypal', 'stripe'].includes(tx.type || '') && (tx.timestamp?.toMillis?.() || 0) > last24h)
        .reduce((sum, tx) => {
          const txAmountKES = (tx.currency === 'KES') ? tx.amount : (tx.amount * (rates['KES'] || 130));
          return sum + txAmountKES;
        }, 0);

      // Velocity Limit Check
      let limitKES = 6500; 
      if (isDeveloper) limitKES = 1300000;
      else if ((userData as any)?.kycVerified || (userData as any)?.isKycVerified) limitKES = 65000; 
          
      if (recentWithdrawalsKES + numAmount > limitKES && !totp && !usePasskey) {
        setScaError(`Daily velocity limit of KES ${limitKES.toLocaleString()} reached with PIN code. If you hit a limit, you MUST 'Authorize with a higher security method' (like a TOTP Code or Passkey) to continue. Authorized limit with Passkeys/TOTP is KES 650,000.`);
      }

      if (!isDeveloper && numAmount > balanceKES) throw new Error("Insufficient reserve for this amount");

      const isQueued = !canWithdrawNow;
      
      let result: any = { success: true, message: isQueued ? "Withdrawal queued for 1st of month" : "Processing..." };

      if (!isQueued) {
        const body = {
          method: payoutMethod,
          amount: numAmount,
          email: payoutEmail,
          bankDetails: payoutMethod === 'bank' ? bankDetails : null,
          userId: currentUser.uid,
          scaToken: pin,
          usePasskey,
          totpCode: totp
        };

        const response = await fetch('/api/payout/international', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        result = await response.json();

        if (result.status === 'SOFT_DECLINE') {
          setScaError(result.message);
          if (result.requiredLevel >= 2 && authMethod === 'pin') {
            setAuthMethod('totp');
          }
          setShowSCAModal(true);
          setScaPendingAction(() => (p: string, up?: boolean, t?: string) => handleInternationalPayout(undefined, p, up, t));
          return;
        }

        if (!result.success) {
          throw new Error(result.message || "Payout initiation failed");
        }
      }

      if (currentUser && db) {
        const txRef = collection(db, 'users', currentUser.uid, 'transactions');
        
        const reference = result.transactionId || `REV-INT-${Date.now()}`;
        const pointsToDeduct = numAmount / 100; // 1g Gold = 100 KES
        
        const txData = {
          amount: numAmount,
          currency: 'KES',
          type: payoutMethod,
          status: isQueued ? 'queued' : 'pending',
          email: payoutEmail,
          bankDetails: payoutMethod === 'bank' ? bankDetails : null,
          timestamp: serverTimestamp(),
          scheduledDate: isQueued ? nextRedemptionDate : null,
          reference,
          details: isQueued ? `Queued for Monthly Batch (${nextRedemptionDate})` : `International ${payoutMethod} payout request`,
          pointsDeducted: pointsToDeduct,
          previousPoints: points,
          remainingPoints: points - pointsToDeduct,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          scaToken: pin,
          usePasskey,
          totpCode: totp
        };

        await addDoc(txRef, txData);

        // Also log to the central withdrawals collection for admin visibility
        await addDoc(collection(db, 'withdrawals'), {
          ...txData,
          userName: userData?.displayName || 'Anonymous',
        }).catch(err => console.error("Central withdrawal logging failed:", err));

        // Deduct balance immediately for the queued amount
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          points: increment(-pointsToDeduct),
          totalWithdrawals: increment(numAmount)
        });

        // Audit Ledger Entry
        await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
          amount: -pointsToDeduct,
          balanceAfter: points - pointsToDeduct,
          type: 'deduction',
          source: 'withdrawal',
          reason: `International Payout (${payoutMethod})`,
          timestamp: serverTimestamp(),
          unit: 'Gold g'
        }).catch(err => console.error("Error logging points ledger:", err));
      }
      
      setSuccess(`International payout request of KES ${numAmount.toLocaleString()} submitted successfully! ${isQueued ? "(Queued for 1st of month)" : ""}`);
      setPayoutAmount("");
      setPayoutEmail("");
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
    setAmount((points * 100).toString());
  };

  const handleWithdrawAllInternational = () => {
    setPayoutAmount((points * 100).toFixed(2));
  };

  const handleSyncWallet = async () => {
    if (!currentUser || !db) return;
    setIsSyncing(true);
    try {
      // 0. Self Update Engine: Flush pending memory points to Firestore before sync
      await syncActiveTimeRewards();

      // 1. Get all ledger entries
      const ledgerSnap = await getDocs(collection(db, 'users', currentUser.uid, 'points_ledger'));
      let totalPoints = 0;
      
      ledgerSnap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'accrual') totalPoints += (data.amount || 0);
        if (data.type === 'deduction' || data.type === 'redemption') totalPoints += (data.amount || 0); // Ledger amounts are negative for deductions
      });

      const calculatedBalanceKes = totalPoints * 100; // KES 100 per 1 g Gold

      // 2. Update user document to match ledger
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: totalPoints,
        balanceKes: calculatedBalanceKes,
        lastSyncAt: serverTimestamp()
      });

      setSuccess(`Wallet synchronized! Found ${totalPoints.toFixed(4)} total g from ledger.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Sync error:", err);
      setError("Failed to sync wallet. Please check connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestorePoints = async () => {
    if (!currentUser || !db || isRecovering) return;
    setIsRecovering(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: 6.337,
        balanceKes: 633.7,
        isPointsRecovered: true,
        isRestoredTo6337: true,
        recoveredAt: serverTimestamp()
      });
      setSuccess("Full balance of 6.337 Gold g successfully restored!");
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
      return `${date.toISOString()},${tx.type},${tx.amount},${tx.currency || 'KES'},${tx.status},${tx.reference}`;
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

  const handlePurgeAuditGhosts = async () => {
    if (!currentUser || !isDeveloper || !db) return;
    if (!window.confirm("This will permanently delete all withdrawal records from your account to fix audit discrepancies. Continue?")) return;
    
    setIsResetting(true);
    try {
      const withdrawalTypes = ['mpesa', 'bank', 'paybill', 'payout'];
      const ghostTxs = transactions.filter(tx => withdrawalTypes.includes(tx.type || ''));
      const { deleteDoc, doc } = await import('firebase/firestore');
      
      for (const tx of ghostTxs) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'transactions', tx.id));
      }
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        totalWithdrawals: 0,
        balanceRestoredAt: serverTimestamp()
      });
      
      setSuccess(`Purged ${ghostTxs.length} ghost transactions. Audit trail cleared.`);
    } catch (err) {
      setError("Failed to purge ghosts.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTesting = async () => {
    if (!currentUser || !db || isResetting) return;
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
    { id: 2, title: 'Gold Predictor', desc: 'Correctly predicted gold movement 5 times.', icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { id: 3, title: 'Community Pillar', desc: 'Received 100+ likes on a single post.', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ];

  return (
    <div className="space-y-8 pb-12 pt-4 px-4 sm:px-6">
      {/* Withdrawal Update Notice */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-indigo-600 dark:bg-indigo-500 border border-indigo-400 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-4 shadow-xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
          <Clock className="w-32 h-32 text-white -rotate-12" />
        </div>
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shrink-0">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div className="relative z-10 text-center md:text-left flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <h3 className="text-base font-black text-white uppercase tracking-wider">On-Demand Payout Cycle</h3>
            <span className="hidden md:block w-1.5 h-1.5 bg-white/50 rounded-full" />
            <span className="text-[10px] font-black text-emerald-100 bg-white/10 px-2 py-0.5 rounded uppercase tracking-widest border border-white/20">Fluid Schedule</span>
          </div>
          <p className="text-xs font-medium text-white/80 max-w-2xl leading-relaxed mb-4">
            Financial integrity maintained through real-time verification. User withdrawals are processed <span className="font-black text-white underline decoration-white/30 underline-offset-4">on-demand</span> with no mandatory monthly waiting period. 
            <span className="block mt-2 font-bold text-indigo-100 italic">Security: Standard velocity limits apply to all immediate disbursements.</span>
          </p>
        </div>
      </motion.div>

      {/* SCA Verification Modal */}
      <AnimatePresence>
        {showSCAModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full relative overflow-hidden"
            >
               {/* Decorative background */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mb-16 blur-2xl" />

               <div className="relative z-10">
                 <div className="flex justify-center mb-6">
                   <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
                     <Lock className="w-8 h-8" />
                   </div>
                 </div>
                 
                 <div className="text-center mb-6">
                   <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Security Protocol</h3>
                   <p className="text-[10px] text-gray-500 mt-2 px-4 font-bold italic">Verification required to authorize withdrawal.</p>
                 </div>

                 {/* Auth Method Toggle */}
                 <div className="flex flex-wrap p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-4 gap-1">
                   <button 
                     onClick={() => { setAuthMethod('pin'); setScaError(null); }}
                     className={cn(
                       "flex-1 py-1.5 px-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all",
                       authMethod === 'pin' ? "bg-white dark:bg-gray-800 text-orange-600 shadow-sm" : "text-gray-400"
                     )}
                   >
                     PIN
                   </button>
                   <button 
                     onClick={() => { setAuthMethod('totp'); setScaError(null); }}
                     className={cn(
                       "flex-1 py-1.5 px-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all",
                       authMethod === 'totp' ? "bg-white dark:bg-gray-800 text-orange-600 shadow-sm" : "text-gray-400"
                     )}
                   >
                     TOTP
                   </button>
                   <button 
                     onClick={() => { setAuthMethod('sms'); setScaError(null); }}
                     className={cn(
                       "flex-1 py-1.5 px-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all",
                       authMethod === 'sms' ? "bg-white dark:bg-gray-800 text-orange-600 shadow-sm" : "text-gray-400"
                     )}
                   >
                     SMS
                   </button>
                   <button 
                     onClick={() => { setAuthMethod('password'); setScaError(null); }}
                     className={cn(
                       "flex-1 py-1.5 px-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all",
                       authMethod === 'password' ? "bg-white dark:bg-gray-800 text-orange-600 shadow-sm" : "text-gray-400"
                     )}
                   >
                     Pass
                   </button>
                   <button 
                     onClick={() => { setAuthMethod('passkey'); setScaError(null); }}
                     className={cn(
                       "flex-1 py-1.5 px-1 text-[7px] font-black uppercase tracking-widest rounded-lg transition-all",
                       authMethod === 'passkey' ? "bg-white dark:bg-gray-800 text-orange-600 shadow-sm" : "text-gray-400"
                     )}
                   >
                     Key
                   </button>
                 </div>

                 {/* Error Display / Velocity Prompt */}
                 {scaError && (
                   <div className={cn(
                     "mb-4 p-3 rounded-xl flex flex-col gap-2 border",
                     scaError.toLowerCase().includes('velocity') 
                       ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30" 
                       : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30"
                   )}>
                      <div className="flex items-center gap-2">
                        {scaError.toLowerCase().includes('velocity') ? (
                          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <p className={cn(
                          "text-[10px] font-bold leading-tight",
                          scaError.toLowerCase().includes('velocity') ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {scaError.toLowerCase().includes('velocity') ? "AUTHORIZE WITH HIGHER SECURITY" : "VERIFICATION ERROR"}
                        </p>
                      </div>
                      <p className={cn(
                        "text-[9px] font-medium leading-tight",
                        scaError.toLowerCase().includes('velocity') ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-400"
                      )}>
                        {scaError}
                      </p>
                   </div>
                 )}

                 <div className="space-y-4">
                   {authMethod === 'pin' ? (
                     <>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <input 
                          type="password"
                          maxLength={8}
                          placeholder="Enter PIN"
                          value={scaToken}
                          onChange={(e) => { setScaToken(e.target.value); setScaError(null); }}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
                          autoFocus
                        />
                      </div>

                      <button 
                        onClick={() => {
                           if (!scaToken) return;
                           if (scaPendingAction) scaPendingAction(scaToken, false);
                           setShowSCAModal(false);
                           setScaPendingAction(null);
                           setScaToken("");
                           setScaError(null);
                        }}
                        disabled={scaToken.length < 4}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 active:scale-95 disabled:opacity-50"
                      >
                        Authorize with PIN
                      </button>
                     </>
                   ) : authMethod === 'totp' ? (
                     <>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <input 
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6-digit TOTP"
                            value={totpCode}
                            onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '')); setScaError(null); }}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            autoFocus
                          />
                        </div>

                        <button 
                          onClick={() => {
                             if (totpCode.length !== 6) return;
                             if (scaPendingAction) scaPendingAction("", false, totpCode);
                             setShowSCAModal(false);
                             setScaPendingAction(null);
                             setTotpCode("");
                             setScaError(null);
                          }}
                          disabled={totpCode.length !== 6}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                        >
                          Authorize with TOTP
                        </button>
                     </>
                   ) : authMethod === 'sms' ? (
                     <>
                        <div className="space-y-3">
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <input 
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="SMS Code"
                              value={smsCode}
                              onChange={(e) => { setSmsCode(e.target.value.replace(/\D/g, '')); setScaError(null); }}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
                              autoFocus
                            />
                          </div>

                          <button 
                            type="button"
                            onClick={async () => {
                              const pNum = userData?.phoneNumber || (userData as any)?.phone;
                              if (!pNum) {
                                setScaError("No phone number linked. Please add in Settings.");
                                return;
                              }
                              setIsSendingSms(true);
                              try {
                                const resp = await fetch('/api/otp/send', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ 
                                    userId: currentUser?.uid, 
                                    phoneNumber: pNum, 
                                    method: 'sms' 
                                  })
                                });
                                const data = await resp.json();
                                if (!data.success) throw new Error(data.error);
                                if (data.devOtp) {
                                  setScaError(`[PREVIEW] SMS Code: ${data.devOtp}`);
                                } else {
                                  setScaError("Code sent successfully!");
                                }
                              } catch (e: any) {
                                setScaError(e.message);
                              } finally {
                                setIsSendingSms(false);
                              }
                            }}
                            disabled={isSendingSms}
                            className="w-full text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 py-1"
                          >
                            {isSendingSms ? "Sending..." : "Send SMS Code"}
                          </button>

                          <button 
                            onClick={async () => {
                               if (smsCode.length !== 6) return;
                               setIsPasskeyAuthenticating(true);
                               try {
                                 const resp = await fetch('/api/otp/verify', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ 
                                     userId: currentUser?.uid, 
                                     otp: smsCode,
                                     email: currentUser?.email 
                                   })
                                 });
                                 const data = await resp.json();
                                 if (!data.success) throw new Error(data.error || "Invalid code");
                                 
                                 if (scaPendingAction) scaPendingAction("", false, smsCode);
                                 setShowSCAModal(false);
                                 setScaPendingAction(null);
                                 setSmsCode("");
                                 setScaError(null);
                               } catch (e: any) {
                                 setScaError(e.message);
                               } finally {
                                 setIsPasskeyAuthenticating(false);
                               }
                            }}
                            disabled={smsCode.length !== 6 || isPasskeyAuthenticating}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                          >
                            {isPasskeyAuthenticating ? "Verifying..." : "Authorize with SMS"}
                          </button>
                        </div>
                     </>
                   ) : authMethod === 'password' ? (
                     <>
                        <div className="space-y-4">
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                              <Lock className="w-5 h-5" />
                            </div>
                            <input 
                              type="password"
                              placeholder="Account Password"
                              value={passwordInput}
                              onChange={(e) => { setPasswordInput(e.target.value); setScaError(null); }}
                              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm"
                              autoFocus
                            />
                          </div>

                          <button 
                            onClick={async () => {
                               if (!passwordInput) return;
                               setIsPasskeyAuthenticating(true);
                               try {
                                 const resp = await fetch('/api/auth/verify-password', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ 
                                     userId: currentUser?.uid, 
                                     email: currentUser?.email,
                                     password: passwordInput 
                                   })
                                 });
                                 const data = await resp.json();
                                 if (!data.success) throw new Error(data.error || "Incorrect password");
                                 
                                 if (scaPendingAction) scaPendingAction("", false, "password-verified");
                                 setShowSCAModal(false);
                                 setScaPendingAction(null);
                                 setPasswordInput("");
                                 setScaError(null);
                               } catch (e: any) {
                                 setScaError(e.message);
                               } finally {
                                 setIsPasskeyAuthenticating(false);
                               }
                            }}
                            disabled={!passwordInput || isPasskeyAuthenticating}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
                          >
                            {isPasskeyAuthenticating ? "Checking..." : "Authorize with Password"}
                          </button>
                        </div>
                     </>
                   ) : (
                     <div className="text-center space-y-4 py-2">
                        {userData?.passkeyRegistered ? (
                          <>
                             <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 mx-auto">
                               <ShieldCheck className="w-6 h-6" />
                             </div>
                             <p className="text-[10px] text-gray-500 font-medium leading-tight px-4">Verify identity via your device biometrics.</p>
                             <button
                               onClick={async () => {
                                 if (!currentUser) return;
                                 setIsPasskeyAuthenticating(true);
                                 setScaError(null);
                                 try {
                                   if (isIframe() && !window.PublicKeyCredential) {
                                     throw new Error(getPasskeyErrorLinkMessage());
                                   }
                                   const resp = await fetch('/api/auth/passkey/generate-authentication-options', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ userId: currentUser.uid }),
                                   });
                                   const options = await resp.json();
                                   if (options.error) throw new Error(options.error);
                                   
                                   const authResp = await (window as any).SimpleWebAuthnBrowser.startAuthentication(options);
                                   
                                   const verifyResp = await fetch('/api/auth/passkey/verify-authentication', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ userId: currentUser.uid, response: authResp }),
                                   });
                                   const verification = await verifyResp.json();
                                   if (verification.verified) {
                                      setShowSCAModal(false);
                                      if (scaPendingAction) scaPendingAction("", true);
                                      setScaPendingAction(null);
                                      setAuthMethod('pin');
                                   } else {
                                     throw new Error(verification.error || "Verification failed");
                                   }
                                 } catch (e: any) {
                                   if (e.name === 'SecurityError' || e.message?.includes('feature is not enabled')) {
                                     setScaError("🔒 PREVIEW BLOCKED: Passkeys cannot be used inside this frame. Please click 'Open in New Tab' at the top of AI Studio.");
                                   } else {
                                     setScaError(e.message);
                                   }
                                 } finally {
                                   setIsPasskeyAuthenticating(false);
                                 }
                               }}
                               disabled={isPasskeyAuthenticating}
                               className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                             >
                               {isPasskeyAuthenticating ? "Checking..." : "Use Passkey"}
                             </button>
                          </>
                        ) : (
                          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20">
                            <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                            <p className="text-[10px] text-amber-800 dark:text-amber-200 font-bold">PASSKEY NOT REGISTERED</p>
                            <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-tighter">Enable passkeys in Settings</p>
                          </div>
                        )}
                     </div>
                   )}
                 </div>
                   <button 
                     onClick={() => {
                       setShowSCAModal(false);
                       setScaToken("");
                       setScaPendingAction(null);
                       setIsPasskeyAuthenticating(false);
                       setPasswordInput("");
                       setSmsCode("");
                     }}
                     className="w-full py-3 bg-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[10px] font-black uppercase tracking-widest transition-colors"
                   >
                     Cancel Operation
                   </button>

                 <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-center gap-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                   <ShieldCheck className="w-3 h-3 text-green-500" />
                   Military Grade Port Guard v5.0
                 </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl max-w-xl mx-auto overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'overview' ? "bg-white dark:bg-gray-700 text-yellow-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Layers className="w-4 h-4" />
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
          <span>Withdrawals</span>
        </button>
        <button 
          onClick={() => setActiveTab('international')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'international' ? "bg-white dark:bg-gray-700 text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>Binance & Global</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center space-x-2 whitespace-nowrap",
            activeTab === 'history' ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>History</span>
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

            <div className="rounded-3xl p-8 text-white shadow-lg relative overflow-hidden bg-gradient-to-br from-yellow-500 to-amber-600">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span className="text-white/80 font-medium uppercase tracking-wider mb-2">
                  Live Account Balance & Accumulation
                </span>
                <div className="text-6xl font-black mb-1 flex items-center gap-2">
                  {points.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Gold g
                </div>
                <div className="text-xl font-bold text-white/90 mb-2">
                  ≈ KES {balanceKES.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm font-bold text-white/70 mb-4">
                  US$ {(userData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xl font-bold opacity-95 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-300" />
                  Earning Mode: Active
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
                      onClick={handlePurgeAuditGhosts}
                      disabled={isResetting}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all border border-white/30 active:scale-95 text-emerald-100"
                    >
                      <ShieldOff className="w-3 h-3 mr-2 text-emerald-500" />
                      Clear Ghosts
                    </button>
                  )}

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
                      {isRecovering ? 'Restoring...' : 'Restore 6.337 Gold g'}
                    </button>
                  )}
                </div>

                <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6 font-mono text-[9px] uppercase tracking-tighter">
                  <div className="flex justify-between items-center text-white/80 border-b border-white/10 pb-2 mb-2">
                    <span>Audit Trail Verification</span>
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span>Lifetime Earned:</span>
                    <span className="font-black">+{convert(userAuditTotals.totalEarned)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1 text-red-100">
                    <span>Total Liquidated:</span>
                    <span className="font-black">-{convert(userAuditTotals.totalWithdrawn)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10 text-white font-black">
                    <span>Current Available:</span>
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
                    <p className="text-lg font-black text-white">Instant</p>
                    <p className="text-[10px] text-white/60">
                      Real-time On-Demand Processing
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
                      <span className="text-xs font-bold uppercase tracking-widest text-white">
                        {isIdle ? "Idle Mode" : "Reward Accumulation Active"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-white/70">
                      {Math.floor(activeSeconds / 60)}m {activeSeconds % 60}s active
                    </span>
                  </div>
                  <div className="flex justify-between items-end text-white">
                    <div>
                      <p className="text-[10px] opacity-70 uppercase font-bold">Earned Today</p>
                      <p className="text-xl font-black">{totalEarnedToday} <span className="text-xs font-normal opacity-70">Gold g</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70 uppercase font-bold">Current Reserve</p>
                      <p className="text-sm font-bold">KES {balanceKES.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setActiveTab('local')}
                    className="bg-white text-amber-700 hover:bg-yellow-50 px-8 py-3 rounded-full font-bold shadow-md transition-all flex-1"
                  >
                    Withdraw Funds
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
                  <strong>2. Exclusions:</strong> Membership level benefits do <strong>not</strong> apply to Ads revenue (fixed 50/50 split).
                  <br/><br/>
                  <strong>3. Platform Payments:</strong> To ensure the long-term sustainability of our high-performance AI infrastructure, all direct platform payments—including Advanced AI Lab access, Event tickets, and Marketplace transactions—belong 100% to the platform treasury. Specialized revenue from Education Hub course enrollments and AI training follow an 80/20 split (80% platform, 20% user reward).
                  <br/><br/>
                  <strong>4. Rewards & Withdrawals:</strong> All earnings are processed in real-time on-demand. You can initiate your withdrawal at any time, and it will be settled instantly.
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
                      <div className="font-bold text-gray-900 dark:text-white">KES {((50.00 * 130)).toLocaleString()}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20">
                      <div className="text-red-500 mb-1 flex items-center"><Landmark className="w-3 h-3 mr-1"/> Tax Withheld (16%)</div>
                      <div className="font-bold text-red-600 dark:text-red-400">-KES {((8.00 * 130)).toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/20">
                      <div className="text-green-600 mb-1">Net Payout</div>
                      <div className="font-bold text-green-700 dark:text-green-400">KES {((42.00 * 130)).toLocaleString()}</div>
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
                    <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">Local Wallet Balance (Gold g)</p>
                    <h2 className="text-5xl font-black tracking-tighter">
                      {points.toLocaleString(undefined, { minimumFractionDigits: 4 })} Gold g
                    </h2>
                    <div className="flex items-center space-x-2 text-blue-100 text-sm">
                      <ShieldCheck className="w-4 h-4" />
                      <span>≈ KES {balanceKES.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Withdrawal Value</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">G</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={amount ? (parseFloat(amount) / 100).toFixed(4) : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAmount(val ? (parseFloat(val) * 100).toString() : "");
                          }}
                          className="w-full pl-10 pr-16 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setAmount((points * 100).toString())}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Max
                        </button>
                      </div>
                      {amount && (
                        <p className="text-[10px] font-bold text-blue-500 px-2">
                          ≈ KES {parseFloat(amount).toLocaleString()} will be disbursed
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
                          key={`activity-${tx.id}`}
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
                                  {tx.currency === 'G' ? 'G ' : 'KES '} 
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
        ) : activeTab === 'international' ? (
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
                        <p className="text-purple-100 font-bold uppercase tracking-widest text-xs">International Payouts (Gold g)</p>
                        <h2 className="text-5xl font-black tracking-tighter">
                          {points.toLocaleString(undefined, { minimumFractionDigits: 4 })} Gold g
                        </h2>
                        <div className="flex items-center space-x-2 text-purple-100 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>≈ KES {balanceKES.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6">
                    <p className="text-amber-800 dark:text-amber-200 text-sm font-bold">
                      ⚠️ Minimum international withdrawal is KES 1,300.
                    </p>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-purple-500" />
                    <span>Select Payout Method</span>
                  </h3>

                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { id: 'binance', label: 'Binance (Direct)', icon: Database, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10' },
                      { id: 'paypal', label: 'PayPal', icon: Gem, color: 'border-blue-100 hover:border-blue-200' },
                      { id: 'stripe', label: 'Stripe', icon: CreditCard, color: 'border-indigo-100 hover:border-indigo-200' },
                      { id: 'bank', label: 'SWIFT Bank', icon: Landmark, color: 'border-gray-100 hover:border-purple-200' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPayoutMethod(method.id as any)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 relative overflow-hidden group",
                          payoutMethod === method.id 
                            ? (method.id === 'binance' ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400")
                            : cn("text-gray-500 dark:border-gray-700", method.color)
                        )}
                      >
                        {method.id === 'binance' && (
                          <div className="absolute -top-1 -right-1">
                               <div className="bg-amber-500 text-[8px] font-black text-white px-2 py-1 rounded-bl-lg transform rotate-2">BETA</div>
                          </div>
                        )}
                        <method.icon className={cn("w-6 h-6", payoutMethod === method.id && "scale-110 transition-transform")} />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  {payoutMethod === 'binance' && (
                    <div className="mb-6 p-4 bg-amber-500/5 rounded-2xl border border-dashed border-amber-500/20">
                      <h4 className="text-sm font-black text-amber-600 uppercase tracking-tight mb-1">Binance Gateway Active</h4>
                      <p className="text-[10px] text-amber-600/70 font-bold uppercase tracking-widest leading-relaxed">
                        Funds are dispatched directly via Binance API. Ensure your Binance Wallet Address is correct and supports {binanceCoin} on the {binanceNetwork} network to avoid fund loss.
                      </p>
                    </div>
                  )}

                  <form onSubmit={payoutMethod === 'binance' ? handleBinanceWithdraw : handleInternationalPayout} className="space-y-6">
                    {payoutMethod === 'binance' ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {binanceCoin === 'PAXG' && paxgBtcRate && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl flex items-center justify-between mb-4 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none mb-1">Real-time Trading Pair</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">PAXG / BTC</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{paxgBtcRate.toFixed(8)}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Binance Market Depth</p>
                            </div>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Asset</label>
                             <div className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-amber-500/10 rounded-2xl text-gray-900 dark:text-white font-black shadow-sm flex items-center justify-between">
                               <span>PAX Gold (PAXG)</span>
                               <Gem className="w-4 h-4 text-amber-500" />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Network</label>
                             <select 
                               value={binanceNetwork}
                               onChange={(e) => setBinanceNetwork(e.target.value)}
                               className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all text-gray-900 dark:text-white font-medium shadow-sm"
                             >
                               <option value="ETH">ERC20 (Ethereum)</option>
                               <option value="BSC">BEP20 (Binance Smart Chain)</option>
                             </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Binance Wallet Address</label>
                          <div className="relative">
                            <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              placeholder={`Paste your Binance ${binanceCoin} address here`}
                              value={binanceAddress}
                              onChange={(e) => setBinanceAddress(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all text-gray-900 dark:text-white font-mono text-xs shadow-sm"
                            />
                          </div>
                          
                          <div className={cn(
                            "p-4 rounded-2xl flex items-start gap-4",
                            error?.includes("Binance API keys not configured") 
                              ? "bg-red-500/10 border border-red-500/20" 
                              : "bg-amber-500/5 border border-amber-500/10"
                          )}>
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                              <ShieldAlert className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest">Binance Status</p>
                               <p className="text-sm font-bold text-amber-600">{binanceBalance ? "Node Connected" : "Connection Pending"}</p>
                               {error?.includes("Binance API keys not configured") && (
                                 <p className="text-[10px] text-red-500 font-bold mt-1">
                                   Please add BINANCE_API_KEY and BINANCE_API_SECRET to your App Secrets (top-right gear icon) to enable real payouts.
                                 </p>
                               )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => checkBinanceAssetBalance(binanceCoin)}
                              disabled={isCheckingBinanceBalance}
                              className="ml-auto px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                            >
                              {isCheckingBinanceBalance ? 'Syncing...' : 'Check Balance'}
                            </button>
                          </div>
                          
                          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest px-2">Ensure network ({binanceNetwork}) matches the address to avoid losing funds.</p>
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
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount ({payoutMethod === 'binance' ? 'Gold Value' : 'KES'})</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{payoutMethod === 'binance' ? '$' : 'KES'}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          className="w-full pl-10 pr-16 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 transition-all text-gray-900 dark:text-white font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setPayoutAmount(payoutMethod === 'binance' ? (userData?.balance || 0).toString() : balanceKES.toFixed(2))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-md hover:bg-amber-100 transition-colors"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                        Value: {payoutAmount ? convert(parseFloat(payoutAmount), payoutMethod === 'binance' ? 'USD' : 'KES') : convert(0)}
                      </p>
                      {payoutMethod === 'binance' && binanceCoin === 'PAXG' && paxgPrice && (
                        <div className="mt-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-1">
                          <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex justify-between">
                            <span>Est. PAXG Quantity:</span>
                            <span>{(parseFloat(payoutAmount || '0') / paxgPrice).toFixed(6)} PAXG</span>
                          </p>
                          {paxgBtcRate && (
                            <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex justify-between">
                              <span>Est. BTC Value (PAXG/BTC):</span>
                              <span>{((parseFloat(payoutAmount || '0') / paxgPrice) * paxgBtcRate).toFixed(8)} BTC</span>
                            </p>
                          )}
                        </div>
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
                      disabled={isLoading || (!canWithdrawNow && !isDeveloper)}
                      className={cn(
                        "w-full py-4 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2 shadow-lg",
                        payoutMethod === 'binance' ? "bg-amber-500 shadow-amber-500/20" : "bg-purple-600 shadow-purple-500/20"
                      )}
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
                        <span>{payoutMethod === 'binance' ? `Withdraw ${binanceCoin} to Binance` : 'Request International Payout'}</span>
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
                      <span>Processing time: Instant (On-Demand)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Minimum withdrawal: KES 1,300 (~13 Gold g)</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
                      <span>Transaction fees may apply depending on the provider</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center py-20">
               <Clock className="w-16 h-16 text-gray-200 mb-6" />
               <h3 className="text-2xl font-black text-gray-900 dark:text-white">Transaction History</h3>
               <p className="text-gray-500 max-w-sm mt-2">See your full activity log on the Overview tab under Audit Trail.</p>
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
                    <Layers className="w-5 h-5 mr-3 flex-shrink-0 text-yellow-500" />
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase tracking-widest">Minimum Threshold</p>
                      <p className="text-sm font-medium">{convert(100)} minimum required</p>
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
