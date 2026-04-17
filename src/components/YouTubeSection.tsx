import React, { useEffect, useState, useRef } from 'react';
import { Youtube, Gem, CheckCircle2, Loader2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRevenue } from '../contexts/RevenueContext';
import { cn } from '../lib/utils';

export default function YouTubeSection() {
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
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Curated Community Content</p>
            </div>
          </div>
        </div>

        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-gray-700 relative group/video">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/videoseries?list=PLJKQ-nLJ-21LgxH8A-7YMFZuZhUnLuGHY"
            title="YouTube playlist player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="relative z-10"
          ></iframe>
          
          <div className="absolute inset-0 bg-black/20 pointer-events-none z-20 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
            Explore the latest updates, tutorials, and stories from the Pulse Feeds community. Stay informed and connected with our curated media feed.
          </p>
        </div>
      </div>
    </div>
  );
}
