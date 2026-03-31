import React, { useState, useEffect, useRef } from "react";
import { Fingerprint, X } from "lucide-react";
import { cn } from "../lib/utils";

interface FingerprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function FingerprintModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  title = "Verify Identity",
  description = "Press and hold to verify your fingerprint"
}: FingerprintModalProps) {
  const [fingerprintProgress, setFingerprintProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFingerprintProgress(0);
      setIsPressing(false);
    }
  }, [isOpen]);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (isPressing) {
      progressInterval.current = setInterval(() => {
        setFingerprintProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval.current!);
            setTimeout(() => {
              onSuccessRef.current();
            }, 300);
            return 100;
          }
          return prev + 2; // 50 ticks = ~1.5 seconds at 30ms
        });
      }, 30);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (fingerprintProgress < 100) {
        setFingerprintProgress(0);
      }
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPressing, fingerprintProgress, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center justify-center space-y-8 py-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
          
          <div className="relative">
            {/* Progress Ring */}
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
                className="text-purple-500 transition-all duration-75 ease-linear"
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
                  ? "bg-purple-100 dark:bg-purple-900/40 scale-95 shadow-inner" 
                  : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg"
              )}
            >
              <Fingerprint 
                className={cn(
                  "w-12 h-12 transition-colors duration-300",
                  isPressing ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500",
                  fingerprintProgress === 100 && "text-green-500 dark:text-green-400"
                )} 
              />
            </button>
          </div>
          
          <div className="h-4">
            {fingerprintProgress > 0 && fingerprintProgress < 100 && (
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 animate-pulse">
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
      </div>
    </div>
  );
}
