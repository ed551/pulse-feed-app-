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
  Activity,
  Link2,
  Sparkles,
  Brain,
  Cpu,
  RefreshCw,
  LockKeyhole
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { generateContentWithRetry } from "../lib/ai";
import Markdown from "react-markdown";
import AISecurityDashboard from "../components/AISecurityDashboard";

export default function Settings() {
  const { currentUser, userData, logout, sendVerificationEmail } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
      setTimeout(() => {
        const el = document.getElementById(`settings-sec-${location.state.activeSection}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [location.state?.activeSection]);
  
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
  const [aiAuditing, setAiAuditing] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<string | null>(null);
  const [aiCurrentPin, setAiCurrentPin] = useState("");
  const [aiNewPin, setAiNewPin] = useState("");
  const [isUpdatingAiPin, setIsUpdatingAiPin] = useState(false);

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
      title: "AI Security & Privacy Shield",
      description: "Neural account auditing & intelligent asset lock keys",
      icon: <Brain className="w-5 h-5 text-purple-500 animate-pulse" />,
      content: (
        <AISecurityDashboard />
      )
    },
    {
      id: 'disabled_security',
      title: "Disabled Security",
      description: "Legacy configuration, archived.",
      icon: <Shield className="w-5 h-5 text-gray-400" />,
      content: (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Security Summary / Health */}
            <div className="p-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Security Protocol</h4>
                    <p className="text-[10px] text-gray-500 font-medium">System status: <span className="text-emerald-500">Maximum Protection</span></p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white dark:border-gray-700/50">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">MFA Status</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{userData?.twoFactorType ? userData.twoFactorType.toUpperCase() : 'DISABLED'}</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-white dark:border-gray-700/50">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Passkey</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{userData?.passkeyRegistered ? 'LINKED' : 'UNAVAILABLE'}</p>
                </div>
              </div>
            </div>

            {/* Section 1: Identity Framework */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">Identity & Trust Framework</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    {currentUser?.emailVerified || userData?.emailVerified ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <Check className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Verified</span>
                      </div>
                    ) : (
                      <button 
                        onClick={async () => {
                          try {
                            await sendVerificationEmail();
                            alert("Verification link sent to your email!");
                          } catch (err: any) {
                            alert(`Error: ${err.message}`);
                          }
                        }}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-tighter animate-pulse shadow-md shadow-blue-500/10"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Authority</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    {userData?.phoneNumberVerified ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <Check className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Verified</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          const targetSection = document.getElementById('mfa-sms');
                          if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth' });
                          else setActiveSection('security');
                        }}
                        className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-tighter animate-bounce shadow-md shadow-orange-500/10"
                      >
                        Verify Link
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Link</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{userData?.phoneNumber || "Unlinked"}</p>
                  </div>
                </div>
              </div>
            </div>


            {/* Section 2: MFA Engine */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">{t('two_factor_auth')} Engine</h4>
              <div className="space-y-2">
                {[
                  { id: 'passkey', icon: ShieldCheck, label: 'Passkey (FIDO2)', desc: 'Secure biometric login', color: 'text-indigo-500' },
                  { id: 'biometric', icon: Fingerprint, label: t('biometric_scanner'), desc: t('biometric_desc'), color: 'text-cyan-500' },
                  { id: 'sms', icon: Smartphone, label: 'SMS Verification', desc: 'Secure text codes', color: 'text-emerald-500' },
                  { id: 'email_otp', icon: Mail, label: t('email_otp'), desc: t('email_otp_desc'), color: 'text-blue-500' },
                  { id: 'totp', icon: Shield, label: t('google_auth'), desc: t('totp_desc'), color: 'text-orange-500' }
                ].map(method => (
                  <div key={`mfa-${method.id}`} className="group">
                    <button
                      onClick={() => handleUpdate2FA(method.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                        userData?.twoFactorType === method.id 
                          ? "bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm" 
                          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={cn("p-2 rounded-xl bg-gray-50 dark:bg-gray-900 shadow-inner group-hover:scale-110 transition-transform", method.color)}>
                          <method.icon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                            {method.label}
                            {method.id === 'passkey' && userData?.passkeyRegistered && (
                              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-widest">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500 font-medium">{method.desc}</p>
                        </div>
                      </div>
                      {userData?.twoFactorType === method.id ? (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                      )}
                    </button>

                    {/* Method Specific UI */}
                    {userData?.twoFactorType === 'totp' && method.id === 'totp' && userData?.twoFactorSecret && (
                      <div className="mt-2 p-6 bg-orange-50/30 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/30 rounded-3xl mx-2 animate-in slide-in-from-top-2">
                        <div className="flex flex-col items-center gap-6">
                          <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-orange-100 dark:border-orange-800">
                            <QRCodeSVG 
                              value={`otpauth://totp/PulseFeeds:${userData.email}?secret=${userData.twoFactorSecret}&issuer=PulseFeeds`}
                              size={160}
                              level="H"
                              includeMargin={true}
                              className="dark:filter dark:invert dark:hue-rotate-180"
                            />
                          </div>
                          <div className="text-center space-y-2">
                            <h5 className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-[0.2em]">{t('scan_qr')}</h5>
                            <p className="text-[10px] text-gray-500 max-w-[200px] leading-relaxed">{t('scan_qr_desc')}</p>
                          </div>
                          <div className="w-full space-y-2">
                            <p className="text-[10px] font-black text-orange-800 dark:text-orange-400 uppercase tracking-[0.2em] text-center">{t('manual_entry')}</p>
                            <div className="flex items-center justify-between bg-white dark:bg-gray-950 p-3 rounded-2xl border border-orange-100 dark:border-orange-900 shadow-inner">
                              <code className="text-xs font-mono font-black text-orange-600 dark:text-orange-500 tracking-tighter">
                                {userData.twoFactorSecret}
                              </code>
                              <button 
                                onClick={() => navigator.clipboard.writeText(userData.twoFactorSecret || '')}
                                className="px-3 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-orange-200 transition-colors"
                              >
                                {t('copy')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {method.id === 'sms' && (
                      <div className="mt-2 mx-2 p-5 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30 rounded-3xl animate-in slide-in-from-top-2">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-widest pl-1">Mobile Authority Number</label>
                            <div className="flex gap-2">
                              <input 
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+254 7..."
                                className="flex-1 bg-white dark:bg-gray-950 border border-emerald-100 dark:border-emerald-900 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                              />
                              <button 
                                onClick={() => {
                                  if (!phoneNumber) return alert("Please enter a phone number.");
                                  setPendingAction('verify_phone');
                                  setShowFingerprintModal(true);
                                }}
                                disabled={isVerifyingPhone || phoneNumber === userData?.phoneNumber}
                                className="px-5 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                {isVerifyingPhone ? "Processing..." : userData?.phoneNumber ? "Rotate" : "Link Now"}
                              </button>
                            </div>
                          </div>
                          {userData?.phoneNumber && (
                            <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                              <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center text-emerald-600">
                                <Check className="w-3 h-3" />
                              </div>
                              <p className="text-[10px] font-bold text-gray-600 dark:text-emerald-400">Authenticated Line: <span className="text-gray-900 dark:text-white font-black">{userData.phoneNumber}</span></p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
              
            <div className="h-px bg-gray-100 dark:bg-gray-700/50 my-2" />

            {/* Section 3: Hardened Encryption (PINs) */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">Hardened Logic & PIN Controls</h4>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Withdrawal PIN (SCA) */}
                <div className="p-6 bg-purple-50/10 dark:bg-purple-950/10 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-100/50 dark:border-purple-800/30">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Withdrawal PIN (SCA)</h4>
                          {!userData?.hasSetPin && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-[8px] font-black text-red-600 dark:text-red-400 rounded-md uppercase tracking-widest animate-pulse">
                              Action Required
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">Multi-digit key required for vault outflows.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">Authority Validation</label>
                        {!userData?.hasSetPin && !pinEmailVerified && !passkeyAuthorized ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-[1.5rem] px-6 py-5 text-xs font-bold text-gray-900 dark:text-white shadow-inner h-full min-h-[90px]">
                              <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shrink-0 animate-pulse shadow-lg shadow-amber-500/20">
                                <Lock className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">First-Time Setup</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">No current PIN exists. Verify via **Email Relay** to authorize your first security key.</p>
                              </div>
                            </div>
                            <button 
                              onClick={async () => {
                                if (!currentUser?.email) return;
                                setIsSendingOtp(true);
                                try {
                                  const res = await apiFetch("/api/otp/send", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: 'email' }) });
                                  if (res.ok) { setPendingAction('reset_pin_email'); setShowFingerprintModal(true); }
                                } catch (err) { alert("Email service unreachable."); } finally { setIsSendingOtp(false); }
                              }}
                              disabled={isSendingOtp}
                              className="w-full py-4 bg-purple-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                              {isSendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}
                              <span>{isSendingOtp ? "Relaying..." : "Authorize via Email Relay"}</span>
                            </button>
                          </div>
                        ) : passkeyAuthorized || pinEmailVerified ? (
                          <div className="flex items-center gap-4 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-[1.5rem] px-6 py-5 text-xs font-bold text-gray-900 dark:text-white shadow-inner h-[140px]">
                            <div className="w-10 min-w-[40px] h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Authenticated</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{passkeyAuthorized ? "WebAuthn Bound Session Active" : "Identity confirmed via Email Relay authority."}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative group">
                              <input 
                                type="password" 
                                id="userCurrentPin"
                                className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] px-6 py-5 text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all group-hover:border-purple-200"
                                placeholder="••••••"
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                <Lock className="w-5 h-5 text-gray-300" />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              {userData?.passkeyRegistered && (
                                <button 
                                  onClick={async () => {
                                    if (!currentUser) return;
                                    if (isIframe()) {
                                      const width = 500;
                                      const height = 600;
                                      const left = window.screenX + (window.outerWidth - width) / 2;
                                      const top = window.screenY + (window.outerHeight - height) / 2;
                                      const popup = window.open(`#/passkey-auth?userId=${currentUser.uid}&type=auth`, 'Passkey', `width=${width},height=${height},left=${left},top=${top}`);
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
                                      const resp = await apiFetch('/api/auth/passkey/generate-authentication-options', { method: 'POST', body: JSON.stringify({ userId: currentUser.uid }), headers: { 'Content-Type': 'application/json' } });
                                      const options = await resp.json();
                                      const authResp = await startAuthentication(options);
                                      const verifyResp = await apiFetch('/api/auth/passkey/verify-authentication', { method: 'POST', body: JSON.stringify({ userId: currentUser.uid, response: authResp }), headers: { 'Content-Type': 'application/json' } });
                                      if ((await verifyResp.json()).verified) setPasskeyAuthorized(true);
                                    } catch (e: any) { alert(`Auth Error: ${e.message}`); } finally { setIsPasskeyAuthenticating(false); }
                                  }}
                                  disabled={isPasskeyAuthenticating}
                                  className="flex-1 py-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100/50 dark:border-indigo-800 flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <Link2 className="w-3.5 h-3.5"/>
                                  <span>{isPasskeyAuthenticating ? "..." : "Passkey"}</span>
                                </button>
                              )}
                              <button 
                                onClick={async () => {
                                  if (!currentUser?.email) return;
                                  setIsSendingOtp(true);
                                  try {
                                    const res = await apiFetch("/api/otp/send", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.uid, email: currentUser.email, method: 'email' }) });
                                    if (res.ok) { setPendingAction('reset_pin_email'); setShowFingerprintModal(true); }
                                  } catch (err) { alert("Email service unreachable."); } finally { setIsSendingOtp(false); }
                                }}
                                disabled={isSendingOtp}
                                className="flex-1 py-4 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all border border-purple-100/50 dark:border-purple-800 flex items-center justify-center gap-2 shadow-sm"
                              >
                                {isSendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}
                                <span>Relay</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">New Protocol Key</label>
                        <div className="relative group">
                          <input 
                            type="password" 
                            id="userNewPin"
                            className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] px-6 py-5 text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-purple-500 outline-none shadow-inner transition-all group-hover:border-purple-200 h-[64px]"
                            placeholder="4-8 Digits"
                          />
                          <div className="absolute right-5 top-1/2 -translate-y-1/2">
                            <Key className="w-5 h-5 text-gray-300" />
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-950/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/50">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 opacity-60">Security Directive</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                            Entropy recommendation: Use <span className="text-purple-500 font-black">6+ digits</span> including non-sequential numbers to prevent brute-force attacks across platform treasury.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={async () => {
                          const cur = (document.getElementById('userCurrentPin') as HTMLInputElement)?.value || "";
                          const next = (document.getElementById('userNewPin') as HTMLInputElement).value;
                          if(!passkeyAuthorized && !pinEmailVerified && !cur) return alert("Security Error: Identity verification required.");
                          if(!next) return alert("Validation Error: Proposed PIN missing.");
                          try {
                            const res = await apiFetch("/api/user/security/update-pin", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser?.uid, currentPin: cur, newPin: next, usePasskey: passkeyAuthorized, email: pinEmailVerified ? currentUser?.email : undefined }) });
                            if (res.ok) { 
                            alert("Protocol Success: Withdrawal PIN Secured."); 
                            setPasskeyAuthorized(false); 
                            setPinEmailVerified(false);
                            // If it was first time setup, we should probably redirect or update local state
                            window.location.reload(); // Refresh to reflect hasSetPin change everywhere
                          } else {
                            const data = await res.json();
                            alert(`Security Error: ${data.message || "Rotation failed."}`);
                          }
                          } catch (e: any) { alert(`API Error: ${e.message}`); }
                        }}
                        className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-purple-600/30 active:scale-95"
                      >
                        Authorize Rotation
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vault Master PIN - Admin Only */}
                {currentUser?.email === 'edwinmuoha@gmail.com' && (
                  <div className="p-8 bg-blue-50/10 dark:bg-blue-950/20 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Shield className="w-40 h-40 text-blue-500 -rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-5 mb-8">
                        <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-lg border border-blue-100 dark:border-blue-800/50">
                          <Shield className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">Vault Master Authority</h4>
                            <span className="px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-md uppercase tracking-widest leading-none">
                              Root Admin
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-sm">High-level administrative encryption key for platform treasury control.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">Master Key</label>
                          <div className="relative group">
                            <input 
                              type="password" 
                              id="settCurrentPin"
                              className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] px-6 py-5 text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all h-[64px]"
                              placeholder="••••••"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                              <Lock className="w-5 h-5 text-gray-300" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 pl-1 tracking-widest">Secret Proposal</label>
                          <div className="relative group">
                            <input 
                              type="password" 
                              id="settNewPin"
                              className="w-full bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] px-6 py-5 text-lg font-mono tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all h-[64px]"
                              placeholder="4-8 Digits"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                              <Key className="w-5 h-5 text-gray-300" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={async () => {
                          const cur = (document.getElementById('settCurrentPin') as HTMLInputElement).value;
                          const next = (document.getElementById('settNewPin') as HTMLInputElement).value;
                          if (!cur || !next) return alert("Validation Error: Missing authority identifiers.");
                          try {
                            const res = await apiFetch("/api/admin/security/update-pin", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPin: cur, newPin: next }) });
                            if (res.ok) alert("Administrative Success: Master Key Updated.");
                          } catch (e: any) { alert(`Root Error: ${e.message}`); }
                        }}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-blue-600/40 active:scale-95"
                      >
                        Cycle Master Authority
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700/50 my-2" />

            {/* Section 4: Privacy & Social Moderation */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">Moderation & Perimeter Control</h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-5 bg-red-50/30 dark:bg-red-950/10 rounded-[2rem] border border-red-100 dark:border-red-900/30 flex items-center justify-between group transition-all hover:bg-red-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-red-100/50 dark:border-red-800/30 group-hover:scale-110 transition-transform">
                        <Ban className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('blocked_users')}</h5>
                        <p className="text-[10px] text-gray-500 font-medium">{(userData?.blockedUsers || []).length} {t('users_restricted')}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 dark:border-red-800 shadow-sm hover:shadow-md transition-all active:scale-95">{t('manage_blocked')}</button>
                  </div>

                  <div className="p-5 bg-orange-50/30 dark:bg-orange-950/10 rounded-[2rem] border border-orange-100 dark:border-orange-900/30 flex items-center justify-between group transition-all hover:bg-orange-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-orange-500 shadow-sm border border-orange-100/50 dark:border-orange-800/30 group-hover:scale-110 transition-transform">
                        <Users2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('blocked_groups')}</h5>
                        <p className="text-[10px] text-gray-500 font-medium">{(userData?.blockedGroups || []).length} {t('groups_restricted')}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-gray-800 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800 shadow-sm hover:shadow-md transition-all active:scale-95">{t('manage_blocked')}</button>
                  </div>
                </div>

                {/* Sub-list for Blocked items if any */}
                {(userData?.blockedUsers || []).length > 0 && (
                  <div className="space-y-2 pl-4 border-l-4 border-red-500/20 py-1 animate-in slide-in-from-left-2">
                    {Array.from(new Set(userData?.blockedUsers || [])).map((uid: string) => (
                      <div key={uid} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-[10px] font-black text-gray-400">ID</div>
                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 tracking-tight">{uid.substring(0, 12)}...</span>
                        </div>
                        <button onClick={() => handleUnblock(uid, 'user')} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">{t('unblock')}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Content Filtration Filters */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">Neural Filtration & Privacy</h4>
              
              <div className="p-6 bg-emerald-50/10 dark:bg-emerald-950/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/50 dark:border-emerald-800/30 group-hover:rotate-12 transition-transform">
                        <Filter className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{t('sensitive_content')}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Disturbing media block</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateFilters('sensitiveContent', !contentFilters.sensitiveContent)}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                        contentFilters.sensitiveContent ? "bg-emerald-600 shadow-emerald-500/20" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                        contentFilters.sensitiveContent ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100/50 dark:border-blue-800/30 group-hover:rotate-12 transition-transform">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{t('spam_filter')}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Bot & advertisement block</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUpdateFilters('spamFilter', !contentFilters.spamFilter)}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                        contentFilters.spamFilter ? "bg-blue-600 shadow-blue-500/20" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                        contentFilters.spamFilter ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-emerald-100 dark:bg-emerald-900/50" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">{t('dm_privacy')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['everyone', 'following', 'none'].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleUpdateFilters('directMessagePrivacy', level)}
                        className={cn(
                          "py-3 text-[10px] font-black rounded-2xl border transition-all uppercase tracking-widest",
                          contentFilters.directMessagePrivacy === level 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-emerald-200"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Section 6: Account Interaction Perimeter */}
            <div>
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1">Social Interaction Perimeter</h4>
              
              <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 space-y-6">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{t('profile_visibility')}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Global discoverability toggle</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateFilters('publicProfile', !contentFilters.publicProfile)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                      contentFilters.publicProfile ? "bg-indigo-600 shadow-indigo-500/20" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                      contentFilters.publicProfile ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Photo Visibility Cluster</p>
                  </div>
                  <div className="flex p-1.5 bg-white dark:bg-gray-950 rounded-[1.5rem] border border-gray-100 dark:border-gray-900 shadow-inner gap-1">
                    {['everyone', 'followers', 'none'].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleUpdateFilters('photoVisibility', val)}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tighter",
                          contentFilters.photoVisibility === val 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "bg-transparent border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                      >
                        {val === 'everyone' ? 'Public' : val === 'followers' ? 'Circle' : 'Locked'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform">
                      <Users2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">{t('allow_followers')}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Permit subscription to stream</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUpdateFilters('allowFollowers', !contentFilters.allowFollowers)}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                      contentFilters.allowFollowers ? "bg-emerald-600 shadow-emerald-500/20" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                      contentFilters.allowFollowers ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick View Link */}
            <button className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all group active:scale-[0.99]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 group-hover:rotate-12 transition-transform">
                  <Eye className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none mb-1">Live Privacy View</p>
                  <p className="text-[10px] text-gray-500 font-medium">Currently set to <span className="font-black text-indigo-600 dark:text-indigo-400">{contentFilters.publicProfile ? 'PUBLIC BROADCAST' : 'ENCRYPTED PRIVATE'}</span></p>
                </div>
              </div>
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
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
            id={`settings-sec-${section.id}`}
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
