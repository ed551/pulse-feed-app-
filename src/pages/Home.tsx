import { useEffect, useState, useRef } from "react";
import { 
  PlayCircle, MessageSquare, Heart, Share2, MoreHorizontal, Sun, Snowflake, CloudRain, Cloud, CloudLightning, 
  Send, Loader2, AlertTriangle, Search, Filter, X, TrendingUp, TrendingDown, Minus,
  LayoutGrid, Globe, Gem, Smartphone, FileText, Gamepad2, DollarSign, Calendar, Clock,
  Mail, Map, Youtube, Image, Languages, ExternalLink, Eye, Camera, Award, Sparkles, Volume2, VolumeX,
  Home as HomeIcon, Flag, BarChart2, Megaphone, RefreshCw, Radio, Video, Type, Smile,
  PlusCircle, MinusCircle, Bookmark, EyeOff, Bell, Link, XCircle, AlertCircle, Copy, Crown,
  ThumbsUp, Pencil, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { multimedia_stream_engine, content_governor, revenue_logic } from "../lib/engines";
import { cn } from "../lib/utils";
import AdUnit from "../components/AdUnit";
import YouTubeSection from "../components/YouTubeSection";
import { moderateContent } from "../services/moderationService";
import { useNavigate, useOutletContext } from "react-router-dom";
import { usePosts } from "../hooks/usePosts";
import { useAuth } from "../contexts/AuthContext";
import SponsoredPost from "../components/SponsoredPost";
import { db } from "../lib/firebase";
import { getDocFromServer, doc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { 
  CheckCircle2
} from "lucide-react";
import { generateContentWithRetry } from "../lib/ai";
import { Modality } from "@google/genai";
import { saveInsight } from "../lib/insights";

export default function Home() {
  const navigate = useNavigate();
  const { 
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
  } = useOutletContext<any>();
  const { posts: firebasePosts, updatePost, deletePost, loading: postsLoading } = usePosts();
  const { currentUser, loading: authLoading } = useAuth();
  const [dbStatus, setDbStatus] = useState<'testing' | 'online' | 'offline'>('testing');

  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection to Firestore
        await getDocFromServer(doc(db, 'system', 'health'));
        setDbStatus('online');
      } catch (error) {
        // If it's just a missing doc or permission denied, that's fine, it means we're connected
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase Connection Test:", error);
          setDbStatus('offline');
        } else {
          setDbStatus('online'); // Connected but doc doesn't exist or permission denied
        }
      }
    }
    testConnection();
  }, []);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [activeReactionPostId, setActiveReactionPostId] = useState<string | null>(null);
  const reactionTimeoutRef = useRef<any>(null);
  
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

  const INDOOR_GAMES = [
    { name: 'Chess', icon: Gamepad2, url: 'https://chess.com', color: 'text-gray-700', bg: 'bg-gray-50' },
    { name: 'Poki', icon: Gamepad2, url: 'https://poki.com', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { name: 'CrazyGames', icon: Gamepad2, url: 'https://crazygames.com', color: 'text-purple-500', bg: 'bg-purple-50' },
    { name: 'Armor Games', icon: Gamepad2, url: 'https://armorgames.com', color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Kongregate', icon: Gamepad2, url: 'https://kongregate.com', color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Y8', icon: Gamepad2, url: 'https://y8.com', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'MiniClip', icon: Gamepad2, url: 'https://miniclip.com', color: 'text-green-500', bg: 'bg-green-50' },
  ];

  const OUTDOOR_GAMES = [
    { name: 'Pokemon GO', icon: Globe, url: 'https://pokemongolive.com', color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Geocaching', icon: Map, url: 'https://geocaching.com', color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Ingress', icon: Globe, url: 'https://ingress.com', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'Zombies, Run!', icon: Globe, url: 'https://zombiesrungame.com', color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const SAMPLE_ADS = [
    {
      id: 'ad-1',
      type: 'sponsored',
      company: 'TechFlow AI',
      title: 'Automate your workflow with TechFlow',
      description: 'The next generation of AI-powered automation is here. Start your free trial today and save 20 hours a week.',
      imageUrl: 'https://picsum.photos/seed/tech/800/400',
      cta: 'Try Free',
      link: 'https://google.com'
    },
    {
      id: 'ad-2',
      type: 'sponsored',
      company: 'EcoStyle',
      title: 'Sustainable fashion for a better planet',
      description: 'Discover our new collection made from 100% recycled materials. Style meets sustainability.',
      imageUrl: 'https://picsum.photos/seed/fashion/800/400',
      cta: 'Shop Now',
      link: 'https://google.com'
    },
    {
      id: 'ad-3',
      type: 'sponsored',
      company: 'CloudScale',
      title: 'Scale your business with ease',
      description: 'Enterprise-grade cloud infrastructure for startups. Get $5,000 in credits when you sign up today.',
      imageUrl: 'https://picsum.photos/seed/cloud/800/400',
      cta: 'Get Credits',
      link: 'https://google.com'
    },
    {
      id: 'ad-4',
      type: 'sponsored',
      company: 'Pulse Rewards',
      title: 'Earn more with Pulse Feeds',
      description: 'Did you know you can earn up to $50/month by just engaging with the community? Check your rewards dashboard.',
      imageUrl: 'https://picsum.photos/seed/rewards/800/400',
      cta: 'Check Rewards',
      link: '/rewards'
    }
  ];

  const feedItems = [
    ...firebasePosts.map(p => ({ ...p, type: p.type || 'post', user: p.author })),
    ...SAMPLE_ADS
  ].sort((a, b) => {
    const getTime = (item: any) => {
      if (item.type === 'sponsored') return Date.now() - (SAMPLE_ADS.indexOf(item as any) * 1000000); // Spread ads
      if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
      if (item.time && !isNaN(new Date(item.time).getTime())) return new Date(item.time).getTime();
      return Date.now();
    };
    return getTime(b) - getTime(a);
  });

  const handleVote = async (postId: string, optionIndex: number) => {
    if (!currentUser) return;
    const post = firebasePosts.find(p => p.id === postId);
    if (!post || !post.poll) return;

    const hasVoted = post.poll.options.some(opt => opt.voters?.includes(currentUser.uid));
    if (hasVoted) return;

    const newOptions = [...post.poll.options];
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      votes: newOptions[optionIndex].votes + 1,
      voters: [...(newOptions[optionIndex].voters || []), currentUser.uid]
    };

    await updatePost(postId, {
      poll: {
        ...post.poll,
        options: newOptions
      }
    });
  };

  const handleReport = async (postId: string) => {
    const post = firebasePosts.find(p => p.id === postId);
    if (!post) return;
    await updatePost(postId, {
      reports: (post.reports || 0) + 1
    });
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Report Received", 
        body: "Post reported. Thank you for helping keep our community safe." 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleSavePost = async (postId: string) => {
    if (!currentUser) {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Auth Required", 
          body: "Please sign in to save posts." 
        } 
      }));
      return;
    }
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'saved_posts', postId), {
        postId,
        savedAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Saved", 
          body: "Post saved to your collection!" 
        } 
      }));
      setActiveMenuPostId(null);
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Link Copied", 
        body: "Post link copied to clipboard!" 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleInterested = async (postId: string) => {
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Preference Saved", 
        body: "We'll show you more posts like this." 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleNotInterested = async (postId: string) => {
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Preference Saved", 
        body: "We'll show you fewer posts like this." 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleHidePost = async (postId: string) => {
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Post Hidden", 
        body: "This post will be hidden from your feed." 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleToggleNotifications = async (postId: string) => {
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Notifications On", 
        body: "Notifications turned on for this post." 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      await deletePost(postId);
      setActiveMenuPostId(null);
    }
  };

  const handleEditPost = async (postId: string) => {
    window.dispatchEvent(new CustomEvent('show-notification', { 
      detail: { 
        title: "Coming Soon", 
        body: "Edit functionality coming soon!" 
      } 
    }));
    setActiveMenuPostId(null);
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    const post = firebasePosts.find(p => p.id === postId);
    if (!post) return;

    const reactions = { ...(post.reactions || {}) };
    const userIds = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    
    if (userIds.includes(currentUser.uid)) {
      // Remove reaction
      reactions[emoji] = userIds.filter(id => id !== currentUser.uid);
    } else {
      // Add reaction
      reactions[emoji] = [...userIds, currentUser.uid];
    }

    await updatePost(postId, { reactions });
  };

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
      <div className="px-6 pt-6">
        <AdUnit slotId="home-top-banner" />
      </div>
      {/* Weather Widget */}
      {currentWeather && forecastWeather && (
        <div className={cn("rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 dark:border-white/10 relative overflow-hidden bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl group transition-all hover:shadow-[0_30px_60px_rgba(0,0,0,0.15)]")}>
          <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", currentWeather.bg)}></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className={cn("absolute inset-0 blur-2xl opacity-50", currentWeather.color)}></div>
                <currentWeather.icon className={cn("w-20 h-20 relative z-10", currentWeather.color, currentWeather.glow)} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('refresh-weather'));
                    }}
                    className="p-1.5 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white dark:hover:bg-black/40 transition-all shadow-sm"
                    title="Refresh Weather"
                  >
                    <RefreshCw className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter">{currentWeather.tempValue}</span>
                  <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">°C</span>
                </div>
                <div className={cn("text-xl font-bold tracking-tight", currentWeather.color)}>{currentWeather.type}</div>
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-20 bg-gray-200 dark:bg-gray-700/50"></div>
            
            <div className="flex items-center space-x-6 bg-white/50 dark:bg-black/20 px-6 py-4 rounded-[2rem] backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm group/tomorrow relative">
              <div className="flex flex-col">
                <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Tomorrow</div>
                <span className="font-bold text-gray-800 dark:text-gray-200 text-lg leading-tight">{forecastWeather.type}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{forecastWeather.temp}</span>
              </div>
              <div className="relative">
                <div className={cn("absolute inset-0 blur-xl opacity-30", forecastWeather.color)}></div>
                <forecastWeather.icon className={cn("w-12 h-12 relative z-10", forecastWeather.color, forecastWeather.glow)} />
              </div>
            </div>
          </div>
        </div>
      )}

      <YouTubeSection />

      {showAdvancedSearch && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="space-y-4">
        {activeCategory === 'Google Apps' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {GOOGLE_APPS.map((app) => (
              <a 
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group relative overflow-hidden"
              >
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity", app.bg)}></div>
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform shadow-inner", app.bg, "dark:bg-gray-700")}>
                  <app.icon className={cn("w-8 h-8", app.color)} />
                </div>
                <span className="text-sm font-black text-gray-900 dark:text-gray-100 tracking-tight">{app.name}</span>
                <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Open App</span>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
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

        {activeCategory === 'Indoor Games' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {INDOOR_GAMES.map((app) => (
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

        {activeCategory === 'Outdoor Games' && !searchQuery && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {OUTDOOR_GAMES.map((app) => (
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
        ) : feedItems.filter((item: any) => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;
          if (item.type === 'sponsored') return true;

          // Category Filter
          if (activeCategory !== 'All') {
            const cat = activeCategory.toLowerCase();
            const itemCat = item.category?.toLowerCase();
            if (cat === 'elite') {
              if (itemCat !== 'elite' && itemCat !== 'premium') return false;
            } else if (itemCat !== cat) {
              return false;
            }
          }

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
          const itemDate = item.createdAt?.toDate?.() || (item.time ? new Date(item.time) : null);
          if (!itemDate || isNaN(itemDate.getTime())) return true; // Show if date is invalid/missing

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
                setUserFilter("");
              }}
              className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : feedItems.filter((item: any) => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;
          if (item.type === 'sponsored') return true;

          // Category Filter
          if (activeCategory !== 'All') {
            const cat = activeCategory.toLowerCase();
            const itemCat = item.category?.toLowerCase();
            if (cat === 'elite') {
              if (itemCat !== 'elite' && itemCat !== 'premium') return false;
            } else if (itemCat !== cat) {
              return false;
            }
          }

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

          return true;
        }).map((item: any) => {
          if (item.type === 'sponsored') {
            return <SponsoredPost key={item.id} ad={item as any} />;
          }

          return (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative"
            >
            {item.type === 'announcement' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
            )}
            {item.type === 'update' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
            )}

            {item.type === 'ad' ? (
              <AdUnit slotId="2771846645" className="w-full rounded-xl overflow-hidden" />
            ) : (
              <div className="flex flex-col">
                {/* Post Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.user} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        item.user?.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="font-bold text-[14px] text-gray-900 dark:text-gray-100 hover:underline cursor-pointer leading-tight">{item.user}</div>
                        {item.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                      </div>
                      <div className="flex items-center space-x-1 text-[12px] text-gray-500 dark:text-gray-400 leading-tight">
                        <span>{item.time || 'Just now'}</span>
                        <span>•</span>
                        {item.isSponsored ? (
                          <span className="flex items-center gap-1">
                            Sponsored • <Globe className="w-3 h-3" />
                          </span>
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuPostId(activeMenuPostId === item.id ? null : item.id)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {activeMenuPostId === item.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" 
                              onClick={() => setActiveMenuPostId(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 100 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 100 }}
                              className="fixed inset-x-0 bottom-0 sm:absolute sm:right-0 sm:top-full sm:bottom-auto sm:inset-x-auto mt-2 w-full sm:w-72 bg-white dark:bg-gray-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                            >
                              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto my-4 sm:hidden" />
                              
                              <div className="px-6 py-2 sm:px-4 sm:py-3 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Post Options</h3>
                                <button onClick={() => setActiveMenuPostId(null)} className="sm:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                  <X className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>

                              <div className="p-3 sm:p-2 space-y-1 pb-10 sm:pb-2 max-h-[70vh] overflow-y-auto">
                                {item.authorId === currentUser?.uid && (
                                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-1 mb-2">
                                    <button 
                                      onClick={() => handleEditPost(item.id)}
                                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                    >
                                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Pencil className="w-5 h-5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
                                      </div>
                                      <div>
                                        <div className="font-bold">Edit Post</div>
                                        <div className="text-[10px] text-gray-500">Modify your content or media.</div>
                                      </div>
                                    </button>
                                    <button 
                                      onClick={() => handleDeletePost(item.id)}
                                      className="w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                    >
                                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 text-red-600" />
                                      </div>
                                      <div>
                                        <div className="font-bold">Delete Post</div>
                                        <div className="text-[10px] text-red-400/70">Permanently remove this post.</div>
                                      </div>
                                    </button>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  <button 
                                    onClick={() => handleInterested(item.id)}
                                    className="flex flex-col items-center justify-center p-3 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all group"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                      <PlusCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Interested</span>
                                  </button>
                                  <button 
                                    onClick={() => handleNotInterested(item.id)}
                                    className="flex flex-col items-center justify-center p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all group"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                      <MinusCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <span className="text-xs font-bold text-red-700 dark:text-red-400">Not Interested</span>
                                  </button>
                                </div>
                                
                                <div className="space-y-1">
                                  <button 
                                    onClick={() => handleSavePost(item.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                      <Bookmark className="w-5 h-5 sm:w-4 sm:h-4 text-blue-500" />
                                    </div>
                                    <div>
                                      <div className="font-bold">Save Post</div>
                                      <div className="text-[10px] text-gray-500">Add to your private collection.</div>
                                    </div>
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (navigator.share) {
                                        try {
                                          await navigator.share({
                                            title: item.title || 'Post',
                                            text: item.content,
                                            url: window.location.href
                                          });
                                        } catch (err) {
                                          if (err instanceof Error && err.name !== 'AbortError') {
                                            console.error('Error sharing:', err);
                                          }
                                        }
                                      } else {
                                        handleCopyLink(item.id);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Share2 className="w-5 h-5 sm:w-4 sm:h-4 text-purple-500" />
                                      </div>
                                      <div>
                                        <div className="font-bold">Share</div>
                                        <div className="text-[10px] text-gray-500">Send this to your friends.</div>
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleHidePost(item.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <EyeOff className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                      </div>
                                      <div>
                                        <div className="font-bold">Hide Post</div>
                                        <div className="text-[10px] text-gray-500">Stop seeing this specific post.</div>
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleReport(item.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="w-5 h-5 sm:w-4 sm:h-4 text-red-500" />
                                      </div>
                                      <div>
                                        <div className="font-bold">Report Post</div>
                                        <div className="text-[10px] text-gray-500">Flag for moderation review.</div>
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleToggleNotifications(item.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                      <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-yellow-500" />
                                    </div>
                                    <div>
                                      <div className="font-bold">Notifications</div>
                                      <div className="text-[10px] text-gray-500">Get alerts for new comments.</div>
                                    </div>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const url = `${window.location.origin}/post/${item.id}`;
                                      navigator.clipboard.writeText(url);
                                      setActiveMenuPostId(null);
                                      alert("Link copied!");
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all text-left group"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                      <Copy className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    </div>
                                    <div>
                                      <div className="font-bold">Copy Link</div>
                                      <div className="text-[10px] text-gray-500">Share the URL manually.</div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Post Content */}
                <div className="px-3 pb-2">
                  {item.title && (
                    <h4 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1 leading-tight">{item.title}</h4>
                  )}
                  <div 
                    className="text-[14px] text-gray-900 dark:text-gray-100 mb-2 prose dark:prose-invert max-w-none leading-normal"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                </div>

                {/* Media Content */}
                <div className="relative w-full bg-gray-100 dark:bg-gray-900">
                  {/* Poll Display */}
                  {item.type === 'poll' && item.poll && (
                    <div className="p-3">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h5 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-emerald-500" />
                          {item.poll.question}
                        </h5>
                        <div className="space-y-2">
                          {item.poll.options.map((opt: any, idx: number) => {
                            const totalVotes = item.poll.options.reduce((acc: number, o: any) => acc + (o.votes || 0), 0);
                            const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            const hasVoted = opt.voters?.includes(currentUser?.uid);
                            const userVotedAny = item.poll.options.some((o: any) => o.voters?.includes(currentUser?.uid));

                            return (
                              <button 
                                key={idx}
                                onClick={() => handleVote(item.id, idx)}
                                disabled={userVotedAny}
                                className={cn(
                                  "w-full relative h-10 rounded-xl overflow-hidden border transition-all flex items-center px-4 group",
                                  hasVoted 
                                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                                    : "border-gray-200 dark:border-gray-700 hover:border-emerald-400"
                                )}
                              >
                                <div 
                                  className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-1000",
                                    hasVoted ? "bg-emerald-500/20" : "bg-gray-100 dark:bg-gray-800"
                                  )}
                                  style={{ width: `${percentage}%` }}
                                />
                                <span className="relative z-10 text-sm font-bold text-gray-700 dark:text-gray-300 flex-1 text-left">
                                  {opt.text}
                                </span>
                                {(userVotedAny || hasVoted) && (
                                  <span className="relative z-10 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                    {percentage}%
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          {item.poll.options.reduce((acc: number, o: any) => acc + (o.votes || 0), 0)} votes
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GIF Display */}
                  {item.gifUrl && (
                    <img src={item.gifUrl} alt="GIF" className="w-full h-auto" referrerPolicy="no-referrer" />
                  )}

                  {/* Images Display */}
                  {item.images && item.images.length > 0 && (
                    <div className={cn(
                      "grid gap-1",
                      item.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    )}>
                      {item.images.map((img: string, idx: number) => (
                        <img key={idx} src={img} alt="Post" className="w-full h-auto max-h-[500px] object-cover" referrerPolicy="no-referrer" />
                      ))}
                    </div>
                  )}

                  {/* Video Display */}
                  {(item.type === 'video' || item.type === 'live') && item.videoUrl && (
                    <div className="aspect-video bg-black relative group">
                      <iframe 
                        src={item.videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full border-none"
                        allowFullScreen
                      />
                      {item.type === 'live' && (
                        <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          LIVE
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Call to Action */}
                {item.cta && (
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={() => item.ctaUrl && window.open(item.ctaUrl, '_blank')}
                      className="w-full py-3 bg-pink-200 dark:bg-pink-900/40 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-pink-300 transition-colors text-[16px]"
                    >
                      {item.cta}
                    </button>
                  </div>
                )}

                {/* Post Stats */}
                <div className="px-3 py-2 flex items-center justify-between text-[13px] text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center -space-x-1">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <Heart className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                    <span className="ml-6">{item.likes || 0}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span>{item.comments || 0} comments</span>
                    <span>{item.shares || 0} shares</span>
                  </div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center px-1 py-1">
                  <div 
                    className="relative flex-1"
                    onMouseEnter={() => {
                      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
                      setActiveReactionPostId(item.id);
                    }}
                    onMouseLeave={() => {
                      reactionTimeoutRef.current = setTimeout(() => setActiveReactionPostId(null), 500);
                    }}
                  >
                    <button 
                      onClick={() => {
                        if (!currentUser) {
                          alert("Please sign in to like posts");
                          return;
                        }
                        updatePost(item.id, { likes: (item.likes || 0) + 1 });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 font-semibold text-[14px]"
                    >
                      <ThumbsUp className={cn("w-5 h-5", item.likes > 0 && "text-blue-500 fill-blue-500")} />
                      <span>Like</span>
                    </button>

                    {/* Reactions Popup */}
                    <AnimatePresence>
                      {activeReactionPostId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.8 }}
                          animate={{ opacity: 1, y: -45, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.8 }}
                          className="absolute bottom-full left-0 bg-white dark:bg-gray-800 shadow-xl rounded-full p-1.5 flex items-center gap-1.5 border border-gray-100 dark:border-gray-700 z-[60] mb-2"
                        >
                          {[
                            { emoji: '👍', label: 'Like', color: 'bg-blue-500' },
                            { emoji: '❤️', label: 'Love', color: 'bg-red-500' },
                            { emoji: '🥰', label: 'Care', color: 'bg-yellow-500' },
                            { emoji: '😂', label: 'Haha', color: 'bg-yellow-500' },
                            { emoji: '😮', label: 'Wow', color: 'bg-yellow-500' },
                            { emoji: '😢', label: 'Sad', color: 'bg-yellow-500' },
                            { emoji: '😡', label: 'Angry', color: 'bg-orange-600' }
                          ].map((reaction, idx) => (
                            <motion.button
                              key={reaction.emoji}
                              whileHover={{ scale: 1.3, y: -5 }}
                              onClick={() => {
                                handleReaction(item.id, reaction.emoji);
                                setActiveReactionPostId(null);
                              }}
                              className="w-10 h-10 flex items-center justify-center text-2xl hover:drop-shadow-lg transition-all"
                              title={reaction.label}
                            >
                              {reaction.emoji}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setActiveCommentPostId(activeCommentPostId === item.id ? null : item.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 font-semibold text-[14px]"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Comment</span>
                  </button>

                  <button 
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: item.title || 'Pulse Feeds',
                            text: item.content,
                            url: window.location.href
                          });
                        } catch (err) {
                          if (err instanceof Error && err.name !== 'AbortError') {
                            console.error('Error sharing:', err);
                          }
                        }
                      } else {
                        handleCopyLink(item.id);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 font-semibold text-[14px]"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>

                {/* Comment Section */}
                {activeCommentPostId === item.id && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
                    {item.commentsList && item.commentsList.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {item.commentsList.map((comment: any, idx: number) => (
                          <div key={idx} className="flex gap-2">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-2xl px-3 py-2 flex-1">
                              <div className="font-bold text-[12px] text-gray-900 dark:text-gray-100">{comment.author}</div>
                              <div className="text-[13px] text-gray-700 dark:text-gray-300 leading-tight">{comment.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-3 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 bg-transparent border-none py-1.5 text-[14px] focus:ring-0 outline-none dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handlePostComment(item.id);
                        }}
                      />
                      <button
                        onClick={() => handlePostComment(item.id)}
                        disabled={isPostingComment || !commentText.trim()}
                        className="text-blue-500 disabled:opacity-50"
                      >
                        {isPostingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  </div>
);
}
