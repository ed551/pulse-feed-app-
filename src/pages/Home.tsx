import { useEffect, useState, useRef } from "react";
import { 
  PlayCircle, MessageSquare, Heart, Share2, MoreHorizontal, Sun, Snowflake, CloudRain, Cloud, CloudLightning, 
  Send, Loader2, AlertTriangle, Search, Filter, X, TrendingUp, TrendingDown, Minus,
  LayoutGrid, Globe, Gem, Smartphone, FileText, Gamepad2, DollarSign, Calendar, Clock,
  Mail, Map, Youtube, Image, Languages, ExternalLink, Eye, Camera, Award, Sparkles, Volume2, VolumeX,
  Home as HomeIcon, Flag, BarChart2, Megaphone, RefreshCw, Radio, Video, Type, Smile,
  PlusCircle, MinusCircle, Bookmark, EyeOff, Bell, Link, XCircle, AlertCircle, Copy, Crown
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

  const feedItems = firebasePosts
    .map(p => ({ ...p, type: p.type || 'post', user: p.author }))
    .sort((a, b) => {
      const getTime = (item: any) => {
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
    alert("Post reported. Thank you for helping keep our community safe.");
    setActiveMenuPostId(null);
  };

  const handleSavePost = async (postId: string) => {
    if (!currentUser) {
      alert("Please sign in to save posts.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'saved_posts', postId), {
        postId,
        savedAt: serverTimestamp()
      });
      alert("Post saved to your collection!");
      setActiveMenuPostId(null);
    } catch (error) {
      console.error("Error saving post:", error);
    }
  };

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
    setActiveMenuPostId(null);
  };

  const handleInterested = async (postId: string) => {
    alert("We'll show you more posts like this.");
    setActiveMenuPostId(null);
  };

  const handleNotInterested = async (postId: string) => {
    alert("We'll show you fewer posts like this.");
    setActiveMenuPostId(null);
  };

  const handleHidePost = async (postId: string) => {
    alert("This post will be hidden from your feed.");
    setActiveMenuPostId(null);
  };

  const handleToggleNotifications = async (postId: string) => {
    alert("Notifications turned on for this post.");
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
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
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
        ) : feedItems.filter(item => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;

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
        ) : feedItems.filter(item => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;

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
        }).map((item) => (
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
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.user} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        item.user?.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{item.user}</div>
                        {item.type === 'announcement' && (
                          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Megaphone className="w-3 h-3" />
                            Announcement
                          </span>
                        )}
                        {item.type === 'update' && (
                          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Update
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                        <span>{item.time || 'Just now'}</span>
                        <span>•</span>
                        <span className="text-purple-500">{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuPostId(activeMenuPostId === item.id ? null : item.id)}
                        className="p-2 text-gray-400 hover:text-purple-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="More options"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {activeMenuPostId === item.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setActiveMenuPostId(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="fixed inset-x-0 bottom-0 sm:absolute sm:right-0 sm:top-full sm:bottom-auto sm:inset-x-auto mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-t-[2rem] sm:rounded-2xl shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                            >
                              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto my-3 sm:hidden" />
                              <div className="p-2 sm:p-2 space-y-1 pb-8 sm:pb-2">
                                <div className="px-4 py-2 sm:hidden">
                                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Post Options</h3>
                                </div>
                                <button 
                                  onClick={() => handleInterested(item.id)}
                                  className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                                    <PlusCircle className="w-5 h-5 sm:w-4 sm:h-4 text-green-500" />
                                  </div>
                                  <div>
                                    <div className="font-bold">Interested</div>
                                    <div className="text-[10px] text-gray-500">More of your posts will be like this.</div>
                                  </div>
                                </button>
                                <button 
                                  onClick={() => handleNotInterested(item.id)}
                                  className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                >
                                  <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                    <MinusCircle className="w-5 h-5 sm:w-4 sm:h-4 text-red-500" />
                                  </div>
                                  <div>
                                    <div className="font-bold">Not interested</div>
                                    <div className="text-[10px] text-gray-500">Fewer of your posts will be like this.</div>
                                  </div>
                                </button>
                                
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-4 sm:mx-0" />
                                
                                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-[1.5rem] sm:rounded-none p-1 sm:p-0 sm:bg-transparent space-y-1">
                                  <button 
                                    onClick={() => handleSavePost(item.id)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Bookmark className="w-5 h-5 sm:w-4 sm:h-4 text-blue-500" />
                                    <div>
                                      <div className="font-bold">Save post</div>
                                      <div className="text-[10px] text-gray-500">Add this to your saved items.</div>
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
                                          // Ignore AbortError (user canceled)
                                          if (err instanceof Error && err.name !== 'AbortError') {
                                            console.error('Error sharing:', err);
                                          }
                                        }
                                      } else {
                                        handleCopyLink(item.id);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Share2 className="w-5 h-5 sm:w-4 sm:h-4 text-purple-500" />
                                      <span className="font-bold">Share</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleHidePost(item.id)}
                                    className="w-full flex items-center justify-between px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <XCircle className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                      <span className="font-bold">I don't want to see this</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleReport(item.id)}
                                    className="w-full flex items-center justify-between px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <AlertCircle className="w-5 h-5 sm:w-4 sm:h-4 text-red-500" />
                                      <span className="font-bold">Report post</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button 
                                    onClick={() => handleToggleNotifications(item.id)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-yellow-500" />
                                    <span className="font-bold">Turn on notifications for this post</span>
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const url = `${window.location.origin}/post/${item.id}`;
                                      navigator.clipboard.writeText(url);
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Copy className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Copy link</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {item.title && (
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">{item.title}</h4>
                )}

                <div 
                  className="text-gray-800 dark:text-gray-200 mb-3 prose dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />

                {/* Poll Display */}
                {item.type === 'poll' && item.poll && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-800">
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
                )}

                {/* GIF Display */}
                {item.gifUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                    <img src={item.gifUrl} alt="GIF" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}

                {/* Images Display */}
                {item.images && item.images.length > 0 && (
                  <div className={cn(
                    "grid gap-2 mb-4 rounded-2xl overflow-hidden",
                    item.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {item.images.map((img: string, idx: number) => (
                      <img key={idx} src={img} alt="Post" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ))}
                  </div>
                )}

                {/* Video Display */}
                {(item.type === 'video' || item.type === 'live') && item.videoUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden aspect-video bg-black relative group">
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

                <div className="flex flex-wrap gap-2 mb-4">
                  {['🔥', '❤️', '😂', '😮', '😢', '👍'].map(emoji => {
                    const userIds = Array.isArray(item.reactions?.[emoji]) ? item.reactions[emoji] : [];
                    const hasReacted = userIds.includes(currentUser?.uid);
                    const count = userIds.length;

                    return (
                      <button 
                        key={emoji}
                        onClick={() => handleReaction(item.id, emoji)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:scale-110 transition-transform flex items-center gap-2",
                          hasReacted && "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        )}
                      >
                        <span>{emoji}</span>
                        {count > 0 && (
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

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
                    <span className="text-sm font-bold">{item.likes}</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentPostId(activeCommentPostId === item.id ? null : item.id)}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors group"
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold">{item.comments}</span>
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
                          // Ignore AbortError (user canceled)
                          if (err instanceof Error && err.name !== 'AbortError') {
                            console.error('Error sharing:', err);
                          }
                        }
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
