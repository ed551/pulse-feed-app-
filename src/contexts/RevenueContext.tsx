import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { apiFetch } from '../lib/api';

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
  const ACTIVE_POINTS_PER_INTERVAL = 0.016; // 0.016 PAXG per 30s
  
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

      const prompt = `Analyze user behavioral pattern for Pulse Feeds platform (PAXG-Based Economy). 
      User ID: ${currentUser.uid}
      Session Persistence: ${activeSeconds}s
      PAXG Accrual: ${totalEarnedToday} PAXG
      Idle Status: ${isIdle}
      
      If the user is idle for more than 10 minutes OR has accrued more than 0.1 PAXG in one session without movement, recommend [LOCKOUT].
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

  useEffect(() => {
    if (currentUser && db && userData && !pointsLocked) {
      const expectedPoints = (userData.balance || 0) * 1.3;
      const currentPoints = userData.points || 0;
      const diff = Math.abs(expectedPoints - currentPoints);
      
      // If discrepancy > 0.01 g (minimal) and not recently synced, heal it
      if (diff > 0.01) {
        console.log(`[Self-Healing] Syncing points to balance: ${currentPoints} -> ${expectedPoints}`);
        const userRef = doc(db, 'users', currentUser.uid);
        updateDoc(userRef, {
          points: expectedPoints
        }).catch(err => console.error("Self-healing failed:", err));
      }
    }
  }, [userData?.balance, currentUser?.uid]);

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

      // These values are already in USD from the accumulation loop
      const userValUsd = userVal;
      const platValUsd = platVal;
      const totalValUsd = userValUsd + platValUsd;

      await updateDoc(userRef, {
        points: increment(userPts),
        balance: increment(userValUsd),
        activeTimeRevenue: increment(userValUsd)
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
        amount: userValUsd,
        currency: 'USD',
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
        platformRevenue: increment(totalValUsd),
        platformShare: increment(platValUsd),
        totalUserBalances: increment(userValUsd),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(() => {});

      await addDoc(collection(db, 'platform_transactions'), {
        type: 'revenue',
        source: 'active_time',
        userAmount: userValUsd,
        platformAmount: platValUsd,
        totalAmount: totalValUsd,
        unit: 'USD',
        reason: "Active Usage Rewards (Engine Sync)",
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(() => {});

      console.log(`[Self-Update] Successfully synced batched rewards: ${userPts} Points ($${userValUsd.toFixed(4)})`);
  } catch (error) {
    console.error("[Self-Update] Sync failure, restoring pending values:", error);
    // Restore if failed
    pendingUserPointsRef.current += userPts;
    pendingUserValueRef.current += userVal;
    pendingPlatformValueRef.current += platVal;
  }
};

const addRevenue = async (userUsdAmount: number, platformUsdAmount: number, reason: string, source: 'ad' | 'education' | 'active_time' | 'dating' | 'community' | 'events') => {
  if (!currentUser) return;
  try {
    // 1. Try to log via Server API for authoritative split logic and safety
    const totalUsd = userUsdAmount + platformUsdAmount;

    // Log as USD
    const response = await apiFetch('/api/revenue/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        totalAmount: totalUsd,
        source,
        reason,
        currency: 'USD'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[API Revenue] Success: User Earned ${result.pointsAdded} Points, Platform Share Logged.`);
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

    // PAXG economy logic (0.01 PAXG = 1 KES context fallback)
    const pointsToAdd = userUsdAmount > 0 ? Math.max(0.001, userUsdAmount * 1.3) : 0;
    
    // Update User Data with specific revenue source tracking
    const updateData: any = {
      points: increment(pointsToAdd),
      balance: increment(userUsdAmount)
    };

    if (source === 'ad') updateData.adRevenue = increment(userUsdAmount);
    if (source === 'education') updateData.educationRevenue = increment(userUsdAmount);
    if (source === 'active_time') updateData.activeTimeRevenue = increment(userUsdAmount);
    if (source === 'dating') updateData.datingRevenue = increment(userUsdAmount);
    if (source === 'community') updateData.communityRevenue = increment(userUsdAmount);
    if (source === 'events') updateData.eventsRevenue = increment(userUsdAmount);
    
    await updateDoc(userRef, updateData);

    // User-specific Points Ledger (Full Audit Trail)
    await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
      amount: pointsToAdd,
      balanceAfter: (userDataRef.current?.points || 0) + pointsToAdd,
      type: 'accrual',
      source: source,
      reason,
      timestamp: serverTimestamp(),
      unit: 'Points'
    }).catch(err => console.error("Error logging points ledger:", err));

    // User-specific Transaction History (UI Audit Trail)
    await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
      amount: userUsdAmount,
      currency: 'USD',
      type: 'earning',
      source: source,
      status: 'success',
      timestamp: serverTimestamp(),
      reference: `REV-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
      details: reason,
      pointsAdded: pointsToAdd,
      remainingPoints: (userDataRef.current?.points || 0) + pointsToAdd
    }).catch(err => console.error("Error logging user transaction:", err));

    // Update Platform Stats (Platform Share & Total User Balances)
    await updateDoc(statsRef, {
      platformRevenue: increment(totalUsd),
      platformShare: increment(platformUsdAmount),
      totalUserBalances: increment(userUsdAmount),
      serverSecret: "pulse-feeds-server-secret-2026"
    }).catch(async (err) => {
      // If document doesn't exist, create it (though it should exist)
      if (err.message.includes('not-found')) {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(statsRef, {
          platformRevenue: totalUsd,
          platformShare: platformUsdAmount,
          totalUserBalances: userUsdAmount,
          serverSecret: "pulse-feeds-server-secret-2026"
        });
      }
    });

    // Log Platform Transaction
    await addDoc(collection(db, 'platform_transactions'), {
      type: 'revenue',
      source: source,
      userAmount: userUsdAmount,
      platformAmount: platformUsdAmount,
      totalAmount: totalUsd,
      unit: 'USD',
      reason,
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
      serverSecret: "pulse-feeds-server-secret-2026"
    }).catch(err => console.error("Error logging platform transaction:", err));

    setTotalEarnedToday(prev => prev + pointsToAdd);
    console.log(`Added revenue: User $${userUsdAmount.toFixed(2)}, Platform $${platformUsdAmount.toFixed(2)} for ${reason}`);
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
        unit: 'USD',
        reason,
        userId: 'system',
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      console.log(`Added Platform Revenue: $${amount.toFixed(2)} for ${reason} (100% Platform Share)`);
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
        unit: 'USD',
        reason,
        userId: 'system',
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      console.log(`Logged Platform Expense: $${amount.toFixed(2)} for ${reason}`);
    } catch (error) {
      console.error("Error logging platform expense:", error);
    }
  };

  const deductBalance = async (usdAmount: number, reason: string): Promise<boolean> => {
    if (!currentUser || !db) return false;
    try {
      if ((userData?.balance || 0) < usdAmount) return false;

      const userRef = doc(db, 'users', currentUser.uid);
      // 1300 Points per $1.00
      const pointsToDeduct = usdAmount * 1.3;

      await updateDoc(userRef, {
        balance: increment(-usdAmount),
        points: increment(-pointsToDeduct)
      });

      // Log Transaction
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: -usdAmount,
        currency: 'USD',
        type: 'expense',
        source: 'purchase',
        status: 'success',
        timestamp: serverTimestamp(),
        reference: `USD-EXP-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
        details: reason,
        pointsDeducted: pointsToDeduct,
        remainingPoints: (userData?.points || 0) - pointsToDeduct
      });

      return true;
    } catch (err) {
      console.error("Error deducting balance:", err);
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
        
        // Accumulate locally: 0.016 PAXG per interval
        const userPts = ACTIVE_POINTS_PER_INTERVAL;
        const userUsd = userPts / 1.3; // PAXG Economy 
        const platUsd = (0.5 * ACTIVE_POINTS_PER_INTERVAL) / 1.3; // Platform takes 50% extra from air

        pendingUserPointsRef.current += userPts;
        pendingUserValueRef.current += userUsd;
        pendingPlatformValueRef.current += platUsd;

        setTotalEarnedToday(prev => prev + userPts);
        console.log(`[Self-Update] Pending Points: ${pendingUserPointsRef.current}. Sync in ${Math.round((SYNC_INTERVAL - (Date.now() - lastSyncRef.current)) / 1000)}s`);

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
