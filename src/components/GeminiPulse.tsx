import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, BrainCircuit, Loader2, ArrowRight, Zap, Target, Heart } from 'lucide-react';
import { generateContentWithRetry } from '../lib/ai';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface PulseInsight {
  id: string;
  title: string;
  description: string;
  category: 'growth' | 'finance' | 'social' | 'health';
  val: string;
  trend: 'up' | 'down' | 'stable';
}

export default function GeminiPulse() {
  const [insights, setInsights] = useState<PulseInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      try {
        // In a real app, we'd fetch actual data to feed Gemini
        // For this widget, we'll ask Gemini to generate "The State of Pulse" 
        // based on the vision of the community.
        
        const response = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: `Generate 3 current "Community Pulse Insights" for a social app called Pulse Feeds.
          These should sound like real-time data trends.
          Format as JSON array: [{title, description, category, val, trend}]
          Categories: growth, finance, social, health.
          Trends: up, down, stable.
          Example: {title: "Health Surge", description: "Users are completing 40% more health scans this week.", category: "health", val: "+40%", trend: "up"}`,
        });

        const text = response.text || "[]";
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setInsights(data.map((d: any, i: number) => ({ ...d, id: `insight-${i}` })));
        }
      } catch (err) {
        console.error("Pulse error", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  const getIcon = (category: string) => {
    switch (category) {
      case 'growth': return <TrendingUp className="w-4 h-4" />;
      case 'finance': return <Zap className="w-4 h-4" />;
      case 'health': return <Heart className="w-4 h-4" />;
      default: return <BrainCircuit className="w-4 h-4" />;
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'growth': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'finance': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'health': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
      default: return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
    }
  };

  if (loading && insights.length === 0) {
    return (
      <div className="mx-6 p-8 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Synchronizing Neural Pulse...</p>
      </div>
    );
  }

  return (
    <div className="mx-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Gemini Pulse Insights</h2>
        </div>
        <button 
          onClick={() => navigate('/intelligence')}
          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Detailed Intelligence <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", getColor(insight.category))}>
                  {getIcon(insight.category)}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">{insight.val}</span>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    {insight.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{insight.trend}</span>
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors uppercase text-xs tracking-tight">{insight.title}</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{insight.description}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
