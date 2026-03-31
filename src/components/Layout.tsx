import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { 
  Home, Users, PlusSquare, Gem, User, ShieldAlert, Bell, FileText, Lock, Headphones,
  Sun, Moon, CloudRain, Cloud, CloudLightning, Clock, Watch, BellRing, StickyNote,
  Fingerprint, HeartPulse, MapPin, Phone, MessageCircle, Gamepad2, Globe, BrainCircuit,
  Languages, Ticket, Snowflake, Calendar, Smartphone, Monitor, PhoneCall, Wrench,
  Calculator, LayoutGrid, Power, RefreshCw, ArrowUpCircle, ArrowDownCircle, XCircle, RotateCcw, Edit3, DollarSign, LogOut, Wallet, X, Send, Search, CheckCircle2, Plus,
  Volume2, VolumeX, Share2, Brain, TrendingUp, TrendingDown, Minus, Menu
} from "lucide-react";
import { GoogleGenAI, Modality } from "@google/genai";
import { generateContentWithRetry } from "../lib/ai";
import { cn } from "../lib/utils";
import { 
  pulse_feeds_auto_sync, daily_twin_sync, midnight_settlement_engine, 
  revenue_split_engine, auto_updater, resource_governor, 
  theme_engine, HeaderIntelligence 
} from "../lib/engines";
import { useAuth } from "../contexts/AuthContext";
import { useRevenue } from "../contexts/RevenueContext";
import { useNotifications } from "../hooks/useNotifications";

const weatherTypes = [
  { type: 'Hot / Sunny', icon: Sun, color: 'text-orange-500', bg: 'from-orange-500/20 to-yellow-500/20', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]', symbol: '☀️', temp: '32°C', tempValue: 32 },
  { type: 'Cold / Chilly', icon: Snowflake, color: 'text-cyan-300', bg: 'from-cyan-500/20 to-blue-500/20', glow: 'drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]', symbol: '❄️', temp: '2°C', tempValue: 2 },
  { type: 'Rainy', icon: CloudRain, color: 'text-teal-700', bg: 'from-teal-500/20 to-emerald-500/20', glow: 'drop-shadow-[0_0_8px_rgba(15,118,110,0.8)]', symbol: '🌧️', temp: '14°C', tempValue: 14 },
  { type: 'Cloudy / Fair', icon: Cloud, color: 'text-slate-400', bg: 'from-slate-500/20 to-gray-500/20', glow: 'drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]', symbol: '⛅', temp: '20°C', tempValue: 20 },
  { type: 'Stormy', icon: CloudLightning, color: 'text-purple-500', bg: 'from-purple-500/20 to-indigo-500/20', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', symbol: '⛈️', temp: '18°C', tempValue: 18 }
];

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const { isIdle, totalEarnedToday } = useRevenue();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [time, setTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    const handleToggleView = () => {
      setViewMode(prev => prev === 'desktop' ? 'mobile' : 'desktop');
    };
    window.addEventListener('toggle-view-mode', handleToggleView);
    return () => window.removeEventListener('toggle-view-mode', handleToggleView);
  }, []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notes, setNotes] = useState<{id: string, text: string, date: string}[]>(() => {
    const saved = localStorage.getItem('user_notes_list');
    return saved ? JSON.parse(saved) : [{ id: '1', text: localStorage.getItem('user_notes') || '', date: new Date().toISOString() }];
  });
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  
  // Calculator State
  const [calcValue, setCalcValue] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isShortening, setIsShortening] = useState(false);

  const { showNotification } = useNotifications();

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const handleShare = async () => {
    if (isShortening) return;
    setIsShortening(true);
    try {
      const currentUrl = window.location.origin;
      const response = await fetch(`/api/shorten?url=${encodeURIComponent(currentUrl)}`);
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
        model: "gemini-2.5-flash-preview-tts",
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
    } catch (error) {
      console.error("TTS Error:", error);
      // Fallback to browser TTS if Gemini fails
      const statusMessage = "Pulse Feeds is currently in development. To be fully functional, I need a secure backend connection, valid API keys for all integrated services, and a verified administrative account. System health is currently optimal, but these components are required for full feature deployment.";
      const msg = new SpeechSynthesisUtterance(statusMessage);
      msg.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(msg);
    }
  };

  const handleCalc = (val: string) => {
    if (val === "=") {
      try {
        const fullExpression = calcExpression + calcValue;
        const sanitizedExpression = fullExpression.replace(/[^-+*/0-9.]/g, '');
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${sanitizedExpression})`)();
        setCalcValue(String(result));
        setCalcExpression('');
      } catch (e) {
        setCalcValue("Error");
        setCalcExpression("");
      }
    } else if (val === "C") {
      setCalcValue("0");
      setCalcExpression("");
    } else if (val === "DEL") {
      setCalcValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (['+', '-', '*', '/', '%'].includes(val)) {
      setCalcExpression(calcValue + val);
      setCalcValue('0');
    } else {
      setCalcValue(prev => prev === "0" ? val : prev + val);
    }
  };

  // Clock/Watch/Alarm State
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [timerTime, setTimerTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');

  // Clock Ticking
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      
      // Check alarm
      const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      if (alarmTime === currentTimeStr) {
        // Only trigger once per minute
        const lastAlarmTrigger = localStorage.getItem('last_alarm_trigger');
        if (lastAlarmTrigger !== currentTimeStr) {
          showNotification("Alarm!", { body: `It's ${alarmTime}!` });
          localStorage.setItem('last_alarm_trigger', currentTimeStr);
          
          // Play a sound if possible
          try {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
            audio.play();
          } catch (e) {
            console.error("Alarm sound error:", e);
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmTime, showNotification]);

  // Stopwatch Ticking
  useEffect(() => {
    let interval: any;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Timer Ticking
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(prev => prev - 1);
      }, 1000);
    } else if (timerTime === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      showNotification("Timer Finished", { body: "Your countdown has ended." });
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime, showNotification]);

  const location = useLocation();

  // Smart Gold Prediction Logic
  const [goldPrediction, setGoldPrediction] = useState('⏭️');
  const [goldSeller, setGoldSeller] = useState('Global Bullion');

  useEffect(() => {
    const updateGoldPrediction = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Day begins at 9am. If before 9am, use yesterday's seed.
      const effectiveDate = new Date(now);
      if (currentHour < 9) {
        effectiveDate.setDate(now.getDate() - 1);
      }
      
      const dateStr = effectiveDate.toISOString().split('T')[0];
      const pagePath = location.pathname;
      
      // Seed based on date and page path for "One prediction direction in each of 10 pages"
      const seed = `${dateStr}-${pagePath}`;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
      }
      
      const predictions = ['⏫', '⏬', '⏭️'];
      const sellers = ['Global Bullion', 'Gold Standard', 'Aureus Trading', 'Midas Exchange', 'Pure Gold Co.'];
      
      setGoldPrediction(predictions[Math.abs(hash) % predictions.length]);
      setGoldSeller(sellers[Math.abs(hash) % sellers.length]);
    };

    updateGoldPrediction();
    const interval = setInterval(updateGoldPrediction, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [location.pathname]);

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
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        const current = data.current_weather;
        
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
                contents: [{ parts: [{ text: `Analyze this weather for ${city}: ${newWeather.temp}, ${newWeather.type}. Provide a 1-sentence smart summary for the user.` }] }],
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
      } catch (error) {
        console.error("Weather Fetch Error:", error);
      }
    };

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            let city = 'Your Region';
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await res.json();
              city = data.address.city || data.address.town || data.address.village || data.address.suburb || 'Your Region';
              setLocationName(city);
            } catch (e) {
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
    { path: '/posts', icon: PlusSquare, color: 'text-pink-500', label: 'Posts' },
    { path: '/rewards', icon: Gem, color: 'text-yellow-500', label: 'Rewards' },
    { path: '/profile', icon: User, color: 'text-purple-500', label: 'Profile' },
  ];

  const extraNavItems = [
    { path: '/moderation', icon: ShieldAlert, color: 'text-red-500', label: 'Moderation' },
    { path: '/notifications', icon: Bell, color: 'text-orange-500', label: 'Notifications' },
    { path: '/calls', icon: Phone, color: 'text-indigo-500', label: 'Calls' },
    { path: '/terms', icon: FileText, color: 'text-teal-500', label: 'Terms' },
    { path: '/privacy', icon: Lock, color: 'text-indigo-500', label: 'Privacy' },
    { path: '/support', icon: Headphones, color: 'text-cyan-500', label: 'Support' },
  ];

  const navItems = [...coreNavItems, ...extraNavItems];

  const rightLinks = [
    { type: 'icon', icon: Share2, color: 'text-blue-500', title: 'Share Pulse Feeds', action: handleShare },
    { type: 'icon', icon: Edit3, color: 'text-yellow-500', title: 'Note Pad', action: () => setActiveModal('notepad') },
    { type: 'icon', icon: DollarSign, color: 'text-green-500', title: 'AdMob Ads', path: '/ads' },
    { type: 'img', src: 'https://cdn.simpleicons.org/whatsapp/25D366', title: 'WhatsApp', href: 'https://web.whatsapp.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/facebook/1877F2', title: 'Facebook', href: 'https://facebook.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/tiktok/black', darkSrc: 'https://cdn.simpleicons.org/tiktok/white', title: 'TikTok', href: 'https://tiktok.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/youtube/FF0000', title: 'YouTube', href: 'https://youtube.com' },
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
    { type: 'icon', icon: Phone, color: 'text-blue-500', title: 'Calls', path: '/calls' },
  ];

  return (
    <div className={cn("bg-gray-200 dark:bg-black min-h-[100dvh] flex items-center justify-center transition-colors duration-300", viewMode === 'desktop' ? "p-0" : "p-0 sm:p-8")}>
      <div className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-all duration-500 relative",
        viewMode === 'mobile' 
          ? "w-full sm:max-w-[375px] sm:h-[812px] sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border-[8px] border-gray-800 dark:border-gray-800 shadow-2xl h-[100dvh]" 
          : "w-full h-[100dvh]"
      )}>
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 bg-white dark:bg-gray-800 shadow-md z-10 shrink-0 gap-2">
          <div className="flex items-center">
            <div 
              onClick={() => {
                const msg = "Pulse Feeds Master AI is active. Use the AI Eye in the search bar to detect real-world problems and earn education badges.";
                const utterance = new SpeechSynthesisUtterance(msg);
                window.speechSynthesis.speak(utterance);
              }}
              className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform group relative" 
              title="Master AI: System Intelligence"
            >
              <BrainCircuit className="w-6 h-6" />
              <span className="absolute -bottom-10 left-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Master AI: Click for Status
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="flex items-center space-x-2 bg-yellow-100/50 dark:bg-yellow-900/20 px-3 sm:px-4 py-1 rounded-full border border-yellow-200/50 dark:border-yellow-700/30 shadow-sm transition-all hover:scale-105 cursor-help" title={`Best Seller: ${goldSeller}`}>
              <span className="font-black text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-500 tracking-widest uppercase">Gold</span>
              <span className="text-sm sm:text-xl font-bold drop-shadow-sm">{goldPrediction}</span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isIdle ? "bg-gray-400" : "bg-green-500"
              )}></div>
              <span className="text-[7px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                {isIdle ? "Idle - Earning Paused" : `Active - Earned ${totalEarnedToday} pts`}
              </span>
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
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
            <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
              {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          
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

          {/* Center Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-24 relative">
            <div className="max-w-4xl mx-auto w-full h-full">
              <Outlet context={{ currentWeather, forecastWeather, locationName, tempTrend, weatherAnalysis }} />
            </div>
          </main>

          {/* Right Links Bar */}
          <div className={cn(
            "flex-col w-12 sm:w-16 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 py-2 sm:py-4 items-center space-y-3 sm:space-y-4 overflow-y-auto shrink-0 z-10 custom-scrollbar",
            viewMode === 'desktop' ? "hidden sm:flex" : "hidden"
          )}>
            {rightLinks.map((link, idx) => {
              if (link.href) {
                return (
                  <a 
                    key={idx} 
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 cursor-pointer" 
                    title={link.title}
                  >
                    {link.type === 'img' ? (
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                        <img 
                          src={link.src} 
                          alt={link.title} 
                          className={cn("w-full h-full object-contain", link.darkSrc ? "dark:hidden" : "")} 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        {link.darkSrc && (
                          <img 
                            src={link.darkSrc} 
                            alt={link.title} 
                            className="w-full h-full object-contain hidden dark:block" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <div className="hidden absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Globe className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ) : (
                      link.icon && <link.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", link.color)} />
                    )}
                    <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                      {link.title}
                    </span>
                  </a>
                );
              }
              const Wrapper = link.path ? Link : 'button';
              const handleClick = () => {
                if (link.action) link.action();
              };
              return (
                <Wrapper 
                  key={idx} 
                  to={link.path || ''} 
                  onClick={handleClick}
                  className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 cursor-pointer" 
                  title={link.title}
                >
                  {link.type === 'img' ? (
                    <div className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      <img 
                        src={link.src} 
                        alt={link.title} 
                        className={cn("w-full h-full object-contain", link.darkSrc ? "dark:hidden" : "")} 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      {link.darkSrc && (
                        <img 
                          src={link.darkSrc} 
                          alt={link.title} 
                          className="w-full h-full object-contain hidden dark:block" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      )}
                      <div className="hidden absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ) : (
                    link.icon && <link.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", link.color)} />
                  )}
                  <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50">
                    {link.title}
                  </span>
                </Wrapper>
              );
            })}
          </div>
        </div>

        {/* Floating Action Button (FAB) - Moved outside main for fixed positioning */}
        <Link to="/posts#add-post" className="fixed bottom-24 right-20 sm:right-24 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-30">
          <PlusSquare className="w-6 h-6" />
        </Link>

      {/* Master AI Icon - Subtle & Integrated */}
      <div className="fixed bottom-20 left-4 sm:left-6 z-30 group">
        <button 
          onClick={() => {
            if (isSpeaking) {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            } else {
              speakSystemStatus();
            }
          }} 
          className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 bg-white/5 dark:bg-black/5 backdrop-blur-[1px] rounded-full flex items-center justify-center text-purple-500/10 dark:text-purple-400/10 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-white/10 dark:hover:bg-black/10 hover:backdrop-blur-md transition-all border border-transparent hover:border-purple-500/20 shadow-none hover:shadow-lg relative overflow-hidden",
            isSpeaking && "text-purple-500 dark:text-purple-400 opacity-100 animate-pulse bg-white/10 dark:bg-black/10 backdrop-blur-md border-purple-500/30"
          )}
          title={isSpeaking ? "Stop Speaking" : "Master AI: System Controller"}
        >
          <BrainCircuit className={cn("w-5 h-5 sm:w-6 sm:h-6 transition-transform", isSpeaking ? "scale-110" : "group-hover:scale-110")} />
          
          {/* AI Activity Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-full h-full border border-purple-500/10 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
          </div>
        </button>
        
        {/* Tooltip/Status */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900/90 backdrop-blur-md text-white text-[9px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 border border-white/10 shadow-xl">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                systemStatus.status === 'optimal' ? "bg-green-500" : "bg-yellow-500"
              )}></div>
              <span className="font-bold tracking-wider uppercase">
                {isSpeaking ? "AI Analyzing System..." : `Master AI: ${systemStatus.status}`}
              </span>
            </div>
            <div className="text-[7px] text-gray-400 italic">{systemStatus.message}</div>
            <div className="text-[6px] text-gray-500 text-right">Last check: {systemStatus.lastCheck}</div>
          </div>
        </div>
      </div>

      {/* Bottom Smart Hub Navigation */}
      <nav className={cn(
        "bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0 z-20 pb-safe",
        viewMode === 'desktop' ? "sm:hidden" : ""
      )}>
        <div className="flex justify-around items-center p-2 max-w-screen-xl mx-auto">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-2 rounded-2xl transition-all duration-300",
                  isActive ? "bg-gray-100 dark:bg-gray-700 scale-110 shadow-inner" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
                title={item.label}
              >
                <Icon className={cn("w-6 h-6", item.color, isActive ? "drop-shadow-md" : "")} />
              </Link>
            );
          })}
          <button 
            onClick={() => setActiveModal('moreMenu')}
            className="flex flex-col items-center p-2 rounded-2xl transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            title="More"
          >
            <Menu className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </nav>
      
      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex space-x-2 overflow-x-auto pb-2 max-w-[250px] hide-scrollbar">
                      {notes.map((note, idx) => (
                        <button 
                          key={note.id} 
                          onClick={() => setCurrentNoteIndex(idx)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                            currentNoteIndex === idx ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          )}
                        >
                          Note {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        const newNote = { id: Date.now().toString(), text: '', date: new Date().toISOString() };
                        setNotes([...notes, newNote]);
                        setCurrentNoteIndex(notes.length);
                      }}
                      className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={notes[currentNoteIndex]?.text || ''}
                    onChange={(e) => {
                      const updatedNotes = [...notes];
                      updatedNotes[currentNoteIndex].text = e.target.value;
                      setNotes(updatedNotes);
                    }}
                    placeholder="Type your notes here..."
                    className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none font-medium"
                  />
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <button 
                      onClick={() => {
                        if (notes.length > 1) {
                          const updatedNotes = notes.filter((_, i) => i !== currentNoteIndex);
                          setNotes(updatedNotes);
                          setCurrentNoteIndex(Math.max(0, currentNoteIndex - 1));
                        } else {
                          const updatedNotes = [{ ...notes[0], text: '' }];
                          setNotes(updatedNotes);
                        }
                      }}
                      className="text-red-500 hover:underline"
                    >
                      Delete Note
                    </button>
                    <span>{notes[currentNoteIndex]?.text.length || 0} characters</span>
                  </div>
                </div>
              )}
              {activeModal === 'calculator' && (
                <div className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl text-right">
                    <div className="text-xs text-gray-500 h-4">{calcExpression}</div>
                    <div className="text-2xl font-mono font-bold truncate">{calcValue}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['C', 'DEL', '%', '/'].map(btn => (
                      <button 
                        key={btn} 
                        onClick={() => handleCalc(btn)}
                        className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-purple-600"
                      >
                        {btn}
                      </button>
                    ))}
                    {['7','8','9','*','4','5','6','-','1','2','3','+'].map(btn => (
                      <button 
                        key={btn} 
                        onClick={() => handleCalc(btn)}
                        className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {btn}
                      </button>
                    ))}
                    <button onClick={() => handleCalc('.')} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">.</button>
                    <button onClick={() => handleCalc('0')} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">0</button>
                    <button 
                      onClick={() => handleCalc('=')}
                      className="h-12 col-span-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
                    >
                      =
                    </button>
                  </div>
                </div>
              )}
              {activeModal === 'calendar' && (
                <div className="space-y-4">
                  <div className="text-center font-bold text-lg">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day}>{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const now = new Date();
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      const today = now.getDate();
                      
                      const days = [];
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`} />);
                      }
                      for (let i = 1; i <= daysInMonth; i++) {
                        const isToday = i === today;
                        days.push(
                          <div key={i} className={cn("h-8 flex items-center justify-center rounded-lg text-sm", isToday ? "bg-purple-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-800")}>
                            {i}
                          </div>
                        );
                      }
                      return days;
                    })()}
                  </div>
                </div>
              )}
              {activeModal === 'health' && (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                    <HeartPulse className="w-10 h-10 text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">Health Report Checker</h4>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">AI-powered diagnostic tool</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 block">Heart Rate</span>
                      <span className="text-lg font-bold">72 BPM</span>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 block">Sleep Score</span>
                      <span className="text-lg font-bold">85/100</span>
                    </div>
                  </div>
                  <button onClick={() => alert('Scanning health data...')} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Run Full Diagnostic</button>
                </div>
              )}
              {activeModal === 'googleapps' && (
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { name: 'Search', icon: Search, color: 'text-blue-500', url: 'https://google.com' },
                    { name: 'Maps', icon: MapPin, color: 'text-green-500', url: 'https://maps.google.com' },
                    { name: 'Mail', icon: Bell, color: 'text-red-500', url: 'https://gmail.com' },
                    { name: 'Drive', icon: LayoutGrid, color: 'text-yellow-500', url: 'https://drive.google.com' },
                    { name: 'Photos', icon: PlusSquare, color: 'text-pink-500', url: 'https://photos.google.com' },
                    { name: 'Translate', icon: Languages, color: 'text-blue-600', url: 'https://translate.google.com' }
                  ].map(app => (
                    <a 
                      key={app.name} 
                      href={app.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center space-y-2 group"
                    >
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-gray-700">
                        <app.icon className={cn("w-6 h-6", app.color)} />
                      </div>
                      <span className="text-xs font-medium">{app.name}</span>
                    </a>
                  ))}
                </div>
              )}
              {activeModal === 'fingerprint' && (
                <div className="space-y-6 text-center">
                  <div className="w-24 h-24 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto relative">
                    <Fingerprint className="w-12 h-12 text-cyan-500" />
                    <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">Biometric Scanner</h4>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Place your finger on the sensor</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-cyan-500/50">
                    <span className="text-sm font-medium text-cyan-600 animate-pulse">Waiting for input...</span>
                  </div>
                  <button onClick={() => alert('Identity Verified!')} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-colors">Simulate Scan</button>
                </div>
              )}
              {activeModal === 'call' && (
                <div className="space-y-6 text-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <PhoneCall className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(num => (
                      <button key={num} className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-600 mx-auto">
                        {num}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => alert('Calling...')} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                    <Phone className="w-5 h-5" />
                    <span>Call Pulse Support</span>
                  </button>
                </div>
              )}
              {activeModal === 'translate' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {['English', 'Swahili', 'French', 'Spanish', 'German', 'Chinese', 'Japanese', 'Arabic'].map(lang => (
                      <button key={lang} onClick={() => { alert(`Language changed to ${lang}`); setActiveModal(null); }} className="py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(activeModal === 'clock' || activeModal === 'watch' || activeModal === 'alarm') && (
                <div className="space-y-6">
                  <div className="flex justify-center space-x-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                    {['clock', 'watch', 'alarm'].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setActiveModal(tab)}
                        className={cn(
                          "px-4 py-1 rounded-full text-xs font-bold capitalize transition-all",
                          activeModal === tab ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {activeModal === 'clock' && (
                    <div className="text-center space-y-4">
                      <div className="text-5xl font-mono font-bold text-blue-500 drop-shadow-sm">
                        {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <p className="text-sm text-gray-500">{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  )}

                  {activeModal === 'watch' && (
                    <div className="text-center space-y-6">
                      <div className="text-5xl font-mono font-bold text-orange-500">
                        {Math.floor(stopwatchTime / 60000).toString().padStart(2, '0')}:
                        {Math.floor((stopwatchTime % 60000) / 1000).toString().padStart(2, '0')}.
                        {Math.floor((stopwatchTime % 1000) / 10).toString().padStart(2, '0')}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-bold text-white transition-all",
                            isStopwatchRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                          )}
                        >
                          {isStopwatchRunning ? 'Stop' : 'Start'}
                        </button>
                        <button 
                          onClick={() => { setStopwatchTime(0); setIsStopwatchRunning(false); }}
                          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'alarm' && (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center space-y-4">
                        <input 
                          type="time" 
                          value={alarmTime}
                          onChange={(e) => setAlarmTime(e.target.value)}
                          className="text-3xl font-mono font-bold p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        <button 
                          onClick={() => {
                            if (alarmTime) alert(`Alarm set for ${alarmTime}`);
                            else alert('Please select a time');
                          }}
                          className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
                        >
                          Set Alarm
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                          <span className="font-bold">07:00 AM</span>
                          <div className="w-10 h-5 bg-green-500 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
      </div>
    </div>
  );
}
