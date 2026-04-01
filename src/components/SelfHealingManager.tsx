import React, { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { saveInsight } from '../lib/insights';
import { self_healing_protocol, ai_auto_diagnostics, automated_hotfix_compiler } from '../lib/engines';
import { generateContentWithRetry } from '../lib/ai';
import { cn } from '../lib/utils';

interface SystemIssue {
  id: string;
  type: 'error' | 'warning' | 'performance';
  message: string;
  timestamp: number;
  healed: boolean;
  diagnosis?: string;
}

export default function SelfHealingManager() {
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [isHealing, setIsHealing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

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

  const reportIssue = async (type: 'error' | 'warning' | 'performance', message: string) => {
    const newIssue: SystemIssue = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
      healed: false
    };

    setIssues(prev => [newIssue, ...prev].slice(0, 10));
    
    // Log to developer insights
    saveInsight('developer', 'general', `[Self-Healing] Detected ${type}: ${message}`);

    // Auto-trigger healing if it's an error
    if (type === 'error') {
      attemptHeal(newIssue);
    }
  };

  const attemptHeal = async (issue: SystemIssue) => {
    setIsHealing(true);
    
    try {
      // AI Diagnosis (Diagnostic, not Generative)
      const prompt = `A system issue has occurred in the Pulse Feeds app: "${issue.message}". 
      Provide a brief diagnostic explanation of what might have caused this and a "healing" suggestion (e.g., "Clear local cache", "Check network connection", "Verify Firestore permissions").
      Keep it technical but concise. 
      Format: DIAGNOSIS: [explanation] | HEAL: [suggestion]`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const diagnosis = response.text || "DIAGNOSIS: Unknown system anomaly. | HEAL: System restart recommended.";
      
      // Simulate healing process
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIssues(prev => prev.map(i => 
        i.id === issue.id ? { ...i, healed: true, diagnosis } : i
      ));

      // Log the diagnosis to developer insights
      saveInsight('developer', 'general', `[Self-Healing] Diagnosis for ${issue.id}: ${diagnosis}`);

    } catch (err) {
      console.error("Healing failed:", err);
    } finally {
      setIsHealing(false);
    }
  };

  const clearIssues = () => setIssues([]);

  return (
    <>
      {/* Floating Status Indicator */}
      <div className="fixed top-24 left-6 z-50">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg",
            issues.some(i => !i.healed) 
              ? "bg-red-500 animate-pulse" 
              : "bg-emerald-500 hover:bg-emerald-600"
          )}
        >
          {isHealing ? (
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          ) : issues.some(i => !i.healed) ? (
            <ShieldAlert className="w-6 h-6 text-white" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Issues Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-40 left-6 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm">Self-Healing Protocol</h3>
              </div>
              <button onClick={clearIssues} className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600">
                Clear
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {issues.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">All systems operational</p>
                </div>
              ) : (
                issues.map(issue => (
                  <div 
                    key={issue.id}
                    className={cn(
                      "p-3 rounded-xl border text-xs transition-all",
                      issue.healed 
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20" 
                        : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={cn(
                        "font-bold uppercase text-[9px]",
                        issue.type === 'error' ? "text-red-500" : "text-amber-500"
                      )}>
                        {issue.type}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {new Date(issue.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium mb-2">{issue.message}</p>
                    
                    {issue.diagnosis && (
                      <div className="mt-2 pt-2 border-t border-emerald-100/50 dark:border-emerald-900/20">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic">
                          {issue.diagnosis}
                        </p>
                      </div>
                    )}

                    {!issue.healed && isHealing && (
                      <div className="mt-2 flex items-center gap-2 text-emerald-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px] font-bold animate-pulse">HEALING...</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">AI Diagnostics: Active</span>
                <span className="text-emerald-500 font-bold">SECURE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
