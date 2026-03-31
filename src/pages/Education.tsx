import React, { useState } from 'react';
import { GraduationCap, Award, BookOpen, Clock, Users, PlayCircle, CheckCircle2, DollarSign, ExternalLink, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';

const COURSES = [
  {
    id: 'c1',
    title: 'AI Engineering Fundamentals',
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
  }
];

export default function Education() {
  const { userData } = useAuth();
  const { addRevenue } = useRevenue();
  const [selectedCourse, setSelectedCourse] = useState<typeof COURSES[0] | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);

  const handleEnroll = async (course: typeof COURSES[0]) => {
    setIsEnrolling(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Revenue Split Logic
    // Course fees: developer gets 75% and user 25% of the revenue
    const developerShare = course.price * 0.75;
    const userShare = course.price * 0.25;
    
    // Add user's share to their revenue
    addRevenue(userShare, `Course Reward: ${course.title} (25% Share)`);
    
    setEnrolledCourses([...enrolledCourses, course.id]);
    setIsEnrolling(false);
    setSelectedCourse(null);
    
    alert(`Successfully enrolled in ${course.title}!\n\nRevenue Split:\nPlatform Fee (75%): $${developerShare.toFixed(2)}\nYour Reward (25%): $${userShare.toFixed(2)} added to your wallet.`);
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
            Learn new skills, earn LinkedIn badges, and get 25% cashback on course fees.
          </p>
        </div>
        <div className="hidden sm:flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full font-bold text-sm">
          <Award className="w-4 h-4 mr-2" />
          Certified Courses
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center">
              <DollarSign className="w-6 h-6 mr-2" />
              Learn & Earn Program
            </h2>
            <p className="text-indigo-100 max-w-md">
              When you enroll in a course, the fee is split: 75% goes to the platform/developer, and you earn 25% back directly to your wallet as a learning reward!
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/30 text-center min-w-[200px]">
            <div className="text-sm font-medium text-indigo-100 mb-1">Your Learning Rewards</div>
            <div className="text-3xl font-bold">${(enrolledCourses.length * 25).toFixed(2)}+</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURSES.map((course) => {
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
                  <button className="w-full py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold rounded-xl flex items-center justify-center cursor-default">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Enrolled
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedCourse(course)}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="relative h-48 sm:h-64 shrink-0">
              <img src={selectedCourse.image} alt={selectedCourse.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{selectedCourse.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
              >
                <ExternalLink className="w-5 h-5 rotate-180" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm font-medium text-gray-600 dark:text-gray-300">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedCourse.instructor}
                </div>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedCourse.duration}
                </div>
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-full">
                  <img src={selectedCourse.badgeIcon} alt="LinkedIn" className="w-4 h-4 mr-2" />
                  {selectedCourse.badge} Badge
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">About this course</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Course Modules</h3>
                  <div className="space-y-3">
                    {selectedCourse.modules.map((module, idx) => (
                      <div key={idx} className="flex items-start p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <PlayCircle className="w-5 h-5 text-blue-500 mr-3 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Module {idx + 1}: {module}</div>
                          <div className="text-sm text-gray-500 mt-1">Video lessons, quizzes, and hands-on projects.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">${selectedCourse.price}</div>
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    Earn ${(selectedCourse.price * 0.25).toFixed(2)} cashback!
                  </div>
                </div>
                <button 
                  onClick={() => handleEnroll(selectedCourse)}
                  disabled={isEnrolling}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isEnrolling ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Enroll Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
