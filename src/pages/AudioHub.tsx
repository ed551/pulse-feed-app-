import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  User, 
  UserCheck, 
  Settings2, 
  Radio, 
  Bell, 
  TrendingUp, 
  ShieldCheck, 
  Coins, 
  Activity,
  ChevronRight,
  Headphones
} from 'lucide-react';
import { speak, stopSpeech, getBestVoice } from '../lib/speech';
import { useNotifications } from '../hooks/useNotifications';
import { useRevenue } from '../contexts/RevenueContext';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AudioHub() {
  const { showNotification } = useNotifications();
  const { totalEarnedToday } = useRevenue();
  const [isNarrationActive, setIsNarrationActive] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [speed, setSpeed] = useState(1.1);
  const [briefingText, setBriefingText] = useState("");
  const [activeSegment, setActiveSegment] = useState<'intro' | 'finance' | 'alerts' | 'community' | null>(null);

  useEffect(() => {
    // Generate the platform briefing text
    const generateBriefing = async () => {
      try {
        const statsSnap = await getDoc(doc(db, "platform", "stats"));
        const data = statsSnap.data();
        
        const parts = [
          "Welcome to the Pulse Feeds Audio Hub. This is your hands-free portal to the community.",
          `Financial Update: The platform treasury is healthy with ${data?.platformRevenue?.toLocaleString() || 'active'} dollars in gross revenue.`,
          `Activity Status: You have earned ${totalEarnedToday} points today.`,
          "Community Status: Engagement is high. New educational modules have been posted to the hub.",
          "System is now monitoring your active time for reward allocation. Relax and stay connected."
        ];
        setBriefingText(parts.join(' '));
      } catch (err) {
        setBriefingText("Welcome to Pulse Audio. Connection established. Stay tuned for platform updates.");
      }
    };
    generateBriefing();
  }, [totalEarnedToday]);

  const toggleNarration = () => {
    if (isNarrationActive) {
      stopSpeech();
      setIsNarrationActive(false);
      setActiveSegment(null);
    } else {
      setIsNarrationActive(true);
      speak(briefingText, { 
        rate: speed, 
        gender: voiceGender,
        onEnd: () => setIsNarrationActive(false)
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 text-white shadow-2xl mb-8">
        <div className="absolute top-0 right-0 -m-4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <Headphones className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">Audio Hub</h1>
              <p className="text-indigo-100 font-medium text-sm">Hands-free accessibility & Earning</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-8">
            <button 
              onClick={toggleNarration}
              className={cn(
                "px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 transition-all active:scale-95 shadow-xl",
                isNarrationActive 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-white text-indigo-600 hover:bg-indigo-50"
              )}
            >
              {isNarrationActive ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5" />}
              {isNarrationActive ? "Stop Briefing" : "Start Full Narration"}
            </button>

            <div className="flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20">
              <button 
                onClick={() => setVoiceGender('female')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2",
                  voiceGender === 'female' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/5"
                )}
              >
                <User className="w-3 h-3" /> Female
              </button>
              <button 
                onClick={() => setVoiceGender('male')}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2",
                  voiceGender === 'male' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/5"
                )}
              >
                <UserCheck className="w-3 h-3" /> Male
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Playback Controls */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-400 mb-6">
              <Settings2 className="w-4 h-4" /> Narration Dynamics
            </h3>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-4">
                  <span className="text-xs font-black uppercase text-gray-500">Learning Speed</span>
                  <span className="text-xs font-black text-indigo-600">{speed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.5" 
                  step="0.1" 
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between mt-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Relaxed</span>
                  <span>Normal</span>
                  <span>Hyper-Speed</span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                    <Radio className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-600 uppercase">Live Earning Protocol</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Staying tuned to the Audio Hub allocates active usage points (AUP) automatically. Your connection is encrypted and verified.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AudioSegmentCard 
              icon={<Coins className="w-4 h-4" />}
              title="Financial Summary"
              desc="Current balances & revenue flow"
              active={isNarrationActive}
            />
            <AudioSegmentCard 
              icon={<Bell className="w-4 h-4" />}
              title="Recent Alerts"
              desc="System and community notifications"
              active={isNarrationActive}
            />
            <AudioSegmentCard 
              icon={<TrendingUp className="w-4 h-4" />}
              title="Market Pulse"
              desc="Engagement metrics & viral tags"
              active={isNarrationActive}
            />
            <AudioSegmentCard 
              icon={<ShieldCheck className="w-4 h-4" />}
              title="Wellness Check"
              desc="Daily health and scan records"
              active={isNarrationActive}
            />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Voice Engine</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
              We use a "High-Water Mark" neural synthesis engine. It prioritizes high-fidelity platform voices to ensure clarity and emotional range during long narrations.
            </p>
            <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-black uppercase text-gray-400">Engine Stats</span>
              <span className="text-[10px] font-black text-green-500 uppercase">Optimized</span>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white">
            <Activity className="w-6 h-6 mb-4 text-white/50" />
            <h4 className="text-lg font-black tracking-tight mb-2">Hands-Free Point Farming</h4>
            <p className="text-[10px] text-white/80 uppercase font-black tracking-widest leading-loose">
              Users with visual impairments or those who prefer audio-only modes can earn 100% of rewards by enabling "Continuous Stream Verification".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioSegmentCard({ icon, title, desc, active }: { icon: React.ReactNode, title: string, desc: string, active: boolean }) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all duration-300",
      active ? "bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/5" : "bg-white/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", active ? "bg-indigo-100 dark:bg-indigo-800 text-indigo-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400")}>
          {icon}
        </div>
        <h4 className="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h4>
      </div>
      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
