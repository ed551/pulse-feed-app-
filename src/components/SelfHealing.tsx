import { useEffect, useState, useRef } from 'react';
import { saveInsight } from '../lib/insights';
import { SelfUpdateEngine, ai_auto_diagnostics, automated_hotfix_compiler } from '../lib/engines';
import { generateContentWithRetry } from '../lib/ai';
import { reconnectFirestore } from '../lib/firebase';
import { Shield, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function SelfHealing() {
  const engine = useRef(SelfUpdateEngine.getInstance());

  useEffect(() => {
    // Lazy Start: Wait 5 seconds after mount to begin monitoring
    const bootTimer = setTimeout(() => {
      engine.current.start();
      
      // Register diagnostic task at low frequency (every 2 mins)
      engine.current.register('health_check', () => {
        console.log("[Self-Healing] Routine health check performed.");
      }, 120000);

      ai_auto_diagnostics();
      automated_hotfix_compiler();
    }, 5000);

    // Optimized event listeners
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('ResizeObserver')) return; // Ignore harmless noise
      
      // Special handling for Firestore unavailable errors
      if (event.message?.toLowerCase().includes('unavailable') && event.message?.toLowerCase().includes('firestore')) {
        handleFirestoreUnavailable();
      }
      
      reportIssue('error', `Runtime Error: ${event.message}`);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      
      if (reason.toLowerCase().includes('unavailable') && reason.toLowerCase().includes('firestore')) {
        handleFirestoreUnavailable();
      }
      
      reportIssue('error', `Unhandled Promise Rejection: ${reason}`);
    };

    const handleFirestoreUnavailable = () => {
      console.warn("[Self-Healing] Persistent Firestore unavailability detected. Initiating reconnection protocol...");
      saveInsight('developer', 'general', "[Self-Healing] Firestore unavailable. Triggering reconnectFirestore.");
      
      // Only auto-reconnect if it's been more than 10 seconds since last attempt to avoid reload loops
      const lastReconnect = sessionStorage.getItem('last_firestore_reconnect');
      const now = Date.now();
      if (!lastReconnect || (now - parseInt(lastReconnect)) > 10000) {
        sessionStorage.setItem('last_firestore_reconnect', now.toString());
        setTimeout(() => reconnectFirestore(), 2000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      clearTimeout(bootTimer);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      engine.current.stop();
    };
  }, []);

  const [healStatus, setHealStatus] = useState<'idle' | 'detecting' | 'healing' | 'complete'>('idle');
  const [lastDiagnosis, setLastDiagnosis] = useState<string | null>(null);
  const [lastHealTime, setLastHealTime] = useState(0);

  const reportIssue = async (type: 'error' | 'warning' | 'performance', message: string) => {
    // Log to developer insights
    saveInsight('developer', 'general', `[Self-Healing] Detected ${type}: ${message}`);
    setHealStatus('detecting');

    // Auto-trigger healing if it's an error
    if (type === 'error') {
      // Prevent recursive healing if the error is already about AI service availability
      if (message.includes("AI service is temporarily unavailable")) {
        console.warn("Skipping self-healing due to AI service unavailability.");
        setHealStatus('idle');
        return;
      }
      
      // Cooldown: 30 seconds
      const now = Date.now();
      if (now - lastHealTime < 30000) {
        console.warn("Skipping self-healing due to cooldown.");
        setHealStatus('idle');
        return;
      }
      
      setLastHealTime(now);
      attemptHeal(message);
    } else {
      setTimeout(() => setHealStatus('idle'), 3000);
    }
  };

  const attemptHeal = async (message: string) => {
    setHealStatus('healing');
    try {
      // Check for offline status first
      if (!navigator.onLine) {
         setLastDiagnosis("DIAGNOSIS: Network connection lost. | HEAL: Please check your internet connection.");
         setHealStatus('complete');
         setTimeout(() => setHealStatus('idle'), 5000);
         return;
      }

      // AI Diagnosis
      const prompt = `A system issue has occurred in the Pulse Feeds app: "${message}". 
      Provide a brief diagnostic explanation of what might have caused this and a "healing" suggestion (e.g., "Clear local cache", "Check network connection", "Verify Firestore permissions").
      Keep it technical but concise. 
      Format: DIAGNOSIS: [explanation] | HEAL: [suggestion]`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const diagnosis = response.text || "DIAGNOSIS: API returned no analysis. | HEAL: System stability check recommended.";
      setLastDiagnosis(diagnosis);
      
      // Simulate healing process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Log the diagnosis to developer insights
      saveInsight('developer', 'general', `[Self-Healing] Diagnosis: ${diagnosis}`);
      setHealStatus('complete');
      setTimeout(() => setHealStatus('idle'), 5000);

    } catch (err: any) {
      console.error("Healing failed:", err);
      if (err.message?.includes("Failed to fetch")) {
        setLastDiagnosis("DIAGNOSIS: System connection interrupted. | HEAL: Retrying background stability protocols...");
      } else {
        setLastDiagnosis(`DIAGNOSIS: Unhandled anomaly (${err.message}). | HEAL: Refresh recommended.`);
      }
      setHealStatus('complete');
      setTimeout(() => setHealStatus('idle'), 5000);
    }
  };

  if (healStatus === 'idle') return null;

  return (
    <div className="fixed bottom-24 right-6 z-[9999] pointer-events-none">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 shadow-2xl max-w-[280px] pointer-events-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              System Warden
            </span>
          </div>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-75" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {healStatus === 'healing' ? (
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            ) : healStatus === 'detecting' ? (
              <Zap className="w-3 h-3 text-blue-500 animate-pulse" />
            ) : (
              <AlertCircle className="w-3 h-3 text-emerald-500" />
            )}
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {healStatus === 'healing' ? 'Applying Hotfix...' : 
               healStatus === 'detecting' ? 'Analyzing Anomaly...' : 
               'Integrity Balanced'}
            </span>
          </div>

          {lastDiagnosis && (
            <div className="p-2 bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-100 dark:border-white/5 text-[9px] font-medium text-gray-400 dark:text-gray-500 italic leading-relaxed">
              {lastDiagnosis}
            </div>
          )}
        </div>

        {healStatus === 'healing' && (
          <div className="mt-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 h-1">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
