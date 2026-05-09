import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface PasskeyModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasskeyModal({ userId, onClose, onSuccess }: PasskeyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Get options from server
      const resp = await fetch('/api/auth/passkey/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      // 2. Start authentication in browser
      const authResp = await startAuthentication(options);

      // 3. Verify with server
      const verifyResp = await fetch('/api/auth/passkey/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          response: authResp,
        }),
      });

      const verification = await verifyResp.json();
      if (verification.verified) {
        onSuccess();
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (e: any) {
      console.error("[Passkey Auth] Error:", e);
      if (e.name === 'NotAllowedError') {
        setError("Authentication cancelled or timed out.");
      } else if (e.name === 'SecurityError' || e.message?.includes('feature is not enabled')) {
        setError("🔒 PREVIEW BLOCKED: Passkeys cannot be used inside this frame. Please click 'Open in New Tab' at the top of AI Studio.");
      } else {
        setError(e.message || "Failed to authenticate with passkey.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-start authentication on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 py-4 max-w-sm mx-auto text-center">
      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 relative">
        {isLoading ? (
          <Loader2 className="w-10 h-10 animate-spin" />
        ) : (
          <Key className="w-10 h-10" />
        )}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-indigo-100 dark:border-indigo-900 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>
      </div>

      <div>
        <h4 className="font-bold text-xl">Passkey Security</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Use your biometric sensor or security key to verify your identity.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full space-y-3">
        <button
          onClick={handleAuthenticate}
          disabled={isLoading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Verrifying..." : "Try Again"}
        </button>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="text-[10px] text-gray-400 flex items-center gap-2">
        <ShieldCheck className="w-3 h-3" />
        FIDO2 / WebAuthn Certified Security
      </div>
    </div>
  );
}
