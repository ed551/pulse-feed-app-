import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Beaker, 
  Send, 
  Image as ImageIcon, 
  Code, 
  Cpu, 
  Sparkles, 
  History,
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { generateContentWithRetry } from "../lib/ai";

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Fast & efficient' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Complex reasoning' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', desc: 'Best for visual tasks' }
];

interface LabMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
  rawResponse?: any;
}

export default function GeminiLab() {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [messages, setMessages] = useState<LabMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const runExperiment = async () => {
    if (!prompt.trim() && !selectedImage) return;

    setIsLoading(true);
    const userMsg: LabMessage = {
      role: 'user',
      text: prompt,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setSelectedImage(null);

    try {
      let contents: any;
      if (userMsg.image) {
        const base64Data = userMsg.image.split(',')[1];
        contents = {
          parts: [
            { text: userMsg.text || "Describe this image" },
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
          ]
        };
      } else {
        contents = userMsg.text;
      }

      const response = await generateContentWithRetry({
        model: selectedModel,
        contents: contents,
      });

      const modelMsg: LabMessage = {
        role: 'model',
        text: response.text || "No response text received.",
        timestamp: Date.now(),
        rawResponse: response
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Lab Error:", error);
      const errorMsg: LabMessage = {
        role: 'model',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: Date.now(),
        rawResponse: error
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Beaker className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gemini Lab</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">AI Experimentation Zone</p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])}
          className="p-2 rounded-xl hover:bg-zinc-900 text-zinc-500 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* Model Selection */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Active Engine</p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl border transition-all ${
                selectedModel === m.id 
                ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4" />
                <span className="text-sm font-semibold">{m.name}</span>
              </div>
              <p className="text-[10px] opacity-60">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Experiment Feed */}
      <div className="space-y-6 mb-8">
        {messages.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-zinc-700" />
            </div>
            <h2 className="text-lg font-medium text-zinc-400">Ready for Input</h2>
            <p className="text-sm text-zinc-600 mt-2">Start an experiment by typing a prompt or uploading an image below.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[85%] rounded-3xl p-4 ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none'
              }`}>
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="Experiment input" 
                    className="w-full rounded-xl mb-3 border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                
                {msg.rawResponse && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
                    >
                      <Code className="w-3 h-3" />
                      {showRaw ? 'Hide Raw JSON' : 'View Raw JSON'}
                    </button>
                    {showRaw && (
                      <pre className="mt-2 p-3 bg-black rounded-xl text-[10px] font-mono text-indigo-300 overflow-x-auto">
                        {JSON.stringify(msg.rawResponse, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-600 mt-1 px-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-3 text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium animate-pulse">Gemini is processing...</span>
          </div>
        )}
      </div>

      {/* Input Dock */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-2xl mx-auto">
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img 
                src={selectedImage} 
                className="w-20 h-20 object-cover rounded-2xl border-2 border-indigo-500" 
                alt="Upload preview"
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="relative flex items-end gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 transition-colors"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              hidden 
              ref={fileInputRef} 
              onChange={handleImageUpload}
              accept="image/*"
            />
            
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Gemini anything..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:border-indigo-500/50 transition-all resize-none min-h-[56px] max-h-32"
                rows={1}
              />
              <button
                onClick={runExperiment}
                disabled={isLoading || (!prompt.trim() && !selectedImage)}
                className="absolute right-2 bottom-2 p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50 disabled:bg-zinc-800 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
