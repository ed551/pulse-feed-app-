import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useLocation } from 'react-router-dom';
import { generateContentWithRetry } from '../lib/ai';
import { ShieldAlert, Timer, BrainCircuit, Activity, Lock, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Idle time in ms
const WARNING_TIMEOUT = 5 * 60 * 1000; // 5 minutes standard
const AUTO_LOCK_TIMEOUT = 60 * 1000; // 1 minute window
const IDLE_REVENUE_THRESHOLD = 300000; // Match RevenueContext (5 mins)

export const IdleAILock: React.FC = () => {
  const { isMfaVerified, setIsMfaVerified, currentUser, userData } = useAuth();
  const { isIdle, setIsIdle } = useRevenue();
  const location = useLocation();
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [lockImminent, setLockImminent] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  
  const lastActivityRef = useRef<number>(Date.now());
  const aiCheckDoneRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isIdle) setIsIdle(false);
    if (lockImminent) {
      setLockImminent(false);
      setAiInsight(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    aiCheckDoneRef.current = false;
  }, [lockImminent, isIdle, setIsIdle]);

  const performAiInsightCheck = async () => {
    if (aiCheckDoneRef.current || !currentUser || !isMfaVerified) return;
    aiCheckDoneRef.current = true;
    setIsAiProcessing(true);

    try {
      const page = location.pathname;
      const bio = userData?.bio || "Active Pulse Community Member";
      
      const prompt = `Security Pulse Monitoring.
User is currently on: ${page}
No physical activity for 5 minutes.
Context: ${bio}

Based on the page complexity and user history, provide an AI Insight.
Is the user 'ENGAGED' (reading/learning/observing data) or 'IDLE' (abandoned device)?

Dashboards/Analytics/Finance/Education/Long articles -> Very high probability they are ENGAGED.
Home/Settings/Profile/Login/Static lists -> High probability they are IDLE.

Format:
{
  "status": "ENGAGED" | "IDLE",
  "reasoning": "Quick logic why",
  "insight": "10-word summary of behavior",
  "probability": 0-1
}

If status is ENGAGED, we will NOT lock the app.`;

      const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { response_mime_type: 'application/json' }
      } as any);

      const result = JSON.parse(response.text || '{}');
      
      if (result.status === 'IDLE' && result.probability > 0.6) {
        setLockImminent(true);
        setSecondsRemaining(60);
        setAiInsight(result.insight);
        setIsIdle(true);
        
        countdownRef.current = setInterval(() => {
          setSecondsRemaining(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              // Trigger global lock event
              window.dispatchEvent(new CustomEvent('pulse-app-lock', { 
                detail: { reason: "AI_INACTIVITY_ANALYSIS", insight: result.insight } 
              }));
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // AI believes user is reading or monitoring - extend automatically for another standard timeout
        lastActivityRef.current = Date.now(); 
        aiCheckDoneRef.current = false; // Allow another check in 5 mins
        setAiInsight(`Smart Pulse: ${result.insight || "User appears focused on content."}. Extending focus session.`);
        setTimeout(() => setAiInsight(null), 10000);
      }
    } catch (err) {
      console.error("[IdleAI] Analysis failed:", err);
      // Fallback
       setLockImminent(true);
       setSecondsRemaining(60);
    } finally {
      setIsAiProcessing(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !isMfaVerified) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleEvent = () => resetTimer();
    activityEvents.forEach(event => document.addEventListener(event, handleEvent));

    timerRef.current = setInterval(() => {
      const timeSinceLast = Date.now() - lastActivityRef.current;
      
      if (timeSinceLast > WARNING_TIMEOUT && !aiCheckDoneRef.current && !lockImminent) {
        performAiInsightCheck();
      }

      // Hard safety
      if (timeSinceLast > (WARNING_TIMEOUT + AUTO_LOCK_TIMEOUT * 2)) {
         window.dispatchEvent(new CustomEvent('pulse-app-lock'));
      }
    }, 15000);

    return () => {
      activityEvents.forEach(event => document.removeEventListener(event, handleEvent));
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [currentUser, isMfaVerified, resetTimer, setIsMfaVerified, location.pathname]);

  return (
    <AnimatePresence>
      {isAiProcessing && (
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0 }}
           className="fixed top-28 right-8 z-[9999] flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl shadow-xl border border-blue-500/30"
        >
           <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                />
              ))}
           </div>
           <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
             <BrainCircuit className="w-3 h-3" /> AI Analyzing Pulse...
           </span>
        </motion.div>
      )}

      {lockImminent && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-80"
        >
          <div className="bg-white dark:bg-slate-900 border-2 border-orange-500/50 rounded-3xl shadow-2xl p-6 overflow-hidden relative backdrop-blur-xl">
            <div className="absolute inset-0 bg-orange-500/5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
               <motion.div 
                 initial={{ width: "100%" }}
                 animate={{ width: "0%" }}
                 transition={{ duration: 60, ease: "linear" }}
                 className="h-full bg-orange-500"
               />
            </div>

            <div className="flex items-start gap-4 pt-2">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-2xl text-orange-600 shrink-0">
                <ScanLine className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Inactivity Detected</h4>
                  <div className="px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-orange-500/20">AI Secured</div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-snug italic">
                  "{aiInsight || "User appears to have left the device."}"
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                   <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-orange-500" />
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">{secondsRemaining}s</span>
                   </div>
                   <button 
                    onClick={resetTimer}
                    className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform shadow-lg active:scale-95"
                  >
                    Stay Online
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {aiInsight && !lockImminent && isMfaVerified && (
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 20 }}
           className="fixed top-24 right-4 z-[9999] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white px-5 py-3 rounded-2xl text-[10px] font-black shadow-2xl border border-emerald-500/30 flex items-center gap-3"
        >
           <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
              <Activity className="w-3 h-3 animate-bounce" />
           </div>
           <div>
              <p className="text-[8px] uppercase tracking-widest text-emerald-500 font-black mb-0.5">Brain Insight</p>
              <p className="opacity-80 uppercase tracking-tight">{aiInsight}</p>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
