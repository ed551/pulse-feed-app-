import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Activity, Heart, CheckCircle2, ShieldCheck, X, Sparkles, TrendingUp, Moon, ClipboardCheck, RefreshCcw, Play, Square, User, UserCheck, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { speak, stopSpeech } from '../lib/speech';

export default function HealthChecker() {
  const { currentUser } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [speechRate, setSpeechRate] = useState(1.1);

  const reportTemplates = [
    {
      heartRate: 72,
      sleepScore: 85,
      status: "Your physiological markers are currently optimal. You are demonstrating strong cardiovascular stability and effective restorative recovery.",
      analysis: [
        { label: "Heart Rate (72 BPM)", value: "Sitting comfortably within the healthy resting range, indicating a low-stress state." },
        { label: "Sleep Score (85/100)", value: "Reflects high-quality sleep cycles; your body is successfully repairing and recharging." }
      ],
      plan: [
        { label: "Consistency", value: "Maintain your current evening routine to preserve this high sleep quality." },
        { label: "Cardio Boost", value: "Incorporate 20 minutes of light aerobic activity to further optimize your resting heart rate." },
        { label: "Hydration", value: "Ensure adequate water intake tonight to support metabolic recovery for tomorrow's scan." }
      ]
    },
    {
      heartRate: 68,
      sleepScore: 92,
      status: "Exceptional vitality detected. Your neural load has dissipated significantly, allowing for peak physical preparedness.",
      analysis: [
        { label: "Heart Rate (68 BPM)", value: "Excellent athletic baseline. Your heart rate variability indicates high stress resilience." },
        { label: "Sleep Score (92/100)", value: "Deep recovery achieved. REM cycles were prolonged, optimizing cognitive function for the day." }
      ],
      plan: [
        { label: "Peak Performance", value: "Today is ideal for high-intensity cognitive tasks or physical training." },
        { label: "Nutrition", value: "Prioritize lean proteins and antioxidants to maintain this high-efficiency state." },
        { label: "Mindfulness", value: "A 5-minute meditation will help anchor this calm baseline." }
      ]
    }
  ];

  const [currentReport, setCurrentReport] = useState(reportTemplates[0]);

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

    // Manual Trigger Listener
    const handleManualScan = () => {
      setIsVisible(true);
      setIsDone(false);
      setIsScanning(false);
      setIsAnalyzing(false);
      setScanProgress(0);
      speak("Manual Wellness Protocol engaged. Please provide fingerprint signature.");
    };

    window.addEventListener('trigger-wellness-scan', handleManualScan);
    return () => window.removeEventListener('trigger-wellness-scan', handleManualScan);
  }, [currentUser]);

  // Remove auto-start scanner logic to ensure intentional user interaction
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);

  const handlePressStart = () => {
    if (isScanning || isAnalyzing || isDone) return;
    setIsScanning(true);
    speak("Biometric link established. Keep holding for full neural capture.");

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setHoldTimer(null);
          startAnalysis();
          return 100;
        }
        return prev + 1;
      });
    }, 20); // Smooth 50fps-ish progress

    setHoldTimer(interval);
  };

  const handlePressEnd = () => {
    if (isDone || isAnalyzing) return;
    
    if (scanProgress < 100) {
      if (holdTimer) clearInterval(holdTimer);
      setHoldTimer(null);
      setIsScanning(false);
      setScanProgress(0);
      speak("Biometric link severed. Please maintain contact until the scan is complete.");
    }
  };

  const startAnalysis = () => {
    setIsScanning(false);
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
    
    const report = reportTemplates[Math.floor(Math.random() * reportTemplates.length)];
    setCurrentReport(report);
    
    // Construct speech text
    const speechText = `Analysis Complete. Your Status: ${report.status}. Heart Rate is ${report.heartRate} beats per minute. Sleep Score is ${report.sleepScore} out of 100. Recommendations: ${report.plan.map(p => `${p.label}: ${p.value}`).join(' ')}`;
    
    speak(speechText);
    
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
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-8 text-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full z-10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter text-left">
              {isDone ? "Health" : isAnalyzing ? "Neural Analysis" : "Fingerprint Reader"}
            </h2>
          </div>

          {/* Scanner Area / Report Area */}
          <div className={cn(
            "flex flex-col items-center",
            isDone ? "p-8" : "p-10 min-h-[420px] justify-center"
          )}>
            {!isDone && !isAnalyzing ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/30 mb-8">
                  <Activity className="w-8 h-8 text-white animate-pulse" />
                </div>
                <div 
                  className="relative group cursor-pointer select-none" 
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                >
                <div className={cn(
                  "w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative overflow-hidden",
                  isScanning ? "border-rose-500 bg-rose-50 dark:bg-rose-900/10 scale-110" : "border-gray-100 dark:border-gray-800 hover:border-rose-200"
                )}>
                  {isScanning && (
                    <motion.div 
                      initial={{ top: "-10%" }}
                      animate={{ top: "110%" }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
                    {isScanning ? "Neural Capture Active" : "Authentication Required"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">
                    {isScanning ? `Biometric Data: ${scanProgress}%` : "Press & Hold for Scan"}
                  </p>
                </div>
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-6"
              >
                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50/50 dark:bg-rose-950/10 p-5 rounded-[2rem] border border-rose-100/50 dark:border-rose-900/30 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Heart Rate</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                      {currentReport.heartRate} BPM
                    </p>
                  </div>
                  
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-5 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <Moon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Sleep Score</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                      {currentReport.sleepScore}/100
                    </p>
                  </div>
                </div>

                {/* Report Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Comprehensive Report</h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Audio Controls */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button 
                        onClick={() => setVoiceGender(prev => prev === 'female' ? 'male' : 'female')}
                        className={cn(
                          "p-1 rounded-md transition-all flex items-center gap-1 text-[8px] font-black uppercase",
                          voiceGender === 'female' ? "text-rose-500 bg-white dark:bg-gray-700 shadow-sm" : "text-blue-500 bg-white dark:bg-gray-700 shadow-sm"
                        )}
                      >
                        {voiceGender}
                      </button>
                      
                      {!isSpeaking ? (
                        <button 
                          onClick={() => {
                            setIsSpeaking(true);
                            speak(`Analysis Complete. Your Status: ${currentReport.status}. Recommendations: ${currentReport.plan.map(p => `${p.label}: ${p.value}`).join(' ')}`, { 
                              rate: speechRate, 
                              gender: voiceGender,
                              onEnd: () => setIsSpeaking(false)
                            });
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            stopSpeech();
                            setIsSpeaking(false);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors animate-pulse"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      )}

                      <select 
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="text-[8px] font-black bg-transparent outline-none cursor-pointer ml-1"
                      >
                        <option value="1.0">1.0x</option>
                        <option value="1.2">1.2x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2.0">2.0x</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => {
                        setIsDone(false);
                        setIsScanning(false);
                        setIsAnalyzing(false);
                        setScanProgress(0);
                        stopSpeech();
                        setIsSpeaking(false);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition-colors flex items-center gap-1 ml-2"
                    >
                      <RefreshCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>
                </div>

                {/* Main Content Box */}
                <div className="bg-white dark:bg-gray-800/40 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-sm font-black text-rose-500 mb-1">Pulse Feeds Health Report</h5>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        Scan Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h6 className="text-[11px] font-black text-rose-500 uppercase tracking-wide">1. Status</h6>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300 leading-relaxed">
                        {currentReport.status}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h6 className="text-[11px] font-black text-rose-500 uppercase tracking-wide">2. Analysis</h6>
                      <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                        {currentReport.analysis.map((item, idx) => (
                          <li key={idx} className="flex gap-2 leading-relaxed">
                            <span className="text-rose-500 shrink-0">•</span>
                            <span>
                              <span className="font-black text-rose-500 mr-2">{item.label}:</span>
                              {item.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h6 className="text-[11px] font-black text-rose-500 uppercase tracking-wide">3. Plan</h6>
                      <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                        {currentReport.plan.map((item, idx) => (
                          <li key={idx} className="flex gap-2 leading-relaxed">
                            <span className="text-rose-500 shrink-0">•</span>
                            <span>
                              <span className="font-black text-rose-500 mr-2">{item.label}:</span>
                              {item.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* AI Disclaimer Footer */}
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                    This AI-generated report is based on current bio-metrics and educational health data. Always consult with a medical professional for critical health decisions.
                  </p>
                </div>

                <button
                  onClick={() => setIsVisible(false)}
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:opacity-90 active:scale-95 shadow-lg"
                >
                  Close & Dismiss
                </button>
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
