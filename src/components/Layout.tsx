import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Home, Users, PlusSquare, Gem, User, ShieldAlert, Bell, FileText, Lock, Headphones,
  Sun, Moon, CloudRain, Cloud, CloudLightning, Clock, Watch, BellRing, StickyNote,
  Fingerprint, HeartPulse, MapPin, Phone, MessageCircle, Gamepad2, Globe, BrainCircuit,
  Languages, Ticket, Snowflake, Calendar, Smartphone, Monitor, PhoneCall, Wrench,
  Calculator, LayoutGrid, Power, RefreshCw, ArrowUpCircle, ArrowDownCircle, XCircle, RotateCcw, Edit3, DollarSign, LogOut, Wallet
} from "lucide-react";
import { cn } from "../lib/utils";
import { 
  supervybe_auto_sync, daily_twin_sync, midnight_settlement_engine, 
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
  const location = useLocation();

  useEffect(() => {
    // Initialize background agents
    supervybe_auto_sync();
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
    { type: 'icon', icon: PhoneCall, color: 'text-green-600', title: 'Active Calls' },
    { type: 'icon', icon: Edit3, color: 'text-yellow-500', title: 'Note Pad' },
    { type: 'icon', icon: DollarSign, color: 'text-green-500', title: 'AdMob Ads', path: '/ads' },
    { type: 'img', src: 'https://cdn.simpleicons.org/whatsapp/25D366', title: 'WhatsApp', href: 'https://web.whatsapp.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/facebook/1877F2', title: 'Facebook', href: 'https://facebook.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/tiktok/black', darkSrc: 'https://cdn.simpleicons.org/tiktok/white', title: 'TikTok', href: 'https://tiktok.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/youtube/FF0000', title: 'YouTube', href: 'https://youtube.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/gmail/EA4335', title: 'Gmail', href: 'https://gmail.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/yahoo/410093', title: 'Yahoo', href: 'https://yahoo.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlemaps/4285F4', title: 'Maps', href: 'https://maps.google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/google/4285F4', title: 'Google Search', href: 'https://google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googletranslate/4285F4', title: 'Translate', href: 'https://translate.google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlegemini/8E75B2', title: 'Gemini AI', href: 'https://gemini.google.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/brave/FF2000', title: 'Brave', href: 'https://brave.com' },
    { type: 'img', src: 'https://cdn.simpleicons.org/googlechrome/4285F4', title: 'Chrome', href: 'https://google.com/chrome' },
    { type: 'icon', icon: LayoutGrid, color: 'text-gray-600 dark:text-gray-300', title: 'Google Apps' },
    { type: 'icon', icon: Calculator, color: 'text-blue-500', title: 'Calculator' },
    { type: 'icon', icon: Calendar, color: 'text-blue-600', title: 'Calendar' },
    { type: 'icon', icon: HeartPulse, color: 'text-red-500', title: 'Health Checker' },
    { type: 'icon', icon: Fingerprint, color: 'text-pink-400', title: 'Fingerprint Reader' },
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
            <span className="font-bold text-base sm:text-xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Pulse Feed</span>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Gold Prediction</span>
            <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-yellow-200 dark:border-yellow-700/50">
              <span className="font-bold text-xs sm:text-sm text-yellow-700 dark:text-yellow-500">Gold</span>
              <span className="text-sm sm:text-lg">{goldPrediction}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end order-last sm:order-none mt-1 sm:mt-0">
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
              <button className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Change Language (Global Support)">
                <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </button>
              <button className="p-1.5 sm:p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors relative group" title="Make a Call">
                <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
              </button>
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
          <div className="flex flex-col items-center space-y-1" title="Clock">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          </div>
          <div className="flex flex-col items-center space-y-1" title="Sport Watch">
            <Watch className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div className="flex flex-col items-center space-y-1" title="Alarm">
            <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div className="flex flex-col items-center space-y-1" title="Note Pad">
            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
          </div>
          <div className="flex flex-col items-center space-y-1 mt-auto" title="Health Checker">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 animate-pulse" />
          </div>
          <div className="flex flex-col items-center space-y-1" title="Fingerprint Reader">
            <Fingerprint className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
          </div>
        </div>

        {/* Center Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 pb-24 relative">
          <div className="max-w-4xl mx-auto w-full h-full">
            <Outlet />
          </div>
          
          {/* Floating Action Button (FAB) */}
          <Link to="/posts" className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-20">
            <PlusSquare className="w-6 h-6" />
          </Link>
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
                    <>
                      <img src={link.src} alt={link.title} className={cn("w-5 h-5 sm:w-6 sm:h-6 object-contain", link.darkSrc ? "dark:hidden" : "")} referrerPolicy="no-referrer" />
                      {link.darkSrc && <img src={link.darkSrc} alt={link.title} className="w-5 h-5 sm:w-6 sm:h-6 object-contain hidden dark:block" referrerPolicy="no-referrer" />}
                    </>
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
            return (
              <Wrapper 
                key={idx} 
                to={link.path || ''} 
                className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 cursor-pointer" 
                title={link.title}
              >
                {link.type === 'img' ? (
                  <>
                    <img src={link.src} alt={link.title} className={cn("w-5 h-5 sm:w-6 sm:h-6 object-contain", link.darkSrc ? "dark:hidden" : "")} referrerPolicy="no-referrer" />
                    {link.darkSrc && <img src={link.darkSrc} alt={link.title} className="w-5 h-5 sm:w-6 sm:h-6 object-contain hidden dark:block" referrerPolicy="no-referrer" />}
                  </>
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

      {/* Bottom Smart Hub Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0 z-20 pb-safe">
        <div className="grid grid-cols-5 sm:flex sm:justify-around items-center p-1 sm:p-2 max-w-screen-xl mx-auto gap-y-1 sm:gap-y-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex flex-col items-center p-1 sm:p-2 rounded-xl min-w-[50px] sm:min-w-[60px] transition-all duration-200",
                  isActive ? "bg-gray-100 dark:bg-gray-700 scale-105 sm:scale-110" : "hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:scale-105"
                )}
                title={item.label}
              >
                <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1", item.color, isActive ? "drop-shadow-md" : "opacity-80")} />
                <span className="text-[9px] sm:text-[10px] font-medium opacity-70 truncate w-full text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Global CSS for hiding scrollbars but keeping functionality */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
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
