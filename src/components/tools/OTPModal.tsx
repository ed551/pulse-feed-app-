import React, { useState, useEffect } from 'react';
import { Mail, Smartphone, ShieldCheck, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface OTPModalProps {
  userId: string;
  email?: string;
  method: 'email' | 'sms';
  onClose: () => void;
  onSuccess: () => void;
}

export default function OTPModal({ userId, email, method, onClose, onSuccess }: OTPModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Initial send
    sendOTP();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const sendOTP = async () => {
    setIsResending(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, method })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send code");
      
      setTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1]; // Only take last char
    if (!/^\d*$/.test(value)) return; // Only numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 10);
    }

    // Auto-submit if all filled
    if (newOtp.every(digit => digit !== '')) {
      setTimeout(() => {
        verifyOTP(newOtp.join(''));
      }, 50);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 10);
    }
  };

  const verifyOTP = async (code: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp: code })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Verification failed");
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      // Clear OTP on error
      // setOtp(['', '', '', '', '', '']);
      // inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 py-4 max-w-sm mx-auto text-center">
      <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400">
        {method === 'email' ? <Mail className="w-8 h-8" /> : <Smartphone className="w-8 h-8" />}
      </div>

      <div>
        <h4 className="font-bold text-xl">Verification Required</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          We sent a 6-digit verification code to your {method === 'email' ? 'email' : 'phone'}
          {email && <span className="block font-medium text-gray-700 dark:text-gray-300">{email}</span>}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              "w-10 h-12 border-2 rounded-lg text-center font-bold text-lg transition-all",
              digit ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" : "border-gray-200 dark:border-gray-700",
              error ? "border-red-500" : ""
            )}
            disabled={isLoading}
          />
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-xs text-red-500 font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={sendOTP}
        disabled={!canResend || isResending}
        className={cn(
          "flex items-center gap-2 text-sm transition-colors",
          canResend ? "text-cyan-600 hover:text-cyan-700 font-medium cursor-pointer" : "text-gray-400 cursor-not-allowed"
        )}
      >
        <RefreshCcw className={cn("w-4 h-4", isResending && "animate-spin")} />
        {canResend ? "Resend Code" : `Resend in ${timer}s`}
      </button>

      {isLoading && (
        <div className="flex items-center gap-2 text-cyan-600 animate-pulse text-sm font-medium">
          <ShieldCheck className="w-4 h-4" />
          Verifying code...
        </div>
      )}
    </div>
  );
}
