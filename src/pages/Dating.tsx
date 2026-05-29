import React, { useState, useEffect } from 'react';
import { 
  Heart, Users, Star, MessageSquare, Shield, Info, Sparkles, Filter, 
  Search, MapPin, Camera, Check, X, Loader2, Award, Zap, Brain,
  HeartPulse, User, Smartphone, Globe, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, where, limit } from 'firebase/firestore';
import { useTranslation } from '../lib/i18n';

interface DatingProfile {
  id: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  age?: number;
  location?: string;
  interests?: string[];
  gender?: string;
  lookingFor?: string;
  isOnline?: boolean;
  membershipLevel?: string;
}

export default function Dating() {
  const { currentUser, userData } = useAuth();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'profile'>('discover');
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'premium' | 'nearby'>('all');

  useEffect(() => {
    if (!db) return;
    setLoading(true);
    // In a real app, we would query the 'users' collection where isDatingActive is true
    const q = query(
      collection(db, 'users'),
      where('isDatingActive', '==', true),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DatingProfile[];
      setProfiles(docs.filter(p => p.id !== currentUser?.uid));
      setLoading(false);
    }, (err) => {
      console.error("Dating Hub Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const toggleDating = async () => {
    if (!currentUser || !db) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isDatingActive: !userData?.isDatingActive
      });
    } catch (err) {
      console.error("Toggle Dating Failed:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 p-8 rounded-[2.5rem] text-white mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl -ml-16 -mb-16" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/30">
                <Heart className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">Dating Hub</h1>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Connect & Discover</p>
              </div>
            </div>
            
            <button
              onClick={toggleDating}
              className={cn(
                "px-6 py-2 rounded-full font-black text-xs transition-all flex items-center gap-2",
                userData?.isDatingActive 
                  ? "bg-emerald-500 text-white" 
                  : "bg-white/20 backdrop-blur-md text-white border border-white/30"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", userData?.isDatingActive ? "bg-white animate-pulse" : "bg-white/50")} />
              {userData?.isDatingActive ? t('dating_hub_active') : 'Join Dating Hub'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Connections', value: '1,240', icon: Users },
              { label: 'Daily Matches', value: '85', icon: Sparkles },
              { label: 'Points Shared', value: '45K', icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <stat.icon className="w-4 h-4 text-pink-300 mb-1" />
                <p className="text-lg font-black leading-none">{stat.value}</p>
                <p className="text-[10px] font-bold opacity-60 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl w-max mx-auto shadow-inner">
        {[
          { id: 'discover', label: 'Discover', icon: Globe },
          { id: 'matches', label: 'Matches', icon: Heart },
          { id: 'profile', label: 'My Stats', icon: User }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all",
              activeTab === tab.id 
                ? "bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm" 
                : "text-gray-500 hover:text-pink-500"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {!userData?.isDatingActive ? (
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-12 text-center border border-gray-100 dark:border-gray-800 shadow-xl max-w-lg mx-auto">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-pink-600" />
          </div>
          <h2 className="text-2xl font-black mb-4">Dating Hub is Private</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Your profile is currently hidden from the dating community. Join to start discovering matches and earning points through social interaction.
          </p>
          <button
            onClick={toggleDating}
            className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white font-black rounded-2xl shadow-lg shadow-pink-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Heart className="w-5 h-5" />
            Activate My Dating Profile
          </button>
          <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Anonymous</span>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Finding Soulmates...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-20 px-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-bold">No active profiles found in your area. Be the first to start a conversation!</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4"
            >
              {profiles.map((profile) => (
                <motion.div
                  key={profile.id}
                  whileHover={{ y: -8 }}
                  className="bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl group"
                >
                  <div className="aspect-[4/5] relative">
                    {profile.photoURL ? (
                      <img 
                        src={profile.photoURL} 
                        alt={profile.displayName} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                      </div>
                    )}
                    
                    {/* Floating Overlays */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20">
                        <div className={cn("w-1.5 h-1.5 rounded-full", profile.isOnline ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-gray-400")} />
                        {profile.isOnline ? 'Online' : 'Away'}
                      </div>
                      {profile.membershipLevel === 'gold' && (
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                          <Star className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <h3 className="text-xl font-black text-white leading-tight">
                        {profile.displayName}{profile.age ? `, ${profile.age}` : ''}
                      </h3>
                      <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold mt-1 uppercase tracking-tighter">
                        <MapPin className="w-3 h-3" />
                        {profile.location || 'Near Earth'}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 font-bold leading-relaxed">
                      {profile.bio || 'This user is mysterious. Start a chat to learn more.'}
                    </p>

                    <div className="flex items-center gap-3">
                      <button className="flex-1 py-3 bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl font-black text-xs hover:bg-pink-200 dark:hover:bg-pink-900/40 transition-colors flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        SAY HELLO
                      </button>
                      <button className="w-12 h-12 bg-pink-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-pink-700 transition-colors">
                        <Heart className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
