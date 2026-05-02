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
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../lib/i18n";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import FingerprintModal from "../components/tools/FingerprintModal";
import OTPModal from "../components/tools/OTPModal";
import { cn } from "../lib/utils";

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

  // Dating states
  const [isDatingActive, setIsDatingActive] = useState(userData?.isDatingActive || false);
  const [datingTribe, setDatingTribe] = useState(userData?.tribe || "");
  const [datingRadius, setDatingRadius] = useState(userData?.radius || 50);
  const [datingAge, setDatingAge] = useState(userData?.age || 18);
  const [datingGender, setDatingGender] = useState(userData?.gender || "Male");
  const [datingLocation, setDatingLocation] = useState(userData?.location || "");
  const [datingHobbies, setDatingHobbies] = useState(userData?.hobbies?.join(", ") || "");
  const [datingJob, setDatingJob] = useState(userData?.job || "");
  const [datingReligion, setDatingReligion] = useState(userData?.religion || "");
  const [datingFoods, setDatingFoods] = useState(userData?.foods?.join(", ") || "");
  const [datingEducation, setDatingEducation] = useState(userData?.education || "");
  const [datingStatus, setDatingStatus] = useState(userData?.status || "Single");
  const [datingSports, setDatingSports] = useState(userData?.sports?.join(", ") || "");
  const [language, setLanguage] = useState(userData?.language || "en");
  const [timezone, setTimezone] = useState(userData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timeFormat, setTimeFormat] = useState(userData?.timeFormat || "24h");
  const [dateFormat, setDateFormat] = useState(userData?.dateFormat || "DD/MM/YYYY");
  const [isSportsWatchPrecise, setIsSportsWatchPrecise] = useState(userData?.isSportsWatchPrecise ?? true);
  const [healthInterval, setHealthInterval] = useState(() => localStorage.getItem('pulse_health_interval') || 'daily');
  const [newsInterval, setNewsInterval] = useState(() => localStorage.getItem('pulse_news_interval') || '1h');

  const updateHealthInterval = (val: string) => {
    setHealthInterval(val);
    localStorage.setItem('pulse_health_interval', val);
  };

  const updateNewsInterval = (val: string) => {
    setNewsInterval(val);
    localStorage.setItem('pulse_news_interval', val);
  };

  // New settings states
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>((userData?.theme as 'light' | 'dark' | 'system') || "system");
  const [activeSessions, setActiveSessions] = useState<string[]>(userData?.activeSessions || []);

  useEffect(() => {
    if (userData?.activeSessions) {
      setActiveSessions(userData.activeSessions);
    }
  }, [userData?.activeSessions]);

  const clearOtherSessions = async () => {
    if (!currentUser) return;
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
      setIsDatingActive(userData.isDatingActive || false);
      setDatingTribe(userData.tribe || "");
      setDatingRadius(userData.radius || 50);
      setDatingAge(userData.age || 18);
      setDatingGender(userData.gender || "Male");
      setDatingLocation(userData.location || "");
      setDatingHobbies(userData.hobbies?.join(", ") || "");
      setDatingJob(userData.job || "");
      setDatingReligion(userData.religion || "");
      setDatingFoods(userData.foods?.join(", ") || "");
      setDatingEducation(userData.education || "");
      setDatingStatus(userData.status || "Single");
      setDatingSports(userData.sports?.join(", ") || "");
      setLanguage(userData.language || "en");
      setTimezone(userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setTimeFormat(userData.timeFormat || "24h");
      setDateFormat(userData.dateFormat || "DD/MM/YYYY");
      setIsSportsWatchPrecise(userData.isSportsWatchPrecise ?? true);
    }
  }, [currentUser, userData]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
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

  const handleFingerprintSuccess = () => {
    setShowFingerprintModal(false);
    if (pendingAction === 'delete') {
      alert("Identity verified. Account deletion process initiated. You will be logged out shortly.");
      // In a real app, you'd call a backend function to delete the account
    } else if (pendingAction === 'security') {
      setActiveSection('security-details');
    }
    setPendingAction(null);
  };

  const handleSaveDatingProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isDatingActive,
        tribe: datingTribe,
        radius: Number(datingRadius),
        age: Number(datingAge),
        gender: datingGender,
        location: datingLocation,
        hobbies: datingHobbies.split(",").map(s => s.trim()).filter(s => s !== ""),
        job: datingJob,
        religion: datingReligion,
        foods: datingFoods.split(",").map(s => s.trim()).filter(s => s !== ""),
        education: datingEducation,
        status: datingStatus,
        sports: datingSports.split(",").map(s => s.trim()).filter(s => s !== "")
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating dating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate2FA = async (type: string) => {
    if (!currentUser) return;
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

  const handleToggle2FA = async (enabled: boolean) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        twoFactorEnabled: enabled
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    if (!currentUser) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
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
      title: 'Health Engine',
      description: 'Daily biometric wellness check-ins and community health.',
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
      id: 'dating',
      title: t('dating_profile'),
      description: t('dating_profile_desc'),
      icon: <Heart className="w-5 h-5 text-pink-500" />,
      content: (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/30 mb-4">
            <div>
              <p className="text-sm font-bold text-pink-900 dark:text-pink-300">{t('dating_hub_active')}</p>
              <p className="text-[10px] text-pink-700/70 dark:text-pink-400/70">{t('dating_hub_desc')}</p>
            </div>
            <button 
              onClick={() => setIsDatingActive(!isDatingActive)}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors",
                isDatingActive ? "bg-pink-500" : "bg-gray-300 dark:bg-gray-600"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                isDatingActive ? "right-1" : "left-1"
              )} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('tribe')}</label>
              <input 
                type="text" 
                value={datingTribe}
                onChange={(e) => setDatingTribe(e.target.value)}
                placeholder="e.g. Kikuyu"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('radius_km')}</label>
              <input 
                type="number" 
                value={datingRadius}
                onChange={(e) => setDatingRadius(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('age')}</label>
              <input 
                type="number" 
                value={datingAge}
                onChange={(e) => setDatingAge(Number(e.target.value))}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('sex')}</label>
              <select 
                value={datingGender}
                onChange={(e) => setDatingGender(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="Male">{t('male')}</option>
                <option value="Female">{t('female')}</option>
                <option value="Other">{t('other')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('location')}</label>
              <input 
                type="text" 
                value={datingLocation}
                onChange={(e) => setDatingLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('favourite_job')}</label>
              <input 
                type="text" 
                value={datingJob}
                onChange={(e) => setDatingJob(e.target.value)}
                placeholder="Software Engineer"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('religion')}</label>
              <input 
                type="text" 
                value={datingReligion}
                onChange={(e) => setDatingReligion(e.target.value)}
                placeholder="Christian"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('education')}</label>
              <input 
                type="text" 
                value={datingEducation}
                onChange={(e) => setDatingEducation(e.target.value)}
                placeholder="University Degree"
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('status')}</label>
              <select 
                value={datingStatus}
                onChange={(e) => setDatingStatus(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="Single">{t('single')}</option>
                <option value="Married">{t('married')}</option>
                <option value="Divorced">{t('divorced')}</option>
                <option value="Widower">{t('widower')}</option>
                <option value="Widowee">{t('widowee')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('hobbies_comma')}</label>
            <input 
              type="text" 
              value={datingHobbies}
              onChange={(e) => setDatingHobbies(e.target.value)}
              placeholder="Reading, Travel, Music"
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('foods_comma')}</label>
            <input 
              type="text" 
              value={datingFoods}
              onChange={(e) => setDatingFoods(e.target.value)}
              placeholder="Pizza, Sushi, Pasta"
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t('sports_comma')}</label>
            <input 
              type="text" 
              value={datingSports}
              onChange={(e) => setDatingSports(e.target.value)}
              placeholder="Football, Basketball, Tennis"
              className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
            />
          </div>

          <button 
            onClick={handleSaveDatingProfile}
            disabled={isSaving}
            className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
            {saveSuccess ? t('saved_successfully') : t('save_dating_profile')}
          </button>
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
              {[
                { id: 'biometric', icon: Fingerprint, label: t('biometric_scanner'), desc: t('biometric_desc'), color: 'text-cyan-500' },
                { id: 'email_otp', icon: Mail, label: t('email_otp'), desc: t('email_otp_desc'), color: 'text-blue-500' },
                { id: 'totp', icon: Shield, label: t('google_auth'), desc: t('totp_desc'), color: 'text-orange-500' }
              ].map(method => (
                <div key={method.id} className="space-y-2">
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
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{method.label}</p>
                        <p className="text-[10px] text-gray-500">{method.desc}</p>
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
                  {userData?.blockedUsers?.map((uid: string) => (
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
            key={section.id}
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
            {userData?.twoFactorType !== 'biometric' && userData?.twoFactorEnabled ? (
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
