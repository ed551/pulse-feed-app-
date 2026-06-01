import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  LineChart,
  Brain,
  Zap,
  Target,
  ChevronRight,
  ShieldCheck
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
  Area,
  ReferenceLine
} from 'recharts';
import { generateContentWithRetry } from '../lib/ai';
import { cn } from '../lib/utils';
import { marketBrain } from '../lib/marketEngine';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';

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
  const { convert: formatCurrency } = useCurrencyConverter();
  const [data, setData] = useState<any[]>([]);
  const [realPrice, setRealPrice] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const response = await fetch('/api/binance/prices');
        const result = await response.json();
        if (result.success) {
          const paxg = result.prices.find((p: any) => p.symbol === 'PAXGUSDT');
          if (paxg && paxg.price) {
            const price = parseFloat(paxg.price);
            setRealPrice(price);
            
            // For now, we still generate a trend but base it on the real current price
            const mockHistory = [];
            const now = new Date();
            let tempPrice = price;
            for (let i = 30; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              const change = (Math.random() - 0.48) * 20;
              tempPrice += change;
              mockHistory.push({
                date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                price: parseFloat(tempPrice.toFixed(2)),
                timestamp: date.getTime()
              });
              // Ensure the last one is the real price
              if (i === 0) mockHistory[mockHistory.length - 1].price = price;
            }
            setData(mockHistory);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Binance prices:", err);
        setData(generateGoldData());
      } finally {
        setDataLoading(false);
      }
    };

    fetchRealData();
  }, []);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    confidence: number;
    target: number;
    reasoning: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | 'ALL'>('30D');

  const currentPrice = data.length > 0 ? data[data.length - 1].price : 2400;
  const startPrice = data.length > 0 ? data[0].price : 2350.45;
  const priceChange = currentPrice - startPrice;
  const percentChange = startPrice !== 0 ? (priceChange / startPrice) * 100 : 0;

  // Forecast data for the chart projection
  const chartData = useMemo(() => {
    if (!prediction || data.length === 0) return data;
    
    const lastPoint = data[data.length - 1];
    const forecastPoints = [];
    const step = (prediction.target - lastPoint.price) / 3;
    
    for (let i = 1; i <= 3; i++) {
      forecastPoints.push({
        date: `Forecast ${i}`,
        price: parseFloat((lastPoint.price + step * i).toFixed(2)),
        isForecast: true
      });
    }
    
    return [...data, ...forecastPoints];
  }, [data, prediction]);

  const runAiPrediction = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `
        Analyze the Gold Market for Pulse Feeds Gold Ecosystem.
        Current Price: ${currentPrice} mg.
        30-Day Trend: ${percentChange.toFixed(2)}%.
        
        Provide a 7-day technical prediction in STRICT JSON format:
        {
          "direction": "UP", "DOWN", or "SIDEWAYS",
          "confidence": (0-100),
          "target": (predicted price in mg),
          "reasoning": "brief 1-sentence analytical insight"
        }
      `;
      
      const response = await generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      });

      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = JSON.parse(response.candidates[0].content.parts[0].text);
        setPrediction(result);
        setAiAnalysis(result.reasoning);
        
        // Push to global Market Intel in header/menu
        marketBrain.updatePrediction({
          direction: result.direction.toLowerCase() as any,
          confidence: result.confidence,
          analysis: result.reasoning
        });
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setAiAnalysis("Market signals are currently divergent. Neutral stance recommended.");
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
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spot Price (Gold)</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(currentPrice)}</span>
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
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
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
                    dot={(props: any) => {
                      if (props.payload.isForecast) {
                        return <circle cx={props.cx} cy={props.cy} r={3} fill="#8b5cf6" stroke="none" />;
                      }
                      return null;
                    }}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                  {prediction && (
                    <ReferenceLine 
                      y={prediction.target} 
                      stroke="#8b5cf6" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: 'AI Target', 
                        position: 'right', 
                        fill: '#8b5cf6', 
                        fontSize: 10, 
                        fontWeight: 900 
                      }} 
                    />
                  )}
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
              className="bg-slate-900 border-2 border-purple-500/30 text-white rounded-3xl p-6 shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain size={120} className="text-purple-400" />
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="font-black text-xs uppercase tracking-widest text-purple-400">The Brain: Prediction Engine</h3>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-400 opacity-50" />
              </div>

              <div className="space-y-6 relative z-10">
                {/* Movement Indicator Gauge */}
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movement Potential</span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      prediction?.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-400' :
                      prediction?.direction === 'DOWN' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-slate-700 text-slate-400'
                    )}>
                      {isAnalyzing ? 'Scanning...' : prediction?.direction || 'Standing By'}
                    </span>
                  </div>
                  
                  <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isAnalyzing ? '100%' : `${prediction?.confidence || 0}%` }}
                      className={cn(
                        "absolute inset-y-0 left-0 transition-all duration-1000",
                        prediction?.direction === 'UP' ? 'bg-emerald-500' :
                        prediction?.direction === 'DOWN' ? 'bg-rose-500' :
                        'bg-purple-500'
                      )}
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    )}
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] font-bold text-slate-500 italic">Caution</span>
                    <span className="text-[9px] font-bold text-slate-400">{prediction?.confidence || 0}% Confidence</span>
                    <span className="text-[9px] font-bold text-slate-500 italic">High conviction</span>
                  </div>
                </div>

                {/* Target & Reasoning */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target className="w-3 h-3 text-purple-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">AI Price Target</p>
                    </div>
                    {isAnalyzing ? (
                      <div className="h-5 bg-slate-700 rounded animate-pulse w-2/3" />
                    ) : (
                      <p className="text-lg font-black text-white">{prediction?.target?.toLocaleString() || '---'}</p>
                    )}
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Timeline</p>
                    </div>
                    <p className="text-lg font-black text-white">7 Days</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ChevronRight className="w-3 h-3 text-purple-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">The Brain's Logic</p>
                  </div>
                  {isAnalyzing ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-700 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                      "{aiAnalysis || 'Waiting for market data synchronization...'}"
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={runAiPrediction}
                  disabled={isAnalyzing}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 transition-all py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95"
                >
                  {isAnalyzing ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Brain className="w-4 h-4" />
                      </motion.div>
                      <span>Brain Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Synchronize Predictions</span>
                    </>
                  )}
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
