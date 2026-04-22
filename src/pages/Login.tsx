import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, ShieldAlert, Fingerprint, AlertCircle, ExternalLink, MoreHorizontal, Share2, Mail, Lock, User as UserIcon, ArrowRight, UserPlus } from 'lucide-react';
import { isBiometricsSupported, authenticateBiometric } from '../lib/biometrics';

export default function Login() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, isFacebookApp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  // New auth states
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    setBiometricSupported(isBiometricsSupported());
  }, []);

  const from = location.state?.from?.pathname || "/";

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !name) {
      setError('Please enter your name');
      return;
    }

    try {
      setError('');
      setLoading(true);
      if (mode === 'signup') {
        await signupWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      // Only navigate if we're not in a redirect flow (since redirect won't return here immediately)
      if (!isFacebookApp) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      if (!isFacebookApp) {
        setLoading(false);
      }
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await authenticateBiometric();
      // In a real app, you'd verify the credential with your backend here
      navigate(from, { replace: true });
    } catch (err: any) {
      setError('Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div>
          <div className="mx-auto h-12 w-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {mode === 'login' 
              ? 'Sign in to access your secure profile' 
              : 'Join the community and start earning'}
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-gray-500'}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-gray-500'}`}
          >
            SIGN UP
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-[11px] text-red-700 dark:text-red-400 leading-tight">{error}</p>
          </div>
        )}

        {isFacebookApp && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Facebook/Instagram Detected</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                In-app browsers often block modern login flows. If "Sign in with Google" fails, please click the <MoreHorizontal className="inline w-3 h-3 mx-0.5 align-middle" /> or <Share2 className="inline w-3 h-3 mx-0.5 align-middle" /> icon and select <strong>"Open in Browser"</strong> (Chrome/Safari).
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-gray-400 bg-white dark:bg-gray-800 px-4">
            Or continue with
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-gray-100 dark:border-gray-700 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-orange-500 group-hover:text-orange-400" aria-hidden="true" />
            </span>
            {loading ? 'Processing...' : 'Google Account'}
          </button>
          
          {biometricSupported && (
            <button
              onClick={handleBiometricLogin}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Fingerprint className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
              </span>
              {loading ? 'Authenticating...' : 'Sign in with Biometrics'}
            </button>
          )}
        </div>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                Secure Authentication
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
