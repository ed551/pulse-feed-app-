import React from 'react';
import { ExternalLink, Info, MoreHorizontal, Share2, ThumbsUp } from 'lucide-react';
import { motion } from 'motion/react';

interface SponsoredPostProps {
  ad: {
    id: string;
    company: string;
    title: string;
    description: string;
    imageUrl: string;
    cta: string;
    link: string;
  };
}

export default function SponsoredPost({ ad }: SponsoredPostProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">
            {ad.company[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{ad.company}</h3>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md text-[10px] font-black uppercase tracking-widest">Sponsored</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold">Promoted Content</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{ad.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{ad.description}</p>
      </div>

      <div className="relative h-48 mx-4 rounded-2xl overflow-hidden">
        <img 
          src={ad.imageUrl} 
          alt={ad.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-600 transition-all">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-[10px] font-black">Like</span>
          </button>
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-600 transition-all">
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-black">Share</span>
          </button>
        </div>
        <a 
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          {ad.cta}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      <div className="px-4 pb-4 flex items-center gap-1 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
        <Info className="w-2 h-2" />
        Ads help keep Pulse Feeds free for everyone.
      </div>
    </motion.div>
  );
}
