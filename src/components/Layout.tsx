import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Home, Users, PlusSquare, Gem, User, ShieldAlert, Bell, FileText, Lock, Headphones,
  Sun, Moon, CloudRain, Cloud, CloudLightning, Clock, Watch, BellRing, StickyNote,
  Fingerprint, HeartPulse, MapPin, Phone, MessageCircle, Gamepad2, Globe, BrainCircuit,
  Languages, Ticket, Snowflake, Calendar, Smartphone, Monitor, PhoneCall, Wrench,
  Calculator, LayoutGrid, Power, RefreshCw, ArrowUpCircle, ArrowDownCircle, XCircle, RotateCcw, Edit3, DollarSign, LogOut, Wallet, X, Send, Search, CheckCircle2, Plus
} from "lucide-react";
import { cn } from "../lib/utils";
import { 
  pulse_feeds_auto_sync, daily_twin_sync, midnight_settlement_engine, 
  revenue_split_engine, auto_updater, resource_governor, 
  theme_engine, HeaderIntelligence 
} from "../lib/engines";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [time, setTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notes, setNotes] = useState<{id: string, text: string, date: string}[]>(() => {
    const saved = localStorage.getItem('user_notes_list');
    return saved ? JSON.parse(saved) : [{ id: '1', text: localStorage.getItem('user_notes') || '', date: new Date().toISOString() }];
  });
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  
  // Calculator State
  const [calcValue, setCalcValue] = useState('0');
  const [calcExpression, setCalcExpression] = useState('');

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

  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('user_notes_list', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => setStopwatchTime(prev => prev + 10), 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => setTimerTime(prev => prev - 1), 1000);
    } else if (timerTime === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      alert('Timer Finished!');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  useEffect(() => {
    // Initialize background agents
    pulse_feeds_auto_sync();
    daily_twin_sync();
    midnight_settlement_engine();
    revenue_split_engine();
    auto_updater();
    resource_governor();
    theme_engine();
    HeaderIntelligence();

    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Simulated Gold Prediction
  const goldPredictions = ['⏫', '⏬', '⏭️'];
  const [goldPrediction] = useState(goldPredictions[Math.floor(Math.random() * goldPredictions.length)]);

  // Real-time Weather & Date Logic
  const weatherTypes = [
    { type: 'Hot / Sunny', icon: Sun, color: 'text-orange-500', glow: 'drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]', symbol: '☀️', temp: '32°C' },
    { type: 'Cold / Chilly', icon: Snowflake, color: 'text-cyan-300', glow: 'drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]', symbol: '❄️', temp: '2°C' },
    { type: 'Rainy', icon: CloudRain, color: 'text-teal-700', glow: 'drop-shadow-[0_0_8px_rgba(15,118,110,0.8)]', symbol: '🌧️', temp: '14°C' },
    { type: 'Cloudy / Fair', icon: Cloud, color: 'text-slate-200', glow: 'drop-shadow-[0_0_8px_rgba(226,232,240,0.8)]', symbol: '⛅', temp: '20°C' },
    { type: 'Stormy', icon: CloudLightning, color: 'text-purple-500', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]', symbol: '⛈️', temp: '18°C' }
  ];

  const [currentWeather, setCurrentWeather] = useState(weatherTypes[0]);
  const [forecastWeather, setForecastWeather] = useState(weatherTypes[1]);
  
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
    const updateWeather = () => {
      const now = new Date();
      // Prediction day starts at 12 AM midnight
      const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      const todayIndex = seed % weatherTypes.length;
      const forecastIndex = (seed + 1) % weatherTypes.length;
      setCurrentWeather(weatherTypes[todayIndex]);
      setForecastWeather(weatherTypes[forecastIndex]);
    };
    
    updateWeather();
    const interval = setInterval(updateWeather, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const CurrentWeatherIcon = currentWeather.icon;
  const ForecastWeatherIcon = forecastWeather.icon;

  const navItems = [
    { path: '/', icon: Home, color: 'text-blue-500', label: 'Home' },
    { path: '/groups', icon: Users, color: 'text-green-500', label: 'Groups' },
    { path: '/posts', icon: PlusSquare, color: 'text-pink-500', label: 'Posts' },
    { path: '/rewards', icon: Gem, color: 'text-yellow-500', label: 'Rewards' },
    { path: '/profile', icon: User, color: 'text-purple-500', label: 'Profile' },
    { path: '/moderation', icon: ShieldAlert, color: 'text-red-500', label: 'Moderation' },
    { path: '/notifications', icon: Bell, color: 'text-orange-500', label: 'Notifications' },
    { path: '/terms', icon: FileText, color: 'text-teal-500', label: 'Terms' },
    { path: '/privacy', icon: Lock, color: 'text-indigo-500', label: 'Privacy' },
    { path: '/support', icon: Headphones, color: 'text-cyan-500', label: 'Support' },
  ];

  const rightLinks = [
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
    { type: 'icon', icon: Calendar, color: 'text-blue-600', title: 'Calendar' },
    { type: 'icon', icon: HeartPulse, color: 'text-red-500', title: 'Health Checker', action: () => setActiveModal('health') },
    { type: 'icon', icon: Fingerprint, color: 'text-pink-400', title: 'Fingerprint Reader', action: () => setActiveModal('fingerprint') },
  ];

  return (
    <div className={cn("bg-gray-200 dark:bg-black min-h-screen flex items-center justify-center transition-colors duration-300", viewMode === 'desktop' ? "p-0" : "p-4 sm:p-8")}>
      <div className={cn(
        "flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-all duration-500 relative",
        viewMode === 'mobile' 
          ? "w-full max-w-[375px] h-[812px] max-h-[90vh] rounded-[2.5rem] border-[8px] border-gray-800 dark:border-gray-800 shadow-2xl" 
          : "w-full h-screen"
      )}>
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 bg-white dark:bg-gray-800 shadow-md z-10 shrink-0 gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl">P</div>
            <span className="font-bold text-base sm:text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Pulse Feeds</span>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Gold Prediction</span>
            <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-yellow-200 dark:border-yellow-700/50">
              <span className="font-bold text-xs sm:text-sm text-yellow-700 dark:text-yellow-500">Gold</span>
              <span className="text-sm sm:text-lg">{goldPrediction}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end order-last sm:order-none mt-1 sm:mt-0">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button onClick={() => setActiveModal('translate')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Translate">
                <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </button>
              <button onClick={() => setActiveModal('call')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Call Support">
                <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </button>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex-1 justify-center sm:flex-none">
              <div className="flex items-center space-x-1 font-bold" title={`Today: ${currentWeather.type} | Forecast: ${forecastWeather.type}`}>
                <CurrentWeatherIcon className={cn("w-4 h-4 sm:w-5 sm:h-5", currentWeather.color, currentWeather.glow)} />
                <span className={cn(currentWeather.color)}>{currentWeather.temp}</span>
              </div>
              <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600"></div>
              <button onClick={toggleDateFormat} className="flex items-center space-x-1 hover:text-blue-500 transition-colors" title="Change Date Format">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-medium">{formatDate(time, dateFormatIndex)}</span>
              </button>
              <div className="w-px h-3 sm:h-4 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-1 font-mono font-semibold">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                <span>{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle Device View">
                {viewMode === 'desktop' ? <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />}
              </button>
              <button onClick={toggleTheme} className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
                {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
              </button>
              {currentUser && (
                <button 
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }} 
                  className="p-1.5 sm:p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors" 
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Left Utility Bar (Weather, Clock, Health) */}
          <div className="flex flex-col w-12 sm:w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-2 sm:py-4 items-center space-y-4 sm:space-y-6 overflow-y-auto shrink-0 z-10 custom-scrollbar">
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

          {/* Center Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-24 relative">
            <div className="max-w-4xl mx-auto w-full h-full">
              <Outlet />
            </div>
          </main>

          {/* Right Links Bar */}
          <div className="flex flex-col w-12 sm:w-16 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 py-2 sm:py-4 items-center space-y-3 sm:space-y-4 overflow-y-auto shrink-0 z-10 custom-scrollbar">
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
        <Link to="/posts" className="fixed bottom-24 right-20 sm:right-24 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-30">
          <PlusSquare className="w-6 h-6" />
        </Link>

      {/* Master AI Icon */}
      <button 
        onClick={() => setActiveModal('health')} 
        className="fixed bottom-20 left-4 sm:left-6 w-10 h-10 sm:w-12 sm:h-12 bg-black/20 dark:bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-purple-500 dark:text-purple-400 opacity-30 hover:opacity-100 transition-all z-30 group"
        title="Master AI"
      >
        <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute left-full ml-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
          Master AI: System Healthy
        </span>
      </button>

      {/* Bottom Smart Hub Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0 z-20 pb-safe">
        <div className="flex items-center p-1 sm:p-2 max-w-screen-xl mx-auto overflow-x-auto custom-scrollbar hide-scrollbar space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-1 sm:p-2 rounded-xl min-w-[70px] sm:min-w-[80px] transition-all duration-200 shrink-0",
                  isActive ? "bg-gray-100 dark:bg-gray-700 scale-105" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
                title={item.label}
              >
                <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1", item.color, isActive ? "drop-shadow-md" : "opacity-80")} />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center">{item.label}</span>
              </Link>
            );
          })}
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
            <div className="p-6">
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
                    { name: 'Search', icon: Search, color: 'text-blue-500' },
                    { name: 'Maps', icon: MapPin, color: 'text-green-500' },
                    { name: 'Mail', icon: Bell, color: 'text-red-500' },
                    { name: 'Drive', icon: LayoutGrid, color: 'text-yellow-500' },
                    { name: 'Photos', icon: PlusSquare, color: 'text-pink-500' },
                    { name: 'Translate', icon: Languages, color: 'text-blue-600' }
                  ].map(app => (
                    <button key={app.name} className="flex flex-col items-center space-y-2 group">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-gray-700">
                        <app.icon className={cn("w-6 h-6", app.color)} />
                      </div>
                      <span className="text-xs font-medium">{app.name}</span>
                    </button>
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
                        {time.toLocaleTimeString()}
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
