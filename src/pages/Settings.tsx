import { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Lock, 
  Bell, 
  Eye, 
  Trash2, 
  ChevronRight, 
  Fingerprint, 
  Smartphone, 
  Mail, 
  UserCircle,
  ArrowLeft,
  Check,
  Loader2,
  Heart,
  Key,
  KeyRound,
  X,
  Sun,
  Moon,
  Monitor,
  Ban,
  Filter,
  Users2,
  AlertCircle,
  Languages,
  LogOut,
  ShieldCheck,
  Copy,
  Clock,
  Timer,
  Calendar,
  Globe,
  Activity
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { isIframe, getPasskeyErrorLinkMessage, checkPasskeyCapability } from "../lib/iframeUtils";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../lib/i18n";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import FingerprintModal from "../components/tools/FingerprintModal";
import OTPModal from "../components/tools/OTPModal";
import PasskeyModal from "../components/tools/PasskeyModal";
import { cn } from "../lib/utils";
import { apiFetch } from "../lib/api";

export default function Settings() {
  const { currentUser, userData, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  // Form states
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPasskeyAuthenticating, setIsPasskeyAuthenticating] = useState(false);
  const [passkeyAuthorized, setPasskeyAuthorized] = useState(false);
  const [language, setLanguage] = useState(userData?.language || "en");
  const [timezone, setTimezone] = useState(userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timeFormat, setTimeFormat] = useState(userData?.timeFormat || "24h");
  const [dateFormat, setDateFormat] = useState(userData?.dateFormat || "DD/MM/YYYY");
  const [isSportsWatchPrecise, setIsSportsWatchPrecise] = useState(userData?.isSportsWatchPrecise ?? true);
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || "");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [healthInterval, setHealthInterval] = useState(() => localStorage.getItem('pulse_health_interval') || 'daily');
  const [newsInterval, setNewsInterval] = useState(() => localStorage.getItem('pulse_news_interval') || '1h');
  const [idleThreshold, setIdleThreshold] = useState(() => localStorage.getItem('pulse_idle_threshold') || '300000');

  const updateHealthInterval = (val: string) => {
    setHealthInterval(val);
    localStorage.setItem('pulse_health_interval', val);
  };

  const updateNewsInterval = (val: string) => {
    setNewsInterval(val);
    localStorage.setItem('pulse_news_interval', val);
  };

  const updateIdleThreshold = (val: string) => {
    setIdleThreshold(val);
    localStorage.setItem('pulse_idle_threshold', val);
    window.dispatchEvent(new CustomEvent('pulse-idle-threshold-update'));
  };

  // New settings states
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>((userData?.theme as 'light' | 'dark' | 'system') || "system");
  const [activeSessions, setActiveSessions] = useState<string[]>(userData?.activeSessions || []);
  const [passkeyBlocked, setPasskeyBlocked] = useState(false);
  const [showPinOtp, setShowPinOtp] = useState(false);
  const [pinEmailVerified, setPinEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    const checkCap = async () => {
      const cap = await checkPasskeyCapability();
      if (!cap.supported && cap.reason === 'blocked_by_iframe') {
        setPasskeyBlocked(true);
      }
    };
    checkCap();
  }, []);

  useEffect(() => {
    if (userData?.activeSessions) {
      setActiveSessions(userData.activeSessions);
    }
  }, [userData?.activeSessions]);

  const clearOtherSessions = async () => {
    if (!currentUser || !db) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const mySessionId = sessionStorage.getItem('pulse_session_id');
      await updateDoc(userRef, {
        activeSessions: mySessionId ? [mySessionId] : []
      });
    } catch (err) {
      console.error('Failed to clear sessions:', err);
    }
  };
  const [contentFilters, setContentFilters] = useState(userData?.contentFilters || {
    sensitiveContent: false,
    spamFilter: true,
    directMessagePrivacy: "everyone" as const,
    photoVisibility: "everyone" as const,
    publicProfile: true,
    allowFollowers: true
  });

  useEffect(() => {
    if (currentUser?.displayName) setDisplayName(currentUser.displayName);
    if (currentUser?.email) setEmail(currentUser.email);
    
    if (userData) {
      setLanguage(userData.language || "en");
      setTimezone(userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setTimeFormat(userData.timeFormat || "24h");
      setDateFormat(userData.dateFormat || "DD/MM/YYYY");
      setIsSportsWatchPrecise(userData.isSportsWatchPrecise ?? true);
      setPhoneNumber(userData.phoneNumber || "");
    }
  }, [currentUser, userData]);

  const handleSaveProfile = async () => {
    if (!currentUser || !db) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: displayName
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSensitiveAction = (action: string) => {
    setPendingAction(action);
    setShowFingerprintModal(true);
  };

  const handleFingerprintSuccess = async () => {
    setShowFingerprintModal(false);
    if (pendingAction === 'delete') {
      alert("Identity verified. Account deletion process initiated. You will be logged out shortly.");
      // In a real app, you'd call a backend function to delete the account
    } else if (pendingAction === 'security') {
      setActiveSection('security-details');
    } else if (pendingAction === 'verify_phone') {
      if (!currentUser || !db) return;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          phoneNumber: phoneNumber,
          phoneNumberVerified: true
        });
        alert("Phone number verified and linked!");
      } catch (err) {
        console.error(err);
        alert("Failed to link phone number.");
      }
    }
    setPendingAction(null);
  };

  const handleUpdate2FA = async (type: string) => {
    if (!currentUser || !db) return;
    
    // If it's a passkey and not registered, we handle registration first
    if (type === 'passkey' && !userData?.passkeyRegistered) {
      await handleRegisterPasskey();
      return;
    }

    if (type === 'sms' && !userData?.phoneNumber) {
      alert("Please provide and verify your phone number before enabling SMS 2FA.");
      return;
    }

    try {
      const updates: any = { twoFactorType: type };
      
      // If switching to TOTP and no secret exists, generate one
      if (type === 'totp' && !userData?.twoFactorSecret) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
          secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        updates.twoFactorSecret = secret;
      }

      await updateDoc(doc(db, 'users', currentUser.uid), updates);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterPasskey = async () => {
    if (!currentUser) return;
    
    if (isIframe()) {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        `#/passkey-auth?userId=${currentUser.uid}&type=reg`,
        'Passkey Registration',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'passkey-success' && event.data?.flow === 'registration') {
          window.removeEventListener('message', handleMessage);
          // Refresh user data is handled by Firestore listeners usually, 
          // but we can manually trigger a small alert or state change
          alert("Passkey Registered Successfully!");
        }
      };
      window.addEventListener('message', handleMessage);
      return;
    }

    if (!window.PublicKeyCredential) {
      alert("Biometric authentication is not supported by this browser.");
      return;
    }
    try {
      // 1. Get options from server
      const resp = await apiFetch('/api/auth/passkey/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.displayName,
        }),
      });

      const options = await resp.json();
      if (options.error) throw new Error(options.error);

      // 2. Start registration in browser
      const regResp = await startRegistration(options);

      // 3. Verify with server
      const verifyResp = await apiFetch('/api/auth/passkey/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          response: regResp,
          deviceName: navigator.userAgent.split(' ')[0] // Simple device name
        }),
      });

      const verification = await verifyResp.json();
      if (verification.verified && db) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          twoFactorType: 'passkey',
          passkeyRegistered: true
        });
        alert("Passkey Registered Successfully! Your 2FA is now set to Passkey.");
      } else if (verification.verified && !db) {
        alert("Passkey verified but database is unavailable. Please try again later.");
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (e: any) {
      console.error("[Passkey] Error:", e);
      if (e.name === 'NotAllowedError') {
        alert("Registration cancelled or timed out.");
      } else if (e.name === 'SecurityError' || e.message?.includes('feature is not enabled')) {
        alert("🔒 PREVIEW BLOCKED: Passkey registration is not allowed inside this preview frame. \n\nPlease click 'Open in New Tab' at the top of AI Studio to register your security key.");
      } else {
        alert(`Passkey Error: ${e.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    if (!currentUser || !db) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        twoFactorEnabled: enabled
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    if (!currentUser || !db) return;
    setTheme(newTheme);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        theme: newTheme
      });
      // Apply theme immediately for preview
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateFilters = async (key: string, value: any) => {
    if (!currentUser || !db) return;
    const newFilters = { ...contentFilters, [key]: value };
    setContentFilters(newFilters);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        contentFilters: newFilters
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLocale = async (key: 'language' | 'timezone' | 'timeFormat' | 'dateFormat' | 'isSportsWatchPrecise', value: any) => {
    if (!currentUser || !db) return;
    if (key === 'language') setLanguage(value);
    if (key === 'timezone') setTimezone(value);
    if (key === 'timeFormat') setTimeFormat(value as string);
    if (key === 'dateFormat') setDateFormat(value as string);
    if (key === 'isSportsWatchPrecise') setIsSportsWatchPrecise(value as boolean);
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        [key]: value
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnblock = async (id: string, type: 'user' | 'group') => {
    if (!currentUser || !db) return;
    try {
      const field = type === 'user' ? 'blockedUsers' : 'blockedGroups';
      const currentList = userData?.[field] || [];
      const newList = currentList.filter((item: string) => item !== id);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        [field]: newList
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sections = [
    {
      id: 'health',
      title: 'Health & Sessions',
      description: 'Wellness check-ins, news delivery, and session timeout controls.',
      icon: <Activity className="w-5 h-5 text-rose-500" />,
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6 bg-rose-50/30 dark:bg-rose-900/10 rounded-[2rem] border border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Community Health & News</h3>
                <p className="text-xs text-gray-500">Manage your wellness check-ins and delivery frequency.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Check-in Interval</h4>
                  <p className="text-[10px] text-gray-500">Frequency of fingerprint prompts</p>
                </div>
                <select 
                  value={healthInterval}
                  onChange={(e) => updateHealthInterval(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-rose-500"
                >
                  <option value="30m">Every 30 Minutes</option>
                  <option value="1h">Every 1 Hour</option>
                  <option value="2h">Every 2 Hours</option>
                  <option value="3h">Every 3 Hours</option>
                  <option value="4h">Every 4 Hours</option>
                  <option value="5h">Every 5 Hours</option>
                  <option value="6h">Every 6 Hours</option>
                  <option value="12h">Every 12 Hours</option>
                  <option value="daily">Daily (Standard)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">News Delivery</h4>
                  <p className="text-[10px] text-gray-500">How often the feed refreshes</p>
                </div>
                <select 
                  value={newsInterval}
                  onChange={(e) => updateNewsInterval(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="30m">Every 30 Minutes</option>
                  <option value="1h">Every Hour</option>
                  <option value="6h">Every 6 Hours</option>
                  <option value="daily">Daily Digestion</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Biometric Precision</h4>
                  <p className="text-[10px] text-gray-500">Neural texture analysis level</p>
                </div>
                <button className="w-10 h-5 bg-rose-600 rounded-full flex items-center px-1">
                  <div className="w-3 h-3 bg-white rounded-full ml-auto" />
                </button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-800">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-relaxed text-center italic">
                VALUE DRIVEN DELIVERY: Consistent check-ins and reading community news contributes to the "Wellness Architecture".
              </p>
            </div>
          </div>

          <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Session Architecture</h3>
                <p className="text-xs text-gray-500">Security protocol: Max 2 concurrent sessions.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Active Sessions</h4>
                  <p className="text-[10px] text-gray-500">{activeSessions.length} of 2 slots occupied</p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className={cn(
                      "w-3 h-3 rounded-full",
                      i < activeSessions.length ? "bg-indigo-500 animate-pulse" : "bg-gray-200 dark:bg-gray-700"
                    )} />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Session Timeout</h4>
                  <p className="text-[10px] text-gray-500">Auto-lock after period of inactivity</p>
                </div>
                <select 
                  value={idleThreshold}
                  onChange={(e) => updateIdleThreshold(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="60000">1 Minute</option>
                  <option value="300000">5 Minutes</option>
                  <option value="900000">15 Minutes</option>
                  <option value="1800000">30 Minutes</option>
                  <option value="3600000">1 Hour</option>
                  <option value="14400000">4 Hours</option>
                  <option value="86400000">24 Hours</option>
                  <option value="31536000000">Never (1 Year)</option>
                </select>
              </div>

              {activeSessions.length > 1 && (
                <button 
                  onClick={clearOtherSessions}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Terminate Other Sessions
                </button>
              )}
            </div>
          </div>
        </div>
      )
    },

    {
      id: 'personal',
      title: t('personal_info'),
      description: t('personal_info_desc'),
      icon: <UserCircle className="w-5 h-5 text-blue-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('display_name')}</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('email_address')}</label>
            <input 
              type="email" 
              value={email}
              disabled
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400">{t('email_security_desc')}</p>
          </div>
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || displayName === currentUser?.displayName}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
            {saveSuccess ? t('saved_successfully') : t('save_changes')}
          </button>
        </div>
      )
    },
    {
      id: 'appearance',
      title: t('theme_appearance'),
      description: t('theme_appearance_desc'),
      icon: <Sun className="w-5 h-5 text-yellow-500" />,
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('interface_theme')}</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', icon: Sun, label: t('light') },
                { id: 'dark', icon: Moon, label: t('dark') },
                { id: 'system', icon: Monitor, label: t('system') }
              ].map((t_item) => (
                <button
                  key={t_item.id}
                  onClick={() => handleUpdateTheme(t_item.id as 'light' | 'dark' | 'system')}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all",
                    theme === t_item.id 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600" 
                      : "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-blue-200"
                  )}
                >
                  <t_item.icon className="w-5 h-5 mb-2" />
                  <span className="text-xs font-medium">{t_item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'device-locale',
      title: t('device_global_config'),
      description: t('device_global_config_desc'),
      icon: <Globe className="w-5 h-5 text-emerald-500" />,
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('language_region')}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                  <Languages className="w-3 h-3" />
                  {t('app_language')}
                </p>
                <select 
                  value={language}
                  onChange={(e) => handleUpdateLocale('language', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option value="en">English (Global)</option>
                  <option value="sw">Swahili</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  {t('time_zone')}
                </p>
                <select 
                  value={timezone}
                  onChange={(e) => handleUpdateLocale('timezone', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option value="Africa/Nairobi">{t('eat_nairobi')}</option>
                  <option value="UTC">{t('utc_global')}</option>
                  <option value="Europe/London">{t('gmt_london')}</option>
                  <option value="America/New_York">{t('est_new_york')}</option>
                  <option value="Asia/Tokyo">{t('jst_tokyo')}</option>
                  <option value="Asia/Dubai">{t('gst_dubai')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('clock_watch_settings')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleUpdateLocale('timeFormat', timeFormat === '12h' ? '24h' : '12h')}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-emerald-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold">{timeFormat.toUpperCase()} {t('time_format')}</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", timeFormat === '24h' ? "bg-emerald-500" : "bg-gray-300")} />
              </button>

              <button
                onClick={() => handleUpdateLocale('dateFormat', dateFormat === 'DD/MM/YYYY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY')}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-emerald-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold">{t('date_style')}</span>
                </div>
                <span className="text-[9px] font-black opacity-50">{dateFormat}</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('sports_watch_precision')}</p>
                  <p className="text-[10px] text-gray-500">Enable millisecond precision for athletics</p>
                </div>
              </div>
              <button 
                onClick={() => handleUpdateLocale('isSportsWatchPrecise', !isSportsWatchPrecise)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-colors",
                  isSportsWatchPrecise ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                  isSportsWatchPrecise ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('active_alarms')}</p>
                  <p className="text-[10px] text-gray-500">Check and manage your wake-up calls</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/')} // Redirect to dashboard to access clock tool
                className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg text-[10px] font-bold"
              >
                {t('open_clock')}
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: t('security_privacy'),
      description: t('security_privacy_desc'),
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('two_factor_auth')}</h4>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Security PIN (SCA)</h4>
                        {!userData?.hasSetPin && (
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-[8px] font-black text-red-600 dark:text-red-400 rounded-md uppercase tracking-widest animate-pulse">
                            NOT SET
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500">The 4-8 digit key required for all withdrawals.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 pl-1">Verification</label>
                      {passkeyAuthorized || pinEmailVerified ? (
                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          {passkeyAuthorized ? "Authenticated via Passkey" : "Verified via Email"}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input 
                            type="password" 
                            id="userCurrentPin"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Current PIN"
                          />
                          <div className="flex flex-col gap-1">
                            {userData?.passkeyRegistered && (
                              <button 
                                onClick={async () => {
                                  if (!currentUser) return;
                                  
                                  if (isIframe()) {
                                    const width = 500;
                                    const height = 600;
                                    const left = window.screenX + (window.outerWidth - width) / 2;
                                    const top = window.screenY + (window.outerHeight - height) / 2;
                                    
                                    const popup = window.open(
                                      `#/passkey-auth?userId=${currentUser.uid}&type=auth`,
                                      'Passkey Authentication',
                                      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
                                    );

                                    const handleMessage = (event: MessageEvent) => {
                                      if (event.origin !== window.location.origin) return;
                                      if (event.data?.type === 'passkey-success') {
                                        setPasskeyAuthorized(true);
                                        window.removeEventListener('message', handleMessage);
                                      }
                                    };
                                    window.addEventListener('message', handleMessage);
                                    return;
                                  }

                                  setIsPasskeyAuthenticating(true);
                                  try {
                                    // 1. Get options from server
                                    const resp = await apiFetch('/api/auth/passkey/generate-authentication-options', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: currentUser.uid }),
                                    });
                                    const options = await resp.json();
                                    if (options.error) throw new Error(options.error);

                                    // 2. Start authentication
                                    const authResp = await startAuthentication(options);

                                    // 3. Verify
                                    const verifyResp = await apiFetch('/api/auth/passkey/verify-authentication', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: currentUser.uid, response: authResp }),
                                    });
                                    const verification = await verifyResp.json();
                                    if (verification.verified) {
                                      setPasskeyAuthorized(true);
                                    } else {
                                      throw new Error(verification.error || "Verification failed");
                                    }
                                  } catch (e: any) {
                                    alert(`Auth Error: ${e.message}`);
                                  } finally {
                                    setIsPasskeyAuthenticating(false);
                                  }
                                }}
                                disabled={isPasskeyAuthenticating}
                                className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 text-center hover:underline"
                              >
                                {isPasskeyAuthenticating ? "Verifying..." : "Verify with Passkey"}
                              </button>
                            )}
                            <button 
                              onClick={async () => {
                                if (!currentUser?.email) return;
                                setIsSendingOtp(true);
                                try {
                                  const res = await apiFetch("/api/otp/send", {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: 'email' })
                                  });
                                  if (res.ok) {
                                    setPendingAction('reset_pin_email');
                                    setShowFingerprintModal(true);
                                  } else {
                                    alert("Failed to send OTP.");
                                  }
                                } catch (err) {
                                  alert("Error sending OTP.");
                                } finally {
                                  setIsSendingOtp(false);
                                }
                              }}
                              disabled={isSendingOtp}
                              className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 text-center hover:underline"
                            >
                              {isSendingOtp ? "Sending..." : "Verify with Email"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 pl-1">New PIN</label>
                      <input 
                        type="password" 
                        id="userNewPin"
                         className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="4-8 digits"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        const cur = (document.getElementById('userCurrentPin') as HTMLInputElement)?.value || "";
                        const next = (document.getElementById('userNewPin') as HTMLInputElement).value;
                        
                        if(!passkeyAuthorized && !pinEmailVerified && !cur) return alert("Validation Error: Please provide your current PIN, verify via Email, or verify with Passkey.");
                        if(!next) return alert("Validation Error: Please provide a new PIN.");
                        if(next.length < 4 || next.length > 8) return alert("Validation Error: PIN must be 4-8 digits.");
                        
                        try {
                          const res = await apiFetch("/api/user/security/update-pin", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              userId: currentUser?.uid, 
                              currentPin: cur, 
                              newPin: next,
                              usePasskey: passkeyAuthorized,
                              email: pinEmailVerified ? currentUser?.email : undefined
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert("Success: Your Security PIN has been rotated.");
                            if (document.getElementById('userCurrentPin')) {
                              (document.getElementById('userCurrentPin') as HTMLInputElement).value = "";
                            }
                            (document.getElementById('userNewPin') as HTMLInputElement).value = "";
                            setPasskeyAuthorized(false);
                            setPinEmailVerified(false);
                          } else {
                            alert(`Security Error: ${data.message}`);
                          }
                        } catch (e: any) {
                          alert(`Connection Error: ${e.message}`);
                        }
                      }}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 active:scale-95"
                    >
                      Update SEC-PIN
                    </button>
                    <button 
                      onClick={async () => {
                        if (!currentUser?.email) return;
                        setIsSendingOtp(true);
                        try {
                          const res = await apiFetch("/api/otp/send", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: 'email' })
                          });
                          if (res.ok) {
                            setPendingAction('reset_pin_email');
                            setShowFingerprintModal(true);
                          } else {
                            alert("Failed to send verification code.");
                          }
                        } catch (err) {
                          alert("Error connecting to security service.");
                        } finally {
                          setIsSendingOtp(false);
                        }
                      }}
                      className="px-4 py-3 bg-white dark:bg-gray-700 text-purple-600 border border-purple-200 dark:border-purple-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Forgot?
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 italic text-center">Default PIN is <span className="font-bold">123456</span> unless previously rotated.</p>
                </div>
              </div>

              {[
                { id: 'passkey', icon: ShieldCheck, label: 'Passkey (FIDO2)', desc: 'Secure biometric login', color: 'text-indigo-500' },
                { id: 'biometric', icon: Fingerprint, label: t('biometric_scanner'), desc: t('biometric_desc'), color: 'text-cyan-500' },
                { id: 'sms', icon: Smartphone, label: 'SMS Verification', desc: 'Verify via text message', color: 'text-emerald-500' },
                { id: 'email_otp', icon: Mail, label: t('email_otp'), desc: t('email_otp_desc'), color: 'text-blue-500' },
                { id: 'totp', icon: Shield, label: t('google_auth'), desc: t('totp_desc'), color: 'text-orange-500' }
              ].map(method => (
                <div key={`mfa-${method.id}`} className="space-y-2">
                  <button
                    onClick={() => handleUpdate2FA(method.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                      userData?.twoFactorType === method.id 
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" 
                        : "bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700 hover:border-indigo-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn("p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm", method.color)}>
                        <method.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {method.label}
                          {method.id === 'passkey' && userData?.passkeyRegistered && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider">
                              Registered
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {method.desc}
                        </p>
                      </div>
                    </div>
                    {userData?.twoFactorType === method.id && (
                      <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>

                  {userData?.twoFactorType === 'totp' && method.id === 'totp' && userData?.twoFactorSecret && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-xl mx-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-orange-100">
                          <QRCodeSVG 
                            value={`otpauth://totp/PulseFeeds:${userData.email}?secret=${userData.twoFactorSecret}&issuer=PulseFeeds`}
                            size={140}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">{t('scan_qr')}</p>
                          <p className="text-[9px] text-gray-500 max-w-[180px]">{t('scan_qr_desc')}</p>
                        </div>
                        
                        <div className="w-full space-y-1 mt-1">
                          <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider">{t('manual_entry')}</p>
                          <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-lg border border-orange-200 dark:border-orange-800 w-full">
                            <code className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-500 tracking-tighter">
                              {userData.twoFactorSecret}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(userData.twoFactorSecret || '');
                                // No toast library imported so using alert/console or assuming it might be there
                              }}
                              className="text-[9px] font-black text-gray-400 hover:text-orange-600 transition-colors uppercase"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {method.id === 'sms' && (
                    <div className="mx-2 mt-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-widest pl-1">Phone Number</label>
                          <div className="flex gap-2">
                            <input 
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+254 7..."
                              className="flex-1 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <button 
                              onClick={() => {
                                if (!phoneNumber) return alert("Please enter a phone number.");
                                setPendingAction('verify_phone');
                                setShowFingerprintModal(true);
                              }}
                              disabled={isVerifyingPhone || phoneNumber === userData?.phoneNumber}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                              {isVerifyingPhone ? "Sending..." : userData?.phoneNumber ? "Change" : "Verify"}
                            </button>
                          </div>
                        </div>
                        {userData?.phoneNumber && (
                          <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-white dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800">
                            <Check className="w-3 h-3" />
                            Linked to: {userData.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-2xl border border-indigo-600/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('enable_2fa')}</p>
                  <p className="text-[10px] text-gray-500">{t('identity_check_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => handleToggle2FA(!userData?.twoFactorEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors duration-300",
                  userData?.twoFactorEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                  userData?.twoFactorEnabled ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />

          {/* Platform SEC-PIN (Administrative) */}
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Vault Security PIN</h4>
                  <p className="text-[10px] text-gray-500">Master PIN used for platform-level withdrawals and sensitive operations.</p>
                </div>
             </div>

             <div className="p-5 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Current PIN</label>
                    <input 
                      type="password" 
                      id="settCurrentPin"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">New Secret PIN</label>
                    <input 
                      type="password" 
                      id="settNewPin"
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="4-8 digits"
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const cur = (document.getElementById('settCurrentPin') as HTMLInputElement).value;
                    const next = (document.getElementById('settNewPin') as HTMLInputElement).value;
                    if(!cur || !next) return alert("Validation Failed: Both PINs are required.");
                    
                    try {
                      const res = await apiFetch("/api/admin/security/update-pin", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPin: cur, newPin: next })
                      });
                      const data = await res.json();
                      if (res.ok) {
                        alert("SEC-PIN Success: Your master security key has been rotated.");
                        (document.getElementById('settCurrentPin') as HTMLInputElement).value = "";
                        (document.getElementById('settNewPin') as HTMLInputElement).value = "";
                      } else {
                        alert(`Security Logic Error: ${data.message}`);
                      }
                    } catch (e: any) {
                      alert(`Network Integration Error: ${e.message}`);
                    }
                  }}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  Rotate Master PIN
                </button>
             </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />

          {/* Blocked Lists */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('blocked_management')}</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                <div className="flex items-center gap-3">
                  <Ban className="w-5 h-5 text-red-500" />
                  <div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">{t('blocked_users')}</h5>
                    <p className="text-[10px] text-gray-500">{(userData?.blockedUsers || []).length} {t('users_restricted')}</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-red-600 hover:underline">{t('manage_blocked')}</button>
              </div>

              {(userData?.blockedUsers || []).length > 0 && (
                <div className="space-y-2 pl-2 border-l-2 border-red-100 dark:border-red-900/30">
                  {Array.from(new Set(userData?.blockedUsers || [])).map((uid: string) => (
                    <div key={uid} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200" />
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{uid.substring(0, 8)}...</span>
                      </div>
                      <button onClick={() => handleUnblock(uid, 'user')} className="text-[10px] text-blue-600 hover:underline">{t('unblock')}</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                <div className="flex items-center gap-3">
                  <Users2 className="w-5 h-5 text-orange-500" />
                  <div>
                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">{t('blocked_groups')}</h5>
                    <p className="text-[10px] text-gray-500">{(userData?.blockedGroups || []).length} {t('groups_restricted')}</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-orange-600 hover:underline">{t('manage_blocked')}</button>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2" />

          {/* Content Filters */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('content_filters')}</h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('sensitive_content')}</p>
                    <p className="text-[10px] text-gray-500">{t('sensitive_content_desc')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUpdateFilters('sensitiveContent', !contentFilters.sensitiveContent)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    contentFilters.sensitiveContent ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    contentFilters.sensitiveContent ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{t('spam_filter')}</p>
                    <p className="text-[10px] text-gray-500">{t('spam_filter_desc')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUpdateFilters('spamFilter', !contentFilters.spamFilter)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    contentFilters.spamFilter ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    contentFilters.spamFilter ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{t('dm_privacy')}</p>
                <select 
                  value={contentFilters.directMessagePrivacy}
                  onChange={(e) => handleUpdateFilters('directMessagePrivacy', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none"
                >
                  <option value="everyone">{t('everyone')}</option>
                  <option value="following">{t('only_people_i_follow')}</option>
                  <option value="none">{t('none')}</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('account_privacy_interactions')}</h4>
            
            <div className="space-y-4 bg-gray-50 dark:bg-gray-700/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('profile_visibility')}</p>
                  <p className="text-[10px] text-gray-500">{t('profile_visibility_desc')}</p>
                </div>
                <button 
                  onClick={() => handleUpdateFilters('publicProfile', !contentFilters.publicProfile)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    contentFilters.publicProfile ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    contentFilters.publicProfile ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('who_see_photos')}</p>
                <div className="flex gap-2">
                  {['everyone', 'followers', 'none'].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleUpdateFilters('photoVisibility', val)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold rounded-lg border capitalize transition-all",
                        contentFilters.photoVisibility === val 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" 
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                      )}
                    >
                      {t(val)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('allow_followers')}</p>
                  <p className="text-[10px] text-gray-500">{t('allow_followers_desc')}</p>
                </div>
                <button 
                  onClick={() => handleUpdateFilters('allowFollowers', !contentFilters.allowFollowers)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    contentFilters.allowFollowers ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                    contentFilters.allowFollowers ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center space-x-4">
                <Eye className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{t('profile_visibility')}</p>
                  <p className="text-[10px] text-gray-500">{t('currently_set_to')} {contentFilters.publicProfile ? t('public') : t('private')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: t('notifications'),
      description: t('notifications_desc'),
      icon: <Bell className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('push_notifications')}</p>
              <p className="text-[10px] text-gray-500">{t('push_notifications_desc')}</p>
            </div>
            <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('email_marketing')}</p>
              <p className="text-[10px] text-gray-500">{t('email_marketing_desc')}</p>
            </div>
            <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings')}</h1>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div 
            key={`section-${section.id}`}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all overflow-hidden",
              activeSection === section.id 
                ? "border-blue-500 ring-1 ring-blue-500" 
                : "border-gray-100 dark:border-gray-700"
            )}
          >
            <button 
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{section.description}</p>
                </div>
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-gray-400 transition-transform duration-300",
                activeSection === section.id ? "rotate-90" : ""
              )} />
            </button>
            
            {activeSection === section.id && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-50 dark:border-gray-700">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 mb-4">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">{t('app_version')}</h4>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1">{t('app_version_desc')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={async () => {
            if (confirm(t('confirm_logout'))) {
              await logout();
              navigate('/login');
            }
          }}
          className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800/50 group transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('log_out')}</h3>
              <p className="text-xs text-gray-500">{t('log_out_desc')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button 
          onClick={() => {
            if (confirm(t('confirm_delete'))) {
              // Note: Real account deletion would involve a cloud function to clean up subcollections
              // and potentially another logic step. For this MVP, we redirect to a support or confirmation flow.
              alert(t('delete_disclaimer'));
            }
          }}
          className="w-full flex items-center justify-between p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800/50 group transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('delete_account')}</h3>
              <p className="text-xs text-gray-500">{t('delete_account_desc')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {showFingerprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700 relative">
            <button 
              onClick={() => {
                setShowFingerprintModal(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {pendingAction === 'verify_phone' ? (
              <OTPModal 
                userId={currentUser?.uid || ''} 
                phoneNumber={phoneNumber}
                method="sms"
                onClose={() => {
                  setShowFingerprintModal(false);
                  setPendingAction(null);
                }}
                onSuccess={handleFingerprintSuccess}
              />
            ) : pendingAction === 'reset_pin_email' ? (
              <OTPModal 
                userId={currentUser?.uid || ''} 
                email={currentUser?.email || ''}
                method="email"
                onClose={() => {
                  setShowFingerprintModal(false);
                  setPendingAction(null);
                }}
                onSuccess={() => {
                  setPinEmailVerified(true);
                  setShowFingerprintModal(false);
                  setPendingAction(null);
                  alert("Identity verified via Email! You can now set a new Security PIN.");
                }}
              />
            ) : userData?.twoFactorType === 'passkey' && userData?.twoFactorEnabled ? (
              <PasskeyModal 
                userId={currentUser?.uid || ''}
                onClose={() => setShowFingerprintModal(false)}
                onSuccess={handleFingerprintSuccess}
              />
            ) : userData?.twoFactorType !== 'biometric' && userData?.twoFactorEnabled ? (
              <OTPModal 
                userId={currentUser?.uid || ''} 
                email={userData?.email}
                method={userData?.twoFactorType === 'totp' ? 'totp' : 'email'}
                onClose={() => setShowFingerprintModal(false)}
                onSuccess={handleFingerprintSuccess}
              />
            ) : (
              <FingerprintModal 
                onClose={() => {
                  setShowFingerprintModal(false);
                  setPendingAction(null);
                }}
                onSuccess={handleFingerprintSuccess}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
