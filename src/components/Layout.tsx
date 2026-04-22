import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Home, Users, PlusSquare, Gem, User, ShieldAlert, Bell, FileText, Lock, Headphones,
  Sun, Moon, CloudRain, Cloud, CloudLightning, Clock, Watch, BellRing, StickyNote,
  Fingerprint, HeartPulse, MapPin, Phone, MessageCircle, Gamepad2, Globe, BrainCircuit,
  Languages, Ticket, Snowflake, Calendar, Smartphone, Monitor, PhoneCall, Wrench,
  Calculator, LayoutGrid, Power, RefreshCw, ArrowUpCircle, ArrowDownCircle, XCircle, RotateCcw, Edit3, DollarSign, LogOut, Wallet, X, Send, Search, CheckCircle2, Plus, ShieldCheck, Zap,
  Volume2, VolumeX, Share2, Brain, TrendingUp, TrendingDown, Minus, Menu, GraduationCap, Eye, Loader2, Video, Type, Radio, Megaphone, BarChart2, Smile, Crown, Filter, Sparkles, Camera, Heart, Youtube, Layers, Map, AlertTriangle, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Modality } from "@google/genai";
import { generateContentWithRetry } from "../lib/ai";
import { cn } from "../lib/utils";
import { saveInsight } from "../lib/insights";
import { 
  pulse_feeds_auto_sync, daily_twin_sync, midnight_settlement_engine, 
  revenue_distribution_engine, auto_updater, resource_governor, 
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
import { setDoc, doc, arrayUnion, serverTimestamp, getDocFromServer } from "firebase/firestore";

const weatherTypes = [
  { type: 'Hot / Sunny', icon: Sun, color: 'text-orange-500', bg: 'from-orange-500/20 to-yellow-500/20', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]', symbol: '☀️', temp: '--°C', tempValue: 25 },
  { type: 'Cold / Chilly', icon: Snowflake, color: 'text-cyan-300', bg: 'from-cyan-500/20 to-blue-500/20', glow: 'drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]', symbol: '❄️', temp: '--°C', tempValue: 5 },
  { type: 'Rainy', icon: CloudRain, color: 'text-teal-700', bg: 'from-teal-500/20 to-emerald-500/20', glow: 'drop-shadow-[0_0_8px_rgba(15,118,110,0.8)]', symbol: '🌧️', temp: '--°C', tempValue: 15 },
  { type: 'Cloudy / Fair', icon: Cloud, color: 'text-slate-400', bg: 'from-slate-500/20 to-gray-500/20', glow: 'drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]', symbol: '⛅', temp: '--°C', tempValue: 20 },
  { type: 'Stormy', icon: CloudLightning, color: 'text-purple-500', bg: 'from-purple-500/20 to-indigo-500/20', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', symbol: '⛈️', temp: '--°C', tempValue: 18 }
];

export default function Layout() {
  const { currentUser, userData, logout, isFacebookApp } = useAuth();
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

  const mainRef = useRef<HTMLDivElement>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showAddPostMenu, setShowAddPostMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const headerNavItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/groups', icon: Users, label: 'Groups' },
    { path: '/rewards', icon: Gem, label: 'Rewards' },
    { path: '/notifications', icon: Bell, label: 'Alerts' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const CATEGORIES = [
    { name: 'All', icon: Home, color: 'text-purple-500' },
    { name: 'Google Apps', icon: LayoutGrid, color: 'text-blue-500' },
    { name: 'Browsers', icon: Globe, color: 'text-orange-500' },
    { name: 'Rewards', icon: Gem, color: 'text-yellow-500' },
    { name: 'Indoor Games', icon: Gamepad2, color: 'text-pink-500' },
    { name: 'Outdoor Games', icon: Map, color: 'text-emerald-500' },
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

  const [dbStatus, setDbStatus] = useState<'testing' | 'online' | 'offline'>('testing');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'system', 'health'));
        setDbStatus('online');
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setDbStatus('offline');
        } else {
          setDbStatus('online');
        }
      }
    }
    testConnection();
  }, []);

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
            localStorage.setItem('gold_analysis_date', dateStr);
            localStorage.setItem('gold_analysis_text', response.text);
          }
        } catch (err: any) {
          const errorMsg = err?.message || JSON.stringify(err);
          if (err?.status === 429) {
            console.warn("Gold Smart Analysis Service busy (will retry).");
            // Use cached text if available even if date is old
            const cachedText = localStorage.getItem('gold_analysis_text');
            if (cachedText) {
              goldBrain.updateAnalysis(effectiveDate, cachedText);
            }
          } else if (errorMsg.includes('Rpc failed') || errorMsg.includes('xhr error')) {
            // Silent retry for transient network errors
            const cachedText = localStorage.getItem('gold_analysis_text');
            if (cachedText) {
              goldBrain.updateAnalysis(effectiveDate, cachedText);
            }
          } else {
            console.error("Gold Smart Analysis Error (will retry):", err);
          }
          // Ensure we still have the default data
          setGoldData({ ...goldBrain.getDailyPrediction(effectiveDate) });
        }
      } else {
        // Load from cache if available
        const cachedText = localStorage.getItem('gold_analysis_text');
        if (cachedText) {
          goldBrain.updateAnalysis(effectiveDate, cachedText);
        }
        setGoldData({ ...goldBrain.getDailyPrediction(effectiveDate) });
      }
    };

    // Initial load from cache
    const cachedDate = localStorage.getItem('gold_analysis_date');
    const cachedText = localStorage.getItem('gold_analysis_text');
    if (cachedDate && cachedText) {
      lastGoldAnalysisDateRef.current = cachedDate;
    }

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
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'detecting' | 'healing' | 'complete'>('idle');
  const [weatherHealProgress, setWeatherHealProgress] = useState(0);
  const [isCorrectingWeather, setIsCorrectingWeather] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [correctionInput, setCorrectionInput] = useState({ temp: '', condition: '' });
  
  const [brightness, setBrightness] = useState(100);
  const [bestSeller, setBestSeller] = useState("JM Bullion");
  const [bestBuyer, setBestBuyer] = useState("APMEX Gold");

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

  const fetchWeather = useCallback(async (lat: number, lon: number, city: string) => {
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      console.warn("Weather: Invalid coordinates, skipping fetch", { lat, lon });
      return;
    }
    
    // Check Local Storage Cache first
    const cacheKey = `weather_${lat.toFixed(1)}_${lon.toFixed(1)}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        if (data && data.current && data.forecast && Date.now() - timestamp < 30 * 60 * 1000) { // 30 mins
          console.log("Weather: Using localStorage cache");
          
          // Re-attach icons because functions (components) are lost in JSON.stringify
          const currentType = weatherTypes.find(t => t.type === data.current.type) || weatherTypes[3];
          const forecastType = weatherTypes.find(t => t.type === data.forecast.type) || weatherTypes[3];
          
          setCurrentWeather({ ...data.current, icon: currentType.icon });
          setForecastWeather({ ...data.forecast, icon: forecastType.icon });
          
          setWeatherStatus('idle');
          return;
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
    
    setWeatherStatus('detecting');
    try {
      const url = `/api/weather?lat=${lat}&lon=${lon}`;
      console.log(`Weather: Fetching ${url} for ${city}...`);
      const response = await fetch(url);
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        let errorMsg = `Weather API responded with status: ${response.status}`;
        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            if (errorData.details) errorMsg += ` (${errorData.details})`;
          } else {
            const text = await response.text();
            console.error("Weather API error response body:", text.substring(0, 100));
          }
        } catch (e) {
          // Ignore parse errors
        }
        throw new Error(errorMsg);
      }

      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Weather API non-JSON response body:", text.substring(0, 100));
        throw new Error("Weather API returned an invalid response format (HTML instead of JSON)");
      }

      const data = await response.json();
      const current = data.current_weather;
      const daily = data.daily;
      
      if (!current) throw new Error("No weather data in response");
      
      // Update Current Weather
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

      // Update Forecast Weather (Tomorrow)
      let newForecast = forecastWeather;
      if (daily && daily.temperature_2m_max && (daily.weather_code || daily.weathercode)) {
        let forecastTypeIndex = 3;
        const forecastCode = daily.weather_code ? daily.weather_code[1] : daily.weathercode[1];
        const forecastTemp = daily.temperature_2m_max[1];

        if (forecastCode === 0) forecastTypeIndex = 0;
        else if (forecastCode >= 1 && forecastCode <= 3) forecastTypeIndex = 3;
        else if (forecastCode >= 51 && forecastCode <= 82) forecastTypeIndex = 2;
        else if (forecastCode >= 95) forecastTypeIndex = 4;
        else if (forecastCode >= 71 && forecastCode <= 77) forecastTypeIndex = 1;

        newForecast = {
          ...weatherTypes[forecastTypeIndex],
          temp: `${Math.round(forecastTemp)}°C`,
          tempValue: Math.round(forecastTemp)
        };
        setForecastWeather(newForecast);
      }

      // Save to Local Storage Cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data: { current: newWeather, forecast: newForecast },
        timestamp: Date.now()
      }));

      // Only update and speak if there's a significant change to avoid "frequent changes"
      const tempDiff = Math.abs(newWeather.tempValue - prevTempRef.current);
      const typeChanged = newWeather.type !== prevTypeRef.current;
      const now = Date.now();
      const analysisCooldown = 2 * 60 * 60 * 1000; // 2 hours cooldown for AI analysis to save quota
      
      // Load cached analysis if available
      const cachedAnalysis = localStorage.getItem('weather_analysis');
      const cachedAnalysisTime = parseInt(localStorage.getItem('weather_analysis_time') || '0');
      
      if (tempDiff >= 2 || typeChanged || !cachedAnalysis) {
        // Smart Analysis via Gemini
        const shouldAnalyze = now - cachedAnalysisTime > analysisCooldown || typeChanged || !cachedAnalysis;
        
        if (shouldAnalyze) {
          try {
            const analysisResponse = await generateContentWithRetry({
              model: "gemini-3-flash-preview",
              contents: `Analyze this weather for ${city}: Today is ${newWeather.temp} and ${newWeather.type}. Tomorrow's forecast is ${forecastWeather.temp} and ${forecastWeather.type}. Provide a 1-sentence smart summary for the user about the current conditions and the transition to tomorrow.`,
            });
            
            if (analysisResponse.text) {
              setWeatherAnalysis(analysisResponse.text);
              localStorage.setItem('weather_analysis', analysisResponse.text);
              localStorage.setItem('weather_analysis_time', Date.now().toString());
              lastWeatherAnalysisTimeRef.current = Date.now();
              const msg = new SpeechSynthesisUtterance(analysisResponse.text);
              window.speechSynthesis.speak(msg);
            }
          } catch (aiErr: any) {
            if (aiErr?.status === 429) {
              console.warn("Smart Analysis Quota Exceeded. Using fallback.");
              if (cachedAnalysis) {
                setWeatherAnalysis(cachedAnalysis);
              } else {
                const trendText = newWeather.tempValue > prevTempRef.current ? "increasing" : (newWeather.tempValue < prevTempRef.current ? "decreasing" : "stable");
                const fallbackText = `Weather update for ${city}: It is now ${newWeather.type} with a temperature of ${newWeather.tempValue} degrees. The temperature is ${trendText}.`;
                setWeatherAnalysis(fallbackText);
              }
            } else {
              console.error("Smart Analysis Error:", aiErr);
            }
          }
        } else if (cachedAnalysis) {
          setWeatherAnalysis(cachedAnalysis);
        }
      } else if (cachedAnalysis) {
        setWeatherAnalysis(cachedAnalysis);
      }

      setTempTrend(newWeather.tempValue > prevTempRef.current ? '+' : (newWeather.tempValue < prevTempRef.current ? '-' : ''));
      prevTempRef.current = newWeather.tempValue;
      prevTypeRef.current = newWeather.type;
      setPrevTemp(newWeather.tempValue);
      setCurrentWeather(newWeather);
      
      setWeatherStatus('complete');
      setTimeout(() => setWeatherStatus('idle'), 3000);
    } catch (error: any) {
      console.error("Weather Fetch Error:", error.message || error);
      setWeatherStatus('healing');
      
      // Smart Self-Healing via Gemini Search
      try {
        setWeatherHealProgress(20);
        const searchResponse = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: `What is the current weather in ${city}? Provide temperature in Celsius and general condition.`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        setWeatherHealProgress(60);
        
        if (searchResponse.text) {
          const analysis = await generateContentWithRetry({
            model: "gemini-3-flash-preview",
            contents: `Extract temperature (number only) and condition from this weather report: "${searchResponse.text}". Format: TEMP: [number] | CONDITION: [Hot/Sunny, Cold/Chilly, Rainy, Cloudy/Fair, Stormy]`,
          });
          
          const text = analysis.text || "";
          const tempMatch = text.match(/TEMP:\s*(\d+)/);
          const condMatch = text.match(/CONDITION:\s*([^|]+)/);
          
          if (tempMatch && condMatch) {
            const temp = parseInt(tempMatch[1]);
            const cond = condMatch[1].trim();
            
            const foundIndex = weatherTypes.findIndex(t => t.type.toLowerCase().includes(cond.toLowerCase()));
            const typeIndex = foundIndex === -1 ? 3 : foundIndex;
            const healedWeather = {
              ...weatherTypes[typeIndex],
              temp: `${temp}°C`,
              tempValue: temp
            };
            
            setCurrentWeather(healedWeather);
            setWeatherAnalysis(`Smart Brain recovered weather data: ${searchResponse.text.substring(0, 100)}...`);
            setWeatherHealProgress(100);
            setWeatherStatus('complete');
            setTimeout(() => {
              setWeatherStatus('idle');
              setWeatherHealProgress(0);
            }, 5000);
            return;
          }
        }
      } catch (healErr) {
        console.error("Smart Healing Failed:", healErr);
      }

      // Final fallback
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
      setWeatherStatus('idle');
    }
  }, [currentWeather]);

  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let city = 'Your Region';
          let geocodeRetries = 2;
          
          while (geocodeRetries > 0) {
            try {
              const url = `/api/geocode?lat=${latitude}&lon=${longitude}`;
              console.log(`Geocoding Attempt ${3 - geocodeRetries}: Fetching ${url}`);
              
              const res = await fetch(url, {
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              });
              
              if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let errorDetails = "Unknown error";
                if (contentType && contentType.includes("application/json")) {
                  const errorData = await res.json().catch(() => ({}));
                  errorDetails = errorData.details || errorData.error || 'Unknown error';
                } else {
                  const text = await res.text().catch(() => "");
                  console.error("Geocode API error response body:", text.substring(0, 100));
                  errorDetails = "Received non-JSON response (likely HTML fallback)";
                }
                throw new Error(`Geocode API responded with status: ${res.status} - ${errorDetails}`);
              }
              const contentType = res.headers.get("content-type");
              if (!contentType || !contentType.includes("application/json")) {
                const text = await res.text().catch(() => "");
                console.error("Geocode API non-JSON response body:", text.substring(0, 100));
                throw new Error("Geocode API returned HTML instead of JSON");
              }
              const data = await res.json();
              city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Your Region';
              setLocationName(city);
              break; // Success
            } catch (e: any) {
              console.error(`Geocoding Attempt ${3 - geocodeRetries} Error:`, e.message || e);
              geocodeRetries--;
              if (geocodeRetries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                setLocationName('Your Region');
              }
            }
          }
          fetchWeather(latitude, longitude, city);
        },
        (error) => {
          console.error("Geolocation Error:", error);
          const errorMsg = error.code === 1 ? "Permission denied" : (error.code === 2 ? "Position unavailable" : "Timeout");
          console.warn(`Geolocation failed: ${errorMsg}. Falling back to default.`);
          setLocationName('Pulse Global');
          fetchWeather(-1.286389, 36.817223, 'Pulse Global'); // Default to Nairobi
          showNotification("Location Access", { body: "We couldn't detect your precise location. Using a default region." });
        }
      );
    } else {
      setLocationName('Global');
      fetchWeather(-1.286389, 36.817223, 'Global');
    }
  }, [fetchWeather]);

  useEffect(() => {
    // Initial location detection with a delay to ensure server is ready
    const timer = setTimeout(() => {
      getLocation();
    }, 3000); // Increased to 3s to be safer against slow boot

    // Listen for manual refresh requests
    const handleRefresh = () => {
      setLocationName('Detecting...');
      getLocation();
    };
    window.addEventListener('refresh-weather', handleRefresh);

    const interval = setInterval(getLocation, 1800000); // Update every 30 mins
    return () => {
      clearTimeout(timer);
      window.removeEventListener('refresh-weather', handleRefresh);
      clearInterval(interval);
    };
  }, [getLocation]);

  const CurrentWeatherIcon = currentWeather.icon;
  const ForecastWeatherIcon = forecastWeather.icon;

  const handleWeatherCorrection = async () => {
    if (!correctionInput.temp || !correctionInput.condition) return;
    
    setWeatherStatus('healing');
    setWeatherHealProgress(30);
    
    try {
      const temp = parseInt(correctionInput.temp);
      const cond = correctionInput.condition;
      
      // Find best match for condition
      const foundIndex = weatherTypes.findIndex(t => 
        t.type.toLowerCase().includes(cond.toLowerCase()) || 
        cond.toLowerCase().includes(t.type.toLowerCase().split(' ')[0])
      );
      const typeIndex = foundIndex === -1 ? 3 : foundIndex;
      
      const correctedWeather = {
        ...weatherTypes[typeIndex],
        temp: `${temp}°C`,
        tempValue: temp
      };
      
      setWeatherHealProgress(70);
      
      // Smart Analysis for the correction
      const analysisResponse = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: `The user corrected the weather. It was reported as ${currentWeather.temp} ${currentWeather.type}, but the user says it is actually ${temp}°C and ${cond}. Provide a 1-sentence smart acknowledgment and update the system intelligence about this local discrepancy.`,
      });
      
      setCurrentWeather(correctedWeather);
      if (analysisResponse.text) {
        setWeatherAnalysis(analysisResponse.text);
        localStorage.setItem('weather_analysis', analysisResponse.text);
      }
      
      // Save correction to Firestore for "Global Brain" learning
      if (currentUser) {
        await setDoc(doc(db, 'system', 'weather_corrections', 'logs', Date.now().toString()), {
          userId: currentUser.uid,
          reported: { temp: currentWeather.temp, type: currentWeather.type },
          actual: { temp, type: cond },
          location: locationName,
          timestamp: serverTimestamp()
        });
      }
      
      setWeatherHealProgress(100);
      setWeatherStatus('complete');
      setIsCorrectingWeather(false);
      setCorrectionInput({ temp: '', condition: '' });
      
      showNotification("Weather Corrected", { body: "System intelligence updated with your local data." });
      
      setTimeout(() => {
        setWeatherStatus('idle');
        setWeatherHealProgress(0);
      }, 3000);
    } catch (err) {
      console.error("Weather Correction Error:", err);
      setWeatherStatus('idle');
    }
  };

  const handleCitySearch = async () => {
    if (!citySearchQuery) return;
    setWeatherStatus('detecting');
    try {
      const response = await fetch(`/api/search-city?q=${encodeURIComponent(citySearchQuery)}`);
      if (!response.ok) throw new Error(`Search API responded with status: ${response.status}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const cityName = display_name.split(',')[0];
        setLocationName(cityName);
        fetchWeather(parseFloat(lat), parseFloat(lon), cityName);
        setIsSearchingCity(false);
        setCitySearchQuery('');
      } else {
        showNotification("City Not Found", { body: "Could not find coordinates for that location." });
        setWeatherStatus('idle');
      }
    } catch (err) {
      console.error("City Search Error:", err);
      setWeatherStatus('idle');
    }
  };

  const coreNavItems = [
    { path: '/', icon: Home, color: 'text-blue-500', label: 'Home' },
    { path: '/groups', icon: Users, color: 'text-green-500', label: 'Groups' },
    { path: '/rewards', icon: Gem, color: 'text-yellow-500', label: 'Rewards' },
    { path: '/profile', icon: User, color: 'text-purple-500', label: 'Profile' },
  ];

  const extraNavItems = [
    { path: '/messages', icon: MessageCircle, color: 'text-purple-500', label: 'Messages' },
    { path: '/contacts', icon: Users, color: 'text-orange-500', label: 'Contacts' },
    { path: '/education', icon: GraduationCap, color: 'text-blue-500', label: 'Education' },
    { path: '/events', icon: Calendar, color: 'text-indigo-600', label: 'Events' },
    { path: '/dating', icon: Heart, color: 'text-pink-500', label: 'Dating' },
    { path: '/community', icon: Users, color: 'text-indigo-500', label: 'Community' },
    { path: '/platform', icon: Lock, color: 'text-indigo-600', label: 'Platform' },
    { path: '/notifications', icon: Bell, color: 'text-orange-500', label: 'Notifications' },
    { path: '/calls', icon: Phone, color: 'text-indigo-500', label: 'Calls' },
    { path: '/terms', icon: FileText, color: 'text-teal-500', label: 'Terms' },
    { path: '/privacy', icon: Lock, color: 'text-indigo-500', label: 'Privacy' },
    { path: '/support', icon: Headphones, color: 'text-cyan-500', label: 'Support' },
  ];

  const isDeveloper = currentUser?.email === 'edwinmuoha@gmail.com' || currentUser?.phoneNumber === '+254728011174' || userData?.role === 'admin';

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
    { type: 'icon', icon: MessageCircle, color: 'text-purple-500', title: 'Messages', path: '/messages' },
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

        {/* Facebook App Compatibility Banner */}
        {isFacebookApp && (
          <div className="bg-gradient-to-r from-red-600 to-indigo-600 text-white px-4 py-2 text-[10px] sm:text-xs font-black text-center flex items-center justify-center gap-3 z-[200] shadow-lg">
            <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span className="uppercase tracking-widest">In-App Browser Warning: For the best experience and secure login, please open in Chrome or Safari.</span>
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
          </div>
        )}

        {/* Scrollable Content Wrapper */}
        <div 
          ref={mainRef}
          className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col"
        >
          {/* Header - Facebook Style Scrollable */}
          <header className="relative flex flex-col bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-[100] shadow-sm">
            {/* Top Row: Logo, Search, Actions (Height: ~52px) */}
            <div className="flex items-center justify-between px-4 py-2 gap-3 h-[52px]">
              {/* Left: Logo */}
              <div className="flex items-center shrink-0">
                <Link to="/" className="flex items-center group">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 flex items-center justify-center shadow-[0_4px_12px_rgba(234,179,8,0.4)] border-2 border-white dark:border-gray-700 group-hover:scale-110 transition-transform overflow-hidden relative z-10">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/gold-dust.png')] opacity-40 animate-pulse" />
                    <span className="text-white font-black text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10">P</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400 -ml-1.5 pl-2">
                    ulse Feeds
                  </span>
                </Link>
              </div>

              {/* Center: Search Bar (Facebook style) */}
              <div className="flex-1 max-w-md relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search Pulse Feeds..."
                  className="block w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-transparent rounded-full text-xs focus:bg-white dark:focus:bg-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none dark:text-white transition-all shadow-inner"
                />
              </div>
              
              {/* Right: Actions (Status, Points, Date, Gold Prediction, Add, Messenger, Menu) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Status Indicator */}
                <div className={cn(
                  "flex items-center px-2 sm:px-3 py-1 rounded-full border shadow-sm transition-all",
                  isIdle 
                    ? "bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800" 
                    : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-1.5 animate-pulse",
                    isIdle ? "bg-orange-500" : "bg-emerald-500"
                  )} />
                  <span className={cn(
                    "text-[8px] sm:text-[10px] font-black uppercase tracking-widest",
                    isIdle ? "text-orange-700 dark:text-orange-300" : "text-emerald-700 dark:text-emerald-300"
                  )}>
                    {isIdle ? 'Idle' : 'Active'}
                  </span>
                </div>

                {/* Points Display */}
                <div className="flex items-center px-2 sm:px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm">
                  <Gem className="w-3.5 h-3.5 sm:w-4 h-4 text-indigo-500 mr-1 sm:mr-1.5" />
                  <span className="text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-300">{userData?.points || 0}</span>
                </div>

                {/* Today's Date */}
                <div className="flex items-center px-2 sm:px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 h-4 text-gray-500 mr-1 sm:mr-1.5" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">
                    {formatDate(time, dateFormatIndex)}
                  </span>
                </div>

                {/* Gold Price Prediction Indicator */}
                <div className="flex items-center px-2 sm:px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 rounded-full border border-yellow-100 dark:border-yellow-800 shadow-sm animate-pulse">
                  <BrainCircuit className="w-3.5 h-3.5 sm:w-4 h-4 text-yellow-600 mr-1 sm:mr-1.5" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] font-black text-yellow-700 dark:text-yellow-300 uppercase">Gold Intel</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] font-black text-yellow-900 dark:text-yellow-100">{goldData?.direction === 'up' ? '▲' : '▼'}</span>
                      <span className="text-[9px] font-black text-yellow-900 dark:text-yellow-100">{goldData?.confidence || 77}%</span>
                    </div>
                  </div>
                </div>

                {/* Brightness Controls */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                  <button 
                    onClick={() => setBrightness(prev => Math.max(50, prev - 10))}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Low Brightness"
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button 
                    onClick={() => setBrightness(prev => Math.min(150, prev + 10))}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="High Brightness"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowAddPostMenu(!showAddPostMenu)}
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <Plus className={cn("w-5 h-5 transition-transform", showAddPostMenu && "rotate-45")} />
                  </button>
                  
                  <AnimatePresence>
                    {showAddPostMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 grid grid-cols-3 gap-3 z-[110] min-w-[240px]"
                      >
                        {[
                          { icon: Video, color: 'bg-red-500', label: 'Video', modal: 'create-post-video' },
                          { icon: Radio, color: 'bg-orange-500', label: 'Live', modal: 'create-post-live' },
                          { icon: BarChart2, color: 'bg-emerald-500', label: 'Poll', modal: 'create-post-poll' },
                          { icon: Megaphone, color: 'bg-purple-500', label: 'Announcement', modal: 'create-post-announcement' },
                          { icon: RefreshCw, color: 'bg-blue-400', label: 'Update', modal: 'create-post-update' },
                          { icon: Type, color: 'bg-blue-500', label: 'Text', modal: 'create-post-text' },
                          { icon: Smile, color: 'bg-pink-500', label: 'GIF', modal: 'create-post-gif' },
                          { icon: Users, color: 'bg-green-500', label: 'Group', modal: 'create-group' },
                          { icon: Brain, color: 'bg-indigo-600', label: 'Smart', modal: 'smart' }
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.modal === 'smart') {
                                const suggestions = ['poll', 'announcement', 'update', 'text', 'video'];
                                const randomType = suggestions[Math.floor(Math.random() * suggestions.length)];
                                setActiveModal(`create-post-${randomType}`);
                                showNotification("Smart Suggestion", { body: `Gemini suggests you create a ${randomType} post!` });
                              } else if (item.modal === 'create-group') {
                                navigate('/groups?create=true');
                                setShowAddPostMenu(false);
                              } else {
                                setActiveModal(item.modal);
                              }
                              setShowAddPostMenu(false);
                            }}
                            className="flex flex-col items-center gap-1 group/item"
                          >
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm group-hover/item:scale-110 transition-transform", item.color)}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[7px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{item.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link to="/messages" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                  <MessageCircle className="w-5 h-5" />
                </Link>

                <button 
                  onClick={() => setActiveModal('moreMenu')}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Navigation Tabs (STRICTLY HEADER ONLY) */}
            <div className="flex items-center overflow-x-auto hide-scrollbar border-t border-gray-50 dark:border-gray-800/50 bg-white dark:bg-gray-900 border-b">
              {headerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex-1 min-w-[60px] sm:min-w-[70px] flex flex-col items-center py-2 relative transition-all group",
                      isActive ? "text-indigo-600 dark:text-indigo-400 font-black" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 transition-all", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(79,70,229,0.3)]" : "group-hover:scale-110")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-tighter mt-0.5", isActive ? "opacity-100" : "opacity-60")}>{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabHeader"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]"
                      />
                    )}
                  </Link>
                );
              })}
              {/* AI Assistant Tab in Header */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-assistant'))}
                className="flex-1 min-w-[60px] sm:min-w-[70px] flex flex-col items-center py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
              >
                <Brain className="w-6 h-6 group-hover:scale-110 transition-transform text-purple-500" />
                <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5 opacity-60">AI</span>
              </button>
            </div>

            {/* Bottom Row: Categories & Market Stats (Horizontal Scroll) */}
            <div className="px-4 py-1.5 bg-gray-50/50 dark:bg-gray-950/50 flex items-center gap-4">
              <div className="flex overflow-x-auto hide-scrollbar space-x-2 flex-1">
                {CATEGORIES.map(cat => {
                  const CategoryIcon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleCategoryClick(cat.name)}
                      className={cn(
                        "flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 shadow-sm",
                        activeCategory === cat.name
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-700 hover:border-indigo-300"
                      )}
                    >
                      <CategoryIcon className={cn("w-2.5 h-2.5", activeCategory === cat.name ? "text-white" : cat.color)} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Market Stats: Best Seller / Buyer */}
              <div className="flex items-center gap-2 shrink-0 border-l border-gray-200 dark:border-gray-800 pl-4 py-1">
                <div className="flex flex-col items-center bg-emerald-100 dark:bg-emerald-500/20 px-3 py-1 rounded-xl border-2 border-emerald-500/30 shadow-md">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter leading-none mb-0.5">BEST ONLINE GOLD SELLER</span>
                  <span className="text-[14px] font-black text-emerald-900 dark:text-emerald-100 truncate max-w-[110px] leading-none">{bestSeller}</span>
                </div>
                <div className="flex flex-col items-center bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-xl border-2 border-blue-500/30 shadow-md">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter leading-none mb-0.5">BEST ONLINE GOLD BUYER</span>
                  <span className="text-[14px] font-black text-blue-900 dark:text-blue-100 truncate max-w-[110px] leading-none">{bestBuyer}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main 
            className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 relative transition-all duration-300"
            style={{ filter: `brightness(${brightness}%)` }}
          >
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

              {/* Global App Disclaimer */}
              <div className="mt-20 pt-12 border-t border-gray-100 dark:border-gray-800/50 pb-12">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex items-center gap-3 opacity-30 grayscale saturate-0 mb-4">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Pulse Infrastructure Alpha</span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest leading-loose max-w-xl mx-auto">
                    Pulse Feeds is a multi-functional social and professional ecosystem developed by the owner. All financial features, educational insights, and community detectors are provided for enhancement and research purposes. Use of this platform constitutes acceptance of the community ethics charter.
                  </p>
                  <div className="flex items-center gap-8 pt-4">
                    <Link to="/terms" className="text-[8px] font-black text-gray-400 hover:text-indigo-500 uppercase tracking-tighter transition-colors">Legal Terms</Link>
                    <Link to="/privacy" className="text-[8px] font-black text-gray-400 hover:text-indigo-500 uppercase tracking-tighter transition-colors">Privacy Shield</Link>
                    <Link to="/support" className="text-[8px] font-black text-gray-400 hover:text-indigo-500 uppercase tracking-tighter transition-colors">Developer Support</Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Floating Sidebars (Desktop Only) */}
        <div className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 w-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 flex flex-col items-center py-4 space-y-4 z-[90] custom-scrollbar",
          "hidden xl:flex"
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
        </div>

        <div className={cn(
          "fixed right-4 top-1/2 -translate-y-1/2 w-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 flex flex-col items-center py-4 space-y-4 z-[90] custom-scrollbar",
          "hidden xl:flex"
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

        {/* Gold Instrument Modal */}
        {activeModal === 'goldInstrument' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-1 rounded-[2.5rem] shadow-[0_0_50px_rgba(234,179,8,0.5)] max-w-md w-full"
            >
              <div className="bg-white dark:bg-gray-900 rounded-[2.3rem] p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Crown className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Gold Instrument</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                  The ultimate community tool for high-value transactions and exclusive rewards.
                </p>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Market Value</span>
                    <span className="text-lg font-black text-yellow-600">$1,240.50</span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Your Stake</span>
                    <span className="text-lg font-black text-indigo-600">0.05 G</span>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl shadow-lg shadow-yellow-500/30 transition-all active:scale-95"
                >
                  Close Instrument
                </button>
              </div>
            </motion.div>
          </div>
        )}
      
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
                  
                  {weatherStatus !== 'idle' && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Brain className={cn("w-4 h-4 text-purple-600 dark:text-purple-400", weatherStatus === 'healing' && "animate-pulse")} />
                          <span className="text-xs font-bold text-purple-800 dark:text-purple-300 capitalize">
                            Smart Brain: {weatherStatus}
                          </span>
                        </div>
                        {weatherStatus === 'healing' && (
                          <span className="text-[10px] font-bold text-purple-500">{weatherHealProgress}%</span>
                        )}
                      </div>
                      {weatherStatus === 'healing' && (
                        <div className="h-1.5 w-full bg-purple-100 dark:bg-purple-900 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-purple-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${weatherHealProgress}%` }}
                          />
                        </div>
                      )}
                      <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-2 italic">
                        {weatherStatus === 'detecting' ? 'Analyzing environmental data points...' : 
                         weatherStatus === 'healing' ? 'Self-Healing: Re-routing intelligence via Google Search...' :
                         'Intelligence sync complete. Data verified.'}
                      </p>
                    </div>
                  )}

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

                  {isSearchingCity ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 animate-in zoom-in duration-200">
                      <h5 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Search Your City
                      </h5>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Enter city name..." 
                          value={citySearchQuery}
                          onChange={(e) => setCitySearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                          className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button 
                          onClick={handleCitySearch}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                        >
                          Go
                        </button>
                      </div>
                      <button 
                        onClick={() => setIsSearchingCity(false)}
                        className="mt-2 w-full py-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : isCorrectingWeather ? (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in zoom-in duration-200">
                      <h5 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center">
                        <Wrench className="w-4 h-4 mr-2" />
                        Correct Weather Data
                      </h5>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="number" 
                            placeholder="Temp (°C)" 
                            value={correctionInput.temp}
                            onChange={(e) => setCorrectionInput({...correctionInput, temp: e.target.value})}
                            className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <select 
                            value={correctionInput.condition}
                            onChange={(e) => setCorrectionInput({...correctionInput, condition: e.target.value})}
                            className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="">Condition</option>
                            {weatherTypes.map(t => <option key={t.type} value={t.type}>{t.type}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleWeatherCorrection}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                          >
                            Apply Correction
                          </button>
                          <button 
                            onClick={() => setIsCorrectingWeather(false)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setLocationName('Detecting...');
                            getLocation();
                          }}
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Auto Refresh
                        </button>
                        <button 
                          onClick={() => setIsSearchingCity(true)}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                          <Search className="w-4 h-4" />
                          Search City
                        </button>
                      </div>
                      <button 
                        onClick={() => setIsCorrectingWeather(true)}
                        className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 text-xs"
                        title="Report Inaccurate Weather"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                        Report Inaccuracy / Correct Data
                      </button>
                    </div>
                  )}
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
                <div className="space-y-6 p-1">
                  {/* User Profile Shortcut */}
                  <Link 
                    to="/profile" 
                    onClick={() => setActiveModal(null)}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
                      {userData?.photoURL ? (
                        <img src={userData.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{userData?.displayName || 'Pulse User'}</p>
                      <p className="text-[10px] text-gray-500">See your profile</p>
                    </div>
                  </Link>

                  {/* Stats & Intelligence (Moved from Header) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Pulse Points</span>
                      </div>
                      <p className="text-lg font-black text-indigo-900 dark:text-indigo-100">{userData?.points.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-2xl border border-yellow-100 dark:border-yellow-800/50 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">Gold Intel</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <p className="text-lg font-black text-yellow-900 dark:text-yellow-100">{goldData?.symbol || 'GOLD'}</p>
                        <span className="text-[10px] font-bold text-yellow-600">{goldData?.direction === 'up' ? '▲' : '▼'} {goldData?.confidence || '--'}%</span>
                      </div>
                    </div>
                  </div>

                  {/* App Settings (Theme, Refresh) */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={toggleTheme}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                      <span className="text-xs font-bold">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    <button 
                      onClick={() => { setLocationName('Detecting...'); getLocation(); }}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <span className="text-xs font-bold">Refresh Data</span>
                    </button>
                  </div>

                  {/* Shortcuts Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Shortcuts</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {extraNavItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link 
                            key={idx}
                            to={item.path}
                            onClick={() => setActiveModal(null)}
                            className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-2 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                          >
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm", item.color.replace('text-', 'bg-').replace('500', '500/10'))}>
                              <Icon className={cn("w-4 h-4", item.color)} />
                            </div>
                            <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* External Links */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Connect</h4>
                    <div className="grid grid-cols-4 gap-3">
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
                            className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors gap-1.5"
                          >
                            {link.type === 'img' ? (
                              <img src={link.src} alt={link.title} className={cn("w-5 h-5 object-contain", link.darkSrc ? "dark:hidden" : "")} />
                            ) : (
                              link.icon && (() => {
                                const LinkIcon = link.icon;
                                return <LinkIcon className={cn("w-5 h-5", link.color)} />;
                              })()
                            )}
                            <span className="text-[8px] font-bold text-center truncate w-full">{link.title}</span>
                          </Wrapper>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logout & Version Info */}
                  <div className="space-y-4">
                    <button 
                      onClick={logout}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors font-bold text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                    
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pulse Feeds v2.1.0-RESTORATION</p>
                      <button 
                        onClick={() => {
                          if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.getRegistrations().then(registrations => {
                              for (let registration of registrations) {
                                registration.unregister();
                              }
                              window.location.reload();
                            });
                          } else {
                            window.location.reload();
                          }
                        }}
                        className="text-[8px] font-bold text-indigo-500 mt-1 uppercase underline"
                      >
                        Force Clear Cache & Sync
                      </button>
                    </div>
                  </div>
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
        {/* AI Assistant & Self Healing */}
        <AIAssistant />
        <SelfHealing />
      </div>
    </div>
  );
}
