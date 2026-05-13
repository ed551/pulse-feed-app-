import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, RefreshCw, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function VerifyEmail() {
  const { currentUser, sendVerificationEmail, checkEmailVerification, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.emailVerified) {
      navigate('/');
    }

    // Set up a polling interval
    const interval = setInterval(async () => {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setSuccess('Email verified! Redirecting...');
        clearInterval(interval);
        setTimeout(() => navigate('/'), 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser, checkEmailVerification, navigate]);

  const handleResend = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await sendVerificationEmail();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    try {
      setChecking(true);
      setError('');
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setSuccess('Verification confirmed! Redirecting...');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError('Email not yet verified. Please check your inbox and click the link.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <div className="mx-auto h-20 w-20 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-3xl flex items-center justify-center">
            <Mail className="h-10 w-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Check Your Inbox</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We've sent a verification link to <span className="font-bold text-gray-900 dark:text-white">{currentUser?.email}</span>
            </p>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0" />
              <div className="text-left space-y-1">
                <p className="text-xs font-bold text-orange-900 dark:text-orange-300">Why verify?</p>
                <p className="text-[10px] text-orange-800 dark:text-orange-400 leading-relaxed font-medium">
                  Verification ensures account safety and unlocks premium features like withdrawals and rewards conversion.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[11px] text-red-700 dark:text-red-400 text-left font-bold">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-xl flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-[11px] text-green-700 dark:text-green-400 text-left font-bold">{success}</p>
              </div>
            )}

            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full py-4 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            >
              {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : <>I've verified my email <ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Resend Verification Email
              </button>
              
              <button
                onClick={() => logout()}
                className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Sign out and use another email
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
