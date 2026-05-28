import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  ReferenceLine
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, Info, Calendar, RefreshCw, Layers, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, Zap, Brain, BarChart2, Wallet, ShoppingCart, 
  ArrowLeftRight, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { goldBrain, GoldPrediction } from '../lib/goldEngine';
import { useTranslation } from '../lib/i18n';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Mock historical data generation
const generateHistory = (direction: 'up' | 'down' | 'stable', points: number = 30) => {
  const data = [];
  let currentPrice = 2300 + Math.random() * 100;
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000 * 24); // daily
    const change = (Math.random() - 0.5) * 20;
    const bias = direction === 'up' ? 5 : (direction === 'down' ? -5 : 0);
    currentPrice += change + bias;
    data.push({
      time: time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: parseFloat(currentPrice.toFixed(2)),
      timestamp: time.getTime()
    });
  }
  return data;
};

export default function GoldMarket() {
  const { t } = useTranslation();
  const { currentUser, userData } = useAuth();
  const { deductBalance, addRevenue } = useRevenue();
  const [prediction, setPrediction] = useState<GoldPrediction | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewPoints, setViewPoints] = useState(14); // 14 days by default
  const [transactionType, setTransactionType] = useState<'buy' | 'sell' | null>(null);
  const [amountInGrams, setAmountInGrams] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const pred = goldBrain.getDailyPrediction(new Date());
    setPrediction(pred);
    setHistory(generateHistory(pred.direction, 30));
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const pred = goldBrain.getDailyPrediction(new Date());
      setPrediction(pred);
      setHistory(generateHistory(pred.direction, 30));
      setIsRefreshing(false);
    }, 4000);
  };

  const chartData = useMemo(() => {
    return history.slice(-viewPoints);
  }, [history, viewPoints]);

  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const startPrice = chartData[0]?.price || 0;
  const priceDiff = currentPrice - startPrice;
  const percentageChange = (priceDiff / startPrice) * 100;

  // Gold price is per ounce. 1 ounce = 28.3495 grams
  // We'll trade in grams for accessibility
  const pricePerGram = currentPrice / 28.3495;

  const handleTransaction = async () => {
    if (!currentUser || !db || !amountInGrams) return;
    const grams = parseFloat(amountInGrams);
    if (isNaN(grams) || grams <= 0) return;

    setIsProcessing(true);
    setTxStatus(null);

    const totalUSD = grams * pricePerGram;

    try {
      if (transactionType === 'buy') {
        const success = await deductBalance(totalUSD, `Purchase of ${grams}g Digital Gold`);
        if (!success) {
          throw new Error("Insufficient balance to complete purchase.");
        }
        
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          goldBalance: increment(grams)
        });

        setTxStatus({ success: true, message: `Successfully purchased ${grams}g of gold.` });
      } else {
        const userGold = (userData as any)?.goldBalance || 0;
        if (userGold < grams) {
          throw new Error("Insufficient gold balance.");
        }

        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          goldBalance: increment(-grams)
        });

        // Add revenue back to user balance
        await addRevenue(totalUSD, 0, `Sold ${grams}g Digital Gold`, 'community');

        setTxStatus({ success: true, message: `Successfully sold ${grams}g of gold.` });
      }

      // Small delay then close modal
      setTimeout(() => {
        setTransactionType(null);
        setTxStatus(null);
        setAmountInGrams('1');
      }, 3000);

    } catch (err: any) {
      setTxStatus({ success: false, message: err.message || "Transaction failed." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!prediction) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24 font-sans uppercase-tracking-none">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-8 pb-12 px-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Gold Market Intelligence
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium normal-case">
                  Real-time precious metal analytics and movement prediction
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Spot Price (XAU/USD)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">${currentPrice.toLocaleString()}</span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5",
                  priceDiff >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {priceDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(percentageChange).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Your Holdings</div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-lg font-black dark:text-white leading-none">{(userData as any)?.goldBalance?.toFixed(2) || '0.00'}g</div>
                  <div className="text-[10px] font-bold text-gray-500">Value: ${(((userData as any)?.goldBalance || 0) * pricePerGram).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">AI Logic Signal</div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-xl",
                  prediction.direction === 'up' ? "bg-emerald-500/10 text-emerald-500" : 
                  prediction.direction === 'down' ? "bg-rose-500/10 text-rose-500" : 
                  "bg-blue-500/10 text-blue-500"
                )}>
                  {prediction.direction === 'up' ? <TrendingUp className="w-5 h-5" /> : 
                   prediction.direction === 'down' ? <TrendingDown className="w-5 h-5" /> : 
                   <Minus className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm font-black capitalize dark:text-white leading-none">{prediction.direction}</div>
                  <div className="text-[10px] font-bold text-gray-500">Conf: {prediction.confidence}%</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Market Sentiment</div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold dark:text-gray-300 leading-tight line-clamp-2">
                  {prediction.analysis}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-xl shadow-black/5 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-gray-400" />
                  <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Movement Chart</h3>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => setViewPoints(days)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-black rounded-xl transition-all",
                        viewPoints === days 
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" 
                          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      )}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-[300px] w-full p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={percentageChange >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={percentageChange >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#888' }}
                      minTickGap={20}
                    />
                    <YAxis 
                      hide={true} 
                      domain={['dataMin - 10', 'dataMax + 10']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1.25rem', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#111827',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={percentageChange >= 0 ? "#10b981" : "#f43f5e"} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                <div className="flex items-center gap-4">
                  <span>LOW: ${Math.min(...chartData.map(d => d.price)).toLocaleString()}</span>
                  <span>HIGH: ${Math.max(...chartData.map(d => d.price)).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE MARKET DATA SYNCED</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setTransactionType('buy')}
                className="group relative p-6 bg-emerald-500 dark:bg-emerald-600 rounded-[2.5rem] text-white overflow-hidden transition-all active:scale-95 active:opacity-90"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xl font-black uppercase tracking-tight">Buy Gold</div>
                  <p className="text-[10px] font-bold text-white/70 tracking-widest">SPOT: ${pricePerGram.toFixed(2)}/G</p>
                </div>
              </button>
              
              <button 
                onClick={() => setTransactionType('sell')}
                className="group relative p-6 bg-gray-900 rounded-[2.5rem] text-white border border-gray-800 overflow-hidden transition-all active:scale-95 active:opacity-90"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                    <ArrowLeftRight className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xl font-black uppercase tracking-tight">Sell Gold</div>
                  <p className="text-[10px] font-bold text-white/50 tracking-widest">MARKET RATE: LIQUIDATE</p>
                </div>
              </button>
            </div>
          </div>

          {/* AI Analysis Rail */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-500/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-black text-lg">Brain Execution</h3>
              </div>
              
              <div className="space-y-4">
                {[
                  { label: 'Input', value: prediction.brainSteps.input },
                  { label: 'Logic', value: prediction.brainSteps.logic },
                  { label: 'Analysis', value: prediction.brainSteps.analysis },
                  { label: 'Output', value: prediction.brainSteps.output }
                ].map((step, idx) => (
                  <div key={idx} className="relative pl-6 border-l border-white/20">
                    <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white/40" />
                    <div className="text-[9px] font-black uppercase text-white/60 mb-0.5">{step.label}</div>
                    <div className="text-[11px] font-bold leading-tight line-clamp-2">{step.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
                <div className="text-[9px] font-black uppercase text-white/60 mb-1">Status Report</div>
                <div className="text-[11px] font-black line-clamp-1">{prediction.brainSteps.update}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h4 className="text-xs font-black dark:text-white uppercase tracking-widest mb-4 flex items-center justify-between">
                Market Partners
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
              </h4>
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Recommended Seller</div>
                  <div className="text-xs font-black dark:text-white">{prediction.bestSeller}</div>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TOP BUYER (LIQUIDITY)</div>
                  <div className="text-xs font-black dark:text-white">{prediction.bestBuyer}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {transactionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setTransactionType(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className={cn(
                "p-8 text-center",
                transactionType === 'buy' ? "bg-emerald-500" : "bg-gray-900"
              )}>
                <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                  {transactionType === 'buy' ? <ShoppingCart className="w-8 h-8 text-white" /> : <ArrowLeftRight className="w-8 h-8 text-white" />}
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                  {transactionType === 'buy' ? 'Acquire Gold' : 'Liquidate Gold'}
                </h3>
                <p className="text-white/70 text-xs font-bold mt-1">
                  XAU/USD: ${currentPrice.toLocaleString()} (${pricePerGram.toFixed(2)}/g)
                </p>
              </div>

              <div className="p-8 space-y-6">
                {!txStatus ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Amount in Grams (G)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={amountInGrams}
                          onChange={(e) => setAmountInGrams(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-3xl px-6 text-xl font-black focus:ring-4 focus:ring-emerald-500/20 dark:text-white"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">GRAMS</div>
                      </div>
                      <div className="flex items-center justify-between px-2 text-[10px] font-bold text-gray-500">
                        <span>EST. VALUE: ${(parseFloat(amountInGrams || '0') * pricePerGram).toFixed(2)}</span>
                        <span>WALLET: ${userData?.balance?.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleTransaction}
                      disabled={isProcessing || !amountInGrams}
                      className={cn(
                        "w-full h-16 rounded-[2rem] text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:grayscale",
                        transactionType === 'buy' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-gray-900 shadow-black/20"
                      )}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        transactionType === 'buy' ? 'Confirm Purchase' : 'Confirm Sale'
                      )}
                    </button>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    {txStatus.success ? (
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    ) : (
                      <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    )}
                    <h4 className={cn(
                      "text-xl font-black mb-2",
                      txStatus.success ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {txStatus.success ? 'Transaction Success' : 'Transaction Failed'}
                    </h4>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {txStatus.message}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

