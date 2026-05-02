import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Award, BookOpen, Clock, Users, PlayCircle, CheckCircle2, DollarSign, 
  ExternalLink, User, Sparkles, BrainCircuit, Zap, Loader2, Brain, Search, Shield, 
  Star, ShieldCheck, Share2, Monitor, ShieldAlert, X, TrendingUp, Languages, Globe,
  Volume2, VolumeX, Headphones, SkipBack, SkipForward, Pause, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ai, generateContentWithRetry } from '../lib/ai';
import { Modality } from "@google/genai";

const CATEGORIES = [
  { id: 'all', name: 'All Courses', icon: BookOpen },
  { id: 'ai', name: 'AI & Tech', icon: BrainCircuit },
  { id: 'corporate', name: 'Corporate Training', icon: Shield },
  { id: 'masterclass', name: 'Expert Masterclasses', icon: Star },
  { id: 'personal', name: 'Personal Growth', icon: Zap },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
];

const VOICES = [
  { id: 'male', name: 'Executive Male', model: 'Charon', gender: 'male', label: 'Male Host' },
  { id: 'female', name: 'Executive Female', model: 'Kore', gender: 'female', label: 'Female Host' },
];

const COURSES = [
  {
    id: 'c1',
    title: 'AI Engineering Fundamentals',
    category: 'ai',
    instructor: 'Dr. Sarah Chen',
    duration: '4 weeks',
    students: 1250,
    price: 99.99,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    badge: 'AI Engineer Associate',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Learn the core principles of artificial intelligence, machine learning, and neural networks. Build real-world AI applications.',
    modules: [
      'Introduction to AI & ML',
      'Neural Networks Deep Dive',
      'Natural Language Processing',
      'Computer Vision Basics'
    ]
  },
  {
    id: 'c2',
    title: 'Full-Stack Web Development',
    category: 'corporate',
    instructor: 'Alex Rivera',
    duration: '8 weeks',
    students: 3420,
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
    badge: 'Certified Web Developer',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Master modern web development using React, Node.js, and cloud databases. Build scalable, responsive web applications.',
    modules: [
      'Frontend Fundamentals (HTML/CSS/JS)',
      'React & State Management',
      'Backend APIs with Node.js',
      'Database Design & Deployment'
    ]
  },
  {
    id: 'c3',
    title: 'Data Science & Analytics',
    category: 'corporate',
    instructor: 'Prof. James Wilson',
    duration: '6 weeks',
    students: 2100,
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    badge: 'Data Science Professional',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Extract insights from complex datasets. Learn Python, Pandas, SQL, and data visualization techniques.',
    modules: [
      'Python for Data Science',
      'Data Wrangling & SQL',
      'Statistical Analysis',
      'Data Visualization with D3'
    ]
  },
  {
    id: 'c4',
    title: 'Digital Marketing & SEO Mastery',
    category: 'corporate',
    instructor: 'Emma Thompson',
    duration: '5 weeks',
    students: 4500,
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    badge: 'Digital Marketing Specialist',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Master the art of digital growth. Learn SEO, SEM, content marketing, and social media analytics to scale any business.',
    modules: [
      'Search Engine Optimization (SEO)',
      'Pay-Per-Click (PPC) Advertising',
      'Content Strategy & Copywriting',
      'Social Media & Email Marketing'
    ]
  },
  {
    id: 'c5',
    title: 'Financial Literacy & Investment',
    category: 'personal',
    instructor: 'Robert Kiyosaki Jr.',
    duration: '4 weeks',
    students: 8900,
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800',
    badge: 'Financial Intelligence Pro',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Take control of your financial future. Learn about stock markets, real estate, crypto, and wealth management strategies.',
    modules: [
      'Personal Finance Foundations',
      'Stock Market & ETF Investing',
      'Real Estate & Passive Income',
      'Cryptocurrency & Web3 Finance'
    ]
  },
  {
    id: 'c6',
    title: 'Cybersecurity Fundamentals',
    category: 'corporate',
    instructor: 'Kevin Mitnick II',
    duration: '7 weeks',
    students: 1800,
    price: 119.99,
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    badge: 'Cyber Defense Associate',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Protect digital assets from cyber threats. Learn ethical hacking, network security, and risk management.',
    modules: [
      'Introduction to Cybersecurity',
      'Network Security & Firewalls',
      'Ethical Hacking & Pentesting',
      'Incident Response & Recovery'
    ]
  },
  {
    id: 'c7',
    title: 'Graphic Design & UI/UX',
    category: 'personal',
    instructor: 'Sophia Martinez',
    duration: '6 weeks',
    students: 2800,
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=800',
    badge: 'Creative Design Professional',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Create stunning visuals and intuitive user experiences. Master Figma, Adobe Creative Suite, and design principles.',
    modules: [
      'Visual Design Principles',
      'User Experience (UX) Research',
      'User Interface (UI) Design',
      'Prototyping & Design Systems'
    ]
  },
  {
    id: 'c8',
    title: 'Advanced AI & Machine Learning',
    category: 'ai',
    instructor: 'Dr. Michael Zhang',
    duration: '10 weeks',
    students: 850,
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    badge: 'Advanced AI Specialist',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Deep dive into neural networks, deep learning, and advanced AI architectures. Build complex models for real-world problems.',
    modules: [
      'Deep Learning Architectures',
      'Reinforcement Learning',
      'Generative AI & LLMs',
      'AI Deployment & Scaling'
    ]
  },
  {
    id: 'c9',
    title: 'Blockchain & Cryptocurrency',
    category: 'personal',
    instructor: 'Vitalik Buterin Jr.',
    duration: '6 weeks',
    students: 3100,
    price: 129.99,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800',
    badge: 'Blockchain Developer',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Understand the technology behind Bitcoin, Ethereum, and the future of decentralized finance. Learn Smart Contract development.',
    modules: [
      'Blockchain Fundamentals',
      'Ethereum & Smart Contracts',
      'DeFi & NFT Ecosystems',
      'Web3 Application Development'
    ]
  },
  {
    id: 'c10',
    title: 'Sustainable Living & Environmental Science',
    category: 'personal',
    instructor: 'Dr. Jane Goodall III',
    duration: '4 weeks',
    students: 1500,
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800',
    badge: 'Sustainability Advocate',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Learn practical ways to reduce your carbon footprint and understand global environmental challenges. Build a sustainable future.',
    modules: [
      'Climate Change Science',
      'Sustainable Resource Management',
      'Eco-friendly Living Practices',
      'Environmental Policy & Advocacy'
    ]
  },
  {
    id: 'c11',
    title: 'Mental Health & Well-being',
    category: 'personal',
    instructor: 'Dr. Andrew Huberman Jr.',
    duration: '4 weeks',
    students: 12000,
    price: 0,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    badge: 'Well-being Champion',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Strategies for stress management, mindfulness, and emotional resilience. Improve your mental health and daily performance.',
    modules: [
      'Neuroscience of Stress',
      'Mindfulness & Meditation',
      'Emotional Intelligence',
      'Sleep & Performance Optimization'
    ]
  },
  {
    id: 'c12',
    title: 'Entrepreneurship & Startup Management',
    category: 'masterclass',
    instructor: 'Elon Musk IV',
    duration: '12 weeks',
    students: 2500,
    price: 179.99,
    image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800',
    badge: 'Certified Entrepreneur',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'From idea to exit: learn how to build and scale a successful business. Master fundraising, product-market fit, and leadership.',
    modules: [
      'Ideation & Market Research',
      'Product Development & MVP',
      'Fundraising & Venture Capital',
      'Scaling & Operations'
    ]
  },
  {
    id: 'c13',
    title: 'Public Speaking & Leadership',
    category: 'masterclass',
    instructor: 'Barack Obama Jr.',
    duration: '5 weeks',
    students: 3800,
    price: 99.99,
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=800',
    badge: 'Leadership Professional',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Master the art of communication and inspire others through effective leadership. Build confidence and influence.',
    modules: [
      'Art of Persuasion',
      'Effective Communication',
      'Leadership Styles',
      'Conflict Resolution'
    ]
  },
  {
    id: 'c14',
    title: 'Professional Project Management (PMP & Agile) - AI Enhanced',
    category: 'corporate',
    instructor: 'Dr. Marcus Holloway, PMP, PMI-ACP + Pulse AI',
    duration: '12 weeks',
    students: 12400,
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    badge: 'Senior Project Strategist (Global)',
    badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
    description: 'Everything Pulse AI knows about elite project leadership. This definitive curriculum covers the entire breadth of PMBOK 7th Edition, Agile Practice Guide, and Silicon Valley execution frameworks, supercharged by a complete AI knowledge download and high-stakes executive assessment.',
    modules: [
      'The PM Mindset: Global Standards & Professional Responsibility',
      'Strategic Initiation: Business Case & Portfolio Alignment',
      'Scope Management: WBS & AI-Driven Requirement Extraction',
      'Advanced Scheduling: Critical Path & Resource Smoothing',
      'Project Finance: Budgeting, Forecasting & EVM',
      'Risk 2.0: Qualitative & Quantitative Mitigation Engines',
      'Stakeholder Diplomacy: Conflict Resolution & Communication',
      'Agile at Scale: SAFe, LeSS, and Enterprise Scrum',
      'Hybrid Excellence: Merging Waterfall and Agile',
      'Quality Intelligence: Six Sigma & Continuous Process Improvement',
      'Procurement & Contract Management Strategy',
      'AI-Powered Project Governance & Dashboard Mastery',
      'Pulse AI Deep-Knowledge Stream: The Unified PM Field Theory',
      'The Quantum PM: Absolute AI Knowledge Download',
      'Final Executive Assessment & Certification Gate',
      'Career Accelerator: Portfolio Mastery & Interview Intelligence'
    ],
    learningObjectives: [
      'Master the PMBOK 7th Edition and Agile Practice Guide standards.',
      'Manage multi-million dollar budgets using advanced financial tracking.',
      'Lead cross-functional international teams through complex digital transformations.',
      'Deploy AI agents for automated project tracking and risk prediction.',
      'Apply advanced emotional intelligence to navigate high-stakes corporate politics.'
    ]
  }
];

export default function Education() {
  const { userData } = useAuth();
  const { addRevenue } = useRevenue();
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[0] | null>(null);

  const updateSelectedCourse = (course: typeof COURSES[0] | null) => {
    setSelectedCourse(course);
    if (course) {
      localStorage.setItem('pulse_active_course_id', course.id);
    } else {
      localStorage.removeItem('pulse_active_course_id');
      localStorage.removeItem('pulse_active_module_id');
    }
  };

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isTrainingAI, setIsTrainingAI] = useState(false);
  const enrolledCourses = userData?.enrolledCourses || [];
  const completedModules = userData?.completedModules || [];
  const customCourses = userData?.customCourses || [];
  const [aiTrainingProgress, setAiTrainingProgress] = useState(0);
  const [trainingStatus, setTrainingStatus] = useState('');
  const [trainingTopic, setTrainingTopic] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isBuyingCertificate, setIsBuyingCertificate] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState('');
  const [tutorAnswer, setTutorAnswer] = useState('');
  const [isAskingTutor, setIsAskingTutor] = useState(false);
  const [deepDiveModule, setDeepDiveModule] = useState<string | null>(null);
  const [deepDiveContent, setDeepDiveContent] = useState<string>('');
  
  // Persist Active Course
  useEffect(() => {
    const savedCourseId = localStorage.getItem('pulse_active_course_id');
    if (savedCourseId && !selectedCourse) {
      // Search in standard and custom courses
      const allPossibleCourses = [...COURSES, ...customCourses];
      const match = allPossibleCourses.find(c => c.id === savedCourseId);
      if (match) {
        setSelectedCourse(match);
        console.log(`Restored active course: ${match.title}`);
      }
    }
  }, [customCourses, selectedCourse]);

  // Persist Deep Dive Content
  useEffect(() => {
    const savedContent = localStorage.getItem('pulse_deep_dive_content');
    const savedModule = localStorage.getItem('pulse_deep_dive_module');
    if (savedContent && savedModule) {
      setDeepDiveContent(savedContent);
      setDeepDiveModule(savedModule);
    }
  }, []);

  useEffect(() => {
    if (deepDiveContent && deepDiveModule) {
      localStorage.setItem('pulse_deep_dive_content', deepDiveContent);
      localStorage.setItem('pulse_deep_dive_module', deepDiveModule);
    }
  }, [deepDiveContent, deepDiveModule]);

  const handleCloseDeepDive = () => {
    setDeepDiveModule(null);
    setDeepDiveContent('');
    localStorage.removeItem('pulse_deep_dive_content');
    localStorage.removeItem('pulse_deep_dive_module');
    localStorage.removeItem('pulse_active_module_id');
    releaseWakeLock();
  };

  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<string[]>([]);
  const [examResult, setExamResult] = useState<{ score: number, passed: boolean } | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [moduleTranslations, setModuleTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [showTranslateDropdown, setShowTranslateDropdown] = useState<string | null>(null);

  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioStartTimeRef = useRef<number>(0);
  const audioOffsetRef = useRef<number>(0);
  const currentBufferRef = useRef<AudioBuffer | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioTotalDuration, setAudioTotalDuration] = useState(0);
  const audioIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pulse_audio_session');
    if (saved) {
      try {
        const { module, time, voiceId } = JSON.parse(saved);
        setAudioCurrentTime(time);
        audioOffsetRef.current = time;
        const voice = VOICES.find(v => v.id === voiceId);
        if (voice) setSelectedVoice(voice);
        console.log(`Restored audio session: ${module} at ${time}s`);
      } catch (e) {}
    }

    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Throttled persistence
  useEffect(() => {
    if (isPlayingAudio && Math.floor(audioCurrentTime) % 5 === 0) {
      const session = {
        module: isPlayingAudio,
        time: audioCurrentTime,
        voiceId: selectedVoice.id
      };
      localStorage.setItem('pulse_audio_session', JSON.stringify(session));
    }
  }, [audioCurrentTime, isPlayingAudio, selectedVoice.id]);

  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const audioCacheRef = useRef<Record<string, AudioBuffer>>({});
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log("Wake Lock active");
      } catch (err) {
        console.log("Wake Lock error:", err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        console.log("Wake Lock released");
      });
    }
  };

  // Re-request wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && (isPlayingAudio || isDeepDiving || deepDiveContent)) {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlayingAudio, isDeepDiving, deepDiveContent]);

  const stopAudio = () => {
    if (audioBufferSourceRef.current) {
      try {
        audioBufferSourceRef.current.stop();
      } catch (e) {}
      audioBufferSourceRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setIsPlayingAudio(null);
    releaseWakeLock();
  };

  const handleSeek = (direction: 'forward' | 'backward', moduleTitle: string) => {
    if (!currentBufferRef.current || !audioContextRef.current || isPlayingAudio !== moduleTitle) return;
    
    const elapsed = (audioContextRef.current.currentTime - audioStartTimeRef.current) * audioSpeed;
    let newOffset = audioOffsetRef.current + elapsed;
    
    if (direction === 'forward') {
      newOffset += 10;
    } else {
      newOffset -= 10;
    }
    
    if (newOffset < 0) newOffset = 0;
    if (newOffset >= currentBufferRef.current.duration) {
      stopAudio();
      return;
    }
    
    startBufferSource(newOffset, moduleTitle, audioSpeed);
  };

  const startBufferSource = (offset: number, moduleTitle: string, speed: number = 1.0) => {
    if (!audioContextRef.current || !currentBufferRef.current) return;

    if (audioBufferSourceRef.current) {
      try { audioBufferSourceRef.current.stop(); } catch(e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = currentBufferRef.current;
    source.playbackRate.value = speed;
    source.connect(audioContextRef.current.destination);
    
    source.start(0, offset);
    audioBufferSourceRef.current = source;
    audioStartTimeRef.current = audioContextRef.current.currentTime;
    audioOffsetRef.current = offset;
    setIsPlayingAudio(moduleTitle);
    requestWakeLock();

    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    audioIntervalRef.current = window.setInterval(() => {
      if (audioContextRef.current && currentBufferRef.current) {
        const now = audioContextRef.current.currentTime;
        const elapsed = (now - audioStartTimeRef.current) * speed;
        const currentPos = audioOffsetRef.current + elapsed;
        setAudioCurrentTime(currentPos);

        if (currentPos >= currentBufferRef.current.duration) {
          stopAudio();
          releaseWakeLock();
        }
      }
    }, 100);
  };

  const toggleAudioSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(audioSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setAudioSpeed(nextSpeed);
    
    if (isPlayingAudio && currentBufferRef.current) {
      const elapsed = (audioContextRef.current!.currentTime - audioStartTimeRef.current) * audioSpeed;
      const currentPos = audioOffsetRef.current + elapsed;
      startBufferSource(currentPos, isPlayingAudio, nextSpeed);
    }
  };

  const handlePlayAudio = async (courseTitle: string, moduleTitle: string, customText?: string) => {
    if (isPlayingAudio === moduleTitle) {
      stopAudio();
      return;
    }

    // Initialize AudioContext immediately on user interaction to avoid "not allowed to start" errors
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
    }

    const cacheKey = `${courseTitle}-${moduleTitle}-${selectedVoice.id}`;
    if (audioCacheRef.current[cacheKey]) {
      currentBufferRef.current = audioCacheRef.current[cacheKey];
      setAudioTotalDuration(currentBufferRef.current.duration);
      startBufferSource(0, moduleTitle);
      return;
    }

    setIsGeneratingAudio(moduleTitle);
    
    // Proactively request wake lock for long TTS synthesis
    await requestWakeLock();

    try {
      if (!ai) return;

      const masterScriptPrompt = `Lead Master Narrator for Pulse Global Education. 
      Subject: "${courseTitle} - ${moduleTitle}"
      
      Deliver the definitive "Master Class" audio lecture.
      NO INTRO LABELS. START IMMEDIATELY.
      
      Structure:
      1. THE CORE technical standards.
      2. EXECUTIVE STRATEGIES.
      3. AI REVOLUTION in this domain.
      4. TACTICAL DEPLOYMENT.
      5. MASTER WISDOM.
      6. CLOSING.

      Tone: Professional, Clear, Natural Pace.
      Language: Professional. No small talk.`;

      const ttsResponse = await generateContentWithRetry({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: customText ? `Read this intelligence brief at a normal, professional pace: ${customText.substring(0, 3000)}` : masterScriptPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice.model as any }, 
            },
          },
        },
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        await playPcmAudio(base64Audio, moduleTitle, cacheKey);
      }
    } catch (error) {
      console.error("Audio Generation Error:", error);
      setIsGeneratingAudio(null);
      // Only release if not currently playing audio
      if (!isPlayingAudio) {
        releaseWakeLock();
      }
    }
  };

  const playPcmAudio = async (base64Data: string, moduleTitle: string, cacheKey?: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }
      
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);
      
      currentBufferRef.current = audioBuffer;
      if (cacheKey) {
        audioCacheRef.current[cacheKey] = audioBuffer;
      }
      setAudioTotalDuration(audioBuffer.duration);
      setIsGeneratingAudio(null);
      startBufferSource(0, moduleTitle);
    } catch (error) {
      console.error("Audio Playback Error:", error);
      setIsGeneratingAudio(null);
    }
  };

  const handleTranslateVideo = async (courseTitle: string, moduleTitle: string, targetLang: typeof LANGUAGES[0]) => {
    const transKey = `${courseTitle}-${moduleTitle}-${targetLang.code}`;
    setSelectedLanguage(targetLang);
    setShowTranslateDropdown(null);
    
    if (moduleTranslations[transKey]) return;

    setIsTranslating(moduleTitle);
    try {
      const prompt = `You are a world-class educational translator for the Pulse Global Education Platform. 
      Course: "${courseTitle}"
      Module: "${moduleTitle}"
      Target Language: ${targetLang.name} (${targetLang.code})

      As the Lead AI Translator:
      1. Provide a comprehensive, professional summary of this specific video module in ${targetLang.name}.
      2. Translate the module's key learning outcomes.
      3. Provide a brief 100-word "Video Script Summary" as if it were a voiceover script translated into ${targetLang.name}.
      4. Include 3 expert tips related to this topic in ${targetLang.name}.

      Use highly professional, industry-specific terminology in ${targetLang.name}. Format with clear headers and professional structure.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setModuleTranslations(prev => ({
        ...prev,
        [transKey]: response.text || 'Translation failed.'
      }));
    } catch (error) {
      console.error("Translation Error:", error);
    } finally {
      setIsTranslating(null);
    }
  };

  const handleDeepDive = async (courseTitle: string, moduleTitle: string) => {
    if (isDeepDiving) return;
    
    // Track module for cross-session persistence
    localStorage.setItem('pulse_active_module_id', moduleTitle);
    
    // If we already have content for this exact module, just open it
    if (deepDiveModule === moduleTitle && deepDiveContent) {
      return;
    }

    setDeepDiveModule(moduleTitle);
    setIsDeepDiving(true);
    setDeepDiveContent('');
    
    // Proactively request wake lock for long generation
    await requestWakeLock();

    // Ensure audio context is ready for later use
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioContextRef.current = new AudioCtx();
    }

    try {
      let prompt = '';
      if (moduleTitle.includes('Knowledge') || moduleTitle.includes('Quantum') || moduleTitle.includes('Unified')) {
        prompt = `You are the PULSE AI MASTER BRAIN. You have been asked to provide the absolute, definitive, and exhaustive "Everything AI Knows" download for Project Management.
        
        This is a multi-disciplinary, high-stakes knowledge transfer. 
        Core areas to cover:
        1. THE QUANTUM SHIFT: How AI moves Project Management from tracking to predicting.
        2. THE ARCHITECTURAL CORE: Comprehensive breakdown of PMBOK 7, Prince2, and Agile/Nexus at scale.
        3. BEHAVIORAL INTELLIGENCE: Advanced stakeholder psychology and corporate diplomacy.
        4. FINANCIAL MASTERY: Integrated Earned Value Management, NPV/IRR analysis, and AI-driven cost projection.
        5. SYSTEMIC RISK: Entropy management, Monte Carlo simulations, and black-swan mitigation.
        6. THE FUTURE: Autonomous project agents and the post-human PM role.
        7. THE UNIFIED FIELD: How to integrate every single PM variable into a single stream of high-performance execution.
        
        Format this as an elite executive brief. Use high-performance terminology. Do not summarize; deepen.`;
      } else {
        prompt = `You are a Lead Project Strategist and Academic Dean. 
        The student is studying the module "${moduleTitle}" within the course "${courseTitle}".
        
        Your goal is to provide "Everything AI knows" about this specific topic. 
        Create a comprehensive, collegiate-level lesson that covers:
        1. Technical Core Principles
        2. Industry-standard Frameworks (e.g. PMBOK, Agile, Six Sigma, Lean)
        3. Advanced Executive Strategies
        4. AI-Augmented PM Techniques (How AI improves this specific area)
        5. A high-stakes Case Study scenario
        6. 3 Master-level interview questions and ideal answers for this topic.
        
        Format the response with professional headings, bullet points, and expert-level depth. Do not hold back. Be as technical and comprehensive as possible.`;
      }

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setDeepDiveContent(response.text || 'Unable to generate deep dive content.');
    } catch (error) {
      console.error("Deep Dive Error:", error);
      setDeepDiveContent('Our knowledge engine is currently processing a high volume of data. Please try again.');
    } finally {
      setIsDeepDiving(false);
      // Only release if not currently playing audio
      if (!isPlayingAudio) {
        releaseWakeLock();
      }
    }
  };
  const handleAskTutor = async (courseTitle: string) => {
    if (!tutorQuestion.trim()) return;
    
    setIsAskingTutor(true);
    setTutorAnswer('');

    try {
      const prompt = `You are a world-renowned Lead Project Strategist and Master Mentor for the "${courseTitle}" course. 
      A high-potential student has a complex inquiry: "${tutorQuestion}".
      
      Your goal is to provide JOB-READY, high-performance guidance that bridges the gap between theory and executive-level execution.
      
      When answering:
      1. Use a professional, mentor-like, and highly encouraging tone.
      2. If the course is "Professional Project Management (PMP & Agile)", reference specific industry anchors like PMBOK 7th Ed, Agile Practice Guide, or ROI Metrics.
      3. Structure your response with:
         - A clear, authoritative explanation.
         - Real-world "In the Field" application example.
         - A "Career Pro Tip" to help them stand out in the job market.
      
      Avoid generic advice. Be deep, technical yet accessible, and vision-focused.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setTutorAnswer(response.text || 'I apologize, but I am unable to provide an answer at this moment.');
    } catch (error) {
      console.error("AI Tutor Error:", error);
      setTutorAnswer('The AI Tutor is currently busy. Please try again in a moment.');
    } finally {
      setIsAskingTutor(false);
    }
  };

  const handleCompleteModule = async (courseId: string, courseTitle: string, moduleTitle: string) => {
    if (!userData?.uid) return;

    if (moduleTitle.includes('Assessment') || moduleTitle.includes('Exam')) {
      startFinalExam(courseId, courseTitle);
      return;
    }
    
    // Engagement Reward: $0.50
    // Engagement is 50/50 distribution
    const reward = 0.50;
    const platformShare = reward * 0.50;
    const userShare = reward * 0.50;

    const moduleKey = `${courseId}-${moduleTitle}`;
    if (completedModules.includes(moduleKey)) return;

    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        completedModules: arrayUnion(moduleKey)
      });

      await addRevenue(userShare, platformShare, `Completed Module: ${moduleTitle} in ${courseTitle}`, 'education');
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Module Completed!", 
          body: `You earned $${userShare.toFixed(2)} for completing "${moduleTitle}". Keep going!` 
        } 
      }));
    } catch (err) {
      console.error("Error completing module:", err);
    }
  };

  const startFinalExam = async (courseId: string, courseTitle: string) => {
    setIsTakingExam(true);
    setExamQuestions([]);
    setCurrentExamIndex(0);
    setExamAnswers([]);
    setExamResult(null);

    try {
      const prompt = `Generate a high-stakes, professional 5-question multiple choice exam for the course: "${courseTitle}".
      
      The questions should be advanced and test executive-level understanding, not just definitions.
      
      Return a JSON array of objects with:
      - question: the text of the question
      - options: an array of 4 options
      - correctIndex: the index of the correct option (0-3)
      - explanation: a brief explanation of why that answer is correct.`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const questions = JSON.parse(response.text || '[]');
      setExamQuestions(questions);
    } catch (error) {
      console.error("Exam Generation Error:", error);
      setIsTakingExam(false);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Exam Error", body: "Could not generate assessment. Please try again." } 
      }));
    }
  };

  const handleExamSubmit = async () => {
    let score = 0;
    examQuestions.forEach((q, idx) => {
      if (parseInt(examAnswers[idx]) === q.correctIndex) {
        score++;
      }
    });

    const percent = (score / examQuestions.length) * 100;
    const passed = percent >= 80;
    setExamResult({ score: percent, passed });

    if (passed && userData?.uid && selectedCourse) {
      const moduleKey = `${selectedCourse.id}-Final Executive Assessment & Certification Gate`;
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        completedModules: arrayUnion(moduleKey)
      });
      
      // Bonus reward for passing exam: $5.00
      await addRevenue(2.5, 2.5, `Passed Final Exam: ${selectedCourse.title}`, 'education');
    }
  };

  const handleBuyCertificate = async (course: any) => {
    setIsBuyingCertificate(true);
    const fee = 19.99;
    
    try {
      // Human-like verification simulation
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Identity Verification", body: "Initiating secure ID verification process for professional certification..." } 
      }));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Smart Analysis", body: `Verifying completion stats for ${course.title}...` } 
      }));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Payment Secure", body: "Finalizing transaction via secure merchant gateway..." } 
      }));
      await new Promise(resolve => setTimeout(resolve, 10));

      // Education Hub Payments: 100% Developer
      const platformShare = fee;
      const userShare = 0;

      await addRevenue(userShare, platformShare, `Premium Certificate: ${course.title}`, 'education');
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Certification Awarded!", 
          body: `Professional ${course.badge} has been added to your profile. View it in your rewards vault.` 
        } 
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { title: "Transaction Error", body: "Certification vault is currently busy. Please try again." } 
      }));
    } finally {
      setIsBuyingCertificate(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return [...customCourses, ...COURSES].filter(c => 
      activeCategory === 'all' || c.category === activeCategory
    );
  }, [customCourses, activeCategory]);

  const handleEnroll = async (course: typeof COURSES[0]) => {
    if (!userData?.uid) return;
    setIsEnrolling(true);
    
    try {
      // Instant execution
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        enrolledCourses: arrayUnion(course.id)
      });

      // 80% Platform revenue, 20% User reward
      const platformShare = course.price * 0.8;
      const userShare = course.price * 0.2;
      
      // Add to platform and user revenue
      await addRevenue(userShare, platformShare, `Course Enrollment: ${course.title}`, 'education');
      
      setIsEnrolling(false);
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Enrollment Successful!", 
          body: `Welcome to "${course.title}". You now have full access to all curriculum modules.` 
        } 
      }));
    } catch (err) {
      console.error("Error enrolling in course:", err);
      setIsEnrolling(false);
    }
  };

  const handleAITraining = async () => {
    if (!trainingTopic.trim()) {
      // Use custom notification instead of alert
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Topic Required", 
          body: "Please enter a topic for your custom course." 
        } 
      }));
      return;
    }

    setIsTrainingAI(true);
    setAiTrainingProgress(0);
    setTrainingStatus('Initializing Master AI Brain...');
    
    // Training Fee: $49.99
    // 80/20 Revenue split
    const trainingFee = 49.99;
    const platformShare = trainingFee * 0.8;
    const userShare = trainingFee * 0.2;

    try {
      // Step 1: Research Phase
      setAiTrainingProgress(10);
      setTrainingStatus('Conducting Global Educational Research...');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Step 2: Logic Analysis Phase
      setAiTrainingProgress(30);
      setTrainingStatus('Analyzing Logical Structures & Learning Paths...');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Step 3: Synthesis with Gemini
      setTrainingStatus('Synthesizing Expert Curriculum...');
      const prompt = `You are a world-class Educational Researcher and Master Curriculum Designer. 
      Your task is to create a high-impact, professional course curriculum for the topic: "${trainingTopic}".
      
      Be confident, authoritative, and expert in your tone.
      
      Return a JSON object with:
      - title: A powerful, professional course title
      - description: A compelling 2-sentence summary that highlights the value proposition
      - modules: An array of 6 comprehensive module titles that follow a logical progression from beginner to mastery
      - learningObjectives: An array of 3 key takeaways
      - badgeName: A prestigious badge name (e.g., "Certified [Topic] Strategist")
      - badgeDescription: A professional certification description`;

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const courseData = JSON.parse(response.text || '{}');
      setAiTrainingProgress(60);
      setTrainingStatus('Updating Smart Results...');

      // Finalizing
      for (let i = 60; i <= 100; i += 20) {
        setAiTrainingProgress(i);
        if (i === 80) setTrainingStatus('Finalizing Certification Standards...');
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Step 4: Add to Custom Courses
      const newCustomCourse = {
        id: `custom-${Date.now()}`,
        ...courseData,
        instructor: 'Master AI & Life Coach',
        duration: 'Self-paced Mastery',
        students: 1,
        price: trainingFee,
        image: `https://picsum.photos/seed/${trainingTopic.replace(/\s/g, '')}/800/600`,
        badgeIcon: 'https://cdn.simpleicons.org/linkedin/0A66C2',
      };

      setAiTrainingProgress(100);

      // Step 3: Add user's share to their revenue
      await addRevenue(userShare, platformShare, `AI Training Purchase: ${courseData.title}`, 'education');
      
      // Step 4: Award Badge & Enroll & Save Course in Firestore
      if (userData?.uid) {
        const userRef = doc(db, 'users', userData.uid);
        await updateDoc(userRef, {
          badges: arrayUnion({
            name: courseData.badgeName || `${trainingTopic} Master`,
            description: courseData.badgeDescription || `Completed AI-trained course on ${trainingTopic}`,
            awardedAt: new Date().toISOString()
          }),
          enrolledCourses: arrayUnion(newCustomCourse.id),
          customCourses: arrayUnion(newCustomCourse)
        });
      }

      setIsTrainingAI(false);
      setTrainingTopic('');
      
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "AI Training Complete!", 
          body: `"${courseData.title}" has been added to your courses. A new badge "${courseData.badgeName}" has been awarded to your profile!` 
        } 
      }));
    } catch (error) {
      console.error("AI Training Error:", error);
      setIsTrainingAI(false);
      window.dispatchEvent(new CustomEvent('show-notification', { 
        detail: { 
          title: "Training Failed", 
          body: "Failed to train course. Please try again." 
        } 
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center">
            <GraduationCap className="w-8 h-8 mr-3 text-blue-600" />
            Education Hub
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Learn new skills, earn LinkedIn badges, and master your future.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {localStorage.getItem('pulse_active_course_id') && (
            <button 
              onClick={() => {
                const savedId = localStorage.getItem('pulse_active_course_id');
                const all = [...COURSES, ...customCourses];
                const match = all.find(c => c.id === savedId);
                if (match) updateSelectedCourse(match);
              }}
              className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-bold text-xs hover:bg-indigo-200 transition-all flex items-center border border-indigo-200 dark:border-indigo-800"
            >
              <RotateCcw className="w-3 h-3 mr-2" />
              Resume Last Session
            </button>
          )}
          <div className="hidden sm:flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-bold text-sm">
            <Award className="w-4 h-4 mr-2" />
            Certified Courses
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
              activeCategory === cat.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-50"
            )}
          >
            <cat.icon className="w-4 h-4" />
            {cat.name}
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center">
              <DollarSign className="w-6 h-6 mr-2" />
              Learn & Grow Program
            </h2>
            <p className="text-indigo-100 max-w-md">
              Enroll in professional courses or use AI Training to master new skills. Engagement in the Education Hub earns you 20% back!
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/30 text-center min-w-[200px]">
            <div className="text-sm font-medium text-indigo-100 mb-1">Your Learning Rewards</div>
            <div className="text-3xl font-bold">${(enrolledCourses.length * 20).toFixed(2)}+</div>
          </div>
        </div>
      </div>

      {/* AI Training Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BrainCircuit className="w-32 h-32 text-indigo-600" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Master AI & Life Coach Training</h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium">Personalized Course Generation from Online Research</p>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
            Let our Master AI & Life Coach gather educational content from across the web to train a custom course specifically for your needs. 
            The AI will research the topic, synthesize a curriculum, and award you a verified badge upon completion.
          </p>

          <div className="mb-8 max-w-xl">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Search for a topic or course to train on:
            </label>
            <div className="relative">
              <input 
                type="text"
                value={trainingTopic}
                onChange={(e) => setTrainingTopic(e.target.value)}
                placeholder="e.g. Advanced Biohacking, Modern Leadership, React Native..."
                className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-900 dark:text-white"
                disabled={isTrainingAI}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500">
                <Search className="w-6 h-6 animate-pulse" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <Zap className="w-5 h-5 text-yellow-500 mb-2" />
              <div className="font-bold text-gray-900 dark:text-white">Instant Generation</div>
              <div className="text-xs text-gray-500">Trained in minutes</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <Users className="w-5 h-5 text-blue-500 mb-2" />
              <div className="font-bold text-gray-900 dark:text-white">Personalized</div>
              <div className="text-xs text-gray-500">Adapts to your level</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <Award className="w-5 h-5 text-purple-500 mb-2" />
              <div className="font-bold text-gray-900 dark:text-white">Verified Badge</div>
              <div className="text-xs text-gray-500">Shareable certification</div>
            </div>
          </div>
          
          {enrolledCourses.includes('ai-master-coach') ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl font-bold flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                AI Training Active
              </div>
              <button className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all">
                Access AI Course
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">$49.99</div>
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                    Supports Platform Sustainability
                  </div>
                </div>
              
              <button 
                onClick={handleAITraining}
                disabled={isTrainingAI}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-70 flex flex-col items-center"
              >
                {isTrainingAI ? (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Brain className="w-8 h-8 text-white animate-pulse" />
                          <Search className="absolute -bottom-1 -right-1 w-4 h-4 text-indigo-200 animate-bounce" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white uppercase tracking-widest">Master AI Brain</div>
                          <div className="text-xs text-indigo-100 font-medium animate-pulse">{trainingStatus}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-white">{aiTrainingProgress}%</div>
                        <div className="text-[10px] text-indigo-100 font-bold uppercase">Analysis Depth: High</div>
                      </div>
                    </div>

                    <div className="relative h-4 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-md">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-white via-indigo-200 to-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${aiTrainingProgress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                      {/* Scanning effect */}
                      <motion.div 
                        className="absolute inset-y-0 w-20 bg-white/40 skew-x-12"
                        animate={{ 
                          left: ['-20%', '120%'],
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Research', min: 10, icon: Search },
                        { label: 'Logic', min: 30, icon: BrainCircuit },
                        { label: 'Synthesis', min: 60, icon: Sparkles },
                        { label: 'Output', min: 90, icon: Zap }
                      ].map((step, i) => (
                        <div key={i} className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-500 border",
                          aiTrainingProgress >= step.min 
                            ? "bg-white/20 border-white/40 text-white" 
                            : "bg-white/5 border-white/10 text-white/40"
                        )}>
                          <step.icon className={cn("w-4 h-4", aiTrainingProgress >= step.min && "animate-bounce")} />
                          <span className="text-[8px] font-bold uppercase">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <span>Start AI Training</span>
                    <span className="text-[10px] opacity-80 font-normal">Master AI & Life Coach</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enrollment Stats & Revenue Focus Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl flex items-center justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Your Certification Profit</div>
            <div className="text-3xl font-black mb-2">$145.00</div>
            <p className="text-xs text-indigo-100">Earned from high-performance tasks.</p>
          </div>
          <div className="p-3 bg-white/20 rounded-2xl relative z-10">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-8 h-8 text-orange-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Community Revenue Share (80/20)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              For every AI model you train or course you help develop, 80% of the generated revenue goes to the platform treasury for development, and 20% is distributed to you as a direct reward.
              <span className="block mt-2 font-bold text-orange-600 text-xs uppercase tracking-widest">Global MoR Tax Remittance Applied</span>
            </p>
          </div>
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('show-notification', { 
                detail: { 
                  title: "Join Creator Program", 
                  body: "Apply to become a verified educator and earn from your knowledge." 
                } 
              }));
            }}
            className="w-full sm:w-auto px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl whitespace-nowrap hover:scale-105 active:scale-95 transition-all"
          >
            Start Earning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const isEnrolled = enrolledCourses.includes(course.id);
          
          return (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="h-48 relative">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold shadow-sm flex items-center">
                  <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                  {course.price}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center space-x-2 text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                  <img src={course.badgeIcon} alt="LinkedIn" className="w-4 h-4" />
                  <span>LinkedIn Badge Included</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-6 mt-auto">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {course.duration}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-1" />
                    {course.students.toLocaleString()} students
                  </div>
                </div>
                
                {isEnrolled ? (
                  <div className="space-y-2">
                    <button 
                      onClick={() => updateSelectedCourse(course)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 transition-all active:scale-95"
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Start Study
                    </button>
                    <button 
                      onClick={() => handleBuyCertificate(course)}
                      disabled={isBuyingCertificate}
                      className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      {isBuyingCertificate ? 'Processing...' : 'Get Premium Certificate ($19.99)'}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => updateSelectedCourse(course)}
                    className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    View Course
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[160] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 sm:zoom-in duration-300 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
            <div className="relative h-32 sm:h-64 shrink-0">
              <img src={selectedCourse.image} alt={selectedCourse.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4 sm:p-6">
                <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight">{selectedCourse.title}</h2>
              </div>
              <button 
                onClick={() => updateSelectedCourse(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 mb-6 text-xs font-medium text-gray-600 dark:text-gray-300">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full w-fit">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedCourse.instructor}
                </div>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full w-fit">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedCourse.duration}
                </div>
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full w-fit">
                  <img src={selectedCourse.badgeIcon} alt="LinkedIn" className="w-4 h-4 mr-2" />
                  {selectedCourse.badge} Badge
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2">About this course</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4 sm:line-clamp-none">
                    {selectedCourse.description}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3 text-center sm:text-left">Certification Assets</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 mb-1 sm:mb-2" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">Verified ID</span>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                      <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mb-1 sm:mb-2" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">LinkedIn Vault</span>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                      <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 mb-1 sm:mb-2" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">ID Hash</span>
                    </div>
                    <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mb-1 sm:mb-2" />
                      <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">Instant</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Course Curriculum</h3>
                    {enrolledCourses.includes(selectedCourse.id) && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                        Progress: {Math.round((selectedCourse.modules.filter((m: string) => completedModules.includes(`${selectedCourse.id}-${m}`)).length / selectedCourse.modules.length) * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {selectedCourse.modules.map((module: string, idx: number) => {
                      const isModuleDone = completedModules.includes(`${selectedCourse.id}-${module}`);
                      
                      return (
                        <div key={idx} className="group relative">
                          <div className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all gap-3",
                            isModuleDone 
                              ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30" 
                              : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-900"
                          )}>
                            <div className="flex items-start">
                              <div className={cn(
                                "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mr-3 sm:mr-4 shrink-0 mt-0.5 transition-colors",
                                isModuleDone
                                  ? "bg-green-600 text-white"
                                  : "bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-600 group-hover:text-white"
                              )}>
                                {isModuleDone ? <CheckCircle2 className="w-5 h-5 sm:w-6 h-6" /> : <PlayCircle className="w-5 h-5 sm:w-6 h-6" />}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">Module {idx + 1}</div>
                                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{module}</div>
                                <div className="text-[9px] sm:text-[10px] text-gray-400 mt-1 sm:mt-2 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>Video Content • Quiz • Professional Project</span>
                                  {enrolledCourses.includes(selectedCourse.id) && (
                                    <div className="relative">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setShowTranslateDropdown(showTranslateDropdown === module ? null : module); }}
                                        className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline py-0.5 transition-all"
                                      >
                                        <Languages className="w-3 h-3" />
                                        Translate Video
                                      </button>
                                      
                                      <AnimatePresence>
                                        {showTranslateDropdown === module && (
                                          <motion.div 
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-[100] p-1.5 min-w-[140px]"
                                          >
                                            {LANGUAGES.map(lang => (
                                              <button
                                                key={lang.code}
                                                onClick={(e) => { e.stopPropagation(); handleTranslateVideo(selectedCourse.title, module, lang); }}
                                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg text-[10px] font-bold transition-all flex items-center justify-between group"
                                              >
                                                <span className="flex items-center gap-2">
                                                  <span className="text-xs group-hover:scale-125 transition-transform">{lang.flag}</span>
                                                  <span className="text-gray-700 dark:text-gray-300">{lang.name}</span>
                                                </span>
                                                {selectedLanguage.code === lang.code && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                              </button>
                                            ))}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  )}
                                  {enrolledCourses.includes(selectedCourse.id) && (
                                    <div className="flex items-center gap-3">
                                      {isGeneratingAudio === module ? (
                                        <div className="flex items-center gap-2 py-0.5 text-blue-600 animate-pulse">
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          <span className="text-[9px] uppercase font-bold tracking-tighter">Synthesizing Intelligence...</span>
                                        </div>
                                      ) : isPlayingAudio === module ? (
                                        <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-800 transition-all shadow-sm">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleSeek('backward', module); }}
                                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full transition-colors"
                                            title="Backward 10s"
                                          >
                                            <SkipBack className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                          </button>
                                          
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleSeek('backward', module); }}
                                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full transition-colors"
                                            title="Backward 10s"
                                          >
                                            <SkipBack className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                          </button>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                            className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800 rounded-full transition-colors group"
                                            title="Stop Audio"
                                          >
                                            <VolumeX className="w-2.5 h-2.5 text-red-600 dark:text-red-400 group-hover:scale-110" />
                                          </button>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleSeek('forward', module); }}
                                            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-full transition-colors"
                                            title="Forward 10s"
                                          >
                                            <SkipForward className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                          </button>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); toggleAudioSpeed(); }}
                                            className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 rounded text-[8px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors"
                                            title="Toggle Speed"
                                          >
                                            {audioSpeed}x
                                          </button>

                                          <div className="flex flex-col ml-1 min-w-[50px]">
                                            <div className="h-1 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden w-12 sm:w-16">
                                              <div 
                                                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300" 
                                                style={{ width: `${(audioCurrentTime / audioTotalDuration) * 100}%` }}
                                              />
                                            </div>
                                            <div className="text-[7px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
                                              {Math.floor(audioCurrentTime)}s / {Math.floor(audioTotalDuration)}s
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div 
                                          className="flex items-center gap-1.5 py-0.5 transition-all"
                                        >
                                           {VOICES.map(voice => (
                                              <button 
                                                key={voice.id}
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  setSelectedVoice(voice);
                                                  handlePlayAudio(selectedCourse.title, module); 
                                                }}
                                                className={cn(
                                                  "flex items-center gap-1.5 py-1 px-2.5 rounded-full font-black text-[9px] uppercase tracking-tighter transition-all hover:scale-105 active:scale-95 shadow-sm border",
                                                  selectedVoice.id === voice.id && isPlayingAudio === module
                                                    ? (voice.gender === 'male' ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20" : "bg-pink-600 border-pink-500 text-white shadow-pink-500/20")
                                                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700"
                                                )}
                                              >
                                                <User className={cn("w-2.5 h-2.5", voice.gender === 'male' ? "text-blue-400" : "text-pink-400")} />
                                                {voice.label}
                                              </button>
                                           ))}
                                        </div>
                                      )}


                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {enrolledCourses.includes(selectedCourse.id) && (
                              <div className="flex sm:flex-col gap-2 shrink-0">
                                <button 
                                  onClick={() => handleDeepDive(selectedCourse.title, module)}
                                  disabled={isDeepDiving && deepDiveModule === module}
                                  className={cn(
                                    "flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5",
                                    (isDeepDiving && deepDiveModule === module) && "opacity-70 cursor-not-allowed"
                                  )}
                                >
                                  {isDeepDiving && deepDiveModule === module ? (
                                     <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                     <Sparkles className="w-3 h-3" />
                                  )}
                                  {isDeepDiving && deepDiveModule === module ? "Analyzing..." : "AI Deep Dive"}
                                </button>
                                {!isModuleDone && (
                                  <button 
                                    onClick={() => handleCompleteModule(selectedCourse.id, selectedCourse.title, module)}
                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                  >
                                    Mark Complete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* AI Translation Expanded Content */}
                          {moduleTranslations[`${selectedCourse.title}-${module}-${selectedLanguage.code}`] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                  <Languages className="w-4 h-4" />
                                  Video Intel Translation ({selectedLanguage.name})
                                </div>
                                <button 
                                  onClick={() => {
                                    const newTrans = { ...moduleTranslations };
                                    delete newTrans[`${selectedCourse.title}-${module}-${selectedLanguage.code}`];
                                    setModuleTranslations(newTrans);
                                  }}
                                  className="text-[9px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  Close Intel
                                </button>
                              </div>
                              <div className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                                {moduleTranslations[`${selectedCourse.title}-${module}-${selectedLanguage.code}`]}
                              </div>
                            </motion.div>
                          )}

                          {isTranslating === module && (
                            <div className="mt-2 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center gap-3 border border-indigo-100 dark:border-indigo-800 border-dashed animate-pulse">
                              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                                Generating AI {selectedLanguage.name} Translation...
                              </span>
                            </div>
                          )}
                          
                          {/* Deep Dive Expanded Content */}
                          {deepDiveModule === module && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800 relative overflow-hidden"
                            >
                              <div className="absolute top-4 right-4 flex gap-2">
                                <button 
                                  onClick={handleCloseDeepDive}
                                  className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4 rotate-180" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                                <BrainCircuit className="w-5 h-5 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest">AI Super-Intelligence Deep Dive</span>
                              </div>

                              {isDeepDiving ? (
                                <div className="flex flex-col items-center py-10">
                                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                  <p className="text-sm font-bold text-gray-500 animate-pulse">Aggregating Global Knowledge...</p>
                                </div>
                              ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                  {deepDiveContent}
                                  
                                  <div className="mt-8 pt-6 border-t border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                                        <ShieldCheck className="w-4 h-4" />
                                        AI Authenticated Content
                                      </div>
                                      
                                      {isGeneratingAudio === module ? (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-blue-600 animate-pulse">
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                          <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing...</span>
                                        </div>
                                      ) : isPlayingAudio === module ? (
                                        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-sm animate-in zoom-in-95">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleSeek('backward', module); }}
                                            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-700"
                                          >
                                            <SkipBack className="w-3 h-3" />
                                          </button>
                                          
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); stopAudio(); }}
                                            className="p-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-all shadow-md shadow-red-500/20"
                                          >
                                            <VolumeX className="w-4 h-4" />
                                          </button>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleSeek('forward', module); }}
                                            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-700"
                                          >
                                            <SkipForward className="w-3 h-3" />
                                          </button>

                                          <button 
                                            onClick={(e) => { e.stopPropagation(); toggleAudioSpeed(); }}
                                            className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-[9px] font-black text-indigo-600 shadow-sm border border-indigo-100 dark:border-indigo-700 hover:bg-indigo-50 transition-all"
                                            title="Toggle Speed"
                                          >
                                            {audioSpeed}x
                                          </button>

                                          <div className="flex flex-col ml-1 min-w-[70px]">
                                            <div className="h-1.5 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden w-20 sm:w-32">
                                              <div 
                                                className="h-full bg-indigo-600 transition-all duration-300" 
                                                style={{ width: `${(audioCurrentTime / audioTotalDuration) * 100}%` }}
                                              />
                                            </div>
                                            <div className="flex justify-between mt-1 items-center">
                                              <span className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter">
                                                Intelligence Flowing
                                              </span>
                                              <span className="text-[8px] font-black text-indigo-600 tabular-nums">
                                                {Math.floor(audioCurrentTime)}s / {Math.floor(audioTotalDuration)}s
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          {VOICES.map(voice => (
                                            <button 
                                              key={voice.id}
                                              onClick={() => {
                                                setSelectedVoice(voice);
                                                handlePlayAudio(selectedCourse.title, module, deepDiveContent);
                                              }}
                                              className={cn(
                                                "flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md",
                                                selectedVoice.id === voice.id && isPlayingAudio === module
                                                  ? (voice.gender === 'male' ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-pink-600 text-white shadow-pink-500/20")
                                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 border border-gray-100 dark:border-gray-700 shadow-none"
                                              )}
                                            >
                                              {voice.gender === 'male' ? <User className="w-4 h-4 text-blue-400" /> : <User className="w-4 h-4 text-pink-400" />}
                                              {voice.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => handleCompleteModule(selectedCourse.id, selectedCourse.title, module)}
                                      disabled={isModuleDone}
                                      className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white text-[10px] font-black rounded-lg hover:bg-green-700 transition-all shadow-md shadow-green-500/20 disabled:opacity-50"
                                    >
                                      {isModuleDone ? 'Mastered' : 'Complete Module'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {(selectedCourse as any).learningObjectives && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-wider mb-3 flex items-center">
                      <Brain className="w-4 h-4 mr-2" />
                      Mastery Objectives
                    </h3>
                    <ul className="space-y-2">
                      {(selectedCourse as any).learningObjectives.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {enrolledCourses.includes(selectedCourse.id) && (
                  <div className="mt-4 sm:mt-8 pt-4 sm:pt-8 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 sm:p-6 border border-blue-100 dark:border-blue-800">
                      <h3 className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                        AI Assistant
                      </h3>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-4 font-medium">
                        Ask your Master AI Tutor anything about this course.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="relative">
                          <textarea
                            value={tutorQuestion}
                            onChange={(e) => setTutorQuestion(e.target.value)}
                            placeholder="e.g. Can you explain Agile in simple terms?"
                            className="w-full bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px] sm:min-h-[100px] resize-none"
                          />
                          <button
                            onClick={() => handleAskTutor(selectedCourse.title)}
                            disabled={isAskingTutor || !tutorQuestion.trim()}
                            className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isAskingTutor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          </button>
                        </div>

                        {tutorAnswer && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-700 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                          >
                            <div className="font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center">
                              <Brain className="w-4 h-4 mr-2" />
                              AI Tutor:
                            </div>
                            {tutorAnswer}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">${selectedCourse.price}</div>
                  <div className="text-[10px] sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 sm:mt-1">
                    {enrolledCourses.includes(selectedCourse.id) ? 'Professional Access Unlocked' : 'Supports Platform Sustainability'}
                  </div>
                </div>
                
                {enrolledCourses.includes(selectedCourse.id) ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedCourse.modules.every((m: string) => completedModules.includes(`${selectedCourse.id}-${m}`)) ? (
                      <button 
                        onClick={() => handleBuyCertificate(selectedCourse)}
                        disabled={isBuyingCertificate}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                      >
                        <Award className="w-5 h-5" />
                        {isBuyingCertificate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim Certificate'}
                      </button>
                    ) : (
                      <div className="w-full sm:w-auto px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                        <Clock className="w-4 h-4" />
                        Finish modules for Certification
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => handleEnroll(selectedCourse)}
                    disabled={isEnrolling}
                    className="w-full sm:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isEnrolling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Enrolling...
                      </>
                    ) : (
                      'Enroll Now'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Exam Modal */}
      {isTakingExam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Final Executive Assessment</h2>
              <p className="text-indigo-100 text-sm mt-2">Pulse Global Professional Standards Dept.</p>
            </div>

            <div className="p-8">
              {examQuestions.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                  <p className="font-bold text-gray-500 animate-pulse">Generating Custom High-Stakes Evaluation...</p>
                </div>
              ) : examResult ? (
                <div className="text-center py-8 space-y-6">
                  <div className={cn(
                    "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                    examResult.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  )}>
                    {examResult.passed ? <CheckCircle2 className="w-12 h-12" /> : <ShieldAlert className="w-12 h-12" />}
                  </div>
                  
                  <div>
                    <div className="text-4xl font-black">{Math.round(examResult.score)}%</div>
                    <div className={cn("text-lg font-bold uppercase tracking-widest mt-2", examResult.passed ? "text-green-600" : "text-red-600")}>
                      {examResult.passed ? "Assessment Passed" : "Assessment Failed"}
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm">
                    {examResult.passed 
                      ? "Congratulations! Your executive competence has been verified. Your Professional Badge has been authorized and an engagement bonus has been credited." 
                      : "The evaluation standards were not met. We recommend revisiting the AI Deep Dive modules before re-attempting the mastery scan."}
                  </p>

                  <button 
                    onClick={() => {
                      setIsTakingExam(false);
                      if (examResult.passed) {
                        setSelectedCourse(null);
                      }
                    }}
                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all"
                  >
                    Return to Hub
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Question {currentExamIndex + 1} of {examQuestions.length}</span>
                    <div className="flex gap-1">
                      {examQuestions.map((_, i) => (
                        <div key={i} className={cn("w-6 h-1 rounded-full", i <= currentExamIndex ? "bg-indigo-600" : "bg-gray-200")} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      {examQuestions[currentExamIndex].question}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {examQuestions[currentExamIndex].options.map((opt: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newAnswers = [...examAnswers];
                          newAnswers[currentExamIndex] = idx.toString();
                          setExamAnswers(newAnswers);
                        }}
                        className={cn(
                          "w-full p-4 rounded-2xl text-left font-bold transition-all border-2",
                          examAnswers[currentExamIndex] === idx.toString()
                            ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                            : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                            examAnswers[currentExamIndex] === idx.toString() ? "bg-indigo-600 text-white" : "bg-white text-gray-400"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          {opt}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    {currentExamIndex > 0 && (
                      <button 
                        onClick={() => setCurrentExamIndex(prev => prev - 1)}
                        className="flex-1 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (currentExamIndex < examQuestions.length - 1) {
                          setCurrentExamIndex(prev => prev + 1);
                        } else {
                          handleExamSubmit();
                        }
                      }}
                      disabled={examAnswers[currentExamIndex] === undefined}
                      className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                    >
                      {currentExamIndex < examQuestions.length - 1 ? 'Next Question' : 'Complete Assessment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mt-16 pt-12 border-t border-gray-100 dark:border-gray-800">
        <div className="bg-white dark:bg-gray-800/40 rounded-[2.5rem] p-8 sm:p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
          
          <ShieldAlert className="w-10 h-10 text-indigo-200 dark:text-indigo-900 mx-auto mb-6" />
          <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-4">Official Disclaimer & Ethics Statement</h4>
          
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
              Pulse Feeds Education is a high-performance simulation and professional developmental ecosystem. All curriculum, AI-Mentor insights, and certifications are designed to bridge the gap between academic theory and real-world executive execution.
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-500 leading-relaxed italic opacity-80">
              Please note: Completion of internal course paths provides deep skill augmentation but does not constitute official certification from third-party regulatory bodies (e.g., PMI®, Scrum Alliance®). We recommend using these certificates to enhance your professional portfolio alongside verified industry credentials. Pulse Feeds does not guarantee specific employment outcomes, as success is dependent on individual application and market conditions.
            </p>
          </div>
          
          <div className="mt-10 pt-8 border-t border-gray-50 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <Brain className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">
                Intelligence Powered<br/>By Pulse Global
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
              &copy; {new Date().getFullYear()} Pulse Feeds. Developed for Global Excellence.<br/>
              Human-Centric Data Intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
