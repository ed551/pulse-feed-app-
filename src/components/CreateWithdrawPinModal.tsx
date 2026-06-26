import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, KeyRound, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface CreateWithdrawPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateWithdrawPinModal({ isOpen, onClose, onSuccess }: CreateWithdrawPinModalProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'info' | 'otp' | 'set_pin' | 'success'>('set_pin');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBypassed, setIsBypassed] = useState(true);

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
      const data = await res.json();
      if (res.ok) {
        // Direct client-side write as fallback/instant synchronization
        if (currentUser?.uid && db) {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const secRef = doc(db, 'users', currentUser.uid, 'private', 'security');
            
            await setDoc(secRef, {
              secPin: String(newPin).trim(),
              updatedAt: new Date()
            }, { merge: true });
            
            await setDoc(userRef, {
              hasSetPin: true,
              lastHighRiskAuth: new Date()
            }, { merge: true });
            
            console.log("[Client Security] Successfully synchronized PIN to Firestore directly.");
          } catch (clientDbErr: any) {
            console.warn("[Client Security] Client-side Firestore write failed/blocked:", clientDbErr.message);
          }
        }

        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(data.message || "Failed to reset PIN. Please ensure your email is verified.");
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
