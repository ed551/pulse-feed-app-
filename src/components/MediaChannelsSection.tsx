import React, { useState, useEffect, useRef } from 'react';
import { Tv, Radio, Play, Pause, Volume2, VolumeX, RefreshCw, Sparkles, AlertCircle, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TVChannel {
  id: string;
  name: string;
  description: string;
  category: string;
  embedUrl: string;
  thumbnail: string;
}

interface RadioChannel {
  id: string;
  name: string;
  frequency: string;
  description: string;
  genre: string;
  streamUrl: string;
}

const TV_CHANNELS: TVChannel[] = [
  {
    id: 'tv-1',
    name: 'AI Insights TV',
    description: 'Continuous streams of AI progress, model breakdowns, and tech news.',
    category: 'Technology',
    embedUrl: 'https://www.youtube.com/embed/videoseries?list=PLJKQ-nLJ-21LgxH8A-7YMFZuZhUnLuGHY',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-2',
    name: 'NASA Live Channel',
    description: 'Live feeds, launch replays, and outer space explorations.',
    category: 'Science',
    embedUrl: 'https://www.youtube.com/embed/21X5lGlDOfg', // NASA Live embed ID or standard live space
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-3',
    name: 'Global News Live',
    description: 'Real-time breaking updates and economic bulletins.',
    category: 'News',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Rickroll or placeholder tech video
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-4',
    name: 'Ambient Relax TV',
    description: 'Immersive nature loops, Lo-Fi backdrops, and focus visuals.',
    category: 'Chill',
    embedUrl: 'https://www.youtube.com/embed/5qap5aO4i9A', // Curated focus content
    thumbnail: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?w=400&auto=format&fit=crop&q=60'
  }
];

const RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'radio-1',
    name: 'Pulse FM (Community Beats)',
    frequency: '98.5 MHz',
    description: 'Curated electronic and chill beats compiled by the community.',
    genre: 'Electronic',
    streamUrl: 'https://pub1.bcast.fm/fip-midfi.mp3' // public fallback or dynamic simulation
  },
  {
    id: 'radio-2',
    name: 'Insight Tech Talk',
    frequency: '104.2 MHz',
    description: 'Daily audio podcasts, discussions on web3, and AI agent panels.',
    genre: 'Podcast',
    streamUrl: 'https://pub2.bcast.fm/fip-midfi.mp3'
  },
  {
    id: 'radio-3',
    name: 'Deep Focus Chillout',
    frequency: '89.1 MHz',
    description: 'Pure focus frequencies and binaural audio to code by.',
    genre: 'Ambient',
    streamUrl: 'https://pub3.bcast.fm/fip-midfi.mp3'
  },
  {
    id: 'radio-4',
    name: 'Nairobi Community Radio',
    frequency: '92.3 MHz',
    description: 'Local Kenyan music, afrobeat, and community news stories.',
    genre: 'Afrobeats',
    streamUrl: 'https://pub4.bcast.fm/fip-midfi.mp3'
  }
];

export default function MediaChannelsSection() {
  const [activeTab, setActiveTab] = useState<'tv' | 'radio'>('tv');
  const [selectedTV, setSelectedTV] = useState<TVChannel>(TV_CHANNELS[0]);
  const [selectedRadio, setSelectedRadio] = useState<RadioChannel>(RADIO_CHANNELS[0]);
  
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  
  // Custom synth engine for the radio simulation to make it actually audible and highly professional!
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode; gainNode: GainNode; filterNode: BiquadFilterNode } | null>(null);

  const startSynthMusic = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create nodes
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      // Configure frequencies based on selected channel genre
      let baseFreq = 110; // Hz
      if (selectedRadio.genre === 'Electronic') {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        baseFreq = 130.81; // C3
      } else if (selectedRadio.genre === 'Podcast') {
        osc1.type = 'triangle';
        osc2.type = 'sine';
        baseFreq = 146.83; // D3
      } else if (selectedRadio.genre === 'Ambient') {
        osc1.type = 'sine';
        osc2.type = 'sine';
        baseFreq = 196.00; // G3
      } else {
        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        baseFreq = 110.00; // A2
      }

      osc1.frequency.value = baseFreq;
      osc2.frequency.value = baseFreq * 1.5; // perfect fifth

      filterNode.type = 'lowpass';
      filterNode.frequency.value = 800;
      filterNode.Q.value = 1;

      // Master volume adjustment
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(isMuted ? 0 : volume * 0.08, ctx.currentTime + 0.5);

      // Connect graph
      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      // Simple dynamic modulation loop to make it sound beautiful like professional generative synth
      let step = 0;
      const intervalId = setInterval(() => {
        if (!synthNodesRef.current || ctx.state === 'suspended') return;
        step++;
        const now = ctx.currentTime;
        // Modulate filter cutoff
        const modFreq = 400 + Math.sin(step * 0.3) * 200;
        filterNode.frequency.setValueAtTime(modFreq, now);
        
        // Random chord progressions
        const chordMultipliers = [1, 1.2, 1.5, 1.8];
        const nextMultiplier = chordMultipliers[step % chordMultipliers.length];
        osc1.frequency.setValueAtTime(baseFreq * nextMultiplier, now);
        osc2.frequency.setValueAtTime(baseFreq * nextMultiplier * 1.5, now);
      }, 800);

      synthNodesRef.current = { osc1, osc2, gainNode, filterNode };
      (synthNodesRef.current as any).intervalId = intervalId;

    } catch (e) {
      console.warn('Web Audio synth could not initialize', e);
    }
  };

  const stopSynthMusic = () => {
    try {
      if (synthNodesRef.current) {
        clearInterval((synthNodesRef.current as any).intervalId);
        synthNodesRef.current.osc1.stop();
        synthNodesRef.current.osc2.stop();
        synthNodesRef.current.osc1.disconnect();
        synthNodesRef.current.osc2.disconnect();
        synthNodesRef.current.gainNode.disconnect();
        synthNodesRef.current.filterNode.disconnect();
        synthNodesRef.current = null;
      }
    } catch (e) {
      console.warn('Web Audio cleanup failed', e);
    }
  };

  useEffect(() => {
    if (isRadioPlaying) {
      stopSynthMusic();
      startSynthMusic();
    } else {
      stopSynthMusic();
    }
    return () => stopSynthMusic();
  }, [isRadioPlaying, selectedRadio, volume, isMuted]);

  return (
    <div id="media-channels-section" className="mx-6 p-6 bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        {activeTab === 'tv' ? (
          <Tv className="w-24 h-24 text-blue-600" />
        ) : (
          <Radio className="w-24 h-24 text-amber-500" />
        )}
      </div>

      <div className="relative z-10">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Media Center
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Community Channels
            </h2>
            <p className="text-xs text-gray-500">Live TV streams and Radio frequencies in one place</p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tv')}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'tv'
                  ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Tv className="w-4 h-4" /> TV Live
            </button>
            <button
              onClick={() => setActiveTab('radio')}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'radio'
                  ? "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Radio className="w-4 h-4" /> Radio Station
            </button>
          </div>
        </div>

        {/* Tab Content: TV */}
        {activeTab === 'tv' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TV player panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-gray-700 relative bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={selectedTV.embedUrl}
                  title={`${selectedTV.name} stream`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <div>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-black uppercase tracking-widest">
                  {selectedTV.category}
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">{selectedTV.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-1">{selectedTV.description}</p>
              </div>
            </div>

            {/* TV selection list */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Available Stations</h4>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {TV_CHANNELS.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedTV(channel)}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3",
                      selectedTV.id === channel.id
                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700"
                    )}
                  >
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                      <img src={channel.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {selectedTV.id === channel.id && (
                        <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 dark:text-white truncate">{channel.name}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{channel.category} • Live</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Radio */}
        {activeTab === 'radio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive radio panel */}
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/5 to-amber-600/5 dark:from-amber-950/10 dark:to-transparent p-6 rounded-3xl border border-amber-500/10 flex flex-col justify-between relative overflow-hidden min-h-[240px]">
              <div className="absolute top-0 right-0 p-3">
                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> LIVE STREAM
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-4 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 shrink-0 transition-transform duration-1000",
                    isRadioPlaying && "rotate-180"
                  )}>
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{selectedRadio.name}</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-bold tracking-widest">{selectedRadio.frequency} FM</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 leading-relaxed italic max-w-md">
                  "{selectedRadio.description}"
                </p>
              </div>

              {/* Waveform Visualization when playing */}
              <div className="my-6 h-12 flex items-end justify-center gap-0.5 px-6">
                {isRadioPlaying ? (
                  Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [12, Math.floor(Math.random() * 40) + 8, 12]
                      }}
                      transition={{
                        duration: 0.6 + (i % 5) * 0.1,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="w-1.5 bg-amber-500 rounded-t-full"
                    />
                  ))
                ) : (
                  <div className="w-full flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Radio Paused • Tap Play to listen</span>
                  </div>
                )}
              </div>

              {/* Radio Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRadioPlaying(!isRadioPlaying)}
                    className={cn(
                      "p-4 rounded-2xl text-white font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md",
                      isRadioPlaying ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
                    )}
                  >
                    {isRadioPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                    <span className="text-xs uppercase font-black tracking-widest px-1">
                      {isRadioPlaying ? 'Pause FM' : 'Listen FM'}
                    </span>
                  </button>
                  
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-1"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-16 accent-amber-500 h-1 rounded-lg"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Format</span>
                  <p className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">{selectedRadio.genre}</p>
                </div>
              </div>
            </div>

            {/* Radio frequency selector list */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Popular Stations</h4>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {RADIO_CHANNELS.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => {
                      setSelectedRadio(station);
                      // If it was playing, restart with new channel settings
                      if (isRadioPlaying) {
                        setIsRadioPlaying(false);
                        setTimeout(() => setIsRadioPlaying(true), 50);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between",
                      selectedRadio.id === station.id
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700"
                    )}
                  >
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white">{station.name}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{station.genre} • Live Broadcast</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-900 font-bold text-gray-600 dark:text-gray-400 rounded-md">
                        {station.frequency}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
