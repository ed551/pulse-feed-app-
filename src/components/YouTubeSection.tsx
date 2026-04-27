import React, { useState } from 'react';
import { Youtube, RefreshCw, Play, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CURATED_CONTENT = [
  { id: 'playlist-1', title: 'Community Feed', type: 'playlist', url: 'https://www.youtube.com/embed/videoseries?list=PLJKQ-nLJ-21LgxH8A-7YMFZuZhUnLuGHY' },
  { id: 'video-1', title: 'Beautiful Wonders', type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }, // Placeholder for actual videos
  { id: 'video-2', title: 'Global Tech Insights', type: 'video', url: 'https://www.youtube.com/embed/qgehB8b_K1U' },
  { id: 'playlist-2', title: 'Master Classes', type: 'playlist', url: 'https://www.youtube.com/embed/videoseries?list=PL4cUxeGkcC9jx2-BHq9u6rax7X6KdfTuR' },
  { id: 'video-3', title: 'Community Spotlight', type: 'video', url: 'https://www.youtube.com/embed/5qap5aO4i9A' }
];

export default function YouTubeSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReshuffling, setIsReshuffling] = useState(false);

  const handleReshuffle = () => {
    setIsReshuffling(true);
    setTimeout(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * CURATED_CONTENT.length);
      } while (nextIndex === currentIndex && CURATED_CONTENT.length > 1);
      
      setCurrentIndex(nextIndex);
      setIsReshuffling(false);
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Feed Reshuffled", 
          body: `Now showing: ${CURATED_CONTENT[nextIndex].title}` 
        } 
      }));
    }, 600);
  };

  const currentContent = CURATED_CONTENT[currentIndex];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Youtube className="w-24 h-24 text-red-600" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Community Spotlight</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{currentContent.title}</p>
            </div>
          </div>
          
          <button 
            onClick={handleReshuffle}
            disabled={isReshuffling}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-100 dark:border-gray-600 group/btn",
              isReshuffling && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4 text-red-600 transition-transform duration-500", isReshuffling && "rotate-180")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Reshuffle</span>
          </button>
        </div>

        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-gray-700 relative group/video">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentContent.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full"
            >
              <iframe
                width="100%"
                height="100%"
                src={currentContent.url}
                title="YouTube player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="relative z-10"
              ></iframe>
            </motion.div>
          </AnimatePresence>
          
          {!isReshuffling && (
            <div className="absolute inset-0 bg-black/5 pointer-events-none z-20 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          )}
          
          {isReshuffling && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 z-30 flex items-center justify-center animate-pulse">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic max-w-md">
            Explore the latest community highlights. Use the Reshuffle button to explore different content sectors.
          </p>
          <div className="flex gap-1">
            {CURATED_CONTENT.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  i === currentIndex ? "bg-red-600 w-4" : "bg-gray-300 dark:bg-gray-600"
                )} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
