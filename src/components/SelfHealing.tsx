import { useEffect, useState } from 'react';
import { saveInsight } from '../lib/insights';
import { self_healing_protocol, ai_auto_diagnostics, automated_hotfix_compiler } from '../lib/engines';
import { generateContentWithRetry } from '../lib/ai';

export default function SelfHealing() {
  useEffect(() => {
    // Initialize engines
    self_healing_protocol();
    ai_auto_diagnostics();
    automated_hotfix_compiler();

    // Global error listener
    const handleError = (event: ErrorEvent) => {
      reportIssue('error', `Runtime Error: ${event.message}`);
    };

    // Unhandled promise rejection listener
    const handleRejection = (event: PromiseRejectionEvent) => {
      reportIssue('error', `Unhandled Promise Rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
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
      // AI Diagnosis
      const prompt = `A system issue has occurred in the Pulse Feeds app: "${message}". 
      Provide a brief diagnostic explanation of what might have caused this and a "healing" suggestion (e.g., "Clear local cache", "Check network connection", "Verify Firestore permissions").
      Keep it technical but concise. 
      Format: DIAGNOSIS: [explanation] | HEAL: [suggestion]`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const diagnosis = response.text || "DIAGNOSIS: Unknown system anomaly. | HEAL: System restart recommended.";
      setLastDiagnosis(diagnosis);
      
      // Simulate healing process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Log the diagnosis to developer insights
      saveInsight('developer', 'general', `[Self-Healing] Diagnosis: ${diagnosis}`);
      setHealStatus('complete');
      setTimeout(() => setHealStatus('idle'), 5000);

    } catch (err) {
      console.error("Healing failed:", err);
      setHealStatus('idle');
    }
  };

  if (healStatus === 'idle') return null;

  return (
    <div className="absolute bottom-48 sm:bottom-44 right-6 z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-purple-100 dark:border-purple-900/30 p-4 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            healStatus === 'healing' ? 'bg-yellow-500' : 
            healStatus === 'detecting' ? 'bg-blue-500' : 
            'bg-green-500'
          }`} />
          <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
            Self-Healing: {healStatus}
          </span>
        </div>
        
        {lastDiagnosis && (
          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
            {lastDiagnosis}
          </div>
        )}
        
        {healStatus === 'healing' && (
          <div className="mt-3 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 animate-progress w-full" />
          </div>
        )}
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
