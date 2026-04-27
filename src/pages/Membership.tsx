import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Crown, Zap, Check, Star, Award, DollarSign, 
  Sparkles, TrendingUp, ArrowRight, ShieldCheck, Gem,
  ZapOff, Lock, Unlock, BadgeCheck, Beaker, Heart, Users, Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const TIERS = [
  {
    id: 'bronze',
    name: 'Bronze',
    subtitle: 'Community Core',
    price: 0,
    icon: Shield,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/10',
    borderColor: 'border-orange-100 dark:border-orange-900/20',
    btnBg: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white',
    features: [
      '20% Revenue Share',
      'Community Discussions',
      'Standard AI Assistant',
      'Daily Task Rewards',
      'Basic Education Access'
    ],
    highlight: false,
    benefit: 'Perfect for getting started and earning from the community.'
  },
  {
    id: 'silver',
    name: 'Silver',
    subtitle: 'Growth Plus',
    price: 9.99,
    icon: Star,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    borderColor: 'border-blue-100 dark:border-blue-900/20',
    btnBg: 'bg-blue-600 text-white',
    features: [
      '50% Revenue Share',
      'Priority AI Assistant',
      'Silver Verified Badge',
      'Exclusive Topic Groups',
      'Early Feature Access',
      'Ad-Free Experience'
    ],
    highlight: true,
    benefit: 'The best balance for active earners and power users.'
  },
  {
    id: 'gold',
    name: 'Gold',
    subtitle: 'Elite Pioneer',
    price: 29.99,
    icon: Crown,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    borderColor: 'border-yellow-100 dark:border-yellow-900/20',
    btnBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white',
    features: [
      '80% Revenue Share (Max)',
      'Ultra AI Engineering Lab',
      'Verified Gold Crown',
      'Unlimited AI Tutor Support',
      'Direct Creator Access',
      'Custom Profile Themes',
      'Monthly Bonus Drops'
    ],
    highlight: false,
    benefit: 'Maximize your potential and revenue with total access.'
  }
];

export default function Membership() {
  const { currentUser, userData } = useAuth();
  const isDeveloper = currentUser?.email === 'edwinmuoha@gmail.com';
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const currentTier = userData?.membershipLevel || 'bronze';

  const handleUpgrade = async (tierId: string) => {
    if (tierId === currentTier) return;
    
    setLoadingTier(tierId);
    try {
      // In a real app, this would trigger a payment gateway
      // Since we center on "making money", let's simulate a checkout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          membershipLevel: tierId,
          membershipStatus: 'active',
          updatedAt: new Date()
        });
      }
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Upgrade Successful!", 
          body: `Welcome to the ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} tier!` 
        } 
      }));
    } catch (err) {
      console.error("Upgrade failed:", err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest"
        >
          <Sparkles className="w-3 h-3" /> Membership Tiers
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
          Unlock Your Future <br className="hidden sm:block" /> with Pulse Elite
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Choose a plan that fits your ambition. From community basics to elite AI integration, 
          every tier is designed to grow your influence and revenue.
        </p>
      </div>

      {/* Fairness & Transparency Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-8 shadow-inner">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-xs uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> The Pulse Promise
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Fairness Across All Tiers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            We believe in distributed growth. Even as a Bronze member, you get full access to community events, 
            basic earning protocols, and standard AI support. We never gate basic human connection or learning. 
            Upgrading is simply about accelerating your revenue share and supercharging your AI toolkit.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <DollarSign className="w-6 h-6 text-indigo-500 mb-2" />
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Base Share</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">20%</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
            <Users className="w-6 h-6 text-indigo-500 mb-2" />
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Access</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">100%</div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TIERS.map((tier, idx) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "relative p-8 rounded-[3rem] border-2 transition-all flex flex-col",
              tier.highlight 
                ? "border-blue-500 shadow-2xl scale-105 z-10 bg-white dark:bg-gray-800" 
                : "border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-700"
            )}
          >
            {tier.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                Most Popular
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className={cn("p-4 rounded-2xl", tier.bg)}>
                <tier.icon className={cn("w-8 h-8", tier.color)} />
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{tier.subtitle}</div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-0">{tier.name}</h3>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                ${tier.price === 0 ? '0' : Math.floor(tier.price)}
              </span>
              <span className="text-xl font-bold text-gray-400">
                .{tier.price === 0 ? '00' : tier.price.toString().split('.')[1] || '00'}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">/ Month</span>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors", tier.color, "bg-gray-50 dark:bg-gray-900 group-hover:bg-white")}>
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 font-medium italic mb-6 text-center leading-relaxed">
              "{tier.benefit}"
            </p>

            <button
              onClick={() => handleUpgrade(tier.id)}
              disabled={loadingTier !== null || currentTier === tier.id}
              className={cn(
                "w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100",
                tier.btnBg
              )}
            >
              {loadingTier === tier.id ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : currentTier === tier.id ? (
                <>Current Plan <BadgeCheck className="w-4 h-4" /></>
              ) : (
                <>Upgrade Now <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Comparison Table Small */}
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Gem className="w-5 h-5 text-indigo-500" /> Value Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Revenue Share</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Bronze</span>
                <span className="text-sm font-black dark:text-white">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Silver</span>
                <span className="text-sm font-black dark:text-white">50%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Gold</span>
                <span className="text-sm font-black dark:text-white">80%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">AI Precision</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Bronze</span>
                <span className="text-[10px] font-black bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded uppercase tracking-tighter">Standard</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Silver</span>
                <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded uppercase tracking-tighter">Priority</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Gold</span>
                <span className="text-[10px] font-black bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 px-2 py-0.5 rounded uppercase tracking-tighter">Quantum</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Security & Identity</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Bronze</span>
                <span className="text-[10px] font-black dark:text-white">Basic</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Silver</span>
                <span className="text-[10px] font-black dark:text-white">Fingerprint Engr.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Gold</span>
                <span className="text-[10px] font-black dark:text-white">Elite Protocol</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-20">
        {[
          { label: 'Secure Payments', icon: Shield },
          { label: 'Cancel Anytime', icon: Clock },
          { label: 'No Extra Fees', icon: DollarSign },
          { label: 'Privacy First', icon: Zap }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
            <item.icon className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
