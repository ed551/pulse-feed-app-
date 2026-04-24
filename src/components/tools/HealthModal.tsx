import React, { useState } from 'react';
import { HeartPulse, Loader2, ClipboardCheck, Sparkles, Activity, Moon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateContentWithRetry } from '../../lib/ai';
import { useHealth } from '../../contexts/HealthContext';
import Markdown from 'react-markdown';

export default function HealthModal() {
  const { metrics } = useHealth();
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-run if opened immediately after a scan (lastScanDate within 5 seconds)
  React.useEffect(() => {
    if (metrics.lastScanDate) {
      const scanTime = new Date(metrics.lastScanDate).getTime();
      const now = new Date().getTime();
      const diff = now - scanTime;
      
      // If scanned within last 5 seconds and not already scanning/completed
      if (diff < 5000 && !report && !isScanning) {
        runDiagnostic();
      }
    }
  }, [metrics.lastScanDate]);

  const runDiagnostic = async () => {
    setIsScanning(true);
    setError(null);
    setReport(null);

    try {
      const prompt = `As a professional AI Health Consultant for Pulse Feeds, provide a CONCISE and BRIEF health report.
Scan Date: ${metrics.lastScanDate || new Date().toLocaleString()}
Current Metrics:
- Heart Rate: ${metrics.heartRate} BPM
- Sleep Score: ${metrics.sleepScore}/100

Structure:
1. **Status**: 1-2 sentence summary.
2. **Analysis**: Brief points on what these numbers mean.
3. **Plan**: 2-3 quick actionable tips.

Keep it very brief but high impact. Use Markdown. Use the scan date provided above as the reference date in the report.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      if (response.text) {
        setReport(response.text);
      } else {
        throw new Error("Failed to generate health report.");
      }
    } catch (err: any) {
      console.error("Health Diagnostic Error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-105 duration-500 shadow-md">
          <HeartPulse className={`w-10 h-10 text-red-500 ${isScanning ? 'animate-pulse' : ''}`} />
        </div>
        <div>
          <h4 className="font-bold text-xl tracking-tight">Pulse Health Diagnostic</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Advanced AI-driven analysis & health planning</p>
          {metrics.lastScanDate && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest bg-cyan-50 dark:bg-cyan-900/20 py-1 px-3 rounded-full w-fit mx-auto border border-cyan-100 dark:border-cyan-900/30">
              <Clock className="w-3 h-3" />
              Last Biometric: {metrics.lastScanDate}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm transition-colors hover:border-red-100 dark:hover:border-red-900/30"
        >
          <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Heart Rate</span>
            <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{metrics.heartRate} BPM</span>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -2 }}
          className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm transition-colors hover:border-blue-100 dark:hover:border-blue-900/30"
        >
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
            <Moon className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest block mb-0.5">Sleep Score</span>
            <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{metrics.sleepScore}/100</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!report && !isScanning && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button
              id="run-diagnostic-btn"
              onClick={runDiagnostic}
              className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Run Full Diagnostic
            </button>
          </motion.div>
        )}

        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center space-y-4"
          >
            <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
            <div className="space-y-1">
              <p className="font-bold text-gray-900 dark:text-white">Analyzing Bio-metrics...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 px-4">Gemini 3 Flash is generating your personalized health status and improvement report.</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-100 dark:border-red-900/30"
          >
            <div className="flex gap-2">
              <div className="font-semibold italic">Error: {error}</div>
            </div>
            <button 
              onClick={runDiagnostic} 
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
            >
              Retry Diagnostic
            </button>
          </motion.div>
        )}

        {report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h5 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <ClipboardCheck className="w-5 h-5 text-green-500" />
                Comprehensive Report
              </h5>
              <button
                onClick={() => setReport(null)}
                className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-bold transition-colors uppercase tracking-widest"
              >
                Reset
              </button>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm max-h-[350px] overflow-y-auto custom-scrollbar">
              <div className="markdown-body">
                <Markdown>{report}</Markdown>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                This AI-generated report is based on current bio-metrics and educational health data. Always consult with a medical professional for critical health decisions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
