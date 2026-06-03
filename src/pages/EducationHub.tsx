import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  Target, 
  ChevronRight, 
  Clock, 
  ShieldCheck, 
  Award, 
  Zap,
  Layout,
  Layers,
  Users,
  TrendingUp,
  BrainCircuit,
  Binary,
  Flame,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Sparkles,
  History,
  Megaphone,
  Briefcase,
  Code2,
  Brain,
  Cpu
} from 'lucide-react';

const badgeIcons: Record<string, React.ReactNode> = {
  'ShieldCheck': <ShieldCheck className="w-4 h-4 text-emerald-500" />,
  'Cpu': <Cpu className="w-4 h-4 text-purple-500" />,
  'TrendingUp': <TrendingUp className="w-4 h-4 text-indigo-500" />,
  'Code2': <Code2 className="w-4 h-4 text-blue-500" />,
  'Megaphone': <Megaphone className="w-4 h-4 text-orange-500" />,
  'Sparkles': <Sparkles className="w-4 h-4 text-pink-500" />,
  'Brain': <Brain className="w-4 h-4 text-rose-500" />,
  'Briefcase': <Briefcase className="w-4 h-4 text-amber-500" />,
};
import { getEducationCourses, getLastSyncInfo, Course } from '../lib/education';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useNotifications } from '../hooks/useNotifications';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import { revenue_distribution_engine } from '../lib/engines';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAIBreakerStatus } from '../lib/ai';

const categoryIcons: Record<string, React.ReactNode> = {
  'Technology': <BrainCircuit className="w-6 h-6 text-purple-500" />,
  'Business': <Layers className="w-6 h-6 text-indigo-500" />,
  'Finance': <TrendingUp className="w-6 h-6 text-emerald-500" />,
  'Personal Growth': <Target className="w-6 h-6 text-orange-500" />,
  'Marketing': <Sparkles className="w-6 h-6 text-pink-500" />,
  'Design': <Layout className="w-6 h-6 text-cyan-500" />,
  'AI': <Zap className="w-6 h-6 text-amber-500" />,
};

const STUDY_METHODS = [
  {
    title: "Pomodoro Technique",
    desc: "25 mins study, 5 mins break. Keeps focus high and prevents mental fatigue.",
    icon: <Clock className="w-5 h-5 text-red-500" />
  },
  {
    title: "The Feynman Technique",
    desc: "Explain it to a child. If you can't, you don't understand it fully.",
    icon: <Zap className="w-5 h-5 text-amber-500" />
  },
  {
    title: "Active Recall",
    desc: "Test yourself before you study. Retrieval is stronger than recognition.",
    icon: <Flame className="w-5 h-5 text-orange-500" />
  },
  {
    title: "Spaced Repetition",
    desc: "Review info at increasing intervals: 1 day, 3 days, 7 days, 30 days.",
    icon: <Layers className="w-5 h-5 text-blue-500" />
  },
  {
    title: "Pareto Principle (80/20)",
    desc: "Focus on the core 20% of content that yields 80% of understanding.",
    icon: <Binary className="w-5 h-5 text-rose-500" />
  },
  {
    title: "SQ3R Method",
    desc: "Survey, Question, Read, Recite, Review. A systematic reading technique.",
    icon: <BookOpen className="w-5 h-5 text-emerald-500" />
  }
];

export default function EducationHub() {
  const { currentUser, userData } = useAuth();
  const { showNotification } = useNotifications();
  const { addPlatformRevenue } = useRevenue();
  const { convert, formatReward, formatCurrency } = useCurrencyConverter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncInfo, setSyncInfo] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [lessonResearch, setLessonResearch] = useState<any | null>(null);
  const [researching, setResearching] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const [data, info] = await Promise.all([
      getEducationCourses(),
      getLastSyncInfo()
    ]);
    setCourses(data);
    setSyncInfo(info);
    setLoading(false);
  };

  const handleEnroll = async (course: Course) => {
    if (!currentUser) {
      showNotification("Auth Required", { body: "Please login to enroll." });
      return;
    }

    if (userData?.enrolledCourses?.includes(course.id)) {
      showNotification("Already Enrolled", { body: "You are already studying this course!" });
      return;
    }

    setEnrollingId(course.id);
    try {
      // Simulate payment processing or just direct enrollment for community courses
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 80/20 Revenue Split for Course Enrollment & AI Training
      // Total Enrollment Fee/Value: 1.0 Gold g (~100 KES)
      const totalEnrollmentValue = 1.0;
      const userShare = totalEnrollmentValue * 0.2; // 20% to user
      const developerShare = totalEnrollmentValue * 0.8; // 80% to developer (as Platform Revenue)

      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        enrolledCourses: arrayUnion(course.id),
        points: increment(userShare),
        experience: increment(250)
      });

      // Log Developer/Platform Share (1g Gold = 100 KES)
      await addPlatformRevenue(developerShare * 0.77, `Course Enrollment Fee: ${course.title} (Developer 80% Share)`);

      showNotification("Education Milestone", { 
        body: `Welcome to ${course.title}! You've been rewarded ${formatReward(userShare)} (20% share) while 80% (${formatCurrency(developerShare * 100)}) fuels global engineering.` 
      });
      setSelectedCourse(null);
    } catch (err) {
      console.error("Enrollment failed:", err);
      showNotification("Enrollment Failed", { body: "Something went wrong. Please try again." });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleLessonAction = (lesson: any) => {
    if (!userData?.enrolledCourses?.includes(selectedCourse?.id)) {
      showNotification("Enrollment Required", { body: "Please enroll in the course to access lessons." });
      return;
    }
    setActiveLesson(lesson);
    if (selectedCourse) {
      fetchLessonResearch(lesson, selectedCourse);
    }
  };

  const fetchLessonResearch = async (lesson: any, course: Course) => {
    const breaker = getAIBreakerStatus();
    if (breaker.isTripped) {
      setLessonResearch({
        overview: `Master the core principles of ${lesson.title} as part of your ${course.title} curriculum.`,
        objectives: ["Understand foundational concepts", "Practical application skills", "Strategic integration"],
        keyConcepts: ["Precision intelligence is currently in power-save mode. Please proceed with the lesson and discuss these concepts in the community feed for peer insights."],
        communityImpact: "This knowledge empowers you to lead with data and strategic insight."
      });
      return;
    }

    setResearching(true);
    setLessonResearch(null);
    let retries = 0;
    const MAX_RETRIES = 10;

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch('/api/education/research-lesson', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Education-Retry': retries.toString()
          },
          body: JSON.stringify({
            lessonTitle: lesson.title,
            courseTitle: course.title,
            courseDescription: course.description
          })
        });

        const responseText = await response.text();
        
        // Detect HTML responses from infrastructure (indicates server booting or proxy error)
        if (responseText.includes("<!doctype") || responseText.includes("<html") || responseText.includes("Starting Server...")) {
          console.warn(`[Education Hub] Infrastructure warmup (${retries + 1}/${MAX_RETRIES}). Retrying...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 3000 * retries));
          continue;
        }

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = JSON.parse(responseText);
        setLessonResearch(data);
        setResearching(false);
        return;
      } catch (error) {
        console.error(`[Education Hub] Research attempt ${retries + 1} failed:`, error);
        retries++;
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000 * retries));
          continue;
        }
      }
    }

    // Fallback if AI fails after all retries
    setLessonResearch({
      overview: `Master the core principles of ${lesson.title} as part of your ${course.title} curriculum.`,
      objectives: ["Understand foundational concepts", "Practical application skills", "Strategic integration"],
      keyConcepts: ["AI Research curation is currently taking longer than expected. Please proceed with the lesson and discuss these concepts in the community feed for peer insights."],
      communityImpact: "This knowledge empowers you to lead with data and strategic insight."
    });
    setResearching(false);
  };

  const handleCompleteLesson = async () => {
    if (!currentUser || !selectedCourse || !activeLesson) return;

    setCompletingLesson(true);
    try {
      const lessonKey = `${selectedCourse.id}_${activeLesson.title}`;
      
      if (userData?.completedModules?.includes(lessonKey)) {
        showNotification("Already Completed", { body: "You've already finished this lesson." });
        setActiveLesson(null);
        return;
      }

      // Distribute rewards for learning
      const rewardPoints = 0.025; // 0.025g Gold (~2.5 KES)
      const { userShare } = revenue_distribution_engine(rewardPoints, 'education');

      await updateDoc(doc(db, 'users', currentUser.uid), {
        completedModules: arrayUnion(lessonKey),
        points: increment(userShare),
        experience: increment(50)
      });

      showNotification("Lesson Completed", { 
        body: `Great job! You earned ${formatReward(userShare)} for completing "${activeLesson.title}".` 
      });
      setActiveLesson(null);
    } catch (err) {
      console.error("Completion failed:", err);
      showNotification("Update Failed", { body: "Could not save your progress." });
    } finally {
      setCompletingLesson(false);
    }
  };

  const getIcon = (category: string) => {
    return categoryIcons[category] || <BookOpen className="w-6 h-6 text-indigo-500" />;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="pb-24 pt-4 px-4 min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 italic">
            <GraduationCap className="w-8 h-8 text-black bg-white p-1 rounded-lg shadow-sm border border-gray-100" />
            EDUCATION HUB
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 text-sm max-w-sm">
              Automated AI Curator exploring global knowledge quarterly.
            </p>
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse">
              <Zap className="w-3 h-3 fill-emerald-600" />
              LIVE AUTOMATION
            </div>
          </div>
        </div>
        
        {syncInfo && (
          <div className="flex flex-col items-end">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-2">
              <History className="w-4 h-4" />
              <div className="text-[10px] font-black">
                <span className="block opacity-60 uppercase tracking-tighter text-[8px]">Next Sync in 90 Days</span>
                <span>{formatDate(syncInfo.lastSuccessfulSync)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Easy Study Methods Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Easy Study Methods</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STUDY_METHODS.map((method, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -2 }}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {method.icon}
                  <h3 className="text-xs font-bold text-gray-900 leading-tight">{method.title}</h3>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  {method.desc}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 text-[8px] font-black text-indigo-500 uppercase tracking-tighter">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Easy Method
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Courses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Online Curricula</h2>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-indigo-200">
            80/20 REVENUE SHARE
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Researching Campus Content...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <motion.div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden group cursor-pointer"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                      {getIcon(course.category)}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {course.badge && badgeIcons[course.badge] && (
                          <div className="p-1 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center gap-1.5 px-2">
                            {badgeIcons[course.badge]}
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Verified Badge</span>
                          </div>
                        )}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border ${
                          course.difficulty === 'Advanced' ? 'bg-indigo-600 text-white border-indigo-700' :
                          course.difficulty === 'Intermediate' ? 'bg-purple-600 text-white border-purple-700' :
                          'bg-emerald-600 text-white border-emerald-700'
                        }`}>
                          {course.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {course.duration}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 mb-2 truncate">{course.subtitle}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 italic">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.lessons} Lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Certified
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600">
                      Syllabus
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Course Detail Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCourse(null)}
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col border border-gray-100"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                      {getIcon(selectedCourse.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedCourse.title}</h2>
                        {selectedCourse.badge && badgeIcons[selectedCourse.badge] && (
                          <div className="p-1 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm flex items-center justify-center" title="Verified Badge">
                            {badgeIcons[selectedCourse.badge]}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-indigo-600 italic">80/20 Knowledge Share • Verified Certification</p>
                    </div>
                  </div>
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-90" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeLesson ? (
                    <motion.div
                      key="player"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <button 
                        onClick={() => setActiveLesson(null)}
                        className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest hover:gap-3 transition-all"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to Curriculum
                      </button>

                      <div className="bg-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
                        <div className="relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 block mb-2">Now Studying</span>
                          <h3 className="text-2xl font-black leading-tight italic">{activeLesson.title}</h3>
                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              {activeLesson.duration}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">
                              <Zap className="w-3 h-3" />
                              Active Session
                            </div>
                          </div>
                        </div>
                        <BrainCircuit className="absolute -bottom-8 -right-8 w-40 h-40 text-white/10" />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-500" />
                          Key Learning Objectives
                        </h4>
                        
                        {researching ? (
                          <div className="space-y-4 py-8">
                            <div className="flex flex-col items-center justify-center gap-4 text-center">
                              <div className="relative">
                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">AI Research Active</h5>
                                <p className="text-[10px] text-gray-400 font-bold italic">Curating academic insights for topic context...</p>
                              </div>
                            </div>
                            <div className="space-y-3 mt-4">
                              <div className="h-2 bg-gray-100 rounded-full w-full animate-pulse"></div>
                              <div className="h-2 bg-gray-100 rounded-full w-[90%] animate-pulse delay-75"></div>
                              <div className="h-2 bg-gray-100 rounded-full w-[95%] animate-pulse delay-150"></div>
                            </div>
                          </div>
                        ) : lessonResearch ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                          >
                            <p className="text-sm text-gray-600 italic leading-relaxed">
                              "{lessonResearch.overview}"
                            </p>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {lessonResearch.objectives.map((obj: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                  <span className="text-[11px] font-bold text-gray-700">{obj}</span>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-3">
                              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Lightbulb className="w-3 h-3" />
                                Deep Insights
                              </h5>
                              {lessonResearch.keyConcepts.map((concept: string, i: number) => (
                                <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl text-[11px] text-gray-600 leading-relaxed shadow-sm">
                                  {concept}
                                </div>
                              ))}
                            </div>

                            <div className="p-4 bg-indigo-600 rounded-2xl flex items-start gap-4 shadow-lg shadow-indigo-100">
                              <div className="p-2 bg-white/20 rounded-xl">
                                <GraduationCap className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <span className="block uppercase tracking-[0.2em] text-[9px] font-black text-white/70 mb-1">Community Empowerment</span>
                                <p className="text-[10px] font-bold text-white leading-snug">
                                  {lessonResearch.communityImpact}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 opacity-20" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for Research Engine...</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCompleteLesson}
                        disabled={completingLesson || userData?.completedModules?.includes(`${selectedCourse.id}_${activeLesson.title}`)}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 transition-all mt-8"
                      >
                        {completingLesson ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : userData?.completedModules?.includes(`${selectedCourse.id}_${activeLesson.title}`) ? (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Lesson Completed
                          </>
                        ) : (
                          <>
                            <Award className="w-5 h-5" />
                            Mark as Complete & Earn Points
                          </>
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="curriculum"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <p className="text-sm text-gray-600 leading-relaxed mb-6 italic">
                        "{selectedCourse.description}"
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Duration</span>
                          <span className="block text-sm font-black text-gray-900 text-center">{selectedCourse.duration}</span>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                          <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Lessons</span>
                          <span className="block text-sm font-black text-gray-900 text-center">{selectedCourse.lessons}</span>
                        </div>
                      </div>

                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Curriculum Overview
                      </h3>
                      
                      <div className="space-y-3 pb-8">
                        {selectedCourse.curriculum.map((lesson, idx) => {
                          const isCompleted = userData?.completedModules?.includes(`${selectedCourse.id}_${lesson.title}`);
                          return (
                            <motion.button 
                              key={idx}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleLessonAction(lesson)}
                              className={`w-full flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm transition-all text-left ${
                                isCompleted ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${
                                  isCompleted ? 'bg-emerald-500 text-white' : 'text-indigo-600 bg-indigo-50'
                                }`}>
                                  {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : (idx < 9 ? `0${idx + 1}` : idx + 1)}
                                </div>
                                <span className={`text-xs font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{lesson.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 italic">{lesson.duration}</span>
                                {userData?.enrolledCourses?.includes(selectedCourse.id) && !isCompleted && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action */}
              {!activeLesson && (
                <div className="p-6 bg-white border-t border-gray-100 sticky bottom-0">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (userData?.enrolledCourses?.includes(selectedCourse.id)) {
                        // Find first incomplete lesson or first lesson
                        const firstIncomplete = selectedCourse.curriculum.find(l => !userData?.completedModules?.includes(`${selectedCourse.id}_${l.title}`)) || selectedCourse.curriculum[0];
                        handleLessonAction(firstIncomplete);
                      } else {
                        handleEnroll(selectedCourse);
                      }
                    }}
                    disabled={enrollingId !== null}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
                  >
                    {enrollingId === selectedCourse.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : userData?.enrolledCourses?.includes(selectedCourse.id) ? (
                      <>
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Continue Learning
                      </>
                    ) : (
                      <>
                        <Flame className="w-5 h-5" />
                        Enroll Now & Earn Rewards
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Info */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="mt-8 bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-100 relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-6 h-6 text-indigo-200" />
            <h3 className="text-lg font-black italic">GLOBAL CERTIFICATION</h3>
          </div>
          <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-4 max-w-[80%]">
            Every completed course awards a blockchain-verified certificate and custom profile badge.
          </p>
          <div className="flex -space-x-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-indigo-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            ))}
            <div className="pl-4 text-[10px] font-bold flex items-center italic text-indigo-200">
              +{1240 + courses.length * 10} Recently Certified
            </div>
          </div>
        </div>
        <GraduationCap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
      </motion.div>
    </div>
  );
}
