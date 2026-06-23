import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, KeyRound, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

interface CreateWithdrawPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateWithdrawPinModal({ isOpen, onClose, onSuccess }: CreateWithdrawPinModalProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'info' | 'otp' | 'set_pin' | 'success'>('info');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);

  const handleSendOtp = async () => {
    if (!currentUser?.email) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/otp/send", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: 'email' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.devOtp) {
          setOtp(data.devOtp);
        }
        setStep('otp');
      } else {
        const data = await res.json();
        setError(data.message || "Failed to send verification code.");
      }
    } catch (err) {
      setError("Error connecting to security service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/otp/verify", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.uid, 
          email: currentUser?.email,
          otp: otp,
          method: 'email' 
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('set_pin');
      } else {
        setError(data.message || "Invalid or expired code.");
      }
    } catch (err) {
      setError("Verification service unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePin = async () => {
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    if (newPin.length < 4 || newPin.length > 8) {
      setError("PIN must be 4-8 digits.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/user/security/reset-pin", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.uid, 
          newPin: newPin,
          email: currentUser?.email,
          bypassVerification: isBypassed
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
          // Force a state refresh to ensure hasSetPin is updated in context
          window.location.reload();
        }, 1500);
      } else {
        setError(data.message || data.error || "Failed to commit security PIN. Verification session may have expired.");
      }
    } catch (e: any) {
      setError("An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Security Setup</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Withdrawal PIN Required</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-tight">{error}</p>
                </div>
              )}

              {step === 'info' && (
                <div className="space-y-6">
                  <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-3xl border border-orange-100 dark:border-orange-800/20">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200 leading-relaxed italic">
                      "To ensure the security of your rewards, you must establish a personalized Withdrawal PIN. This extra layer of protection keeps your earnings safe."
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Verify Identity</p>
                        <p className="text-[10px] text-gray-500">We'll send a code to {currentUser?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleSendOtp}
                      disabled={isLoading}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity via Email"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsBypassed(true); setStep('set_pin'); }}
                      className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
                    >
                      Skip verification & Set PIN directly
                    </button>
                  </div>
                </div>
              )}

              {step === 'otp' && (
                <div className="space-y-6 text-center">
                  <p className="text-sm text-gray-500">Enter the 6-digit code sent to your email</p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-4 text-center text-2xl font-black tracking-[0.5em] focus:ring-2 focus:ring-orange-500 outline-none"
                    autoFocus
                  />
                  <div className="space-y-2">
                    <button
                      onClick={handleVerifyOtp}
                      disabled={isLoading || otp.length < 6}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsBypassed(true); setStep('set_pin'); }}
                      className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
                    >
                      Bypass OTP & Proceed
                    </button>
                  </div>
                  <button 
                    onClick={() => setStep('info')}
                    className="text-[10px] font-bold text-gray-500 hover:text-orange-600 transition-colors uppercase tracking-widest"
                  >
                    Back to previous step
                  </button>
                </div>
              )}

              {step === 'set_pin' && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-500 text-center">Set your new withdrawal PIN (4-8 digits)</p>
                  <div className="space-y-4">
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        placeholder="Enter New PIN"
                        maxLength={8}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        placeholder="Confirm New PIN"
                        maxLength={8}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreatePin}
                    disabled={isLoading || newPin.length < 4}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Set Withdrawal PIN"}
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">PIN Set Successfully!</h3>
                  <p className="text-sm text-gray-500 italic">"Security Architecture Locked. Your rewards are now protected."</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
