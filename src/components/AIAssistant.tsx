import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Lightbulb
} from 'lucide-react';
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

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-assistant', handleToggle);
    return () => window.removeEventListener('toggle-ai-assistant', handleToggle);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I'm your Pulse Feeds Master AI & Life Coach. I'm here to help you navigate the app, improve your health, and even suggest ways to make this app better for you. How can I assist today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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
      
      const systemInstruction = `You are the Pulse Feeds Master AI Assistant, Developer Consultant, and Life/Health Coach.
      Your goals are:
      1. ASSISTANCE: Help users navigate and understand app features.
      2. COACHING: Provide advice on improving life and health. If they use the fingerprint tool, use the simulated data to give health tips. Remind them you are an AI, not a doctor.
      3. IMPROVEMENT: Identify ways to improve the app. If the user expresses frustration or suggests a feature, acknowledge it and say you'll "log it for the developers". 
      
      When you identify a clear suggestion for the developer or a significant coaching tip, format your response normally but include a hidden signal at the end like [INSIGHT:developer:category:content] or [INSIGHT:user:category:content] so the system can log it.
      
      Be professional, empathetic, and visionary.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: `${context}\n\nUser: ${input}`,
        config: {
          systemInstruction
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
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl z-[60] flex items-center justify-center border-2 border-white/20",
          isOpen && "hidden"
        )}
      >
        <Sparkles className="w-7 h-7" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
      </motion.button>

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
            className="fixed top-24 right-6 bg-white dark:bg-gray-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[70] flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Master AI Coach</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] opacity-80">Ready to Assist</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-gray-950/50"
                >
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[9px] text-gray-400">
                      High Thinking Enabled
                    </p>
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
