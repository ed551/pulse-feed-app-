import React, { useState, useEffect, useRef } from 'react';
import { Youtube, RefreshCw, Play, Pause, Loader2, Radio, Volume2, VolumeX, AlertCircle, Sparkles, Tv, Search, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import NewsFeed from './NewsFeed';

interface MediaItem {
  id: string;
  title: string;
  category: 'Spotlight' | 'Live TV';
  type: 'video' | 'playlist' | 'live';
  url: string;
  description: string;
  thumbnail?: string;
}

const MEDIA_ITEMS: MediaItem[] = [
  // Curated spotlights
  { id: 'spot-1', title: 'Community Feed', category: 'Spotlight', type: 'playlist', url: 'https://www.youtube.com/embed/videoseries?list=PLJKQ-nLJ-21LgxH8A-7YMFZuZhUnLuGHY', description: 'Curated community playlist updates and event recordings.' },
  { id: 'spot-2', title: 'Beautiful Wonders', category: 'Spotlight', type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', description: 'Cinematic visual experience of nature and wonders.' },
  { id: 'spot-3', title: 'Global Tech Insights', category: 'Spotlight', type: 'video', url: 'https://www.youtube.com/embed/qgehB8b_K1U', description: 'Latest breakthroughs in technology, AI and science.' },
  { id: 'spot-4', title: 'Master Classes', category: 'Spotlight', type: 'playlist', url: 'https://www.youtube.com/embed/videoseries?list=PL4cUxeGkcC9jx2-BHq9u6rax7X6KdfTuR', description: 'Educational deep-dives and development bootcamps.' },
  { id: 'spot-5', title: 'Community Spotlight', category: 'Spotlight', type: 'video', url: 'https://www.youtube.com/embed/5qap5aO4i9A', description: 'Featured creator highlights from our digital cooperations.' },

  // Live TV Channels (everything the 2nd screen had!)
  {
    id: 'tv-1',
    title: 'KBC TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC5l4yN126m5t8_t37Q_r-qA',
    description: 'Kenya Broadcasting Corporation - News and national content.',
    thumbnail: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-2',
    title: 'KTN TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC4w92T8t5Kz4v8825s34t-A',
    description: 'Kenya Television Network - News and entertainment.',
    thumbnail: 'https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-3',
    title: 'CITIZEN TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UCtJ-gJ71rE53q2iT-M-7V-A',
    description: 'Citizen TV Kenya - Breaking news and high quality productions.',
    thumbnail: 'https://images.unsplash.com/photo-1557200134-903274290370?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-4',
    title: 'K24 TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UCeZ1zQ7B05C725-5M9j2KjQ',
    description: 'K24 - Kenya\'s innovative news and entertainment.',
    thumbnail: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-5',
    title: 'INOORO TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC6k78vQ9018428574109721',
    description: 'Inooro TV - Vernacular news and culture.',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-6',
    title: 'KAMEME TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC6k78vQ9018428574109722',
    description: 'Kameme TV - Vernacular news and culture.',
    thumbnail: 'https://images.unsplash.com/photo-1581481615162-81734913f019?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-7',
    title: 'RAMOGI TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC6k78vQ9018428574109723',
    description: 'Ramogi TV - Vernacular news and culture.',
    thumbnail: 'https://images.unsplash.com/photo-1616469829999-c52251ea79a2?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-8',
    title: 'MERU TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC6k78vQ9018428574109724',
    description: 'Meru TV - Vernacular news and culture.',
    thumbnail: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400&auto=format&fit=crop&q=60'
  },
  {
    id: 'tv-9',
    title: 'SUPER SPORTS TV Live',
    category: 'Live TV',
    type: 'live',
    url: 'https://www.youtube.com/embed/live_stream?channel=UC6k78vQ9018428574109725',
    description: 'Super Sports - Live sports and events.',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&auto=format&fit=crop&q=60'
  }
];

interface RadioChannel {
  id: string;
  name: string;
  frequency: string;
  description: string;
  genre: string;
  streamUrl: string;
}

const RADIO_CHANNELS: RadioChannel[] = [
  {
    id: 'radio-1',
    name: 'Citizen Radio',
    frequency: '92.3 MHz',
    description: 'News, discussion and cultural entertainment from Kenya.',
    genre: 'News & Talk',
    streamUrl: 'https://live.radio.citizen.co.ke'
  },
  {
    id: 'radio-2',
    name: 'Capital FM',
    frequency: '98.4 MHz',
    description: 'Kenyan premium hit music station and breaking news.',
    genre: 'Urban Hits',
    streamUrl: 'https://live.radio.capitalfm.co.ke'
  },
  {
    id: 'radio-3',
    name: 'BBC World Service',
    frequency: '93.7 MHz',
    description: 'International news, global stories, and comprehensive analysis.',
    genre: 'Global News',
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service'
  },
  {
    id: 'radio-4',
    name: 'Kiss FM',
    frequency: '100.3 MHz',
    description: 'Kenya\'s ultimate destination for contemporary hit music and celebrity news.',
    genre: 'Hits',
    streamUrl: 'https://live.radio.kissfm.co.ke'
  },
  {
    id: 'radio-5',
    name: 'Radio Jambo',
    frequency: '97.5 MHz',
    description: 'The leading Swahili sports, talk and relationships radio station in Kenya.',
    genre: 'Swahili Talk & Sports',
    streamUrl: 'https://live.radio.jambo.co.ke'
  },
  {
    id: 'radio-6',
    name: 'Kameme FM',
    frequency: '101.1 MHz',
    description: 'Traditional vernacular hits, news, and heritage talk from central region.',
    genre: 'Vernacular Talk',
    streamUrl: 'https://live.radio.kameme.co.ke'
  },
  {
    id: 'radio-7',
    name: 'Classic 105',
    frequency: '105.2 MHz',
    description: 'The home of soul-stirring classic oldies, morning breakfast banter and soulful hits.',
    genre: 'Classic Soul & RnB',
    streamUrl: 'https://live.radio.classic105.co.ke'
  },
  {
    id: 'radio-8',
    name: 'Voice of America',
    frequency: '90.2 MHz',
    description: 'Comprehensive global news and reports from around the world.',
    genre: 'International News',
    streamUrl: 'https://stream.live.vc.voamedia.co.uk/voa_world_service'
  },
  {
    id: 'radio-9',
    name: 'NPR News',
    frequency: '88.5 MHz',
    description: 'In-depth American public radio talk, arts, stories, and global news.',
    genre: 'Public Radio & Talk',
    streamUrl: 'https://stream.live.vc.nprmedia.co.uk/npr_news'
  },
  {
    id: 'radio-10',
    name: 'Al Jazeera Audio',
    frequency: '95.1 MHz',
    description: 'Live broadcast audio of Al Jazeera global news network.',
    genre: 'Middle-East & Global News',
    streamUrl: 'https://stream.live.vc.aljazeera.co.uk/aj_english'
  }
];

export default function YouTubeSection() {
  const [activeTab, setActiveTab] = useState<'youtube' | 'radio' | 'news'>('youtube');
  
  // Unified Media states
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(MEDIA_ITEMS[0]);
  const [isReshuffling, setIsReshuffling] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");

  // Radio states
  const [selectedRadio, setSelectedRadio] = useState<RadioChannel>(RADIO_CHANNELS[0]);
  const [isRadioPlaying, setIsRadioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  // Audio Synth Ref for real-world audio synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode; gainNode: GainNode; filterNode: BiquadFilterNode } | null>(null);

  const handleReshuffle = () => {
    setIsReshuffling(true);
    setTimeout(() => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * MEDIA_ITEMS.length);
      } while (MEDIA_ITEMS[nextIndex].id === selectedMedia.id && MEDIA_ITEMS.length > 1);
      
      setSelectedMedia(MEDIA_ITEMS[nextIndex]);
      setIsReshuffling(false);
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Player Reshuffled", 
          body: `Now playing: ${MEDIA_ITEMS[nextIndex].title}` 
        } 
      }));
    }, 600);
  };

  const startSynthMusic = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      let baseFreq = 110; 
      if (selectedRadio.genre.includes('Hits') || selectedRadio.genre.includes('Urban')) {
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        baseFreq = 130.81; 
      } else if (selectedRadio.genre.includes('News') || selectedRadio.genre.includes('Talk')) {
        osc1.type = 'triangle';
        osc2.type = 'sine';
        baseFreq = 146.83; 
      } else if (selectedRadio.genre.includes('Soul') || selectedRadio.genre.includes('Classic')) {
        osc1.type = 'sine';
        osc2.type = 'sine';
        baseFreq = 196.00; 
      } else {
        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        baseFreq = 110.00; 
      }

      osc1.frequency.value = baseFreq;
      osc2.frequency.value = baseFreq * 1.5; 

      filterNode.type = 'lowpass';
      filterNode.frequency.value = 800;
      filterNode.Q.value = 1;

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(isMuted ? 0 : volume * 0.08, ctx.currentTime + 0.5);

      osc1.connect(filterNode);
      osc2.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      let step = 0;
      const intervalId = setInterval(() => {
        if (!synthNodesRef.current || ctx.state === 'suspended') return;
        step++;
        const now = ctx.currentTime;
        const modFreq = 400 + Math.sin(step * 0.3) * 200;
        filterNode.frequency.setValueAtTime(modFreq, now);
        
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
    if (activeTab === 'radio' && isRadioPlaying) {
      stopSynthMusic();
      startSynthMusic();
    } else {
      stopSynthMusic();
    }
    return () => stopSynthMusic();
  }, [activeTab, isRadioPlaying, selectedRadio, volume, isMuted]);

  useEffect(() => {
    return () => stopSynthMusic();
  }, []);

  const filteredMediaItems = MEDIA_ITEMS.filter(item => 
    item.title.toLowerCase().includes(mediaSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(mediaSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  const spotlights = filteredMediaItems.filter(item => item.category === 'Spotlight');
  const tvStations = filteredMediaItems.filter(item => item.category === 'Live TV');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        {activeTab === 'youtube' && <Youtube className="w-24 h-24 text-red-600" />}
        {activeTab === 'radio' && <Radio className="w-24 h-24 text-amber-500" />}
      </div>

      <div className="relative z-10">
        {/* Navigation & Section Title */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Media Hub Center
            </span>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {activeTab === 'youtube' && "Spotlight & TV Broadcasts"}
              {activeTab === 'radio' && "FM Radio Station"}
            </h2>
            <p className="text-xs text-gray-500">
              {activeTab === 'youtube' && "Curated spotlight videos, playlists and Live TV stations combined."}
              {activeTab === 'radio' && "Dynamic simulated synthesizer and live stations"}
            </p>
          </div>

          {/* Combined Navigation Tabs */}
          <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('youtube')}
              className={cn(
                "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                activeTab === 'youtube'
                  ? "bg-white dark:bg-gray-800 text-red-600 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Youtube className="w-3.5 h-3.5" /> YouTube Screen
            </button>
            <button
              onClick={() => setActiveTab('radio')}
              className={cn(
                "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                activeTab === 'radio'
                  ? "bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Radio className="w-3.5 h-3.5" /> Radio FM
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={cn(
                "flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                activeTab === 'news'
                  ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Newspaper className="w-3.5 h-3.5" /> News
            </button>
          </div>
        </div>

        {/* Tab 1: YouTube Spotlights & TV Combined (The 1st screen/player) */}
        {activeTab === 'youtube' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Player block (Left, spans 2 columns) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase text-white shrink-0",
                    selectedMedia.category === 'Live TV' ? "bg-red-600" : "bg-purple-600"
                  )}>
                    {selectedMedia.category}
                  </span>
                  Now Showing: <span className="text-indigo-600 dark:text-indigo-400 font-black truncate max-w-[200px] sm:max-w-xs">{selectedMedia.title}</span>
                </span>
                
                <button 
                  onClick={handleReshuffle}
                  disabled={isReshuffling}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all border border-gray-100 dark:border-gray-600 cursor-pointer shrink-0 active:scale-95",
                    isReshuffling && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-red-600 transition-transform duration-500", isReshuffling && "rotate-180")} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Reshuffle</span>
                </button>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-100 dark:border-gray-700 relative bg-black">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedMedia.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full"
                  >
                    <iframe
                      width="100%"
                      height="100%"
                      src={selectedMedia.url}
                      title={selectedMedia.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="relative z-10 w-full h-full"
                    ></iframe>
                  </motion.div>
                </AnimatePresence>
                
                {isReshuffling && (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 z-30 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                  </div>
                )}
              </div>

              <div className="mt-2 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-md font-black text-gray-900 dark:text-white flex items-center gap-2">
                  {selectedMedia.category === 'Live TV' ? <Tv className="w-4 h-4 text-red-500" /> : <Youtube className="w-4 h-4 text-purple-500" />}
                  {selectedMedia.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {selectedMedia.description}
                </p>
              </div>
            </div>

            {/* Content Selector Sidebar (Right, spans 1 column) */}
            <div className="lg:col-span-1 flex flex-col h-full space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/60 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Search className="w-4 h-4 text-gray-400 ml-1" />
                <input 
                  type="text"
                  placeholder="Search Spotlight & TV..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="bg-transparent border-none text-xs w-full outline-none focus:ring-0 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex-1 overflow-y-auto max-h-[420px] pr-1 space-y-4">
                {/* Spotlights Group */}
                {spotlights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1 px-1">
                      <Sparkles className="w-3 h-3" /> Curated Spotlights
                    </h4>
                    <div className="space-y-1.5">
                      {spotlights.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedMedia(item)}
                          className={cn(
                            "w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer",
                            selectedMedia.id === item.id
                              ? "bg-purple-500/10 border-purple-200 dark:border-purple-900"
                              : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700"
                          )}
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 text-purple-600">
                            <Youtube className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5 uppercase tracking-wide font-medium">{item.type}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TV Stations Group */}
                {tvStations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1 px-1">
                      <Tv className="w-3 h-3 animate-pulse" /> Live TV Channels
                    </h4>
                    <div className="space-y-1.5">
                      {tvStations.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedMedia(item)}
                          className={cn(
                            "w-full text-left p-2 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer",
                            selectedMedia.id === item.id
                              ? "bg-red-500/10 border-red-200 dark:border-red-900"
                              : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700"
                          )}
                        >
                          <div className="w-14 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0 relative">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-red-600 bg-red-50 dark:bg-red-950/20">
                                <Tv className="w-5 h-5" />
                              </div>
                            )}
                            {selectedMedia.id === item.id && (
                              <div className="absolute inset-0 bg-red-600/15 flex items-center justify-center">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                            <p className="text-[9px] text-red-600 font-bold uppercase tracking-widest mt-0.5">Live Stream</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Radio FM Player */}
        {activeTab === 'radio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2 bg-gradient-to-br from-amber-500/5 to-amber-600/5 dark:from-amber-950/10 dark:to-transparent p-6 rounded-3xl border border-amber-500/10 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
              <div className="absolute top-0 right-0 p-3">
                <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> LIVE SYNTH STREAM
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
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-bold tracking-widest">{selectedRadio.frequency}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4 leading-relaxed italic max-w-md">
                  "{selectedRadio.description}"
                </p>
              </div>

              {/* Dynamic Waveform Visualizer */}
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
                  <div className="w-full flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Radio Paused • Tap Play to listen</span>
                  </div>
                )}
              </div>

              {/* Radio Interactive Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRadioPlaying(!isRadioPlaying)}
                    className={cn(
                      "p-4 rounded-2xl text-white font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer",
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
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-1 cursor-pointer"
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
                      className="w-16 accent-amber-500 h-1 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Format</span>
                  <p className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">{selectedRadio.genre}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-2">Popular Stations</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {RADIO_CHANNELS.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => {
                      setSelectedRadio(station);
                      if (isRadioPlaying) {
                        setIsRadioPlaying(false);
                        setTimeout(() => setIsRadioPlaying(true), 50);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
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

        {/* Tab 3: News */}
        {activeTab === 'news' && (
          <div className="animate-in fade-in duration-300">
            <NewsFeed />
          </div>
        )}
      </div>
    </div>
  );
}
