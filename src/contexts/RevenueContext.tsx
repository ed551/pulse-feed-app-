import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RevenueContextType {
  isIdle: boolean;
  activeSeconds: number;
  totalEarnedToday: number;
  addRevenue: (userAmount: number, platformAmount: number, reason: string, source: 'ad' | 'education' | 'active_time' | 'dating' | 'community' | 'events') => Promise<void>;
  addPlatformRevenue: (amount: number, reason: string) => Promise<void>;
  addPlatformExpense: (amount: number, reason: string) => Promise<void>;
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
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const earningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const IDLE_THRESHOLD = 60000; // 60 seconds
  const EARNING_INTERVAL = 30000; // 30 seconds
  const POINTS_PER_INTERVAL = 1;

  const addRevenue = async (userAmount: number, platformAmount: number, reason: string, source: 'ad' | 'education' | 'active_time' | 'dating' | 'community' | 'events') => {
    if (!currentUser) return;
    try {
      // 1. Try to log via Server API for authoritative split logic and safety
      const totalAmount = userAmount + platformAmount;
      const response = await fetch('/api/revenue/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          totalAmount,
          source,
          reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[API Revenue] Success: User Earned $${result.userAmount}, Platform Earned $${result.platformAmount}`);
        setTotalEarnedToday(prev => prev + result.pointsAdded);
        return;
      }

      console.warn("[API Revenue] Server log failed, falling back to client-side direct Firestore update.");

      // 2. Fallback to direct Firestore if API fails
      const userRef = doc(db, 'users', currentUser.uid);
      const statsRef = doc(db, 'platform', 'stats');

      // 1 point = $0.01. So $1.00 = 100 points.
      const pointsToAdd = Math.floor(userAmount * 100);
      
      // Update User Data with specific revenue source tracking
      const updateData: any = {
        points: increment(pointsToAdd),
        balance: increment(userAmount)
      };

      if (source === 'ad') updateData.adRevenue = increment(userAmount);
      if (source === 'education') updateData.educationRevenue = increment(userAmount);
      if (source === 'active_time') updateData.activeTimeRevenue = increment(userAmount);
      if (source === 'dating') updateData.datingRevenue = increment(userAmount);
      if (source === 'community') updateData.communityRevenue = increment(userAmount);
      if (source === 'events') updateData.eventsRevenue = increment(userAmount);
      
      await updateDoc(userRef, updateData);

      // User-specific Points Ledger (Full Audit Trail)
      await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
        amount: pointsToAdd,
        balanceAfter: (userData?.points || 0) + pointsToAdd,
        type: 'accrual',
        source: source,
        reason,
        timestamp: serverTimestamp()
      }).catch(err => console.error("Error logging points ledger:", err));

      // User-specific Transaction History (UI Audit Trail)
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: userAmount,
        currency: 'USD',
        type: 'earning',
        source: source,
        status: 'success',
        timestamp: serverTimestamp(),
        reference: `REVN-${Date.now()}-${currentUser.uid.slice(0, 4)}`,
        details: reason,
        pointsAdded: pointsToAdd,
        remainingPoints: (userData?.points || 0) + pointsToAdd
      }).catch(err => console.error("Error logging user transaction:", err));

      // Update Platform Stats (Platform Share & Total User Balances)
      await updateDoc(statsRef, {
        platformRevenue: increment(userAmount + platformAmount),
        platformShare: increment(platformAmount),
        totalUserBalances: increment(userAmount),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(async (err) => {
        // If document doesn't exist, create it (though it should exist)
        if (err.message.includes('not-found')) {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(statsRef, {
            platformRevenue: userAmount + platformAmount,
            platformShare: platformAmount,
            totalUserBalances: userAmount,
            serverSecret: "pulse-feeds-server-secret-2026"
          });
        }
      });

      // Log Platform Transaction
      await addDoc(collection(db, 'platform_transactions'), {
        type: 'revenue',
        source: source,
        userAmount,
        platformAmount,
        totalAmount: userAmount + platformAmount,
        reason,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        serverSecret: "pulse-feeds-server-secret-2026"
      }).catch(err => console.error("Error logging platform transaction:", err));

      setTotalEarnedToday(prev => prev + pointsToAdd);
      console.log(`Added revenue: User $${userAmount} (${pointsToAdd} points), Platform $${platformAmount} for ${reason}`);
    } catch (error) {
      console.error("Error adding revenue:", error);
    }
  };

  const addPlatformRevenue = async (amount: number, reason: string) => {
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

      console.log(`Added Platform Revenue: $${amount} for ${reason} (100% Platform Share)`);
    } catch (error) {
      console.error("Error adding platform revenue:", error);
    }
  };

  const addPlatformExpense = async (amount: number, reason: string) => {
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

      console.log(`Logged Platform Expense: $${amount} for ${reason}`);
    } catch (error) {
      console.error("Error logging platform expense:", error);
    }
  };

  const resetIdleTimer = () => {
    setIsIdle(false);
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
    if (currentUser && !isIdle) {
      earningIntervalRef.current = setInterval(async () => {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const statsRef = doc(db, 'platform', 'stats');

          // 1 point = $0.01. So POINTS_PER_INTERVAL (1) = $0.01
          // Active earning is distributed 50/50 (as per "User engagement excluding payment is 50/50 distribution")
          const totalValue = POINTS_PER_INTERVAL / 100;
          const userValue = totalValue * 0.5;
          const platformValue = totalValue * 0.5;
          const userPoints = Math.floor(userValue * 100);

          await updateDoc(userRef, {
            points: increment(userPoints),
            balance: increment(userValue),
            activeTimeRevenue: increment(userValue)
          });

          // User-specific Points Ledger (Audit Trail for Active Time)
          await addDoc(collection(db, 'users', currentUser.uid, 'points_ledger'), {
            amount: userPoints,
            balanceAfter: (userData?.points || 0) + userPoints,
            type: 'accrual',
            source: 'active_time',
            reason: 'Activity Reward',
            timestamp: serverTimestamp()
          }).catch(() => {});

          await updateDoc(statsRef, {
            platformRevenue: increment(totalValue),
            platformShare: increment(platformValue),
            totalUserBalances: increment(userValue),
            serverSecret: "pulse-feeds-server-secret-2026"
          }).catch(() => {}); // Ignore errors here to keep interval smooth

          setTotalEarnedToday(prev => prev + userPoints);
          console.log(`Earned ${userPoints} point ($${userValue}) for being active! Platform earned $${platformValue}`);
        } catch (error) {
          console.error("Error updating points:", error);
        }
      }, EARNING_INTERVAL);
    } else {
      if (earningIntervalRef.current) clearInterval(earningIntervalRef.current);
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

  return (
    <RevenueContext.Provider value={{ isIdle, activeSeconds, totalEarnedToday, addRevenue, addPlatformRevenue, addPlatformExpense }}>
      {children}
    </RevenueContext.Provider>
  );
};
