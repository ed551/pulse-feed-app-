import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, RefreshCw, ExternalLink, Sparkles, TrendingUp, Clock, Globe } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  timestamp: string;
  impactLevel: 'high' | 'medium' | 'low';
  scope: 'local' | 'international';
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(0);
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Reverse geocoding can be complex, just pass coordinates and ask Gemini to infer or use general context
            setLocation(`${latitude}, ${longitude}`);
          } catch (e) {
            console.error("Location error", e);
          }
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  const fetchNews = async (force = false) => {
    const intervalStr = localStorage.getItem('pulse_news_interval') || '1h';
    let intervalMs = 60 * 60 * 1000;
    if (intervalStr === '30m') intervalMs = 30 * 60 * 1000;
    if (intervalStr === '6h') intervalMs = 6 * 60 * 60 * 1000;
    if (intervalStr === 'daily') intervalMs = 24 * 60 * 60 * 1000;

    const now = Date.now();
    const lastFetch = parseInt(localStorage.getItem('pulse_last_news_fetch') || '0');

    if (!force && now - lastFetch < intervalMs && news.length > 0) {
      return; // Respect interval
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Generate 8 highly relevant news items for a platform called Pulse Feeds.
      Include a mix of 4 International news items and 4 Local news items.
      ${location ? `Context for Local News: User's approximate coordinates are ${location}.` : "Context for Local News: Focus on general high-vibrancy community achievements and grass-roots impact."}
      
      Requirements:
      - Focus on social impact, community achievements, real-world issue detection, and educational milestones.
      - Format: JSON array of objects with: id (string), title (string), summary (string), category (string), timestamp (string), impactLevel ('high'|'medium'|'low'), scope ('local'|'international').
      - Keep summaries concise and impactful. Avoid generic corporate speak.
      - Categories should be specific like 'Science', 'Environment', 'Co-op', 'Edu', 'Tech', 'Social'.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = result.text || '';
      const cleanedJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanedJson);

      setNews(parsed);
      setLastRefreshed(now);
      localStorage.setItem('pulse_last_news_fetch', now.toString());
      localStorage.setItem('pulse_cached_news', JSON.stringify(parsed));
    } catch (error) {
      console.error("News Fetch Error:", error);
      // Fallback to static if AI fails
      const fallback = [
        { id: '1', title: 'Global Climate Summit Reaches Accord', summary: 'International leaders agree on a new framework for community-led carbon reduction projects.', category: 'Social', timestamp: '1h ago', impactLevel: 'high', scope: 'international' },
        { id: '2', title: 'Local Co-op Program Expands', summary: 'Community-run agricultural cooperative in your region expands its reach to five new districts.', category: 'Co-op', timestamp: '3h ago', impactLevel: 'medium', scope: 'local' }
      ] as NewsItem[];
      setNews(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('pulse_cached_news');
    if (cached) {
      setNews(JSON.parse(cached));
    }
    fetchNews();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white tracking-tight">Community Feed</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <Globe className="w-3 h-3" /> Value-Driven Updates
            </p>
          </div>
        </div>
        <button 
          onClick={() => fetchNews(true)}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4 text-gray-400", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {news.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                  item.impactLevel === 'high' ? "bg-rose-100 text-rose-600" :
                  item.impactLevel === 'medium' ? "bg-amber-100 text-amber-600" :
                  "bg-blue-100 text-blue-600"
                )}>
                  {item.scope === 'international' ? <Globe className="w-2 h-2" /> : <TrendingUp className="w-2 h-2" />}
                  {item.category} • {item.scope}
                </span>
                <span className="text-[9px] text-gray-400 font-bold">{item.timestamp}</span>
              </div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {item.summary}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                  <TrendingUp className="w-3 h-3" />
                  Impact Verified
                </div>
                <button className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase flex items-center gap-1 group/btn">
                  Read More
                  <ExternalLink className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-900/30">
        <div className="flex items-center justify-between text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            AI Curated for You
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Refresh: {localStorage.getItem('pulse_news_interval') || '1h'}
          </div>
        </div>
      </div>
    </div>
  );
}
