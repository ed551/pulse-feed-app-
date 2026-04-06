import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateContentWithRetry } from '../../lib/ai';
import { Modality } from '@google/genai';
import { db } from '../../lib/firebase';
import { setDoc, doc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface AIEyeModalProps {
  onClose: () => void;
}

export default function AIEyeModal({ onClose }: AIEyeModalProps) {
  const { currentUser } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      alert("Please allow camera access to use the AI Eye.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    window.speechSynthesis.cancel();
  };

  const analyzeProblem = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAnalyzing(true);
    setAiAdvice(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      const base64Data = imageData.split(',')[1];

      try {
        const prompt = `Act as an expert Life, Security, Health, and Wealth Consultant. Analyze this image for real-world opportunities or problems. 
        1. LIFE: How does this scene impact quality of life?
        2. SECURITY: Are there any physical or digital security risks visible?
        3. HEALTH: Are there health hazards or wellness opportunities?
        4. WEALTH: Is there an economic opportunity or a waste of resources here?
        
        Provide practical, actionable advice for each category.
        
        Format the response clearly with these sections:
        LIFE: [Advice]
        SECURITY: [Advice]
        HEALTH: [Advice]
        WEALTH: [Advice]
        BADGE: [Badge Name, e.g., "Security Specialist", "Wealth Architect", "Wellness Guru"]`;

        const response = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          },
          config: {
            temperature: 0.7,
            topP: 0.95,
          }
        });

        const advice = response.text || "I couldn't identify any specific insights in this view. Try pointing me at something else!";
        setAiAdvice(advice);
        speakAdvice(advice);

        if (advice.includes("BADGE:") && currentUser) {
          const badgeMatch = advice.match(/BADGE:\s*(.*)/i);
          const badgeName = badgeMatch ? badgeMatch[1].trim() : "Insight Seeker";
          
          await setDoc(doc(db, 'users', currentUser.uid), {
            badges: arrayUnion({
              name: badgeName,
              date: new Date().toISOString(),
              type: 'LinkedIn-Style',
              icon: 'Eye',
              description: "Awarded for multi-domain AI Eye analysis."
            })
          }, { merge: true });
        }

      } catch (err) {
        console.error("AI Analysis Error:", err);
        setAiAdvice("The AI Eye is currently experiencing interference. Please try again in a moment.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const speakAdvice = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Say clearly and helpfully: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } else {
        throw new Error("No audio data");
      }
    } catch (error) {
      console.error("TTS Error:", error);
      const msg = new SpeechSynthesisUtterance(text);
      msg.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center">
        <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-xs font-bold uppercase tracking-widest">AI Eye Live</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full border border-white/20 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <AnimatePresence>
          {capturedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0"
            >
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-[2px] border-white/20 m-12 rounded-3xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500 -mt-1 -ml-1 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500 -mt-1 -mr-1 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500 -mb-1 -ml-1 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500 -mb-1 -mr-1 rounded-br-lg" />
          </div>
        </div>
      </div>

      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            {aiAdvice ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 rounded-2xl p-6 border border-white/10 max-h-[40vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-cyan-400 font-bold flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Analysis Result
                  </h3>
                  <button 
                    onClick={() => speakAdvice(aiAdvice)}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      isSpeaking ? "bg-cyan-500 text-white" : "bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {aiAdvice}
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm font-medium">Point the camera at a problem or opportunity and tap analyze</p>
              </div>
            )}
          </AnimatePresence>

          <div className="flex justify-center">
            <button 
              onClick={analyzeProblem}
              disabled={isAnalyzing}
              className={cn(
                "group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500",
                isAnalyzing ? "bg-cyan-500/20" : "bg-white hover:scale-110 active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
              ) : (
                <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center group-hover:bg-cyan-500 transition-colors">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
