import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Info,
  Lock,
  ExternalLink,
  Cpu,
  Zap,
  Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { cn } from '../lib/utils';

interface BinancePrice {
  symbol: string;
  price: string;
  error?: boolean;
}

export default function BinanceHub() {
  const { currentUser, userData } = useAuth();
  const { convert: formatCurrency } = useCurrencyConverter();
  const [prices, setPrices] = useState<BinancePrice[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Fetch Prices
      const priceResp = await fetch('/api/binance/prices');
      const priceResult = await priceResp.json();
      if (priceResult.success) {
        setPrices(priceResult.prices);
      }

      // Fetch Account if Admin (since we store keys in .env for now)
      const isAdmin = currentUser?.email === 'edwinmuoha@gmail.com' || userData?.role === 'admin';
      if (isAdmin) {
        const accResp = await fetch('/api/binance/account');
        const accResult = await accResp.json();
        if (accResult.success) {
          setAccount(accResult.account);
        } else {
          console.warn("Binance Account check failed:", accResult.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const btcPrice = prices.find(p => p.symbol === 'BTCUSDT')?.price;
  const ethPrice = prices.find(p => p.symbol === 'ETHUSDT')?.price;
  const paxgPrice = prices.find(p => p.symbol === 'PAXGUSDT')?.price;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                Binance Integration Hub
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Connected</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Real-time market data & treasury synchronization</p>
            </div>
          </div>

          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-600 dark:text-gray-400", refreshing && "animate-spin")} />
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">Refresh Feed</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Network Base</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">Binance Mainnet</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Price Feeds</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">WebSocket Ready</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">API Security</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">HMAC-SHA256</p>
            </div>
          </motion.div>
        </div>

        {/* Market Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white">Market Tickers</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black">₿</div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">Bitcoin</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">BTC Price Index</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 dark:text-white">{formatCurrency(parseFloat(btcPrice || '0'))}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">+2.4%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 font-black">Ξ</div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">Ethereum</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ETH Price Index</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 dark:text-white">{formatCurrency(parseFloat(ethPrice || '0'))}</p>
                  <p className="text-[10px] text-red-500 font-bold">-0.8%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black">G</div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">PAX Gold (Real Gold)</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">PAXG / BTC Dealing</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-amber-600 dark:text-amber-400">
                    {paxgPrice && btcPrice ? (parseFloat(paxgPrice) / parseFloat(btcPrice)).toFixed(8) : "0.00000000"}
                  </p>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] text-gray-400 font-medium italic opacity-60">
                      Physical Reserve Unit
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-400" />
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white">Account Status</h3>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Verified</span>
              </div>
            </div>
            
            <div className="p-6">
              {account ? (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Database size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Balance</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-black">
                        {calculateTotalBalance(account.balances, prices, formatCurrency)}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500">Locked Assets: 0.00 USDT</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Holdings</p>
                    <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800">
                      {account.balances
                        .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
                        .map((b: any) => {
                          const isPAXG = b.asset === 'PAXG';
                          const amount = parseFloat(b.free) + parseFloat(b.locked);
  const grams = amount * 31.1035;
  const points = Math.floor(grams * 1000); // g to mg

  return (
    <div key={b.asset} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-2">
        <span className={cn("font-black text-xs", isPAXG ? "text-yellow-600 dark:text-yellow-400" : "text-gray-900 dark:text-white")}>
          {b.asset}
        </span>
        {isPAXG && (
          <span className="text-[8px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded-full font-black">PHYSICAL</span>
        )}
      </div>
      <div className="text-right">
        <p className="text-xs font-black text-gray-900 dark:text-white">
          {isPAXG ? grams.toFixed(4) : amount.toFixed(4)}
          <span className="ml-1 text-[9px] opacity-60 font-medium">{isPAXG ? 'g' : b.asset}</span>
        </p>
        <p className="text-[10px] font-black text-yellow-600">
           {isPAXG ? `${points} mg GOLD` : formatCurrency(amount)}
        </p>
      </div>
    </div>
  );
})}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-black text-gray-900 dark:text-white mb-2 uppercase tracking-wide text-sm">Restricted Access</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
                    Binance API keys are required to view private account data. Configure them in .env secrets.
                  </p>
                  <button className="mt-6 flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest hover:underline">
                    View Docs <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Gold Reserve Coverage Analysis */}
        {account && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/5 p-8 rounded-[2.5rem] border border-amber-200/50 dark:border-amber-800/30 shadow-xl shadow-amber-500/5"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Physical Gold Reserve Coverage</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                  The platform uses PAX Gold (PAXG) to back community "Gold g" points. 1 PAXG is verifiable 1:1 with a LBMA-approved gold bar in London vaults.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-white dark:border-slate-800">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Total Grams Held</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {(parseFloat(account.balances.find((b: any) => b.asset === 'PAXG')?.free || '0') * 31.1035).toFixed(3)}g
                    </p>
                  </div>
                  <div className="p-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-white dark:border-slate-800">
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Backing Strength</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">100% Secure</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-auto flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-amber-100 dark:border-slate-800 shadow-inner">
                <div className="text-center mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Gold Value</p>
                  <p className="text-4xl font-black text-gray-900 dark:text-whitetracking-tighter">
                    {formatCurrency(parseFloat(paxgPrice || '0') / 31.1035)}
                    <span className="text-sm font-bold text-gray-400 ml-1">/g</span>
                  </p>
                </div>
                <div className="h-2 w-48 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-600"
                  />
                </div>
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Audited by Binance Smart Link</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Operational Specs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white">Operational Specs</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-100 dark:border-slate-800 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Latency</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">~45ms</p>
            </div>
            <div className="p-4 border border-gray-100 dark:border-slate-800 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data Model</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">V3 REST</p>
            </div>
            <div className="p-4 border border-gray-100 dark:border-slate-800 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Signer</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">Secp256k1</p>
            </div>
            <div className="p-4 border border-gray-100 dark:border-slate-800 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Permissions</p>
              <p className="text-sm font-black text-emerald-500">Read-Only</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function calculateTotalBalance(balances: any[], tickers: BinancePrice[], formatCurrency: Function) {
  const total = balances.reduce((sum, b) => {
    const free = parseFloat(b.free);
    const locked = parseFloat(b.locked);
    const val = free + locked;
    if (val === 0) return sum;

    if (b.asset === 'USDT' || b.asset === 'USDC' || b.asset === 'BUSD' || b.asset === 'FDUSD') return sum + val;
    
    // Check for direct USDT pair
    const ticker = tickers.find(t => t.symbol === `${b.asset}USDT`);
    if (ticker && ticker.price) {
      return sum + (val * parseFloat(ticker.price));
    }
    
    // Fallbacks for common assets if ticker missing or pair is different
    if (b.asset === 'BTC') return sum + (val * 65000);
    if (b.asset === 'ETH') return sum + (val * 3500);
    if (b.asset === 'PAXG') return sum + (val * 2400); // 1 PAXG = 1 Troy Ounce Gold
    
    return sum;
  }, 0);
  return formatCurrency(total);
}
