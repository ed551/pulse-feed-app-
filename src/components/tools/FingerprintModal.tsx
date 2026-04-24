import React, { useState, useRef, useEffect } from 'react';
import { Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { generateContentWithRetry } from '../../lib/ai';
import { Modality } from '@google/genai';
import { useNotifications } from '../../hooks/useNotifications';
import { saveInsight } from '../../lib/insights';
import { cn } from '../../lib/utils';
import { useHealth } from '../../contexts/HealthContext';

interface FingerprintModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FingerprintModal({ onClose, onSuccess }: FingerprintModalProps) {
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const { showNotification } = useNotifications();
  const { updateMetrics } = useHealth();

  useEffect(() => {
    if (isPressing && fingerprintProgress < 100) {
      progressInterval.current = setInterval(() => {
        setFingerprintProgress((prev) => {
          const next = prev + 2;
          if (next >= 100) {
            if (progressInterval.current) clearInterval(progressInterval.current);
            return 100;
          }
          return next;
        });
      }, 30);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (!isPressing && fingerprintProgress < 100) {
        setFingerprintProgress(0);
      }
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPressing, fingerprintProgress]);

  // Handle completion separately from the interval state updater
  useEffect(() => {
    if (fingerprintProgress === 100) {
      // 1. Update metrics immediately so the next modal has data
      updateMetrics({
        heartRate: Math.floor(Math.random() * (85 - 60 + 1)) + 60, // 60-85 BPM
        sleepScore: Math.floor(Math.random() * (100 - 75 + 1)) + 75, // 75-100 Score
        lastScanDate: new Date().toLocaleString(),
      });

      // 2. Trigger the transition immediately for better UX
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
      
      // 3. Kick off the background AI processing (Report, TTS, Insights)
      generateDeepScanAdvice();
    }
  }, [fingerprintProgress]);

  const generateDeepScanAdvice = async () => {
    // Prevent double invocation
    if ((window as any).__isGeneratingAdvice) return;
    (window as any).__isGeneratingAdvice = true;

    try {
      const prompt = `Act as a multi-domain AI consultant (Health, Security, Wealth, Life). 
      Based on a simulated deep biometric fingerprint scan, generate a comprehensive report.
      Include:
      1. HEALTH: Vitals and a tip.
      2. SECURITY: Digital/Physical safety status and a tip.
      3. WEALTH: Financial mindset/status and a tip.
      4. LIFE: General wellbeing tip.
      
      Keep it concise, high-tech, and encouraging. 
      Also, provide a developer insight if you notice any potential app improvement related to these domains.
      Format developer insights as [INSIGHT:developer:category:content].`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const advice = response.text || "Deep Scan Complete. Health: Optimal. Security: Secure. Wealth: Growing. Life: Balanced.";
      
      const regex = /\[INSIGHT:(developer|user):(life|security|health|wealth|general):(.*?)\]/g;
      let match;
      while ((match = regex.exec(advice)) !== null) {
        saveInsight(match[1] as any, match[2] as any, match[3].trim());
      }
      
      const cleanAdvice = advice.replace(/\[INSIGHT:[^\]]+\]/g, '').trim();

      const ttsResponse = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Deep Scan Complete. ${cleanAdvice}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        await audio.play();
      } else {
        const msg = new SpeechSynthesisUtterance(`Deep Scan Complete. ${cleanAdvice}`);
        window.speechSynthesis.speak(msg);
      }
      
      showNotification("Deep Scan Complete", { body: cleanAdvice });

      // Update Health Context with fresh simulated metrics and current timestamp
      // (Already updated immediately in the useEffect above)
    } catch (err: any) {
      console.error("Deep Scan Error:", err);
      // Fail silently in the background since we already transitioned
    } finally {
      (window as any).__isGeneratingAdvice = false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 py-4">
      <div className="text-center">
        <h4 className="font-bold text-xl">Biometric Scanner</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Press and hold for security, health status, and acknowledgement</p>
      </div>
      
      <div className="relative">
        <svg className="absolute inset-0 w-32 h-32 -m-4 transform -rotate-90 pointer-events-none">
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r="60"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={377}
            strokeDashoffset={377 - (377 * fingerprintProgress) / 100}
            className="text-cyan-500 transition-all duration-75 ease-linear"
          />
        </svg>

        <button
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
            isPressing 
              ? "bg-cyan-100 dark:bg-cyan-900/40 scale-95 shadow-inner" 
              : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg"
          )}
        >
          <Fingerprint 
            className={cn(
              "w-12 h-12 transition-colors duration-300",
              isPressing ? "text-cyan-600 dark:text-cyan-400" : "text-cyan-500",
              fingerprintProgress === 100 && "text-green-500 dark:text-green-400"
            )} 
          />
        </button>
      </div>
      
      <div className="h-4">
        {fingerprintProgress > 0 && fingerprintProgress < 100 && (
          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 animate-pulse">
            Scanning... {fingerprintProgress}%
          </span>
        )}
        {fingerprintProgress === 100 && (
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            Identity Verified
          </span>
        )}
      </div>
    </div>
  );
}
