import { useEffect, useState } from "react";
import { PlayCircle, MessageSquare, Heart, Share2, MoreHorizontal, Sun, Snowflake, CloudRain, Cloud, CloudLightning, Send, Loader2, AlertTriangle, Search, Filter, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { multimedia_stream_engine, content_governor, revenue_logic } from "../lib/engines";
import { cn } from "../lib/utils";
import AdUnit from "../components/AdUnit";
import { moderateContent } from "../services/moderationService";
import { useOutletContext } from "react-router-dom";

export default function Home() {
  const { currentWeather, forecastWeather, locationName, tempTrend, weatherAnalysis } = useOutletContext<any>();
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [userFilter, setUserFilter] = useState("");
  
  const CATEGORIES = ['All', 'General', 'Gold Prediction', 'Tech', 'News', 'Gaming', 'Finance'];

  const [feedItems, setFeedItems] = useState<any[]>([
    { id: 1, type: 'post', user: 'Alice', category: 'General', content: 'Just discovered the new Pulse Feeds app! Loving the gold predictions.', likes: 42, comments: 12, commentsList: [], timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2 hours ago
    { id: 2, type: 'video', user: 'Bob', category: 'Tech', content: 'Check out this amazing sunset!', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', likes: 156, comments: 34, commentsList: [], timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 1 day ago
    { id: 3, type: 'ad', category: 'Sponsored', content: 'Sponsored: Get 20% off your next premium subscription!', sponsor: 'Pulse Feeds Premium', timestamp: new Date() },
    { id: 4, type: 'poll', user: 'Charlie', category: 'Gold Prediction', content: 'What feature do you use most?', options: ['Gold Prediction', 'Groups', 'Rewards'], votes: 89, commentsList: [], timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }, // 3 days ago
  ]);

  useEffect(() => {
    multimedia_stream_engine();
    content_governor();
    revenue_logic();
  }, []);

  const handlePostComment = async (postId: number) => {
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    setCommentError(null);

    try {
      const moderationResult = await moderateContent(commentText, 'comment');

      if (!moderationResult.isApproved) {
        setCommentError(`Comment flagged: ${moderationResult.reason}`);
        setIsPostingComment(false);
        return;
      }

      // If approved, add comment
      setFeedItems(prevItems => 
        prevItems.map(item => {
          if (item.id === postId) {
            return {
              ...item,
              comments: (item.comments || 0) + 1,
              commentsList: [...(item.commentsList || []), { user: 'You', text: commentText }]
            };
          }
          return item;
        })
      );
      
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
      {/* Weather Widget */}
      {currentWeather && forecastWeather && (
        <div className={cn("rounded-3xl p-6 shadow-lg border border-white/10 relative overflow-hidden bg-gradient-to-br", currentWeather.bg)}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-20">
            <currentWeather.icon className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">Weather Today</h2>
              <div className="flex items-end space-x-4">
                <currentWeather.icon className={cn("w-16 h-16", currentWeather.color, currentWeather.glow)} />
                <div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{currentWeather.temp}</div>
                  <div className={cn("text-lg font-medium", currentWeather.color)}>{currentWeather.type}</div>
                </div>
              </div>
            </div>
            
            <div className="w-full sm:w-px h-px sm:h-16 bg-gray-300 dark:bg-gray-600/50"></div>
            
            <div className="flex items-center space-x-4 bg-white/40 dark:bg-black/20 p-3 rounded-2xl backdrop-blur-sm">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tomorrow</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{forecastWeather.type}</span>
              </div>
              <forecastWeather.icon className={cn("w-8 h-8", forecastWeather.color, forecastWeather.glow)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">Latest Feed</h1>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
              activeCategory === category
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {feedItems.filter(item => {
          // Ad bypasses filters
          if (item.type === 'ad') return true;

          // Category Filter
          if (activeCategory !== 'All' && item.category !== activeCategory) return false;

          // Search Query Filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contentMatch = item.content?.toLowerCase().includes(query);
            const userMatch = item.user?.toLowerCase().includes(query);
            if (!contentMatch && !userMatch) return false;
          }

          // User Filter
          if (userFilter && !item.user?.toLowerCase().includes(userFilter.toLowerCase())) return false;

          // Date Filter
          if (dateFilter !== 'all' && item.timestamp) {
            const now = new Date();
            const itemDate = new Date(item.timestamp);
            const diffTime = Math.abs(now.getTime() - itemDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
                          {item.timestamp ? (
                            (() => {
                              const diff = Math.floor((new Date().getTime() - new Date(item.timestamp).getTime()) / 1000);
                              if (diff < 60) return 'Just now';
                              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                              return `${Math.floor(diff / 86400)}d ago`;
                            })()
                          ) : '2 hours ago'}
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

                {item.type === 'video' ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-3 flex items-center justify-center group">
                    <video src={item.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loop muted autoPlay playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <PlayCircle className="w-12 h-12 text-white/80" />
                    </div>
                  </div>
                ) : item.type === 'poll' ? (
                  <div className="mb-3 space-y-2">
                    <p className="text-gray-800 dark:text-gray-200 mb-2">{item.content}</p>
                    {item.options?.map((opt, i) => (
                      <button key={i} className="w-full text-left px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        {opt}
                      </button>
                    ))}
                    <div className="text-xs text-gray-500 mt-2">{item.votes} votes</div>
                  </div>
                ) : (
                  <p className="text-gray-800 dark:text-gray-200 mb-3">{item.content}</p>
                )}

                <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button className="flex items-center space-x-1 hover:text-pink-500 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">{item.likes}</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentPostId(activeCommentPostId === item.id ? null : item.id)}
                    className="flex items-center space-x-1 hover:text-blue-500 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm">{item.comments}</span>
                  </button>
                  <button className="flex items-center space-x-1 hover:text-green-500 transition-colors ml-auto">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Comment Section */}
                {activeCommentPostId === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {item.commentsList && item.commentsList.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {item.commentsList.map((comment: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 mr-2">{comment.user}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</span>
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
