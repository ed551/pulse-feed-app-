import { useEffect, useState, useRef } from "react";
import { 
  PlayCircle, MessageSquare, Heart, Share2, MoreHorizontal, Sun, Snowflake, CloudRain, Cloud, CloudLightning, 
  Send, Loader2, AlertTriangle, Search, Filter, X, TrendingUp, TrendingDown, Minus,
  LayoutGrid, Globe, Gem, Smartphone, FileText, Gamepad2, DollarSign, Calendar, Clock,
  Mail, Map, Youtube, Image, Languages, ExternalLink, Eye, Camera, Award, Sparkles, Volume2, VolumeX,
  Home as HomeIcon
} from "lucide-react";
import { multimedia_stream_engine, content_governor, revenue_logic } from "../lib/engines";
import { cn } from "../lib/utils";
import AdUnit from "../components/AdUnit";
import { moderateContent } from "../services/moderationService";
import { useNavigate, useOutletContext } from "react-router-dom";
import { usePosts } from "../hooks/usePosts";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { getDocFromServer, doc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { 
  CheckCircle2, AlertCircle
} from "lucide-react";
import { generateContentWithRetry } from "../lib/ai";
import { Modality } from "@google/genai";

export default function Home() {
  const navigate = useNavigate();
  const { currentWeather, forecastWeather, locationName, tempTrend, weatherAnalysis } = useOutletContext<any>();
  const { posts: firebasePosts, updatePost, loading: postsLoading } = usePosts();
  const { currentUser, loading: authLoading } = useAuth();
  const [dbStatus, setDbStatus] = useState<'testing' | 'online' | 'offline'>('testing');

  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection to Firestore
        await getDocFromServer(doc(db, 'system', 'health'));
        setDbStatus('online');
      } catch (error) {
        console.error("Firebase Connection Test:", error);
        // If it's just a missing doc, that's fine, it means we're connected
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setDbStatus('offline');
        } else {
          setDbStatus('online'); // Connected but doc doesn't exist
        }
      }
    }
    testConnection();
  }, []);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("Google Apps");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [userFilter, setUserFilter] = useState("");
  
  // AI Eye & Education State
  const [showAiEye, setShowAiEye] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const CATEGORIES = [
    { name: 'All', icon: HomeIcon, color: 'text-purple-500' },
    { name: 'Google Apps', icon: LayoutGrid, color: 'text-blue-500' },
    { name: 'Browsers', icon: Globe, color: 'text-orange-500' },
    { name: 'Rewards', icon: Gem, color: 'text-yellow-500' },
    { name: 'View Mode', icon: Smartphone, color: 'text-purple-500' },
    { name: 'Terms', icon: FileText, color: 'text-teal-500' },
    { name: 'Games', icon: Gamepad2, color: 'text-red-500' },
    { name: 'Ads', icon: DollarSign, color: 'text-green-500' }
  ];

  const GOOGLE_APPS = [
    { name: 'Gmail', icon: Mail, url: 'https://mail.google.com', color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Drive', icon: Cloud, url: 'https://drive.google.com', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Calendar', icon: Calendar, url: 'https://calendar.google.com', color: 'text-green-500', bg: 'bg-green-50' },
    { name: 'Maps', icon: Map, url: 'https://maps.google.com', color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'YouTube', icon: Youtube, url: 'https://youtube.com', color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Photos', icon: Image, url: 'https://photos.google.com', color: 'text-blue-400', bg: 'bg-blue-50' },
    { name: 'Search', icon: Search, url: 'https://google.com', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Translate', icon: Languages, url: 'https://translate.google.com', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const BROWSERS = [
    { name: 'Chrome', icon: Globe, url: 'https://google.com/chrome', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Firefox', icon: Globe, url: 'https://firefox.com', color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Safari', icon: Globe, url: 'https://apple.com/safari', color: 'text-blue-400', bg: 'bg-blue-50' },
    { name: 'Edge', icon: Globe, url: 'https://microsoft.com/edge', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Opera', icon: Globe, url: 'https://opera.com', color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Brave', icon: Globe, url: 'https://brave.com', color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const GAMES = [
    { name: 'Poki', icon: Gamepad2, url: 'https://poki.com', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { name: 'CrazyGames', icon: Gamepad2, url: 'https://crazygames.com', color: 'text-purple-500', bg: 'bg-purple-50' },
    { name: 'Armor Games', icon: Gamepad2, url: 'https://armorgames.com', color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Kongregate', icon: Gamepad2, url: 'https://kongregate.com', color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Y8', icon: Gamepad2, url: 'https://y8.com', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'MiniClip', icon: Gamepad2, url: 'https://miniclip.com', color: 'text-green-500', bg: 'bg-green-50' },
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
    if (categoryName === 'View Mode') {
      window.dispatchEvent(new CustomEvent('toggle-view-mode'));
      return;
    }
    setActiveCategory(categoryName);
  };

  const startAiEye = async () => {
    setShowAiEye(true);
    setAiAdvice(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Please allow camera access to use the AI Eye.");
      setShowAiEye(false);
    }
  };

  const stopAiEye = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowAiEye(false);
    setIsSpeaking(false);
    window.speechSynthesis.cancel();
  };

  const analyzeProblem = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAnalyzing(true);
    setAiAdvice(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      const base64Data = imageData.split(',')[1];

      try {
        const prompt = `Act as an expert problem solver and educator. Analyze this image for real-world problems (social, environmental, technical, or personal). 
        1. Identify the core problem.
        2. Provide a practical, actionable solution.
        3. Suggest an educational topic related to this problem.
        4. Award a specific "LinkedIn-style" education badge for learning about this.
        
        Format the response clearly with these sections:
        PROBLEM: [The detected problem]
        SOLUTION: [Practical advice]
        EDUCATION: [Educational topic]
        BADGE: [Badge Name, e.g., "Sustainability Advocate", "Tech Problem Solver", "Social Impact Leader"]`;

        const response = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Data } }
              ]
            }
          ],
          config: {
            temperature: 0.7,
            topP: 0.95,
          }
        });

        const advice = response.text || "I couldn't identify any specific problems in this view, but I'm always learning. Try pointing me at something else!";
        setAiAdvice(advice);
        
        // Speak the advice
        speakAdvice(advice);

        // Award a badge if a badge is mentioned
        if (advice.includes("BADGE:") && currentUser) {
          const badgeMatch = advice.match(/BADGE:\s*(.*)/i);
          const badgeName = badgeMatch ? badgeMatch[1].trim() : "Problem Solver";
          
          await setDoc(doc(db, 'users', currentUser.uid), {
            badges: arrayUnion({
              name: badgeName,
              date: new Date().toISOString(),
              type: 'LinkedIn-Style',
              icon: 'Award',
              description: advice.split('EDUCATION:')[1]?.split('BADGE:')[0]?.trim() || "Awarded for real-world problem detection."
            })
          }, { merge: true });
        }

      } catch (err) {
        console.error("AI Analysis Error:", err);
        setAiAdvice("The AI Eye is currently experiencing interference. Please try again in a moment.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const speakAdvice = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say clearly and helpfully: ${text}` }] }],
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
      const msg = new SpeechSynthesisUtterance(text);
      msg.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(msg);
    }
  };

  const feedItems = firebasePosts.map(p => ({ ...p, type: 'post', user: p.author }))
    .sort((a, b) => new Date(b.time || b.createdAt?.toDate?.()?.toISOString?.() || new Date()).getTime() - new Date(a.time || a.createdAt?.toDate?.()?.toISOString?.() || new Date()).getTime());

  useEffect(() => {
    multimedia_stream_engine();
    content_governor();
    revenue_logic();
  }, []);

  const handlePostComment = async (postId: string) => {
    if (!commentText.trim() || !currentUser) return;

    setIsPostingComment(true);
    setCommentError(null);

    try {
      const moderationResult = await moderateContent(commentText, 'comment');

      if (!moderationResult.isApproved) {
        setCommentError(`Comment flagged: ${moderationResult.reason}`);
        setIsPostingComment(false);
        return;
      }

      const post = firebasePosts.find(p => p.id === postId);
      if (post) {
        const newComment = {
          id: Math.random().toString(36).substr(2, 9),
          authorId: currentUser.uid,
          author: currentUser.displayName || "Anonymous",
          avatar: currentUser.photoURL || (currentUser.displayName ? currentUser.displayName.charAt(0) : "U"),
          content: commentText,
          likes: 0,
          isLiked: false,
          time: "Just now",
          replies: []
        };

        await updatePost(postId, {
          comments: (post.comments || 0) + 1,
          commentsList: [...(post.commentsList || []), newComment]
        });
      }
      
      setCommentText("");
      setIsPostingComment(false);
      setActiveCommentPostId(null);
    } catch (err) {
      setCommentError("Failed to moderate comment. Please try again.");
      setIsPostingComment(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Connection Status Badge */}
      <div className="flex justify-end">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
          dbStatus === 'online' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
          dbStatus === 'offline' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
          'bg-zinc-500/10 border-zinc-500/30 text-zinc-500'
        }`}>
          {dbStatus === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
          {dbStatus === 'online' && <CheckCircle2 className="w-3 h-3" />}
          {dbStatus === 'offline' && <AlertCircle className="w-3 h-3" />}
          Firebase {dbStatus}
        </div>
      </div>
      {/* Weather Widget */}
      {currentWeather && forecastWeather && (
        <div className={cn("rounded-3xl p-6 shadow-lg border border-white/10 relative overflow-hidden bg-gradient-to-br", currentWeather.bg)}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
            <currentWeather.icon className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="group relative">
              <div className="flex items-end space-x-4">
                <currentWeather.icon className={cn("w-16 h-16", currentWeather.color, currentWeather.glow)} />
                <div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{currentWeather.temp}</div>
                  <div className={cn("text-lg font-medium", currentWeather.color)}>{currentWeather.type}</div>
                </div>
              </div>
              <span className="absolute -top-6 left-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Weather Today</span>
            </div>
            
            <div className="w-full sm:w-px h-px sm:h-16 bg-gray-300 dark:bg-gray-600/50"></div>
            
            <div className="flex items-center space-x-4 bg-white/40 dark:bg-black/20 p-3 rounded-2xl backdrop-blur-sm group relative">
              <div className="flex flex-col">
                <Clock className="w-3 h-3 text-gray-500 mb-1" />
                <span className="font-semibold text-gray-800 dark:text-gray-200">{forecastWeather.type}</span>
              </div>
              <forecastWeather.icon className={cn("w-8 h-8", forecastWeather.color, forecastWeather.glow)} />
              <span className="absolute -top-6 right-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tomorrow</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <div className="flex items-center space-x-2 group relative">
          <TrendingUp className="w-6 h-6 text-purple-600" />
          <span className="absolute -top-8 left-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Latest Feed</span>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 group">
            <div 
              className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer z-10"
              onClick={() => document.getElementById('search-input')?.focus()}
            >
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            </div>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or ask AI Eye..."
              className="block w-full pl-9 pr-20 py-2 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white transition-all"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-1 space-x-1">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={startAiEye}
                className="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-all group relative"
                title="AI Eye: Detect Real-World Problems"
              >
                <Eye className="h-4 w-4" />
                <span className="absolute -top-8 right-0 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">AI Eye</span>
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={cn(
              "p-2 rounded-full transition-colors border",
              showAdvancedSearch 
                ? "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800" 
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
            )}
            title="Advanced Search Filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showAdvancedSearch && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Date Range</label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Past 24 Hours</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Filter by User</label>
              <input 
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto hide-scrollbar space-x-2 pb-2 mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all border group relative",
                  activeCategory === cat.name
                    ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-purple-200 dark:hover:border-purple-900/30"
                )}
              >
                <cat.icon className={cn("w-4 h-4", activeCategory === cat.name ? "text-white" : cat.color)} />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {cat.name}
                </span>
              </button>
            ))}
      </div>

      <div className="space-y-4">
        {/* AI Eye Modal */}
        {showAiEye && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[110] flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-3xl aspect-video bg-gray-950 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={cn("w-full h-full object-cover transition-opacity duration-500", isAnalyzing && "opacity-40")}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover opacity-20 animate-pulse" />
              )}

              {/* HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-purple-500/20 rounded-full animate-[ping_3s_linear_infinite]" />
                  <div className="absolute w-48 h-48 border border-purple-500/40 rounded-full animate-pulse" />
                </div>
                
                {/* Corner Accents */}
                <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-purple-500/50 rounded-tl-xl" />
                <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-purple-500/50 rounded-tr-xl" />
                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-purple-500/50 rounded-bl-xl" />
                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-purple-500/50 rounded-br-xl" />

                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-black/60 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">AI Eye: Real-World Detection</span>
                </div>
              </div>

              {/* Analysis Result */}
              {aiAdvice && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-8 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="flex items-start space-x-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl rotate-3">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-purple-400 font-black text-xs uppercase tracking-[0.15em]">AI Analysis Complete</h4>
                        {aiAdvice.includes("BADGE:") && (
                          <div className="flex items-center space-x-2 bg-yellow-500/20 border border-yellow-500/30 px-3 py-1 rounded-full">
                            <Award className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="text-yellow-500 text-[9px] font-black uppercase tracking-wider">Badge Earned</span>
                          </div>
                        )}
                      </div>
                      <div className="text-white text-sm leading-relaxed font-medium whitespace-pre-wrap">
                        {aiAdvice}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-6" />
                    <div className="absolute inset-0 blur-xl bg-purple-500/20 animate-pulse" />
                  </div>
                  <p className="text-white font-black text-xs animate-pulse uppercase tracking-[0.3em]">Decoding Reality Matrix...</p>
                </div>
              )}
            </div>

            <div className="mt-10 flex items-center space-x-6">
              <button 
                onClick={stopAiEye}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/10 backdrop-blur-xl"
              >
                Deactivate
              </button>
              <button 
                onClick={analyzeProblem}
                disabled={isAnalyzing}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all flex items-center space-x-3 disabled:opacity-50 active:scale-95"
              >
                <Camera className="w-5 h-5" />
                <span>{isAnalyzing ? "Processing..." : "Capture & Detect"}</span>
              </button>
              {aiAdvice && (
                <button 
                  onClick={() => speakAdvice(aiAdvice)}
                  className={cn(
                    "p-4 rounded-2xl transition-all border backdrop-blur-xl",
                    isSpeaking 
                      ? "bg-purple-600 text-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]" 
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {isSpeaking ? <Volume2 className="w-6 h-6 animate-bounce" /> : <VolumeX className="w-6 h-6" />}
                </button>
              )}
            </div>
          </div>
        )}

        {activeCategory === 'Google Apps' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {GOOGLE_APPS.map((app) => (
              <a 
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform", app.bg, "dark:bg-gray-700")}>
                  <app.icon className={cn("w-6 h-6", app.color)} />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{app.name}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        {activeCategory === 'Browsers' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {BROWSERS.map((app) => (
              <a 
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform", app.bg, "dark:bg-gray-700")}>
                  <app.icon className={cn("w-6 h-6", app.color)} />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{app.name}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        {activeCategory === 'Games' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {GAMES.map((app) => (
              <a 
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform", app.bg, "dark:bg-gray-700")}>
                  <app.icon className={cn("w-6 h-6", app.color)} />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{app.name}</span>
                <ExternalLink className="w-3 h-3 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        )}

        {postsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading your feed...</p>
          </div>
        ) : feedItems.filter(item => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;

          // Category Filter
          if (activeCategory !== 'All' && item.category?.toLowerCase() !== activeCategory.toLowerCase()) return false;

          // Search Query Filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contentMatch = item.content?.toLowerCase().includes(query);
            const userMatch = item.user?.toLowerCase().includes(query);
            const categoryMatch = item.category?.toLowerCase().includes(query);
            if (!contentMatch && !userMatch && !categoryMatch) return false;
          }

          // User Filter
          if (userFilter && !item.user?.toLowerCase().includes(userFilter.toLowerCase())) return false;

          // Date Filter
          if (dateFilter !== 'all') {
            const itemDate = item.createdAt?.toDate?.() || (item.time ? new Date(item.time) : null);
            if (!itemDate || isNaN(itemDate.getTime())) return true; // Show if date is invalid/missing

            const now = new Date();
            const diffTime = Math.abs(now.getTime() - itemDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (dateFilter === 'today' && diffDays > 1) return false;
            if (dateFilter === 'week' && diffDays > 7) return false;
            if (dateFilter === 'month' && diffDays > 30) return false;
          }

          return true;
        }).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No posts found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-xs mt-2">
              We couldn't find any posts matching your current filters. Try adjusting your search or category.
            </p>
            <button 
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
                setDateFilter("all");
                setUserFilter("");
              }}
              className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : feedItems.filter(item => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;

          // Category Filter
          if (activeCategory !== 'All' && item.category?.toLowerCase() !== activeCategory.toLowerCase()) return false;

          // Search Query Filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contentMatch = item.content?.toLowerCase().includes(query);
            const userMatch = item.user?.toLowerCase().includes(query);
            const categoryMatch = item.category?.toLowerCase().includes(query);
            if (!contentMatch && !userMatch && !categoryMatch) return false;
          }

          // User Filter
          if (userFilter && !item.user?.toLowerCase().includes(userFilter.toLowerCase())) return false;

          // Date Filter
          if (dateFilter !== 'all') {
            const itemDate = item.createdAt?.toDate?.() || (item.time ? new Date(item.time) : null);
            if (!itemDate || isNaN(itemDate.getTime())) return true;

            const now = new Date();
            const diffTime = Math.abs(now.getTime() - itemDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (dateFilter === 'today' && diffDays > 1) return false;
            if (dateFilter === 'week' && diffDays > 7) return false;
            if (dateFilter === 'month' && diffDays > 30) return false;
          }

          return true;
        }).map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            {item.type === 'ad' ? (
              <AdUnit slotId="1234567890" className="w-full rounded-xl overflow-hidden" />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {item.user?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{item.user}</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {item.time || 'Just now'}
                        </span>
                        <span>•</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-800 dark:text-gray-200 mb-3">{item.content}</p>

                <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => {
                      if (!currentUser) {
                        alert("Please sign in to like posts");
                        return;
                      }
                      updatePost(item.id, { likes: (item.likes || 0) + 1 });
                    }}
                    className="flex items-center space-x-1 hover:text-pink-500 transition-colors group"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20">
                      <Heart className={cn("w-5 h-5", item.likes > 0 && "fill-pink-500 text-pink-500")} />
                    </div>
                    <span className="text-sm">{item.likes}</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentPostId(activeCommentPostId === item.id ? null : item.id)}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors group"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-sm">{item.comments}</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Pulse Feeds',
                          text: item.content,
                          url: window.location.href
                        }).catch(console.error);
                      } else {
                        alert("Sharing not supported on this browser");
                      }
                    }}
                    className="flex items-center space-x-1 hover:text-green-500 transition-colors ml-auto group"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20">
                      <Share2 className="w-5 h-5" />
                    </div>
                  </button>
                </div>

                {/* Comment Section */}
                {activeCommentPostId === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {item.commentsList && item.commentsList.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {item.commentsList.map((comment: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 mr-2">{comment.author}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostComment(item.id);
                          }}
                        />
                        {commentError && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{commentError}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handlePostComment(item.id)}
                        disabled={isPostingComment || !commentText.trim()}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
