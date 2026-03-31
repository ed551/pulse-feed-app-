import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RevenueContextType {
  isIdle: boolean;
  activeSeconds: number;
  totalEarnedToday: number;
  addRevenue: (amount: number, reason: string) => Promise<void>;
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

  const addRevenue = async (amount: number, reason: string) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      // Assuming 1 point = $0.01 for simplicity, or we just add to points
      // Let's add amount * 100 as points
      const pointsToAdd = Math.floor(amount * 100);
      await updateDoc(userRef, {
        points: increment(pointsToAdd)
      });
      setTotalEarnedToday(prev => prev + pointsToAdd);
      console.log(`Added revenue: $${amount} (${pointsToAdd} points) for ${reason}`);
    } catch (error) {
      console.error("Error adding revenue:", error);
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
          await updateDoc(userRef, {
            points: increment(POINTS_PER_INTERVAL)
          });
          setTotalEarnedToday(prev => prev + POINTS_PER_INTERVAL);
          console.log(`Earned ${POINTS_PER_INTERVAL} point for being active!`);
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
    <RevenueContext.Provider value={{ isIdle, activeSeconds, totalEarnedToday, addRevenue }}>
      {children}
    </RevenueContext.Provider>
  );
};
