import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, ShieldAlert, Fingerprint, AlertCircle, ExternalLink, MoreHorizontal, Share2, Mail, Lock, User as UserIcon, ArrowRight, UserPlus, Smartphone, ShieldCheck, ChevronLeft, Shield, QrCode, Copy, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { isBiometricsSupported, authenticateBiometric } from '../lib/biometrics';

export default function Login() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, logout, isFacebookApp, currentUser, userData, isMfaVerified, setIsMfaVerified, sessionError, setSessionError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionError) {
      setError(sessionError);
      // Clear the error from global state so it doesn't linger after display
      setSessionError(null);
    }
  }, [sessionError, setSessionError]);
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  // New auth states
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // 2FA states
  const [mfaStep, setMfaStep] = useState<'none' | 'challenge'>('none');
  const [mfaType, setMfaType] = useState<'email_otp' | 'biometric' | 'totp'>('email_otp');
  const [phone, setPhone] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'email' | 'biometric' | 'totp'>('email');

  useEffect(() => {
    setBiometricSupported(isBiometricsSupported());
    // Auto-select biometric if supported and we're in 2FA step
    if (isBiometricsSupported() && signupStep === 2) {
      setMfaType('biometric');
    }
  }, [signupStep]);

  // Handle MFA requirement detection
  useEffect(() => {
    if (currentUser && !isMfaVerified && userData) {
      setMfaStep('challenge');
      const method = userData.twoFactorType === 'biometric' ? 'biometric' : 
                     userData.twoFactorType === 'totp' ? 'totp' : 'email';
      setMfaMethod(method as any);
    }
  }, [currentUser, isMfaVerified, userData, setIsMfaVerified]);

  useEffect(() => {
    if (mode === 'signup' && signupStep === 2 && mfaType === 'totp' && !totpSecret) {
      // Generate a random base32-like secret for simulation
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';
      let secret = '';
      for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setTotpSecret(secret);
    }
  }, [mode, signupStep, mfaType, totpSecret]);

  const from = location.state?.from?.pathname || "/";

  const sendOtp = async () => {
    if (!currentUser) return;
    try {
      setIsSendingOtp(true);
      setError('');
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
          method: mfaMethod
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to send verification code');
      
      // If in dev/sim mode, the OTP is returned in devOtp
      if (data.devOtp) {
        console.log(`[DEVEL] Verification code: ${data.devOtp}`);
        // We could auto-fill or just alert for user convenience in this environment
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError('');
      const cleanOtp = otp.replace(/\s+/g, '').replace(/\D/g, '');
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.uid, 
          otp: cleanOtp,
          secret: userData?.twoFactorSecret || totpSecret
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Invalid verification code');
      
      setIsMfaVerified(true);
      navigate(from, { replace: true });
    } catch (err: any) {
      let displayError = err.message || 'Invalid verification code';
      
      // Specifically handle the "Cloud Firestore API not used" error
      if (displayError.includes('PERMISSION_DENIED') || displayError.includes('7')) {
        displayError = "🕒 DATABASE SETUP IN PROGRESS: Google is still activating the database for your project. Please wait 5 minutes, or click 'Skip for now' below to enter the app immediately.";
      }
      
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaBiometric = async () => {
    try {
      setLoading(true);
      setError('');
      await authenticateBiometric();
      setIsMfaVerified(true);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mfaStep === 'challenge') {
      if (mfaMethod === 'biometric') {
        handleMfaBiometric();
      } else {
        verifyOtp();
      }
      return;
    }
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && signupStep === 1 && !name) {
      setError('Please enter your name');
      return;
    }

    if (mode === 'signup' && signupStep === 1) {
      setSignupStep(2);
      return;
    }

    if (mode === 'signup' && signupStep === 2 && !mfaType) {
      setError('Please select a security method');
      return;
    }

    try {
      setError('');
      setLoading(true);
      if (mode === 'signup') {
        const isSkipping = signupStep === 2 && !mfaType;
        await signupWithEmail(email, password, name, isSkipping ? undefined : { 
          type: mfaType as any, 
          secret: mfaType === 'totp' ? totpSecret : undefined
        });
      } else {
        await loginWithEmail(email, password);
      }
      // Note: We no longer navigate here. The useEffect logic will detect if MFA is required
      // or if it's already verified and then navigate.
    } catch (err: any) {
      let displayError = err.message || 'Failed to authenticate';
      
      // Handle stringified JSON error objects
      const trimmedError = displayError.trim();
      if (trimmedError.startsWith('{') && trimmedError.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedError);
          displayError = parsed.error || displayError;
        } catch (e) {
          // Fallback
        }
      }

      // Specific handling for unauthorized-domain (case insensitive and partial match)
      if (displayError.toLowerCase().includes('unauthorized-domain') || displayError.toLowerCase().includes('unauthorized domain')) {
        const currentDomain = window.location.hostname;
        displayError = `🔒 SECURITY ERROR: The domain "${currentDomain}" is not authorized. 

To fix this:
1. Go to your Firebase Console
2. Open Authentication > Settings > Authorized Domains
3. Click "Add domain" and paste: ${currentDomain}
4. Refresh this page and try again.`;
      }

      setError(displayError);
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
      // and if MFA is not required.
      if (!isFacebookApp && isMfaVerified) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      let displayError = err.message || 'Failed to sign in';
      
      // Handle stringified JSON error objects
      const trimmedError = displayError.trim();
      if (trimmedError.startsWith('{') && trimmedError.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedError);
          displayError = parsed.error || displayError;
        } catch (e) {
          // Fallback
        }
      }

      if (displayError.toLowerCase().includes('unauthorized-domain') || displayError.toLowerCase().includes('unauthorized domain')) {
        const currentDomain = window.location.hostname;
        displayError = `🔒 SECURITY ERROR: The domain "${currentDomain}" is not authorized. 

To fix this:
1. Go to your Firebase Console
2. Open Authentication > Settings > Authorized Domains
3. Click "Add domain" and paste: ${currentDomain}
4. Refresh this page and try again.`;
      }

      setError(displayError);
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
        {mfaStep === 'challenge' ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-2xl flex items-center justify-center mb-2">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Check</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
                Please verify your identity using the method you selected during registration.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600">
                  {mfaMethod === 'biometric' ? <Fingerprint className="w-5 h-5" /> : 
                   mfaMethod === 'totp' ? <ShieldCheck className="w-5 h-5" /> :
                   <Mail className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">{mfaMethod} Verification</p>
                  <p className="text-[10px] text-gray-500">
                    {mfaMethod === 'biometric' ? 'Use face/fingerprint authentication' : 
                     mfaMethod === 'totp' ? 'Enter the code from Google Authenticator' :
                     'Check your inbox for a 6-digit code'}
                  </p>
                </div>
              </div>

              {mfaMethod !== 'biometric' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold tracking-[0.5em]"
                    />
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-2 rounded-md">
                      <p className="text-[10px] text-red-700 dark:text-red-400 leading-tight">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={verifyOtp}
                      disabled={loading || otp.length < 6}
                      className="w-full py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-all disabled:opacity-50"
                    >
                      {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div> : 'Verify & Sign In'}
                    </button>
                    <button
                      onClick={sendOtp}
                      disabled={isSendingOtp}
                      className="w-full py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-orange-600 transition-colors"
                    >
                      {isSendingOtp ? 'Sending code...' : 'Resend Code'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleMfaBiometric}
                  disabled={loading}
                  className="w-full py-4 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Fingerprint className="w-5 h-5" /> Authenticate Now</>}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => {
                  setIsMfaVerified(true);
                  navigate(from, { replace: true });
                }}
                className="w-full text-xs font-black text-orange-600 uppercase tracking-widest hover:opacity-80 transition-opacity"
              >
                Skip for now
              </button>
              <button
                onClick={async () => {
                  await logout();
                  setMfaStep('none');
                }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel and Sign Out
              </button>
            </div>
          </div>
        ) : (
          <>
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
            onClick={() => { setMode('login'); setSignupStep(1); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-gray-500'}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => { setMode('signup'); setSignupStep(1); }}
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
          {mode === 'signup' && signupStep === 1 && (
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

          {mode === 'signup' && signupStep === 2 && (
            <div className="space-y-4 py-2">
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="flex items-center gap-1 text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4 hover:opacity-70 transition-opacity"
              >
                <ChevronLeft className="w-3 h-3" /> Back
              </button>
              
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Secure Your Account</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Select how you'd like to verify your identity during logins.</p>
              
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setMfaType('email_otp')}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${mfaType === 'email_otp' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}
                >
                  <div className={`p-2 rounded-lg ${mfaType === 'email_otp' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Email OTP</p>
                    <p className="text-[10px] text-gray-500">Fast & reliable via inbox</p>
                  </div>
                </button>

                {biometricSupported && (
                  <button
                    type="button"
                    onClick={() => setMfaType('biometric')}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${mfaType === 'biometric' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}
                  >
                    <div className={`p-2 rounded-lg ${mfaType === 'biometric' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Biometric Login</p>
                      <p className="text-[10px] text-gray-500">Face or Fingerprint unlock</p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMfaType('totp')}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${mfaType === 'totp' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700'}`}
                >
                  <div className={`p-2 rounded-lg ${mfaType === 'totp' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Google Authenticator (App)</p>
                    <p className="text-[10px] text-gray-500">Industry standard safety</p>
                  </div>
                </button>
              </div>

               {mfaType === 'totp' && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-900/30 animate-in fade-in slide-in-from-top-1 text-center">
                  <p className="text-xs font-bold text-orange-800 dark:text-orange-300 mb-3">Authenticator Setup</p>
                  
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                      <QRCodeSVG 
                        value={`otpauth://totp/PulseFeeds:${email}?secret=${totpSecret}&issuer=PulseFeeds`}
                        size={150}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-orange-700 dark:text-orange-400 mb-3 leading-relaxed">
                    Scan with Google Authenticator or enter the key below
                  </p>
                  
                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-orange-200 dark:border-orange-800 flex items-center justify-between">
                    <code className="text-xs font-mono font-bold tracking-wider text-orange-600 dark:text-orange-500">{totpSecret}</code>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSecret);
                      }}
                      className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    setLoading(true);
                    try {
                      await signupWithEmail(email, password, name);
                    } catch (err: any) {
                      setError(err.message || 'Signup failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {(mode === 'login' || (mode === 'signup' && signupStep === 1)) && (
            <>
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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : signupStep === 1 ? 'Continue' : 'Complete Setup'}
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
      </>
    )}
      </div>
    </div>
  );
}
