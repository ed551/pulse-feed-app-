import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { apiFetch } from '../lib/api';
import { Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PasskeyAuth() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const type = searchParams.get('type') || 'auth'; // 'auth' or 'reg'
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!userId) {
      setError("User ID is missing");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      if (type === 'reg') {
        // Registration Flow
        const resp = await apiFetch('/api/auth/passkey/generate-registration-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const options = await resp.json();
        if (options.error) throw new Error(options.error);

        console.log("[Passkey Registration] Starting startRegistration with options:", options);
        // @simplewebauthn/browser v10+ startRegistration handles JSON options
        const regResp = await startRegistration({
          ...options,
        });

        const verifyResp = await apiFetch('/api/auth/passkey/verify-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, response: regResp }),
        });
        const verification = await verifyResp.json();
        if (verification.verified) {
          setStatus('success');
          window.opener?.postMessage({ type: 'passkey-success', flow: 'registration' }, window.location.origin);
          setTimeout(() => window.close(), 2000);
        } else {
          throw new Error(verification.error || "Registration verification failed");
        }
      } else {
        // Authentication Flow
        const resp = await apiFetch('/api/auth/passkey/generate-authentication-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const options = await resp.json();
        if (options.error) throw new Error(options.error);

        console.log("[Passkey Authentication] Starting startAuthentication with options:", options);
        // @simplewebauthn/browser v10+ startAuthentication handles JSON options
        const authResp = await startAuthentication({
          ...options,
        });

        const verifyResp = await apiFetch('/api/auth/passkey/verify-authentication', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, response: authResp }),
        });
        const verification = await verifyResp.json();
        if (verification.verified) {
          setStatus('success');
          window.opener?.postMessage({ type: 'passkey-success', flow: 'authentication' }, window.location.origin);
          setTimeout(() => window.close(), 2000);
        } else {
          throw new Error(verification.error || "Authentication verification failed");
        }
      }
    } catch (e: any) {
      console.error("[Passkey Ceremony] Error:", e);
      // Detailed error for debugging
      const errorMsg = e.message || "An unexpected error occurred during passkey ceremony.";
      const detailMsg = e.stack ? `\nStack: ${e.stack}` : '';
      setError(errorMsg + detailMsg);
      setStatus('error');
    }
  };

  useEffect(() => {
    // Auto-start ceremony in the popup
    const timer = setTimeout(() => {
      handleProcess();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {status === 'loading' ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : status === 'success' ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            ) : status === 'error' ? (
              <AlertCircle className="w-10 h-10 text-red-500" />
            ) : (
              <ShieldCheck className="w-10 h-10" />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">
            {type === 'reg' ? 'Passkey Registration' : 'Passkey Verification'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {status === 'loading' ? 'Communicating with your device sensor...' : 
             status === 'success' ? 'Verification successful! Closing window...' :
             status === 'error' ? 'Something went wrong.' :
             'Follow your device prompts to continue.'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={handleProcess}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all"
          >
            Try Again
          </button>
        )}

        {status === 'success' && (
          <button
            onClick={() => window.close()}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold"
          >
            Return to App
          </button>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          <ShieldCheck className="w-3 h-3" />
          Pulse Secure Auth
        </div>
      </div>
    </div>
  );
}
