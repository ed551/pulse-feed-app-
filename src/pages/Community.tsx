import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Gem, TrendingUp, Clock, CheckCircle2, AlertCircle, 
  Loader2, MessageSquare, Share2, Info, Sparkles, Heart, Award, Zap,
  MapPin, Camera, Shield, Search, Filter, Plus, Megaphone, Handshake,
  Lightbulb, Wrench, GraduationCap, ChevronRight, Star, ArrowUpCircle,
  BrainCircuit, X, Send, PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { generateContentWithRetry } from '../lib/ai';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface CommunityTask {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: React.ElementType;
  category: 'Engagement' | 'Support' | 'Growth' | 'Civic';
  completed: boolean;
}

interface CommunityReport {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'Pending' | 'Investigating' | 'Resolved';
  location: string;
  lat?: number;
  lng?: number;
  reporterName: string;
  timestamp: any;
  upvotes: number;
  aiAnalysis?: string;
  bounty?: number;
  solutionPrice?: number;
}

interface CommunityPoll {
  id: string;
  question: string;
  options: { text: string; votes: number }[];
  voters: string[];
  endsAt: any;
  category: string;
  status: 'Active' | 'Closed';
}

interface SkillOffer {
  id: string;
  userName: string;
  skill: string;
  description: string;
  price: number;
  rating: number;
  category: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: any;
  location: string;
  category: string;
  attendees: number;
}

export default function Community() {
  const { currentUser, userData } = useAuth();
  const { totalEarnedToday, addRevenue } = useRevenue();
  const [tasks, setTasks] = useState<CommunityTask[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [polls, setPolls] = useState<CommunityPoll[]>([]);
  const [skills, setSkills] = useState<SkillOffer[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', description: '', location: '' });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [activeView, setActiveView] = useState<'map' | 'bounties' | 'marketplace' | 'insights'>('map');

  const buyInsight = async (insightTitle: string, price: number) => {
    if (!currentUser || !userData) return;
    if ((userData.balance || 0) < price) {
      alert("Insufficient balance to purchase this insight report.");
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      // Paid community revenue is 100% platform revenue
      const platformShare = price;
      const userShare = 0;

      await updateDoc(userRef, {
        balance: increment(-price)
      });

      await addRevenue(userShare, platformShare, `B2B Insight: ${insightTitle}`, 'community');
      alert(`Insight report "${insightTitle}" purchased! The PDF report has been sent to your email.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    const sampleTasks: CommunityTask[] = [
      { id: '1', title: 'Welcome New Members', description: 'Comment on 5 new member posts to help them feel at home.', reward: 50, icon: Heart, category: 'Support', completed: false },
      { id: '2', title: 'Share Community Insight', description: 'Create a post with the #Insight tag to share knowledge.', reward: 100, icon: Zap, category: 'Engagement', completed: false },
      { id: '3', title: 'Report a Local Issue', description: 'Use the Pulse Map to report a real-world problem in your area.', reward: 150, icon: MapPin, category: 'Civic', completed: false },
      { id: '4', title: 'Invite a Friend', description: 'Use your referral link to bring a new member to Pulse Feeds.', reward: 200, icon: Users, category: 'Growth', completed: false },
    ];
    setTasks(sampleTasks);

    // Fetch Community Reports
    const reportsQuery = query(collection(db, 'community_reports'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityReport[];
      if (fetchedReports.length === 0) {
        setReports([
          { id: 'r1', title: 'Broken Street Light', description: 'The light on 5th Ave has been out for 3 days.', category: 'Safety', status: 'Investigating', location: 'Downtown', reporterName: 'John D.', timestamp: new Date(), upvotes: 12, aiAnalysis: 'High priority for nighttime safety.', bounty: 5.00 },
          { id: 'r2', title: 'Pothole Alert', description: 'Large pothole near the school entrance.', category: 'Infrastructure', status: 'Pending', location: 'Westside', reporterName: 'Sarah M.', timestamp: new Date(), upvotes: 45, aiAnalysis: 'Potential hazard for school buses.', bounty: 15.00, solutionPrice: 2.99 }
        ]);
      } else {
        setReports(fetchedReports);
      }
    });

    // Fetch Community Polls
    const pollsQuery = query(collection(db, 'community_polls'), orderBy('endsAt', 'desc'), limit(5));
    const unsubscribePolls = onSnapshot(pollsQuery, (snapshot) => {
      const fetchedPolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityPoll[];
      if (fetchedPolls.length === 0) {
        setPolls([
          { 
            id: 'p1', 
            question: 'Should we add a community garden in the North Park?', 
            options: [{ text: 'Yes, absolutely!', votes: 156 }, { text: 'Maybe later', votes: 42 }, { text: 'No, keep it as is', votes: 12 }],
            voters: [],
            endsAt: new Date(Date.now() + 86400000 * 3),
            category: 'Environment',
            status: 'Active'
          }
        ]);
      } else {
        setPolls(fetchedPolls);
      }
    });

    // Generate AI Community Summary
    const generateSummary = async () => {
      try {
        const summary = await generateContentWithRetry({
          model: "gemini-3-flash-preview",
          contents: "Summarize the current community vibe: People are reporting potholes, offering coding skills, and voting for a new garden. Keep it under 2 sentences, encouraging and energetic."
        });
        setAiSummary(summary.text || "The community is buzzing with activity! From infrastructure improvements to skill sharing, Pulse members are actively building a better neighborhood together.");
      } catch (error) {
        console.error("Error generating summary:", error);
      }
    };
    generateSummary();

    // Fetch Community Events
    const eventsQuery = query(collection(db, 'events'), orderBy('date', 'asc'), limit(5));
    const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CommunityEvent[];
      if (fetchedEvents.length === 0) {
        setEvents([
          { id: 'e1', title: 'Weekend Clean-up Drive', description: 'Join us to clean the local park and earn bonus points.', date: new Date(Date.now() + 86400000 * 2), location: 'Central Park', category: 'Civic', attendees: 24 },
          { id: 'e2', title: 'Tech Workshop: AI Basics', description: 'Learn how AI works in our community app.', date: new Date(Date.now() + 86400000 * 5), location: 'Community Center', category: 'Education', attendees: 15 }
        ]);
      } else {
        setEvents(fetchedEvents);
      }
    });

    // Sample Skills
    setSkills([
      { id: 's1', userName: 'David L.', skill: 'Basic Coding', description: 'I can help you get started with HTML/CSS.', price: 500, rating: 4.9, category: 'Education' },
      { id: 's2', userName: 'Emma W.', skill: 'Gardening Tips', description: 'Expert advice on urban vegetable gardens.', price: 300, rating: 5.0, category: 'Lifestyle' },
      { id: 's3', userName: 'Kev O.', skill: 'Tech Support', description: 'Fixing slow laptops and software issues.', price: 450, rating: 4.7, category: 'Services' }
    ]);

    setLoading(false);
    return () => {
      unsubscribeReports();
      unsubscribePolls();
      unsubscribeEvents();
    };
  }, []);

  const claimTaskReward = async (task: CommunityTask) => {
    if (!currentUser || isClaiming) return;
    setIsClaiming(true);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const monetaryValue = task.reward / 100;
      
      // User engagement excluding payment is 50/50 distribution
      // We give the user their share and log an equal share for the platform
      const userShare = monetaryValue;
      const platformShare = monetaryValue;

      await addRevenue(userShare, platformShare, `Task Completed: ${task.title}`, 'community');

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      alert(`Great job! You earned ${task.reward} points ($${monetaryValue.toFixed(2)}) for your community contribution!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || isSubmittingReport) return;
    setIsSubmittingReport(true);

    try {
      // AI Analysis of the problem
      const aiPrompt = `Analyze this community problem report: "${newReport.title} - ${newReport.description}". Provide a 1-sentence assessment of its impact and priority.`;
      const aiResponse = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: aiPrompt
      });

      await addDoc(collection(db, 'community_reports'), {
        ...newReport,
        category: 'General',
        status: 'Pending',
        reporterName: userData?.displayName || 'Anonymous',
        reporterUid: currentUser.uid,
        timestamp: serverTimestamp(),
        upvotes: 0,
        lat: -1.286389 + (Math.random() - 0.5) * 0.1,
        lng: 36.817223 + (Math.random() - 0.5) * 0.1,
        aiAnalysis: aiResponse.text || 'Awaiting further assessment.'
      });

      setShowReportModal(false);
      setNewReport({ title: '', description: '', location: '' });
      alert("Problem reported successfully! Our AI has analyzed your report and tagged it for investigation.");
      
      // Auto-complete the "Report a Local Issue" task if it exists
      const civicTask = tasks.find(t => t.category === 'Civic' && !t.completed);
      if (civicTask) {
        claimTaskReward(civicTask);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'community_reports');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const voteInPoll = async (pollId: string, optionIndex: number) => {
    if (!currentUser) return;
    try {
      const pollRef = doc(db, 'community_polls', pollId);
      const poll = polls.find(p => p.id === pollId);
      if (!poll || poll.voters.includes(currentUser.uid)) return;

      const newOptions = [...poll.options];
      newOptions[optionIndex].votes += 1;

      await updateDoc(pollRef, {
        options: newOptions,
        voters: [...poll.voters, currentUser.uid]
      });
      alert("Your vote has been counted! Thanks for participating in community governance.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_polls/${pollId}`);
    }
  };

  const bookSkill = async (skill: SkillOffer) => {
    if (!currentUser || !userData) return;
    if (userData.balance < skill.price / 100) {
      alert("Insufficient balance to book this skill session.");
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const cost = skill.price / 100;

      await updateDoc(userRef, {
        balance: increment(-cost),
        points: increment(-skill.price)
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        amount: -skill.price,
        monetaryValue: -cost,
        type: 'payment',
        revenueSource: 'skill-booking',
        timestamp: serverTimestamp(),
        title: `Booked Skill: ${skill.skill} with ${skill.userName}`
      });

      alert(`Session booked! ${skill.userName} will contact you shortly via your registered email.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const buySolution = async (report: CommunityReport) => {
    if (!currentUser || !userData || !report.solutionPrice) return;
    if (userData.balance < report.solutionPrice) {
      alert("Insufficient balance to unlock this solution.");
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      // Paid community revenue is 100% platform revenue
      const platformShare = report.solutionPrice;
      const userShare = 0;

      await updateDoc(userRef, {
        balance: increment(-report.solutionPrice)
      });

      await addRevenue(userShare, platformShare, `Solution Unlocked: ${report.title}`, 'community');
      alert("Solution unlocked! You can now view the full engineering report and suggested fixes.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const sponsorBounty = async (reportId: string, amount: number) => {
    if (!currentUser || !userData) return;
    if (userData.balance < amount) {
      alert("Insufficient balance to sponsor this bounty.");
      return;
    }

    try {
      const reportRef = doc(db, 'community_reports', reportId);
      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        balance: increment(-amount)
      });

      await updateDoc(reportRef, {
        bounty: increment(amount)
      });

      alert(`Bounty sponsored! You've added $${amount.toFixed(2)} to the reward pool for solving this issue.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `community_reports/${reportId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center gap-3">
          <Users className="w-10 h-10 text-indigo-600" />
          Community Dashboard
        </h1>
        <p className="text-gray-500 text-sm">Contribute to the community and earn rewards. Your activity builds our collective value.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-4"
      >
        <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-xl">
          <Megaphone className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">Community Announcement</h3>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">The "Weekend Clean-up Drive" is this Saturday! Double points for all participants.</p>
        </div>
        <button className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black rounded-lg hover:bg-amber-700 transition-all">
          Details
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <Gem className="w-8 h-8 text-indigo-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Balance</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            ${(userData?.balance || 0).toFixed(2)}
          </p>
          <p className="text-[10px] font-bold text-gray-400 mt-1">
            {userData?.points || 0} Points
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's Impact</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{totalEarnedToday} pts</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
          <Users className="w-8 h-8 text-purple-500 mb-2" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Community Size</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">12.4k</p>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
        <button 
          onClick={() => setActiveView('map')}
          className={cn(
            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
            activeView === 'map' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
          )}
        >
          Pulse Map
        </button>
        <button 
          onClick={() => setActiveView('bounties')}
          className={cn(
            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
            activeView === 'bounties' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
          )}
        >
          Bounties
        </button>
        <button 
          onClick={() => setActiveView('marketplace')}
          className={cn(
            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
            activeView === 'marketplace' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
          )}
        >
          Solutions
        </button>
        <button 
          onClick={() => setActiveView('insights')}
          className={cn(
            "flex-1 py-2 text-xs font-black rounded-xl transition-all",
            activeView === 'insights' ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500"
          )}
        >
          B2B Insights
        </button>
      </div>

      {activeView === 'map' && (
        <>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-4">
        <Info className="w-6 h-6 text-indigo-500 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">Community Rewards Program</h3>
          <p className="text-xs text-indigo-800/70 dark:text-indigo-200/70 leading-relaxed">
            Pulse Feeds is powered by you. Complete tasks that help the community grow and stay healthy to earn points. 
            Points are synchronized with your cash balance (100 pts = $1.00).
          </p>
        </div>
      </div>

      {aiSummary && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BrainCircuit className="w-24 h-24" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h3 className="font-black text-sm uppercase tracking-widest">Community Pulse Summary</h3>
            </div>
            <p className="text-lg font-medium leading-relaxed italic">"{aiSummary}"</p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-200">
              <Clock className="w-3 h-3" />
              Updated just now by Pulse AI
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Available Tasks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => (
            <motion.div 
              key={task.id}
              whileHover={{ y: -2 }}
              className={cn(
                "bg-white dark:bg-gray-800 p-5 rounded-3xl border shadow-sm transition-all flex flex-col justify-between",
                task.completed ? "border-emerald-100 dark:border-emerald-900/30 opacity-75" : "border-gray-100 dark:border-gray-700"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "p-2 rounded-xl",
                    task.category === 'Engagement' ? "bg-blue-50 text-blue-500" :
                    task.category === 'Support' ? "bg-pink-50 text-pink-500" :
                    "bg-purple-50 text-purple-500"
                  )}>
                    <task.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {task.category}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{task.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">{task.description}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  <Gem className="w-4 h-4" />
                  +{task.reward} PTS
                </div>
                <button 
                  disabled={task.completed || isClaiming}
                  onClick={() => claimTaskReward(task)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                    task.completed 
                      ? "bg-emerald-50 text-emerald-600 cursor-default" 
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                  )}
                >
                  {task.completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </>
                  ) : isClaiming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Complete Task"
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            Pulse Map: Local Issues
          </h2>
          <button 
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-200 dark:shadow-none"
          >
            <Plus className="w-4 h-4" />
            Report Issue
          </button>
        </div>

          <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-xl relative z-0">
          <MapContainer 
            center={[-1.286389, 36.817223]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {reports.map((report) => (
              <Marker 
                key={report.id} 
                position={[report.lat || -1.286389 + (Math.random() - 0.5) * 0.05, report.lng || 36.817223 + (Math.random() - 0.5) * 0.05]}
              >
                <Popup>
                  <div className="p-1 min-w-[150px]">
                    <h3 className="font-bold text-sm text-gray-900">{report.title}</h3>
                    <p className="text-[10px] text-gray-500 mb-2 line-clamp-2">{report.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                      <span className={cn(
                        "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                        report.status === 'Resolved' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {report.status}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400">{report.location}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest",
                        report.status === 'Resolved' ? "bg-emerald-50 text-emerald-600" :
                        report.status === 'Investigating' ? "bg-blue-50 text-blue-600" :
                        "bg-amber-50 text-amber-600"
                      )}>
                        {report.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{report.category}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{report.title}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {report.location}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-all text-gray-400 hover:text-red-500">
                      <ArrowUpCircle className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-black text-gray-600 dark:text-gray-400">{report.upvotes}</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{report.description}</p>
                
                {report.bounty && (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">Active Bounty: ${report.bounty.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => sponsorBounty(report.id, 5.00)}
                      className="text-[10px] font-black text-emerald-600 hover:underline"
                    >
                      + Sponsor $5
                    </button>
                  </div>
                )}

                {report.aiAnalysis && (
                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 flex items-start gap-3">
                    <BrainCircuit className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-800 dark:text-indigo-200 italic leading-relaxed">
                      <span className="font-bold not-italic mr-1">AI Insight:</span>
                      {report.aiAnalysis}
                    </p>
                  </div>
                )}

                {report.solutionPrice && (
                  <button 
                    onClick={() => buySolution(report)}
                    className="w-full py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Unlock Solution Report (${report.solutionPrice})
                  </button>
                )}
                
                <div className="pt-2 flex items-center justify-between border-t border-gray-50 dark:border-gray-700">
                  <span className="text-[10px] text-gray-400 font-bold">Reported by {report.reporterName}</span>
                  <button className="text-[10px] font-black text-indigo-600 hover:underline">View Updates</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}

    {activeView === 'bounties' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-2">
              <h2 className="text-2xl font-black">Community Bounties</h2>
              <p className="text-emerald-100 text-sm max-w-md">Solve these high-priority problems to earn cash rewards sponsored by the community and local businesses.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {reports.filter(r => r.bounty).map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">{report.title}</h3>
                  <p className="text-xs text-gray-500">{report.location} • {report.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-600">${report.bounty?.toFixed(2)}</div>
                  <button className="text-[10px] font-black text-indigo-600 hover:underline">Submit Solution</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'marketplace' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lightbulb className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-2">
              <h2 className="text-2xl font-black">Solution Marketplace</h2>
              <p className="text-indigo-100 text-sm max-w-md">Access professional engineering reports and step-by-step fixes for community issues.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.filter(r => r.solutionPrice).map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <img src={`https://picsum.photos/seed/${report.id}/400/200`} className="w-full h-32 object-cover rounded-2xl" alt="" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{report.title} Solution</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">Complete technical breakdown and cost estimation for fixing the {report.title.toLowerCase()}.</p>
                </div>
                <button 
                  onClick={() => buySolution(report)}
                  className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Unlock for ${report.solutionPrice}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'insights' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-purple-600 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <PieChart className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-2">
              <h2 className="text-2xl font-black">B2B Data Insights</h2>
              <p className="text-purple-100 text-sm max-w-md">Anonymized, AI-powered community pulse reports for businesses and urban planners.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Nairobi Mobility Trends Q2", price: 299, description: "Deep dive into traffic patterns and infrastructure needs based on 10k+ community reports.", category: "Infrastructure" },
              { title: "Community Safety Index 2026", price: 499, description: "Comprehensive safety analysis and risk assessment for residential areas.", category: "Safety" },
              { title: "Local Consumer Sentiment", price: 199, description: "Real-time feedback on local services and retail needs in the Westlands area.", category: "Retail" }
            ].map((insight, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[10px] font-black uppercase tracking-widest">{insight.category}</span>
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{insight.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{insight.description}</p>
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-xl font-black text-gray-900 dark:text-white">${insight.price}</div>
                  <button 
                    onClick={() => buyInsight(insight.title, insight.price)}
                    className="px-4 py-2 bg-purple-600 text-white text-[10px] font-black rounded-xl hover:bg-purple-700 transition-all"
                  >
                    Purchase Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Handshake className="w-5 h-5 text-emerald-500" />
            Skill Marketplace
          </h2>
          <button className="text-xs font-black text-indigo-600 hover:underline">See All Skills</button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {skills.map(skill => (
            <div key={skill.id} className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {skill.userName[0]}
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{skill.userName}</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-3 h-3 fill-yellow-500" />
                  <span className="text-[10px] font-black">{skill.rating}</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{skill.skill}</h3>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{skill.description}</p>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-black text-emerald-600">
                  {skill.price} pts <span className="text-[10px] text-gray-400 font-normal">/ session</span>
                </div>
                <button 
                  onClick={() => bookSkill(skill)}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg hover:bg-indigo-100 transition-all"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Community Governance
          </h2>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Polls</span>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {polls.map(poll => (
            <div key={poll.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                    {poll.category}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ends in {Math.ceil((poll.endsAt?.getTime ? poll.endsAt.getTime() - Date.now() : 0) / 86400000)} days
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{poll.question}</h3>
              </div>
              
              <div className="space-y-3">
                {poll.options.map((option, idx) => {
                  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
                  const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                  const hasVoted = poll.voters.includes(currentUser?.uid || '');
                  
                  return (
                    <button 
                      key={idx}
                      disabled={hasVoted}
                      onClick={() => voteInPoll(poll.id, idx)}
                      className="w-full group relative"
                    >
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{option.text}</span>
                        <span className="text-xs font-black text-indigo-600">{percentage}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full transition-all duration-1000",
                            hasVoted ? "bg-indigo-500" : "bg-gray-300 group-hover:bg-indigo-400"
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="pt-2 flex items-center justify-between border-t border-gray-50 dark:border-gray-700">
                <span className="text-[10px] text-gray-400 font-bold">
                  {poll.options.reduce((sum, o) => sum + o.votes, 0)} total votes
                </span>
                {poll.voters.includes(currentUser?.uid || '') && (
                  <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Vote Recorded
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Upcoming Events
          </h2>
          <button className="text-xs font-black text-indigo-600 hover:underline">View Calendar</button>
        </div>
        
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex flex-col items-center justify-center text-blue-600">
                  <span className="text-[10px] font-black uppercase">{new Date(event.date?.seconds ? event.date.seconds * 1000 : event.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black leading-none">{new Date(event.date?.seconds ? event.date.seconds * 1000 : event.date).getDate()}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{event.title}</h3>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location} • {event.attendees} attending
                  </p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 transition-all">
                Join
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Community Spotlight
          </h2>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Local Hero</span>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-6">
          <div className="relative">
            <img src="https://picsum.photos/seed/hero/200/200" className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-lg" alt="Local Hero" />
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white p-1.5 rounded-lg shadow-md">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Sarah Jenkins</h3>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Top Contributor of the Month</p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Sarah has reported 15 local issues and helped 5 neighbors with gardening tips this month. Her dedication makes our community shine!
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-1 text-[10px] font-black text-gray-500">
                <Gem className="w-3 h-3" />
                12.4k PTS
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black text-gray-500">
                <Heart className="w-3 h-3" />
                450 Likes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Achievement Badges
          </h2>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Collection</span>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'Civic Hero', icon: Shield, color: 'bg-red-50 text-red-500', earned: true },
            { name: 'Top Voter', icon: CheckCircle2, color: 'bg-blue-50 text-blue-500', earned: true },
            { name: 'Skill Master', icon: GraduationCap, color: 'bg-purple-50 text-purple-500', earned: false },
            { name: 'Pulse Pioneer', icon: Zap, color: 'bg-amber-50 text-amber-500', earned: true },
          ].map((badge, idx) => (
            <div key={idx} className={cn(
              "flex flex-col items-center gap-2 transition-all",
              !badge.earned && "grayscale opacity-30"
            )}>
              <div className={cn("p-3 rounded-2xl", badge.color)}>
                <badge.icon className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-black text-center uppercase tracking-tighter">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Community Leaderboard</h2>
          <TrendingUp className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="space-y-3">
          {[
            { name: 'Sarah J.', points: 12400, rank: 1, avatar: 'https://picsum.photos/seed/sarah/100/100' },
            { name: 'Mike R.', points: 10200, rank: 2, avatar: 'https://picsum.photos/seed/mike/100/100' },
            { name: 'Alex K.', points: 9800, rank: 3, avatar: 'https://picsum.photos/seed/alex/100/100' },
          ].map((user, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-400 w-4">{user.rank}</span>
                <img src={user.avatar} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800" alt="" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</span>
              </div>
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {user.points.toLocaleString()} PTS
              </div>
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-red-500" />
                    Report a Problem
                  </h2>
                  <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <form onSubmit={submitReport} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">What's the issue?</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g., Broken street light, Pothole..."
                      value={newReport.title}
                      onChange={e => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-red-500 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        required
                        type="text" 
                        placeholder="Street name or neighborhood"
                        value={newReport.location}
                        onChange={e => setNewReport(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-red-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Details</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Describe the problem in more detail..."
                      value={newReport.description}
                      onChange={e => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-red-500 transition-all text-sm resize-none"
                    />
                  </div>
                  
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                    <BrainCircuit className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-800 dark:text-indigo-200 leading-relaxed">
                      Our AI will analyze your report to prioritize it for community action and local authorities.
                    </p>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmittingReport}
                    className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2"
                  >
                    {isSubmittingReport ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Report
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

