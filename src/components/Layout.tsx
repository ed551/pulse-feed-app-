import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { 
  Home, Users, PlusSquare, Gem, User, ShieldAlert, Bell, FileText, Lock, Headphones,
  Sun, Moon, CloudRain, Cloud, CloudLightning, Clock, Watch, BellRing, StickyNote,
  Fingerprint, HeartPulse, MapPin, Phone, MessageCircle, Gamepad2, Globe, BrainCircuit,
  Languages, Ticket, Snowflake, Calendar, Smartphone, Monitor, PhoneCall, Wrench,
  Calculator, LayoutGrid, Power, RefreshCw, ArrowUpCircle, ArrowDownCircle, XCircle, RotateCcw, Edit3, DollarSign, LogOut, Wallet, X, Send, Search, CheckCircle2, Plus, ShieldCheck,
  Volume2, VolumeX, Share2, Brain, TrendingUp, TrendingDown, Minus, Menu, GraduationCap, Eye, Loader2, Video, Type, Radio, Megaphone, BarChart2, Smile, Crown, Filter, Sparkles, Camera, Heart, Youtube
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Modality } from "@google/genai";
import { generateContentWithRetry } from "../lib/ai";
import { cn } from "../lib/utils";
import { saveInsight } from "../lib/insights";
import { 
  pulse_feeds_auto_sync, daily_twin_sync, midnight_settlement_engine, 
  revenue_split_engine, auto_updater, resource_governor, 
  theme_engine, HeaderIntelligence 
} from "../lib/engines";
import { goldBrain, GoldPrediction } from "../lib/goldEngine";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { useNotifications } from "../hooks/useNotifications";
import AIAssistant from "./AIAssistant";
import SelfHealing from "./SelfHealing";
import CreatePostModal from "./CreatePostModal";
import AIEyeModal from "./tools/AIEyeModal";
import CalculatorModal from "./tools/CalculatorModal";
import NotePadModal from "./tools/NotePadModal";
import FingerprintModal from "./tools/FingerprintModal";
import CalendarModal from "./tools/CalendarModal";
import HealthModal from "./tools/HealthModal";
import GoogleAppsModal from "./tools/GoogleAppsModal";
import CallModal from "./tools/CallModal";
import TranslateModal from "./tools/TranslateModal";
import ClockModal from "./tools/ClockModal";
import { db } from "../lib/firebase";
import { setDoc, doc, arrayUnion, serverTimestamp } from "firebase/firestore";

const weatherTypes = [
  { type: 'Hot / Sunny', icon: Sun, color: 'text-orange-500', bg: 'from-orange-500/20 to-yellow-500/20', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]', symbol: '☀️', temp: '32°C', tempValue: 32 },
  { type: 'Cold / Chilly', icon: Snowflake, color: 'text-cyan-300', bg: 'from-cyan-500/20 to-blue-500/20', glow: 'drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]', symbol: '❄️', temp: '2°C', tempValue: 2 },
  { type: 'Rainy', icon: CloudRain, color: 'text-teal-700', bg: 'from-teal-500/20 to-emerald-500/20', glow: 'drop-shadow-[0_0_8px_rgba(15,118,110,0.8)]', symbol: '🌧️', temp: '14°C', tempValue: 14 },
  { type: 'Cloudy / Fair', icon: Cloud, color: 'text-slate-400', bg: 'from-slate-500/20 to-gray-500/20', glow: 'drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]', symbol: '⛅', temp: '20°C', tempValue: 20 },
  { type: 'Stormy', icon: CloudLightning, color: 'text-purple-500', bg: 'from-purple-500/20 to-indigo-500/20', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', symbol: '⛈️', temp: '18°C', tempValue: 18 }
];

export default function Layout() {
  const { currentUser, userData, logout } = useAuth();
  const { isIdle, totalEarnedToday } = useRevenue();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [time, setTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
    // Detect real mobile devices
    const isRealMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // On real mobile devices or small screens, always default to full-screen (desktop) mode
    if (isRealMobile || (typeof window !== 'undefined' && window.innerWidth < 1024)) return 'desktop';
    const saved = localStorage.getItem('viewMode');
    return (saved as 'desktop' | 'mobile') || 'desktop';
  });

  // Handle window resize and device detection to ensure we don't show the frame on mobile
  useEffect(() => {
    const isRealMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const handleResize = () => {
      if ((isRealMobile || window.innerWidth < 1024) && viewMode === 'mobile') {
        setViewMode('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Run once on mount
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => {
    const handleToggleView = () => {
      setViewMode(prev => {
        const next = prev === 'desktop' ? 'mobile' : 'desktop';
        localStorage.setItem('viewMode', next);
        return next;
      });
    };
    window.addEventListener('toggle-view-mode', handleToggleView);
    return () => window.removeEventListener('toggle-view-mode', handleToggleView);
  }, []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showAddPostMenu, setShowAddPostMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const CATEGORIES = [
    { name: 'All', icon: Home, color: 'text-purple-500' },
    { name: 'Google Apps', icon: LayoutGrid, color: 'text-blue-500' },
    { name: 'Browsers', icon: Globe, color: 'text-orange-500' },
    { name: 'Rewards', icon: Gem, color: 'text-yellow-500' },
    { name: 'Indoor Games', icon: Gamepad2, color: 'text-pink-500' },
    { name: 'Outdoor Games', icon: Gamepad2, color: 'text-emerald-500' },
    { name: 'Toggle Frame', icon: Smartphone, color: 'text-purple-500' },
    { name: 'Terms', icon: FileText, color: 'text-teal-500' },
    { name: 'Ads', icon: DollarSign, color: 'text-green-500' }
  ];

  const handleCategoryClick = (categoryName: string) => {
    if (categoryName === 'Rewards') {
      navigate('/rewards');
      return;
    }
    if (categoryName === 'Terms') {
      navigate('/terms');
      return;
    }
    if (categoryName === 'Ads') {
      navigate('/ads');
      return;
    }
    if (categoryName === 'Toggle Frame') {
      const isRealMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isRealMobile || window.innerWidth < 1024) {
        showNotification('Frame mode is only available on desktop browsers.');
        return;
      }
      window.dispatchEvent(new CustomEvent('toggle-view-mode'));
      return;
    }
    setActiveCategory(categoryName);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (location.pathname !== '/' && query.length > 0) {
      navigate('/');
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isShortening, setIsShortening] = useState(false);

  const { showNotification } = useNotifications();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
  }, [isDark]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const [systemStatus, setSystemStatus] = useState<{
    status: 'optimal' | 'healing' | 'checking' | 'updating';
    message: string;
    lastCheck: string;
  }>({
    status: 'optimal',
    message: 'System intelligence active. All units operational.',
    lastCheck: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });

  useEffect(() => {
    const aiActions: { status: 'optimal' | 'healing' | 'checking' | 'updating'; message: string }[] = [
      { status: 'checking', message: 'Scanning for system anomalies...' },
      { status: 'healing', message: 'Auto-correcting minor database inconsistencies...' },
      { status: 'updating', message: 'Syncing intelligence units with global pulse...' },
      { status: 'optimal', message: 'System health: 100%. Self-healing complete.' }
    ];

    const interval = setInterval(() => {
      const randomAction = aiActions[Math.floor(Math.random() * aiActions.length)];
      setSystemStatus({
        ...randomAction,
        lastCheck: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      
      // Occasionally show a notification for "AI Insight"
      if (Math.random() > 0.8) {
        showNotification("AI Insight", { body: "System optimized for peak community engagement." });
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [showNotification]);

  // Removed Fingerprint logic as it's moved to FingerprintModal.tsx

  const handleShare = async () => {
    if (isShortening) return;
    setIsShortening(true);
    try {
      const currentUrl = window.location.origin;
      const response = await fetch(`${window.location.origin}/api/shorten?url=${encodeURIComponent(currentUrl)}`);
      let shareUrl = currentUrl;
      if (response.ok) {
        const data = await response.json();
        shareUrl = data.shortUrl;
      }
      
      await navigator.clipboard.writeText(shareUrl);
      showNotification("Link Copied!", { body: "Pulse Feeds link copied to clipboard." });
    } catch (error) {
      console.error('Error sharing:', error);
      await navigator.clipboard.writeText(window.location.origin);
      showNotification("Link Copied!", { body: "Pulse Feeds link copied to clipboard." });
    } finally {
      setIsShortening(false);
    }
  };

  const speakSystemStatus = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const statusMessage = "Pulse Feeds is currently in development. To be fully functional, I need a secure backend connection, valid API keys for all integrated services, and a verified administrative account. System health is currently optimal, but these components are required for full feature deployment.";
      
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Say clearly and professionally: ${statusMessage}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } else {
        throw new Error("No audio data");
      }
    } catch (error: any) {
      if (error?.status === 429) {
        console.warn("TTS Service busy. Using browser fallback.");
      } else {
        console.error("TTS Error:", error);
      }
      // Fallback to browser TTS if Gemini fails
      const statusMessage = "Pulse Feeds is currently in development. To be fully functional, I need a secure backend connection, valid API keys for all integrated services, and a verified administrative account. System health is currently optimal, but these components are required for full feature deployment.";
      const msg = new SpeechSynthesisUtterance(statusMessage);
      msg.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(msg);
    }
  };

  // Removed Calculator logic as it's moved to CalculatorModal.tsx

  // Clock Ticking
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Removed Stopwatch and Timer logic as it's moved to ClockModal.tsx

  const location = useLocation();

  // Smart Gold Prediction Logic (Brain Unit)
  const [goldData, setGoldData] = useState<GoldPrediction | null>(null);
  const lastGoldAnalysisDateRef = useRef<string | null>(null);

  useEffect(() => {
    const updateGoldPrediction = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Day begins at 9am. If before 9am, use yesterday's seed.
      const effectiveDate = new Date(now);
      if (currentHour < 9) {
        effectiveDate.setDate(now.getDate() - 1);
      }
      
      const dateStr = effectiveDate.toISOString().split('T')[0];
      const prediction = goldBrain.getDailyPrediction(effectiveDate);
      setGoldData({ ...prediction });

      // Smart Analysis via Gemini (Once per day)
      if (lastGoldAnalysisDateRef.current !== dateStr) {
        try {
          const prompt = `Provide a smart, professional 1-sentence market analysis for gold today. The predicted direction is ${prediction.direction}. Mention one potential economic driver.`;
          const response = await generateContentWithRetry({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          
          if (response.text) {
            goldBrain.updateAnalysis(effectiveDate, response.text);
            setGoldData({ ...goldBrain.getDailyPrediction(effectiveDate) });
            lastGoldAnalysisDateRef.current = dateStr;
          }
        } catch (err: any) {
          // If it's a quota error, we don't set lastGoldAnalysisDateRef so it can retry on the next interval
          // We only log it once per hour as a warning to avoid console spam
          const now = new Date();
          if (now.getMinutes() === 0) {
            if (err?.status === 429) {
              console.warn("Gold Smart Analysis Service busy (will retry).");
            } else {
              console.error("Gold Smart Analysis Error (will retry):", err);
            }
          }
          // Ensure we still have the default data
          setGoldData({ ...goldBrain.getDailyPrediction(effectiveDate) });
        }
      }
    };

    updateGoldPrediction();
    const interval = setInterval(updateGoldPrediction, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Real-time Weather & Date Logic
  const [currentWeather, setCurrentWeather] = useState(weatherTypes[0]);
  const [forecastWeather, setForecastWeather] = useState(weatherTypes[1]);
  const [tempTrend, setTempTrend] = useState<'+' | '-' | ''>('');
  const [prevTemp, setPrevTemp] = useState<number>(32);
  const prevTempRef = useRef<number>(32);
  const prevTypeRef = useRef<string>(weatherTypes[0].type);
  const lastWeatherAnalysisTimeRef = useRef<number>(0);
  const [locationName, setLocationName] = useState<string>('Detecting...');
  const [weatherAnalysis, setWeatherAnalysis] = useState<string>('Analyzing weather patterns...');
  
  const dateFormats = ['US', 'UK', 'ISO', 'Full'];
  const [dateFormatIndex, setDateFormatIndex] = useState(0);
  
  const formatDate = (date: Date, formatIndex: number) => {
    const format = dateFormats[formatIndex];
    switch(format) {
      case 'US': return date.toLocaleDateString('en-US');
      case 'UK': return date.toLocaleDateString('en-GB');
      case 'ISO': return date.toISOString().split('T')[0];
      case 'Full': return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      default: return date.toLocaleDateString();
    }
  };

  const toggleDateFormat = () => setDateFormatIndex((prev) => (prev + 1) % dateFormats.length);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number, city: string) => {
      if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
        console.warn("Weather: Invalid coordinates, skipping fetch", { lat, lon });
        return;
      }
      
      try {
        console.log(`Weather: Fetching for ${city} (${lat}, ${lon})...`);
        const response = await fetch(`${window.location.origin}/api/weather?lat=${lat}&lon=${lon}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Weather: Server responded with error", { status: response.status, errorData });
          throw new Error(errorData.error || `Weather API responded with status: ${response.status}`);
        }
        const data = await response.json();
        const current = data.current_weather;
        
        if (!current) throw new Error("No weather data in response");
        
        let typeIndex = 3; // Default Cloudy
        if (current.weathercode === 0) typeIndex = 0; // Hot/Sunny
        else if (current.weathercode >= 1 && current.weathercode <= 3) typeIndex = 3; // Cloudy
        else if (current.weathercode >= 51 && current.weathercode <= 82) typeIndex = 2; // Rainy
        else if (current.weathercode >= 95) typeIndex = 4; // Stormy
        else if (current.weathercode >= 71 && current.weathercode <= 77) typeIndex = 1; // Cold
        
        const newWeather = {
          ...weatherTypes[typeIndex],
          temp: `${Math.round(current.temperature)}°C`,
          tempValue: Math.round(current.temperature)
        };

        // Only update and speak if there's a significant change to avoid "frequent changes"
        const tempDiff = Math.abs(newWeather.tempValue - prevTempRef.current);
        const typeChanged = newWeather.type !== prevTypeRef.current;
        const now = Date.now();
        const analysisCooldown = 30 * 60 * 1000; // 30 minutes cooldown for AI analysis
        
        if (tempDiff >= 2 || typeChanged) {
          // Smart Analysis via Gemini
          const shouldAnalyze = now - lastWeatherAnalysisTimeRef.current > analysisCooldown || typeChanged;
          
          if (shouldAnalyze) {
            try {
              const analysisResponse = await generateContentWithRetry({
                model: "gemini-3-flash-preview",
                contents: `Analyze this weather for ${city}: ${newWeather.temp}, ${newWeather.type}. Provide a 1-sentence smart summary for the user.`,
              });
              
              if (analysisResponse.text) {
                setWeatherAnalysis(analysisResponse.text);
                lastWeatherAnalysisTimeRef.current = Date.now();
                const msg = new SpeechSynthesisUtterance(analysisResponse.text);
                window.speechSynthesis.speak(msg);
              }
            } catch (aiErr: any) {
              // If it's a quota error, don't log it as an error, just a warning
              if (aiErr?.status === 429) {
                console.warn("Smart Analysis Quota Exceeded. Using fallback.");
              } else {
                console.error("Smart Analysis Error:", aiErr);
              }
              
              const trendText = newWeather.tempValue > prevTempRef.current ? "increasing" : (newWeather.tempValue < prevTempRef.current ? "decreasing" : "stable");
              const fallbackText = `Weather update for ${city}: It is now ${newWeather.type} with a temperature of ${newWeather.tempValue} degrees. The temperature is ${trendText}.`;
              setWeatherAnalysis(fallbackText);
              const msg = new SpeechSynthesisUtterance(fallbackText);
              window.speechSynthesis.speak(msg);
            }
          } else {
            // Just update the basic text without AI if on cooldown
            const trendText = newWeather.tempValue > prevTempRef.current ? "increasing" : (newWeather.tempValue < prevTempRef.current ? "decreasing" : "stable");
            const updateText = `Weather update for ${city}: It is now ${newWeather.type} with a temperature of ${newWeather.tempValue} degrees. The temperature is ${trendText}.`;
            setWeatherAnalysis(updateText);
          }

          setTempTrend(newWeather.tempValue > prevTempRef.current ? '+' : (newWeather.tempValue < prevTempRef.current ? '-' : ''));
          prevTempRef.current = newWeather.tempValue;
          prevTypeRef.current = newWeather.type;
          setPrevTemp(newWeather.tempValue);
          setCurrentWeather(newWeather);
        }
      } catch (error: any) {
        console.error("Weather Fetch Error:", error.message || error);
        // Set a fallback weather state instead of leaving it empty/broken
        if (!currentWeather) {
          setCurrentWeather({
            type: 'Cloudy / Fair',
            icon: Cloud,
            color: 'text-slate-400',
            bg: 'from-slate-500/20 to-gray-500/20',
            glow: 'drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]',
            symbol: '⛅',
            temp: '--°C',
            tempValue: 20
          });
        }
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            let city = 'Your Region';
            try {
              const res = await fetch(`${window.location.origin}/api/geocode?lat=${latitude}&lon=${longitude}`);
              if (!res.ok) throw new Error(`Geocode API responded with status: ${res.status}`);
              const data = await res.json();
              city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Your Region';
              setLocationName(city);
            } catch (e) {
              console.error("Geocoding Error:", e);
              setLocationName('Your Region');
            }
            fetchWeather(latitude, longitude, city);
          },
          (error) => {
            console.error("Geolocation Error:", error);
            setLocationName('Global');
            fetchWeather(-1.286389, 36.817223, 'Global'); // Default to Nairobi
          }
        );
      } else {
        setLocationName('Global');
        fetchWeather(-1.286389, 36.817223, 'Global');
      }
    };

    getLocation();
    const interval = setInterval(getLocation, 600000); // Update every 10 mins
    return () => clearInterval(interval);
  }, []);

  const CurrentWeatherIcon = currentWeather.icon;
  const ForecastWeatherIcon = forecastWeather.icon;

  const coreNavItems = [
    { path: '/', icon: Home, color: 'text-blue-500', label: 'Home' },
    { path: '/groups', icon: Users, color: 'text-green-500', label: 'Groups' },
    { path: '/rewards', icon: Gem, color: 'text-yellow-500', label: 'Rewards' },
    { path: '/profile', icon: User, color: 'text-purple-500', label: 'Profile' },
  ];

  const extraNavItems = [
    { path: '/education', icon: GraduationCap, color: 'text-blue-500', label: 'Education' },
    { path: '/events', icon: Calendar, color: 'text-indigo-600', label: 'Events' },
    { path: '/dating', icon: Heart, color: 'text-pink-500', label: 'Dating' },
    { path: '/watch-to-earn', icon: Youtube, color: 'text-red-500', label: 'Watch to Earn' },
    { path: '/moderation', icon: ShieldAlert, color: 'text-red-500', label: 'Moderation' },
    { path: '/notifications', icon: Bell, color: 'text-orange-500', label: 'Notifications' },
    { path: '/calls', icon: Phone, color: 'text-indigo-500', label: 'Calls' },
    { path: '/terms', icon: FileText, color: 'text-teal-500', label: 'Terms' },
    { path: '/privacy', icon: Lock, color: 'text-indigo-500', label: 'Privacy' },
    { path: '/support', icon: Headphones, color: 'text-cyan-500', label: 'Support' },
  ];

  if (userData?.role === 'admin') {
    extraNavItems.unshift({ path: '/admin', icon: ShieldCheck, color: 'text-purple-600', label: 'Admin' });
  }

  const navItems = [...coreNavItems, ...extraNavItems];

  const rightLinks = [
    { type: 'icon', icon: Share2, color: 'text-blue-500', title: 'Share Pulse Feeds', action: handleShare },
    { type: 'icon', icon: Edit3, color: 'text-yellow-500', title: 'Note Pad', action: () => setActiveModal('notepad') },
    { type: 'icon', icon: DollarSign, color: 'text-green-500', title: 'AdMob Ads', path: '/ads' },
    
    // Messaging Links
    { type: 'img', src: 'https://cdn.simpleicons.org/whatsapp/25D366', title: 'WhatsApp', href: 'https://web.whatsapp.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/telegram/26A5E4', title: 'Telegram', href: 'https://web.telegram.org' },
    { type: 'img', src: 'https://cdn.simpleicons.org/messenger/00B2FF', title: 'Messenger', href: 'https://messenger.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/signal/3A76F0', title: 'Signal', href: 'https://signal.org' },
    { type: 'img', src: 'https://cdn.simpleicons.org/discord/5865F2', title: 'Discord', href: 'https://discord.com/app' },
    { type: 'img', src: 'https://cdn.simpleicons.org/wechat/07C160', title: 'WeChat', href: 'https://web.wechat.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/skype/00AFF0', title: 'Skype', href: 'https://web.skype.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/viber/7360F2', title: 'Viber', href: 'https://www.viber.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/line/00C300', title: 'Line', href: 'https://line.me' },
    { type: 'img', src: 'https://cdn.simpleicons.org/slack/4A154B', title: 'Slack', href: 'https://slack.com' },

    // Social Media Links
    { type: 'img', src: 'https://cdn.simpleicons.org/facebook/1877F2', title: 'Facebook', href: 'https://facebook.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/x/black', darkSrc: 'https://cdn.simpleicons.org/x/white', title: 'X (Twitter)', href: 'https://x.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/instagram/E4405F', title: 'Instagram', href: 'https://instagram.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/linkedin/0A66C2', title: 'LinkedIn', href: 'https://linkedin.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/tiktok/black', darkSrc: 'https://cdn.simpleicons.org/tiktok/white', title: 'TikTok', href: 'https://tiktok.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/youtube/FF0000', title: 'YouTube', href: 'https://youtube.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/snapchat/FFFC00', title: 'Snapchat', href: 'https://snapchat.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/pinterest/E60023', title: 'Pinterest', href: 'https://pinterest.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/reddit/FF4500', title: 'Reddit', href: 'https://reddit.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/threads/black', darkSrc: 'https://cdn.simpleicons.org/threads/white', title: 'Threads', href: 'https://threads.net' },
    { type: 'img', src: 'https://cdn.simpleicons.org/twitch/9146FF', title: 'Twitch', href: 'https://twitch.tv' },
    { type: 'img', src: 'https://cdn.simpleicons.org/tumblr/36465D', title: 'Tumblr', href: 'https://tumblr.com' },

    // Other Utilities
    { type: 'img', src: 'https://cdn.simpleicons.org/gmail/EA4335', title: 'Gmail', href: 'https://gmail.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/yahoo/720E9E', title: 'Yahoo', href: 'https://yahoo.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlemaps/4285F4', title: 'Maps', href: 'https://maps.google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/google/4285F4', title: 'Google Search', href: 'https://google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlegemini/8E75B2', title: 'Gemini AI', href: 'https://gemini.google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/brave/FF2000', title: 'Brave', href: 'https://brave.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlechrome/4285F4', title: 'Chrome', href: 'https://google.com/chrome' },
    { type: 'icon', icon: LayoutGrid, color: 'text-gray-600 dark:text-gray-300', title: 'Google Apps', action: () => setActiveModal('googleapps') },
    { type: 'icon', icon: Calculator, color: 'text-blue-500', title: 'Calculator', action: () => setActiveModal('calculator') },
    { type: 'icon', icon: Calendar, color: 'text-blue-600', title: 'Calendar', action: () => setActiveModal('calendar') },
    { type: 'icon', icon: HeartPulse, color: 'text-red-500', title: 'Health Checker', action: () => setActiveModal('health') },
    { type: 'icon', icon: Fingerprint, color: 'text-pink-400', title: 'Fingerprint Reader', action: () => setActiveModal('fingerprint') },
    { type: 'icon', icon: Brain, color: 'text-indigo-500', title: 'AI Assistant', action: () => window.dispatchEvent(new CustomEvent('toggle-ai-assistant')) },
    { type: 'icon', icon: Phone, color: 'text-blue-500', title: 'Calls', path: '/calls' },
  ];

  return (
    <div className={cn(
      "bg-gray-200 dark:bg-black h-[100dvh] overflow-hidden flex items-center justify-center transition-colors duration-300",
      viewMode === 'desktop' ? "p-2 sm:p-4" : "p-0"
    )}>
      <div className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-all duration-500 relative h-full w-full",
        viewMode === 'mobile' && window.innerWidth >= 1024 && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
          ? "max-w-[375px] max-h-[812px] rounded-[3rem] border-[12px] border-gray-800 dark:border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.3)]" 
          : "rounded-none lg:rounded-2xl shadow-2xl"
      )}>
        {/* Mobile Notch Simulation */}
        {viewMode === 'mobile' && window.innerWidth >= 1024 && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-gray-700 rounded-full"></div>
          </div>
        )}
        {/* Header */}
        <header className="sticky top-0 flex items-center justify-between px-6 sm:px-8 py-4 bg-white dark:bg-gray-800 shadow-md z-[100] shrink-0 gap-4">
          <div className="flex items-center w-12 sm:w-16">
            <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group" title="Restore Home Screen">
              <Home className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1">
            {/* Date & Time Display - More Prominent */}
            <div 
              onClick={toggleDateFormat}
              className="mb-1 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm cursor-pointer hover:shadow-md transition-all group flex items-center space-x-3"
              title="Click to toggle date format"
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {formatDate(time, dateFormatIndex)}
              </span>
              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800 mx-1"></div>
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div 
              className="flex items-center space-x-4 bg-yellow-100/50 dark:bg-yellow-900/20 px-5 sm:px-8 py-2 rounded-full border border-yellow-200/50 dark:border-yellow-700/30 shadow-sm transition-all hover:scale-105 cursor-help group relative" 
              title="Gold Intelligence Unit"
            >
              <span className="font-black text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-500 tracking-widest uppercase">Gold</span>
              <span className="text-sm sm:text-xl font-bold drop-shadow-sm">{goldData?.symbol || '⏭️'}</span>
              
              {/* Brain Unit Tooltip */}
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-yellow-200 dark:border-yellow-700 p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[150] text-left">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3 text-yellow-600" />
                    <span className="text-[10px] font-bold text-yellow-600 uppercase">Brain Unit Intelligence</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] text-gray-400">Live</span>
                  </div>
                </div>

                {/* Analysis */}
                <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight mb-3 italic font-medium">
                  "{goldData?.analysis}"
                </p>

                {/* Brain Steps */}
                <div className="space-y-1.5 mb-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">INPUT:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.input}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">LOGIC:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.logic}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">ANALYSIS:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.analysis}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">OUTPUT:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.output}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">CORRECT:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.errorCorrection}</span>
                  </div>
                  <div className="flex items-start gap-2 text-[8px]">
                    <span className="text-yellow-600 font-bold w-12 shrink-0">UPDATE:</span>
                    <span className="text-gray-500 dark:text-gray-400">{goldData?.brainSteps.update}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded border border-blue-100 dark:border-blue-800/30">
                    <p className="text-blue-400 uppercase font-bold mb-0.5 text-[7px]">Top Seller</p>
                    <p className="text-blue-600 dark:text-blue-400 font-bold truncate">{goldData?.bestSeller}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-1.5 rounded border border-green-100 dark:border-green-800/30">
                    <p className="text-green-400 uppercase font-bold mb-0.5 text-[7px]">Top Buyer</p>
                    <p className="text-green-600 dark:text-green-400 font-bold truncate">{goldData?.bestBuyer}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[8px] text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-1.5">
                  <span>Confidence: {goldData?.confidence}%</span>
                  <span>Sync: {new Date(goldData?.lastUpdate || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex items-center space-x-1" title="Your Points">
                <Gem className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 tracking-tighter">
                  {userData?.points?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center space-x-1" title="Your Cash Balance">
                <DollarSign className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 tracking-tighter">
                  ${userData?.balance?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  isIdle ? "bg-gray-400" : "bg-green-500"
                )}></div>
                <span className="text-[7px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                  {isIdle ? "Idle" : "Active"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button onClick={() => setActiveModal('translate')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Translate">
              <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </button>
            <button onClick={() => setActiveModal('call')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Call Support">
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </button>
            <button onClick={() => navigate('/calls')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="User & Group Calls">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-view-mode'))} 
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
              title="Toggle View Mode"
            >
              {viewMode === 'desktop' ? <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
            </button>
            <button 
              onClick={() => {
                setDateFormatIndex(0);
                setActiveCategory("All");
                setSearchQuery("");
                showNotification("Header Reset", { body: "Header and filters have been restored to default." });
              }}
              className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
              title="Reset Header & Filters"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative min-h-0">
          
          {/* Left Utility Bar (Weather, Clock, Health) */}
          <div className={cn(
            "flex-col w-12 sm:w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-2 sm:py-4 items-center space-y-4 sm:space-y-6 overflow-y-auto shrink-0 z-10 custom-scrollbar",
            viewMode === 'desktop' ? "hidden sm:flex" : "hidden"
          )}>
            <div className="flex flex-col items-center space-y-1 group relative" title={`Today: ${currentWeather.type}`}>
              <CurrentWeatherIcon className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-all", currentWeather.color, currentWeather.glow)} />
              <span className="text-[8px] sm:text-[10px] font-bold opacity-70">Today</span>
            </div>
            <div className="flex flex-col items-center space-y-1 group relative" title={`Forecast: ${forecastWeather.type}`}>
              <ForecastWeatherIcon className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-all opacity-80", forecastWeather.color, forecastWeather.glow)} />
              <span className="text-[8px] sm:text-[10px] font-bold opacity-70">Later</span>
            </div>
            <div className="w-6 sm:w-8 h-px bg-gray-200 dark:bg-gray-700 my-1 sm:my-2"></div>
            <div className="flex flex-col items-center space-y-1" title="Clock" onClick={() => setActiveModal('clock')}>
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Sport Watch" onClick={() => setActiveModal('watch')}>
              <Watch className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Alarm" onClick={() => setActiveModal('alarm')}>
              <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Notifications" onClick={() => navigate('/notifications')}>
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Note Pad" onClick={() => setActiveModal('notepad')}>
              <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1 mt-auto" title="Health Checker" onClick={() => setActiveModal('health')}>
              <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 animate-pulse cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Fingerprint Reader" onClick={() => setActiveModal('fingerprint')}>
              <Fingerprint className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500 cursor-pointer" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="AI Eye: Universal Analysis" onClick={() => setActiveModal('aieye')}>
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 cursor-pointer animate-pulse" />
            </div>
            <div className="flex flex-col items-center space-y-1" title="Master AI Assistant" onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-assistant'))}>
              <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 cursor-pointer animate-pulse" />
            </div>
          </div>

          {/* Desktop Sidebar Navigation */}
          <div className={cn(
            "flex-col w-16 sm:w-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-4 items-center space-y-4 overflow-y-auto shrink-0 z-10 custom-scrollbar",
            viewMode === 'desktop' ? "hidden sm:flex" : "hidden"
          )}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl transition-all duration-300 group relative",
                    isActive ? "bg-blue-50 dark:bg-blue-900/20 shadow-inner" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  )}
                  title={item.label}
                >
                  <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", item.color, isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                  {isActive && <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-l-full"></div>}
                  <span className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 pb-32 relative custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full h-full">
              <Outlet context={{ 
                currentWeather, 
                forecastWeather, 
                locationName, 
                tempTrend, 
                weatherAnalysis,
                searchQuery,
                setSearchQuery,
                activeCategory,
                setActiveCategory,
                showAdvancedSearch
              }} />
            </div>
          </main>
        </div>

        {/* Create Post Modals */}
        <AnimatePresence>
          {activeModal === 'create-post-text' && (
            <CreatePostModal type="text" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-video' && (
            <CreatePostModal type="video" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-live' && (
            <CreatePostModal type="live" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-poll' && (
            <CreatePostModal type="poll" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-announcement' && (
            <CreatePostModal type="announcement" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-update' && (
            <CreatePostModal type="update" onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'create-post-gif' && (
            <CreatePostModal type="gif" onClose={() => setActiveModal(null)} />
          )}
        </AnimatePresence>

        {/* AI Eye Modal */}
        {activeModal === 'aieye' && (
          <AIEyeModal onClose={() => setActiveModal(null)} />
        )}
      
      {/* Bottom Smart Hub Navigation */}
      <div className={cn(
        "sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0 z-[100] pb-safe"
      )}>
        {/* Search and Categories Hub */}
        <div className="px-6 py-3 space-y-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search or ask AI Eye..."
                className="block w-full pl-10 pr-12 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button 
                  onClick={() => setActiveModal('aieye')}
                  className="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-all"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={cn(
                "p-2.5 rounded-full transition-colors border",
                showAdvancedSearch 
                  ? "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0",
                  activeCategory === cat.name
                    ? "bg-purple-600 text-white border-purple-600 shadow-md"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-200"
                )}
              >
                <cat.icon className={cn("w-3.5 h-3.5", activeCategory === cat.name ? "text-white" : cat.color)} />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-around items-center p-3 max-w-screen-xl mx-auto border-t border-gray-50 dark:border-gray-700/50">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-300 gap-1",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "scale-110" : "")} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
          <button 
            onClick={() => setActiveModal('moreMenu')}
            className="flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-300 gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
          </button>
        </div>
      </div>
      
      {/* Modals */}
      {activeModal && !activeModal.startsWith('create-post-') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg capitalize">{activeModal.replace('googleapps', 'Google Apps')}</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {activeModal === 'weather' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CurrentWeatherIcon className={cn("w-12 h-12", currentWeather.color, currentWeather.glow)} />
                      <div>
                        <h4 className="text-2xl font-bold">{currentWeather.temp}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{currentWeather.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{locationName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Auto Location Reader</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
                      <Brain className="w-4 h-4 mr-2" />
                      Smart Weather Analysis
                    </h5>
                    <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                      {weatherAnalysis}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Temperature Trend</p>
                      <p className="text-sm font-bold flex items-center">
                        {tempTrend === '+' ? <TrendingUp className="w-4 h-4 text-red-500 mr-1" /> : (tempTrend === '-' ? <TrendingDown className="w-4 h-4 text-blue-500 mr-1" /> : <Minus className="w-4 h-4 text-gray-500 mr-1" />)}
                        {tempTrend === '+' ? 'Increasing' : (tempTrend === '-' ? 'Decreasing' : 'Stable')}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Forecast</p>
                      <p className="text-sm font-bold flex items-center">
                        <ForecastWeatherIcon className={cn("w-4 h-4 mr-1", forecastWeather.color)} />
                        {forecastWeather.type}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {activeModal === 'notepad' && (
                <NotePadModal />
              )}
              {activeModal === 'calculator' && (
                <CalculatorModal onClose={() => setActiveModal(null)} />
              )}
              {activeModal === 'calendar' && (
                <CalendarModal />
              )}
              {activeModal === 'health' && (
                <HealthModal />
              )}
              {activeModal === 'googleapps' && (
                <GoogleAppsModal />
              )}
              {activeModal === 'fingerprint' && (
                <FingerprintModal onClose={() => setActiveModal(null)} />
              )}
              {activeModal === 'call' && (
                <CallModal />
              )}
              {activeModal === 'translate' && (
                <TranslateModal onClose={() => setActiveModal(null)} />
              )}
              {(activeModal === 'clock' || activeModal === 'watch' || activeModal === 'alarm') && (
                <ClockModal activeTab={activeModal} onTabChange={setActiveModal} />
              )}
              {activeModal === 'moreMenu' && (
                <div className="grid grid-cols-3 gap-4">
                  {extraNavItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <Link 
                        key={idx}
                        to={item.path}
                        onClick={() => setActiveModal(null)}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-2"
                      >
                        <Icon className={cn("w-6 h-6", item.color)} />
                        <span className="text-xs font-bold text-center">{item.label}</span>
                      </Link>
                    );
                  })}
                  {rightLinks.map((link, idx) => {
                    const Wrapper = link.href ? 'a' : (link.path ? Link : 'button');
                    const props = link.href ? { href: link.href, target: "_blank", rel: "noopener noreferrer" } : { to: link.path || '' };
                    return (
                      <Wrapper
                        key={`right-${idx}`}
                        {...props as any}
                        onClick={() => {
                          if (link.action) link.action();
                          if (link.path) setActiveModal(null);
                        }}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-2"
                      >
                        {link.type === 'img' ? (
                          <img src={link.src} alt={link.title} className={cn("w-6 h-6 object-contain", link.darkSrc ? "dark:hidden" : "")} />
                        ) : (
                          link.icon && <link.icon className={cn("w-6 h-6", link.color)} />
                        )}
                        <span className="text-xs font-bold text-center">{link.title}</span>
                      </Wrapper>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for hiding scrollbars but keeping functionality */}
      <style>{`
        .dark {
          --tw-bg-opacity: 1;
          background-color: rgb(0 0 0 / var(--tw-bg-opacity));
        }
        .dark .bg-gray-900 {
          background-color: #020202;
        }
        .dark .bg-gray-800 {
          background-color: #050505;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
      `}</style>
        {/* Floating Action Button (FAB) - Positioned relative to frame */}
        <div className="absolute bottom-48 right-6 sm:right-10 z-[110] flex flex-col items-center space-y-4">
          <AnimatePresence>
            {showAddPostMenu && (
              <div className="flex flex-col items-center space-y-3 mb-2">
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  onClick={() => {
                    setActiveModal('create-post-video');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Add Video"
                >
                  <Video className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Video</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => {
                    setActiveModal('create-post-live');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Go Live"
                >
                  <Radio className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Live</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => {
                    setActiveModal('create-post-poll');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Create Poll"
                >
                  <BarChart2 className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Poll</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => {
                    setActiveModal('create-post-announcement');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Announcement"
                >
                  <Megaphone className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Announcement</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => {
                    setActiveModal('create-post-update');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Update"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Update</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.25 }}
                  onClick={() => {
                    setActiveModal('create-post-text');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Add Text"
                >
                  <Type className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Text</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.35 }}
                  onClick={() => {
                    setActiveModal('create-post-gif');
                    setShowAddPostMenu(false);
                  }}
                  className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Add GIF"
                >
                  <Smile className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">GIF</span>
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => {
                    // Smart Suggest logic
                    const suggestions = ['poll', 'announcement', 'update', 'text', 'video'];
                    const randomType = suggestions[Math.floor(Math.random() * suggestions.length)];
                    setActiveModal(`create-post-${randomType}`);
                    setShowAddPostMenu(false);
                    showNotification("Smart Suggestion", { body: `Gemini suggests you create a ${randomType} post!` });
                  }}
                  className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform group relative"
                  title="Smart Suggest"
                >
                  <Brain className="w-5 h-5" />
                  <span className="absolute right-full mr-3 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">Smart Suggest</span>
                </motion.button>
              </div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowAddPostMenu(!showAddPostMenu)}
            className={cn(
              "w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all",
              showAddPostMenu ? "rotate-45 scale-90" : "hover:scale-105"
            )}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* AI Assistant & Self Healing */}
        <AIAssistant />
        <SelfHealing />
      </div>
    </div>
  );
}
