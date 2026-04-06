import React, { useState, useEffect } from 'react';
import { Play, DollarSign, Gem, TrendingUp, Clock, CheckCircle2, AlertCircle, Loader2, Youtube, ExternalLink, Info, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  reward: number;
  url: string;
  category: string;
  views: number;
}

export default function WatchToEarn() {
  const { currentUser, userData } = useAuth();
  const { totalEarnedToday } = useRevenue();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchingVideo, setWatchingVideo] = useState<Video | null>(null);
  const [watchProgress, setWatchProgress] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    // Sample videos for now
    const sampleVideos: Video[] = [
      { id: '1', title: 'Top 10 AI Trends in 2026', thumbnail: 'https://picsum.photos/seed/ai/400/225', duration: '5:30', reward: 50, url: 'https://youtube.com', category: 'Tech', views: 1200 },
      { id: '2', title: 'How to Master React 19', thumbnail: 'https://picsum.photos/seed/react/400/225', duration: '12:45', reward: 120, url: 'https://youtube.com', category: 'Coding', views: 850 },
      { id: '3', title: 'The Future of Web Design', thumbnail: 'https://picsum.photos/seed/design/400/225', duration: '8:15', reward: 80, url: 'https://youtube.com', category: 'Design', views: 2300 },
      { id: '4', title: 'Gemini 3 Flash: A Deep Dive', thumbnail: 'https://picsum.photos/seed/gemini/400/225', duration: '15:00', reward: 150, url: 'https://youtube.com', category: 'AI', views: 4500 },
    ];
    setVideos(sampleVideos);
    setLoading(false);
  }, []);

  const handleWatch = (video: Video) => {
    setWatchingVideo(video);
    setWatchProgress(0);
    
    // Simulate watching progress
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 100);
  };

  const claimReward = async () => {
    if (!currentUser || !watchingVideo || isClaiming) return;
    setIsClaiming(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        points: increment(watchingVideo.reward),
        totalEarned: increment(watchingVideo.reward)
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: watchingVideo.reward,
        type: 'reward',
        revenueSource: 'watch-to-earn',
        timestamp: serverTimestamp(),
        title: `Watched: ${watchingVideo.title}`
      });

      setWatchingVideo(null);
      setWatchProgress(0);
      alert(`Congratulations! You earned ${watchingVideo.reward} points!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center gap-3">
          <Youtube className="w-10 h-10 text-red-500" />
          Watch to Earn
        </h1>
        <p className="text-gray-500 text-sm">Earn points for every video you watch. Redeem points for real rewards!</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <Gem className="w-8 h-8 text-blue-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Points</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{userData?.points || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Earned Today</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{totalEarnedToday} pts</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <Clock className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Watch Time</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">1.2h</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
        <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">How it works</h3>
          <p className="text-xs text-blue-800/70 dark:text-blue-200/70 leading-relaxed">
            Select a video from the list below. Watch it until the progress bar reaches 100% to claim your points. 
            Points are automatically added to your balance and can be withdrawn monthly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map(video => (
          <motion.div 
            key={video.id}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 group"
          >
            <div className="relative aspect-video">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <button 
                  onClick={() => handleWatch(video)}
                  className="w-14 h-14 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center text-red-600 shadow-xl scale-0 group-hover:scale-100 transition-all duration-300"
                >
                  <Play className="w-6 h-6 fill-red-600" />
                </button>
              </div>
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                {video.duration}
              </div>
              <div className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-full shadow-lg flex items-center gap-1">
                <Gem className="w-3 h-3" />
                +{video.reward} PTS
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">
                  {video.category}
                </span>
                <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {video.views.toLocaleString()} views
                </span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
                {video.title}
              </h3>
              <button 
                onClick={() => handleWatch(video)}
                className="w-full py-3 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-black rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 border border-gray-100 dark:border-gray-700"
              >
                <Play className="w-4 h-4" />
                Watch Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {watchingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="w-full max-w-4xl space-y-6">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Youtube className="w-6 h-6 text-red-500" />
                  Now Watching: {watchingVideo.title}
                </h2>
                <button 
                  onClick={() => setWatchingVideo(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&disablekb=1&modestbranding=1"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
                
                {/* Overlay to prevent interaction */}
                <div className="absolute inset-0 z-10" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-white text-sm font-bold">
                  <span>Watch Progress</span>
                  <span className="text-red-500">{watchProgress}%</span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${watchProgress}%` }}
                  />
                </div>
                
                <div className="flex justify-center pt-4">
                  <button
                    disabled={watchProgress < 100 || isClaiming}
                    onClick={claimReward}
                    className={cn(
                      "px-10 py-4 rounded-2xl font-black text-lg transition-all flex items-center gap-3 shadow-xl",
                      watchProgress < 100 
                        ? "bg-gray-800 text-gray-500 cursor-not-allowed" 
                        : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 active:scale-95 shadow-green-500/20"
                    )}
                  >
                    {isClaiming ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : watchProgress < 100 ? (
                      <>
                        <Clock className="w-6 h-6" />
                        <span>Watching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>Claim {watchingVideo.reward} Points</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
