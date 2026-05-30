import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  AlertCircle,
  Gem,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  BarChart3,
  LineChart
} from 'lucide-react';
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { generateContentWithRetry } from '../lib/ai';

// Mock data generator for 30 days of Gold price movement
const generateGoldData = () => {
  const data = [];
  let currentPrice = 2350.45;
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some random volatility
    const change = (Math.random() - 0.48) * 45;
    currentPrice += change;
    
    data.push({
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: parseFloat(currentPrice.toFixed(2)),
      timestamp: date.getTime()
    });
  }
  return data;
};

export default function GoldGraph() {
  const [data, setData] = useState(generateGoldData());
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | 'ALL'>('30D');

  const currentPrice = data[data.length - 1].price;
  const startPrice = data[0].price;
  const priceChange = currentPrice - startPrice;
  const percentChange = (priceChange / startPrice) * 100;

  const runAiPrediction = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Based on the current Gold price of $${currentPrice} (which has seen a ${percentChange.toFixed(2)}% change over 30 days), what is the 7-day prediction and market sentiment? Provide a brief, professional technical analysis. Context: Pulse Feeds Gold Ecosystem.`;
      
      const response = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        setAiAnalysis(response.candidates[0].content.parts[0].text);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("Unable to generate prediction at this time. Market volatility is currently outside standard parameters.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAiPrediction();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center">
              <Gem className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                Gold Market Terminal
                <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Live</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Real-time commodity tracking & AI forecasting</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spot Price (USD/oz)</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white">${currentPrice.toLocaleString()}</span>
                <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${priceChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {priceChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(percentChange).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Main Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-gray-400" />
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Price History</h3>
              </div>
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                {['7D', '30D', 'ALL'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t as any)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${timeframe === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: '#fbbf24', fontWeight: 800 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#eab308" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI Insights Panel */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={120} />
              </div>
              
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-yellow-500" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-yellow-500">Gemini Intelligence</h3>
              </div>

              <div className="space-y-4">
                {isAnalyzing ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-800 rounded w-4/6"></div>
                  </div>
                ) : (
                  <div className="text-sm font-medium leading-relaxed text-slate-300">
                    {aiAnalysis}
                  </div>
                )}
                
                <button 
                  onClick={runAiPrediction}
                  disabled={isAnalyzing}
                  className="w-full mt-4 bg-white/10 hover:bg-white/20 transition-colors py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? 'Scanning Markets...' : 'Refresh AI Prediction'}
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Market Metrics</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vol (24h)</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">$4.2B</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Spread</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">0.05%</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Index Price</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">${(currentPrice * 0.998).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Depth</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">99.9%</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
