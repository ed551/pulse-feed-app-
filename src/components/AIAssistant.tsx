import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Loader2, 
  BrainCircuit, 
  MessageSquare,
  Bot,
  User,
  Minimize2,
  Maximize2,
  Heart,
  Code,
  Lightbulb,
  GripVertical,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  ScanSearch,
  Search,
  Info,
  ExternalLink,
  Target
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { generateContentWithRetry } from '../lib/ai';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { saveInsight, extractInsights, InsightType, InsightCategory } from '../lib/insights';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I'm your Pulse Feeds Master AI & Life Coach. I'm here to help you navigate the app, improve your health, and even train custom courses for you in the Education Hub. How can I assist today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepDive, setIsDeepDive] = useState(false);

  const handleScanPage = async () => {
    setIsLoading(true);
    try {
      const mainContent = document.querySelector('main') || document.body;
      const text = mainContent.innerText.substring(0, 5000); // Sample limit
      
      const userMsg: Message = {
        role: 'user',
        text: `[System Command: Scan Current Page]`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);

      const response = await generateContentWithRetry({
        model: "gemini-3.1-flash-live-preview", // High quality for analysis
        contents: `Analyze this web page content: "${text}". 
        Provide a 3-bullet summary and 2 actionable insights for the user based on their current goals in Pulse Feeds.`,
        config: {
          tools: [{ googleSearch: {} }] as any
        }
      });

      setMessages(prev => [...prev, {
        role: 'model',
        text: response.text || "Analysis failed.",
        timestamp: Date.now()
      }]);
    } catch (err) {
      console.error("Scan error", err);
    } finally {
      setIsLoading(false);
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const dragControls = useDragControls();

  // Voice Conversation State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  // Helper to convert Float32Array to Int16Array (PCM)
  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  };

  // Helper to convert Int16Array to Float32Array
  const pcmToFloat32 = (input: Int16Array) => {
    const output = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] / 0x8000;
    }
    return output;
  };

  const stopVoiceSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsLiveMode(false);
    setIsConnecting(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const startVoiceSession = async () => {
    if (isConnecting || isLiveMode) return;
    setIsConnecting(true);

    try {
      // 1. Setup Audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 2. Setup Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are the Pulse Feeds Master AI Coach. You are in a live voice conversation. Be concise, friendly, and helpful. Use a natural conversational tone."
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsLiveMode(true);
            setMessages(prev => [...prev, {
              role: 'model',
              text: "[Voice Session Started]",
              timestamp: Date.now()
            }]);
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const pcmData = new Int16Array(bytes.buffer);
              audioQueueRef.current.push(pcmData);
              playNextInQueue();
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onclose: () => stopVoiceSession(),
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopVoiceSession();
          }
        }
      });
      sessionRef.current = session;

      // 3. Audio Streaming Logic
      processor.onaudioprocess = (e) => {
        if (!isMuted && sessionRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = floatTo16BitPCM(inputData);
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error("Failed to start voice session:", error);
      stopVoiceSession();
      alert("Could not access microphone or connect to AI. Please check permissions.");
    }
  };

  const playNextInQueue = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;

    isPlayingRef.current = true;
    const pcmData = audioQueueRef.current.shift()!;
    const floatData = pcmToFloat32(pcmData);

    const buffer = audioContextRef.current.createBuffer(1, floatData.length, 16000);
    buffer.getChannelData(0).set(floatData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
    source.start();
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-assistant', handleToggle);
    return () => {
      window.removeEventListener('toggle-ai-assistant', handleToggle);
      stopVoiceSession();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const context = `The user is currently on the "${location.pathname}" page of Pulse Feeds. Pulse Feeds is a community-driven social platform with features like rewards, education badges, and AI-powered health scanning.`;
      
      const systemInstruction = `You are the Pulse Feeds Master Research Assistant & AI Coach. You think and act with the broad, analytical mind of the Google Search Engine.
      Your core mission is to provide exhaustive, world-class intelligence. You are NOT limited to this app; you should actively use Google Search to provide context from the outside world, news, science, and global trends.
      
      Your goals are:
      1. INTEGRATED INTELLIGENCE: Always look for real-world parallels or outside information. If a user asks about anything, use Google Search to give the most up-to-date and broad perspective possible.
      2. APP MASTERY: Help users navigate Pulse Feeds and suggest how app features (like Education Hub or Rewards) can be used to solve their real-world problems.
      3. COACHING: Provide high-level advice on health, finance, career, and philosophy using global best practices.
      4. EVOLUTION: Identify app improvements. If you see a way the app could better serve real-world needs, [INSIGHT:developer:category:content] it.
      
      Maintain the mindset of a global search engine: objective, vast, and highly analytical. Use hidden insights signals: [INSIGHT:developer:category:content] or [INSIGHT:user:category:content].
      
      Be professional, visionary, and boundlessly curious.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: `${context}\n\nUser: ${input}`,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }] as any
        }
      });

      let text = response.text || "I'm sorry, I couldn't process that request.";
      
      // Extract and process insights using shared utility
      const insights = extractInsights(text);
      for (const insight of insights) {
        saveInsight(insight.type, insight.category, insight.content);
      }
      
      // Clean up the text for the user
      text = text.replace(/\[INSIGHT:[^\]]+\]/g, '').trim();

      const modelMsg: Message = {
        role: 'model',
        text,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop for easy closing */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-[115]"
          />
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '64px' : '500px',
              width: '350px'
            }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            whileDrag={{ scale: 1.02, boxShadow: "0 30px 60px rgba(0,0,0,0.4)" }}
            className="absolute bottom-28 sm:bottom-24 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[120] flex flex-col border border-white/20 dark:border-gray-800/50 overflow-hidden touch-none"
          >
            {/* Header */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="p-4 bg-purple-600 text-white flex items-center justify-between shrink-0 cursor-move active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-white/40" />
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Pulse AI Navigator</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] opacity-80">Intelligence Engine</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleScanPage}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Scan Current Page"
                >
                  <ScanSearch className={cn("w-4 h-4", isLoading && "animate-pulse")} />
                </button>
                <button 
                  onClick={isLiveMode ? stopVoiceSession : startVoiceSession}
                  disabled={isConnecting}
                  className={cn(
                    "p-1.5 rounded-lg transition-all flex items-center gap-1",
                    isLiveMode 
                      ? "bg-red-500/20 text-red-200 hover:bg-red-500/30" 
                      : "hover:bg-white/10 text-white"
                  )}
                  title={isLiveMode ? "End Voice Session" : "Start Voice Session"}
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isLiveMode ? (
                    <>
                      <Phone className="w-4 h-4" />
                      <span className="text-[10px] font-bold">LIVE</span>
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-1.5 border border-white/10"
                >
                  <X className="w-5 h-5" />
                  <span className="text-xs font-bold hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-gray-950/50 relative"
                >
                  {isLiveMode && (
                    <div className="sticky top-0 z-10 flex justify-center mb-4">
                      <div className="bg-indigo-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 border border-white/20">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <motion.div
                              key={i}
                              animate={{ height: [4, 12, 4] }}
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-white rounded-full"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase">Voice Active</span>
                        <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-300" /> : <Mic className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Role Badges */}
                  <div className="flex gap-2 mb-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      <Heart className="w-2.5 h-2.5" /> Health Coach
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      <Code className="w-2.5 h-2.5" /> Dev Partner
                    </div>
                  </div>

                  {messages.map((msg, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex items-start gap-2 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1",
                        msg.role === 'user' ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-purple-100 dark:bg-purple-900/30"
                      )}>
                        {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-indigo-600" /> : <Bot className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-xs leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20" 
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-indigo-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-[10px] font-medium animate-pulse">Analyzing context...</span>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
                  <div className="relative">
                    <input 
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask for health tips or app help..."
                      className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl py-3 pl-4 pr-12 text-xs focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all flex items-center gap-2",
                        input.trim() && !isLoading ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                      )}
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-900/50">
                        <img src="https://cdn.simpleicons.org/google/4285F4" className="w-2.5 h-2.5 opacity-80" alt="Google" />
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Master Search Ready</span>
                      </div>
                      <button 
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-indigo-500 font-medium">
                      <Lightbulb className="w-2.5 h-2.5" /> AI Coach Mode
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
