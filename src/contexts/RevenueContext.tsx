import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RevenueContextType {
  isIdle: boolean;
  setIsIdle: (val: boolean) => void;
  pointsLocked: boolean;
  activeSeconds: number;
  totalEarnedToday: number;
  addRevenue: (userAmount: number, platformAmount: number, reason: string, source: 'ad' | 'education' | 'active_time' | 'dating' | 'community' | 'events') => Promise<void>;
  addPlatformRevenue: (amount: number, reason: string) => Promise<void>;
  addPlatformExpense: (amount: number, reason: string) => Promise<void>;
  deductBalance: (amount: number, reason: string) => Promise<boolean>;
  syncActiveTimeRewards: () => Promise<void>;
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined);

export const useRevenue = () => {
  const context = useContext(RevenueContext);
  if (!context) throw new Error('useRevenue must be used within a RevenueProvider');
  return context;
};

export const RevenueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const [isIdle, setIsIdle] = useState(false);
  const [pointsLocked, setPointsLocked] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);
  
  // Self-Update Engine: Batched Synchronization
  const pendingUserPointsRef = useRef(0);
  const pendingUserValueRef = useRef(0);
  const pendingPlatformValueRef = useRef(0);
  const lastSyncRef = useRef<number>(Date.now());
  const lastBehaviorCheckRef = useRef<number>(0);
  
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const earningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userDataRef = useRef(userData);

  // Keep ref in sync
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);
  
  const [idleThreshold, setIdleThreshold] = useState(() => {
    const saved = localStorage.getItem('pulse_idle_threshold');
    return saved ? parseInt(saved) : 300000; // Default 5 mins
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('pulse_idle_threshold');
      if (saved) setIdleThreshold(parseInt(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('pulse-idle-threshold-update', handleStorageChange as any);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pulse-idle-threshold-update', handleStorageChange as any);
    };
  }, []);

  const IDLE_THRESHOLD = idleThreshold;
  const EARNING_INTERVAL = 30000; // Check every 30s locally
  const SYNC_INTERVAL = 300000; // Sync to DB every 5 mins
  const ACTIVE_GOLD_PER_INTERVAL = 2; // 2mg gold per 30s
  const GOLD_PRICE_USD = 80; // $80 per 1g gold (approx)

  const monitorBehaviorWithAI = async () => {
    if (!currentUser || isAnalyzingBehavior || Date.now() - lastBehaviorCheckRef.current < 60000) return;
    
    setIsAnalyzingBehavior(true);
    lastBehaviorCheckRef.current = Date.now();
    
    try {
      const { generateContentWithRetry } = await import('../lib/ai');
      const { saveInsight } = await import('../lib/insights');
      
      const stats = {
        activeSeconds,
        earnedToday: totalEarnedToday,
        idleTime: isIdle ? Date.now() - (lastSyncRef.current - IDLE_THRESHOLD) : 0,
        platformStats: {
          totalUsers: 1000 
        }
      };

      const prompt = `Analyze user behavioral pattern for Pulse Feeds platform (Gold-Based Economy). 
      User ID: ${currentUser.uid}
      Session Persistence: ${activeSeconds}s
      Gold Accrual (mg): ${totalEarnedToday}
      Idle Status: ${isIdle}
      
      If the user is idle for more than 10 minutes OR has accrued more than 500mg gold in one session without movement, recommend [LOCKOUT].
      Otherwise return [STABLE].`;

      const result = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const responseText = result.text || "";
      
      if (responseText.includes("[LOCKOUT]")) {
        setPointsLocked(true);
        const insight = responseText.replace("[LOCKOUT]", "").trim();
        await saveInsight('user', 'security', `AI Lockout: ${insight || "Potential idle point farming detected."}`);
        console.log("[AI Behavior] Points Locked due to inactivity/pattern detection.");
      } else {
        setPointsLocked(false);
      }
    } catch (err) {
      console.error("Behavior analysis failed:", err);
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const syncPendingToFirestore = async () => {
    if (!currentUser || !db || pendingUserPointsRef.current <= 0 || pointsLocked) return;
    
    const userPts = pendingUserPointsRef.current;
    const userVal = pendingUserValueRef.current;
    const platVal = pendingPlatformValueRef.current;
    const totalVal = userVal + platVal;
    
    // Reset counters before async call to prevent race conditions
    pendingUserPointsRef.current = 0;
    pendingUserValueRef.current = 0;
    pendingPlatformValueRef.current = 0;
    lastSyncRef.current = Date.now();

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const statsRef = doc(db, 'platform', 'stats');

      await updateDoc(userRef, {
        points: increment(userPts),
        balance: increment(userVal),
        activeTimeRevenue: increment(userVal)
      });

      // User-specific Points Ledger
      await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
        amount: userPts,
        balanceAfter: (userDataRef.current?.points || 0) + userPts,
        type: 'accrual',
        source: 'active_time',
        reason: 'Activity Reward (Engine Sync)',
        timestamp: serverTimestamp()
      }).catch(() => {});

      // LOG TRANSACTION
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: userVal,
        currency: 'GOLD',
        type: 'earning',
        source: 'active_time',
        status: 'success',
        timestamp: serverTimestamp(),
        reference: `ACTV-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
        details: 'Active Engagement Rewards (Batched)',
        pointsAdded: userPts,
        remainingPoints: (userDataRef.current?.points || 0) + userPts
      }).catch(() => {});

      await updateDoc(statsRef, {
        platformRevenue: increment(totalVal),
        platformShare: increment(platVal),
        totalUserBalances: increment(userVal),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(() => {});

      await addDoc(collection(db, 'platform_transactions'), {
        type: 'revenue',
        source: 'active_time',
        userAmount: userVal,
        platformAmount: platVal,
        totalAmount: totalVal,
        reason: "Active Usage Rewards (Engine Sync)",
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(() => {});

      console.log(`[Self-Update] Successfully synced batched rewards: ${userPts} mg (${userVal.toFixed(4)} G)`);
  } catch (error) {
    console.error("[Self-Update] Sync failure, restoring pending values:", error);
    // Restore if failed
    pendingUserPointsRef.current += userPts;
    pendingUserValueRef.current += userVal;
    pendingPlatformValueRef.current += platVal;
  }
};

const addRevenue = async (userGold: number, platformGold: number, reason: string, source: 'ad' | 'education' | 'active_time' | 'dating' | 'community' | 'events') => {
  if (!currentUser) return;
  try {
    // 1. Try to log via Server API for authoritative split logic and safety
    const totalGold = userGold + platformGold;
    // Log as gold grams
    const response = await fetch('/api/revenue/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        totalAmount: totalGold,
        source,
        reason,
        currency: 'GOLD'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[API Revenue] Success: User Earned ${result.userAmount}g Gold, Platform Earned ${result.platformAmount}g Gold`);
      setTotalEarnedToday(prev => prev + (result.pointsAdded || 0));
      return;
    }

    console.warn("[API Revenue] Server log failed, falling back to client-side direct Firestore update.");

    if (!db) {
      console.warn("Firestore not available for revenue fallback logging.");
      return;
    }

    // 2. Fallback to direct Firestore if API fails
    const userRef = doc(db, 'users', currentUser.uid);
    const statsRef = doc(db, 'platform', 'stats');

    // 1000 mg = 1.00 g. 
    const pointsToAddMg = userGold > 0 ? Math.max(1, Math.floor(userGold * 1000)) : 0;
    
    // Update User Data with specific revenue source tracking
    const updateData: any = {
      points: increment(pointsToAddMg),
      balance: increment(userGold)
    };

    if (source === 'ad') updateData.adRevenue = increment(userGold);
    if (source === 'education') updateData.educationRevenue = increment(userGold);
    if (source === 'active_time') updateData.activeTimeRevenue = increment(userGold);
    if (source === 'dating') updateData.datingRevenue = increment(userGold);
    if (source === 'community') updateData.communityRevenue = increment(userGold);
    if (source === 'events') updateData.eventsRevenue = increment(userGold);
    
    await updateDoc(userRef, updateData);

    // User-specific Points Ledger (Full Audit Trail)
    await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
      amount: pointsToAddMg,
      balanceAfter: (userDataRef.current?.points || 0) + pointsToAddMg,
      type: 'accrual',
      source: source,
      reason,
      timestamp: serverTimestamp(),
      unit: 'mg'
    }).catch(err => console.error("Error logging points ledger:", err));

    // User-specific Transaction History (UI Audit Trail)
    await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
      amount: userGold,
      currency: 'GOLD',
      type: 'earning',
      source: source,
      status: 'success',
      timestamp: serverTimestamp(),
      reference: `GLD-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
      details: reason,
      pointsAdded: pointsToAddMg,
      remainingPoints: (userDataRef.current?.points || 0) + pointsToAddMg
    }).catch(err => console.error("Error logging user transaction:", err));

      // Update Platform Stats (Platform Share & Total User Balances)
      await updateDoc(statsRef, {
        platformRevenue: increment(userGold + platformGold),
        platformShare: increment(platformGold),
        totalUserBalances: increment(userGold),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(async (err) => {
        // If document doesn't exist, create it (though it should exist)
        if (err.message.includes('not-found')) {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(statsRef, {
            platformRevenue: userGold + platformGold,
            platformShare: platformGold,
            totalUserBalances: userGold,
            serverSecret: "pulse-feeds-server-secret-2026"
          });
        }
      });

      // Log Platform Transaction
      await addDoc(collection(db, 'platform_transactions'), {
        type: 'revenue',
        source: source,
        userAmount: userGold,
        platformAmount: platformGold,
        totalAmount: userGold + platformGold,
        reason,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      setTotalEarnedToday(prev => prev + pointsToAddMg);
      console.log(`Added revenue: User ${userGold}g (${pointsToAddMg} mg), Platform ${platformGold}g for ${reason}`);
    } catch (error) {
      console.error("Error adding revenue:", error);
    }
  };

  const addPlatformRevenue = async (amount: number, reason: string) => {
    if (!db) return;
    try {
      const statsRef = doc(db, 'platform', 'stats');
      await updateDoc(statsRef, {
        platformRevenue: increment(amount),
        platformShare: increment(amount),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(async (err) => {
        if (err.message.includes('not-found')) {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(statsRef, {
            platformRevenue: amount,
            platformShare: amount,
            serverSecret: "pulse-feeds-server-secret-2026"
          });
        }
      });

      // Log Platform Transaction
      await addDoc(collection(db, 'platform_transactions'), {
        type: 'platform_revenue',
        source: 'platform',
        userAmount: 0,
        platformAmount: amount,
        totalAmount: amount,
        reason,
        userId: 'system',
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      console.log(`Added Platform Revenue: ${amount} G for ${reason} (100% Platform Share)`);
    } catch (error) {
      console.error("Error adding platform revenue:", error);
    }
  };

  const addPlatformExpense = async (amount: number, reason: string) => {
    if (!db) return;
    try {
      const statsRef = doc(db, 'platform', 'stats');
      await updateDoc(statsRef, {
        platformShare: increment(-amount),
        serverSecret: "pulse-feeds-server-secret-2026"
      });

      // Log Platform Transaction
      await addDoc(collection(db, 'platform_transactions'), {
        type: 'expense',
        source: 'platform',
        userAmount: 0,
        platformAmount: -amount,
        totalAmount: -amount,
        reason,
        userId: 'system',
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      console.log(`Logged Platform Expense: ${amount} G for ${reason}`);
    } catch (error) {
      console.error("Error logging platform expense:", error);
    }
  };

  const deductBalance = async (gramsGold: number, reason: string): Promise<boolean> => {
    if (!currentUser || !db) return false;
    try {
      if ((userData?.balance || 0) < gramsGold) return false;

      const userRef = doc(db, 'users', currentUser.uid);
      const mgToDeduct = Math.floor(gramsGold * 1000);

      await updateDoc(userRef, {
        balance: increment(-gramsGold),
        points: increment(-mgToDeduct)
      });

      // Log Transaction
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: -gramsGold,
        currency: 'GOLD',
        type: 'expense',
        source: 'purchase',
        status: 'success',
        timestamp: serverTimestamp(),
        reference: `GLD-EXP-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
        details: reason,
        pointsDeducted: mgToDeduct,
        remainingPoints: (userData?.points || 0) - mgToDeduct
      });

      return true;
    } catch (err) {
      console.error("Error deducting gold balance:", err);
      return false;
    }
  };

  const resetIdleTimer = () => {
    setIsIdle(false);
    setPointsLocked(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_THRESHOLD);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer));
    resetIdleTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentUser && !isIdle && !pointsLocked) {
      earningIntervalRef.current = setInterval(() => {
        if (pointsLocked) return;
        
        // Accumulate locally
        const userMg = Math.floor(ACTIVE_GOLD_PER_INTERVAL);
        const userGold = userMg / 1000;
        const platGold = (0.5 * ACTIVE_GOLD_PER_INTERVAL) / 1000; // Platform takes 50% extra from air

        pendingUserPointsRef.current += userMg;
        pendingUserValueRef.current += userGold;
        pendingPlatformValueRef.current += platGold;

        setTotalEarnedToday(prev => prev + userMg);
        console.log(`[Self-Update] Pending Gold: ${pendingUserPointsRef.current} mg. Sync in ${Math.round((SYNC_INTERVAL - (Date.now() - lastSyncRef.current)) / 1000)}s`);

        // Check if it's time to sync
        if (Date.now() - lastSyncRef.current >= SYNC_INTERVAL) {
          syncPendingToFirestore();
        }
      }, EARNING_INTERVAL);
    } else {
      if (earningIntervalRef.current) clearInterval(earningIntervalRef.current);
      // Sync on idle or logout
      if (pendingUserPointsRef.current > 0) {
        syncPendingToFirestore();
      }
    }

    return () => {
      if (earningIntervalRef.current) clearInterval(earningIntervalRef.current);
    };
  }, [currentUser, isIdle]);

  // Track active seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isIdle) {
        setActiveSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isIdle]);

  useEffect(() => {
    if (isIdle && currentUser) {
      monitorBehaviorWithAI();
    }
  }, [isIdle, currentUser]);

  return (
    <RevenueContext.Provider value={{ isIdle, setIsIdle, pointsLocked, activeSeconds, totalEarnedToday, addRevenue, addPlatformRevenue, addPlatformExpense, deductBalance, syncActiveTimeRewards: syncPendingToFirestore }}>
      {children}
    </RevenueContext.Provider>
  );
};
