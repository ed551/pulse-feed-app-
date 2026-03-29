import { useEffect, useState, useRef } from "react";
import { Headphones, Mail, MessageCircle, Phone, FileText, Send, X, Loader2, User, Bot } from "lucide-react";
import { privacy_engine, auto_translation_engine, email_system_reporter } from "../lib/engines";
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Support() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm your Pulse Feed AI. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    privacy_engine();
    auto_translation_engine();
    email_system_reporter();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue("");
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: "You are a helpful customer support assistant for Pulse Feed, a social media platform. You help users with technical issues, account questions, and general inquiries. Be polite, concise, and professional.",
        }
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that request. Please try again.";
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Headphones className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Customer Support</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">We're here to help you 24/7</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
            <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Live Chat</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Chat with our AI assistant or a human agent instantly.</p>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
          >
            Start Chat
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Support</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Send us an email and we'll get back to you within 24 hours.</p>
          <button 
            onClick={() => window.location.href = 'mailto:support@pulsefeed.com'}
            className="mt-auto w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
          >
            Send Email
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <FileText className="w-6 h-6 mr-3 text-cyan-500" />
          Help Resources
        </h2>
        <div className="space-y-4">
          <button 
            onClick={() => alert('FAQ:\n1. How to earn? Participate in surveys.\n2. How to withdraw? Go to Wallet.\n3. Is it safe? Yes, we use end-to-end encryption.')}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
          >
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-lg">FAQ</div>
              <div className="text-gray-500 dark:text-gray-400">Frequently asked questions</div>
            </div>
          </button>
          <button 
            onClick={() => alert('User Guide:\n- Navigation: Use the bottom bar.\n- Posting: Click the + button.\n- Profile: Edit your bio and avatar in the Profile tab.')}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
          >
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-lg">User Guide</div>
              <div className="text-gray-500 dark:text-gray-400">Learn how to use Pulse Feed</div>
            </div>
          </button>
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = 'data:application/pdf;base64,JVBERi0xLjQKJWRmYm9keQoxIDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzMgMCBSXT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgIDAgb2JqCjw8L0xlbmd0aCA0ND4+CnN0cmVhbQpCVAovRjEgMjQgVGYKODAgNzAwIFRkCihQdWxzZSBGZWVkIERvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDY3IDAwMDAwIG4gCjAwMDAwMDAxMjYgMDAwMDAgbiAKMDAwMDAwMDIyNiAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNS9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjMyMQolJUVPRgo=';
              link.download = 'Pulse_Feed_Support.pdf';
              link.click();
              alert('Support PDF download started!');
            }}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
          >
            <div>
              <div className="font-bold text-gray-900 dark:text-white text-lg">Download Support PDF</div>
              <div className="text-gray-500 dark:text-gray-400">Offline documentation</div>
            </div>
          </button>
        </div>
      </div>

      {/* AI Chatbot Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-[400px] max-w-[90vw] h-[600px] max-h-[80vh] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Pulse Feed AI</div>
                  <div className="text-xs text-blue-100">Always online</div>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center space-x-2">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-full transition-colors shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
