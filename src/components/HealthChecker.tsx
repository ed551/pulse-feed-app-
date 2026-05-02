import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Activity, Heart, CheckCircle2, ShieldCheck, X, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function HealthChecker() {
  const { currentUser } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [healthNote, setHealthNote] = useState("");

  const wellnessNotes = [
    "Pulse Synchronized: Your community impact signature is trending positive. Heart rate and social engagement metrics are optimal. Keep building.",
    "Vitality Verified: Neural load is well-balanced. Biometric consistency has unlocked a 1.5x reward multiplier for your sector transactions.",
    "Health Integrity: Daily check-in complete. Your activity contribution has boosted the community wellness pool by 10 points. You are fit for service.",
    "Wellness Baseline established: System checks indicate high-vibrancy baseline. Social reward readiness is at peak levels today."
  ];

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05; // Slightly futuristic pitch
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // Check if we need a scan based on interval
    const lastScanTs = localStorage.getItem('pulse_last_health_scan_ts');
    const intervalStr = localStorage.getItem('pulse_health_interval') || 'daily';
    
    let intervalMs = 24 * 60 * 60 * 1000; // default daily
    if (intervalStr === '30m') intervalMs = 30 * 60 * 1000;
    if (intervalStr === '1h') intervalMs = 60 * 60 * 1000;
    if (intervalStr === '2h') intervalMs = 2 * 60 * 60 * 1000;
    if (intervalStr === '3h') intervalMs = 3 * 60 * 60 * 1000;
    if (intervalStr === '4h') intervalMs = 4 * 60 * 60 * 1000;
    if (intervalStr === '5h') intervalMs = 5 * 60 * 60 * 1000;
    if (intervalStr === '6h') intervalMs = 6 * 60 * 60 * 1000;
    if (intervalStr === '12h') intervalMs = 12 * 60 * 60 * 1000;

    const needsScan = !lastScanTs || (Date.now() - parseInt(lastScanTs) > intervalMs);
    
    if (needsScan && currentUser) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        speak("Wellness protocol initiated. Accessing Biometric Cluster. Please provide fingerprint signature for daily impact report.");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Auto-start scan when visible
  useEffect(() => {
    if (isVisible && !isScanning && !isAnalyzing && !isDone) {
      const timer = setTimeout(() => {
        startScan();
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [isVisible, isScanning, isAnalyzing, isDone]);

  const startScan = () => {
    if (isScanning || isAnalyzing || isDone) return;
    setIsScanning(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        startAnalysis();
      }
    }, 30);
  };

  const startAnalysis = () => {
    setIsScanning(false);
    setIsAnalyzing(true);
    speak("Signature captured. Computing daily health and social impact vectors.");
    
    // Neural Analysis phase
    setTimeout(() => {
      completeScan();
    }, 2500);
  };

  const completeScan = async () => {
    setIsAnalyzing(false);
    setIsDone(true);
    const note = wellnessNotes[Math.floor(Math.random() * wellnessNotes.length)];
    setHealthNote(note);
    
    // Read the report aloud immediately upon reveal
    speak("Analysis Complete. View your Daily Impact Report: " + note);
    
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          points: increment(10),
          lastHealthCheck: serverTimestamp()
        });
        
        await setDoc(doc(db, 'activity', `${currentUser.uid}_${Date.now()}`), {
          userId: currentUser.uid,
          type: 'health_check',
          pointsGained: 10,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to update health check:", err);
      }
    }

    localStorage.setItem('pulse_last_health_scan_ts', Date.now().toString());
    
    // Longer delay to allow reading/listening to the report
    setTimeout(() => {
      setIsVisible(false);
    }, 8000);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-8 text-center bg-gradient-to-b from-rose-50 to-white dark:from-rose-950/20 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            
            <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/30 mb-4">
              <Activity className="w-8 h-8 text-white animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
              {isDone ? "Impact Certified" : isAnalyzing ? "Neural Analysis" : "Fingerprint Reader"}
            </h2>
            <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest px-8">
              {isDone ? "Value-Driven Community Health Signature" : isAnalyzing ? "Evaluating Social Impact Vectors" : "Biometric Cluster: Input Required"}
            </p>
          </div>

          {/* Scanner Area */}
          <div className="p-10 flex flex-col items-center min-h-[380px] justify-center">
            {!isDone && !isAnalyzing ? (
              <div className="relative group cursor-pointer" onClick={!isScanning ? startScan : undefined}>
                <div className={cn(
                  "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative overflow-hidden",
                  isScanning ? "border-rose-500 bg-rose-50 dark:bg-rose-900/10 scale-110" : "border-gray-100 dark:border-gray-800 hover:border-rose-200"
                )}>
                  {isScanning && (
                    <motion.div 
                      initial={{ top: "-10%" }}
                      animate={{ top: "110%" }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] z-10"
                    />
                  )}
                  
                  <Fingerprint className={cn(
                    "w-16 h-16 transition-all duration-300",
                    isScanning ? "text-rose-500 scale-105" : "text-gray-300 group-hover:text-rose-300"
                  )} />

                  {isScanning && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-rose-500"
                        strokeDasharray={377}
                        strokeDashoffset={377 - (377 * scanProgress) / 100}
                      />
                    </svg>
                  )}
                </div>

                <div className="mt-8 text-center text-rose-600 dark:text-rose-400">
                  <p className="text-sm font-black uppercase tracking-tighter">
                    {isScanning ? "Initializing Neural Scan..." : "Biometric Input Required"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">
                    {isScanning ? `Scan in Progress: ${scanProgress}%` : "Place Thumb on Reader"}
                  </p>
                </div>
              </div>
            ) : isAnalyzing ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-2 border-rose-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-12 h-12 text-rose-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">Neural Computing</h3>
                <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest animate-pulse">Analyzing Biometric Impact Vectors...</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/20">
                  <ShieldCheck className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">Daily Impact Report</h3>
                <div className="flex items-center justify-center gap-2 text-rose-600 font-black text-[10px] uppercase bg-rose-50 dark:bg-rose-900/20 py-2 px-4 rounded-full mb-6 border border-rose-100 dark:border-rose-800/50">
                  <CheckCircle2 className="w-3 h-3" />
                  Health & Neural Baseline Certified
                </div>
                
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Activity className="w-12 h-12" />
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Status Analysis
                    </p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-relaxed italic">"{healthNote}"</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Social Reward</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">+10 PTS</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-6">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-gray-400">Next Multiplier</p>
                <div className="flex items-center justify-between mt-1">
                  <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mr-3">
                    <div className="h-full bg-rose-500 w-[65%]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Streak: 4 Days</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
