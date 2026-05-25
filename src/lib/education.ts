import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export interface Lesson {
  title: string;
  duration: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  lessons: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  curriculum: Lesson[];
  lastUpdated: number;
  badge?: string; // Icon identifier or name
}

const COURSES_COLLECTION = 'education_courses';

const FALLBACK_COURSES: Course[] = [
  {
    id: 'f-pm-001',
    title: "Advanced Project Management",
    subtitle: "Enterprise Strategy & Digital Transformation",
    description: "Navigate high-complexity enterprise projects. Master advanced risk psychography, automated resource leveling, and cross-functional agile scaling (SAFe/LeSS).",
    duration: "18 Hours",
    lessons: 32,
    difficulty: 'Advanced',
    category: 'Business',
    curriculum: [
      { title: "Portfolio Theory & Strategic Alignment", duration: "60m" },
      { title: "Advanced Critical Path Method (CPM) & PERT Analysis", duration: "90m" },
      { title: "Monte Carlo Simulations for Risk Mitigation", duration: "75m" },
      { title: "Lean-Agile Leadership & Organizational Change", duration: "120m" }
    ],
    lastUpdated: Date.now(),
    badge: 'ShieldCheck'
  },
  {
    id: 'f-ai-001',
    title: "AI & Machine Learning Essentials",
    subtitle: "Stanford Online / Coursera",
    description: "A comprehensive introduction to machine learning, datamining, and statistical pattern recognition. Learn the foundational concepts that power modern AI.",
    duration: "11 Weeks",
    lessons: 22,
    difficulty: 'Intermediate',
    category: 'Technology',
    curriculum: [
      { title: "Introduction to Machine Learning", duration: "45m" },
      { title: "Linear Regression with One Variable", duration: "60m" },
      { title: "Logistic Regression & Regularization", duration: "90m" },
      { title: "Neural Networks: Representation", duration: "75m" }
    ],
    lastUpdated: Date.now(),
    badge: 'Cpu'
  },
  {
    id: 'f-biz-002',
    title: "The Science of Well-Being",
    subtitle: "Yale University / Coursera",
    description: "Engage in a series of challenges designed to increase your own happiness and build more productive habits based on psychological science.",
    duration: "19 Hours",
    lessons: 10,
    difficulty: 'Beginner',
    category: 'Personal Growth',
    curriculum: [
      { title: "Misconceptions About Happiness", duration: "30m" },
      { title: "Why Our Expectations are So Bad", duration: "45m" },
      { title: "How We Can Overcome Our Biases", duration: "60m" },
      { title: "Stuff That Really Makes Us Happy", duration: "50m" }
    ],
    lastUpdated: Date.now(),
    badge: 'Sparkles'
  },
  {
    id: 'f-fin-003',
    title: "Financial Markets",
    subtitle: "Robert Shiller / Yale Online",
    description: "An overview of the ideas, methods, and institutions that permit human society to manage risks and foster enterprise.",
    duration: "27 Hours",
    lessons: 15,
    difficulty: 'Intermediate',
    category: 'Finance',
    curriculum: [
      { title: "Basics of Risk and Management", duration: "60m" },
      { title: "Efficient Markets vs. Behavioral Finance", duration: "90m" },
      { title: "Insurance and Stock Markets", duration: "75m" },
      { title: "Futures, Options and Derivatives", duration: "120m" }
    ],
    lastUpdated: Date.now(),
    badge: 'TrendingUp'
  },
  {
    id: 'f-cs-004',
    title: "CS50: Introduction to Computer Science",
    subtitle: "Harvard University / edX",
    description: "Introduction to the intellectual enterprises of computer science and the art of programming. Learn to think algorithmically and solve problems efficiently.",
    duration: "12 Weeks",
    lessons: 11,
    difficulty: 'Beginner',
    category: 'Technology',
    curriculum: [
      { title: "C Programming & Memory", duration: "120m" },
      { title: "Arrays & Algorithms", duration: "90m" },
      { title: "Data Structures & Trees", duration: "120m" },
      { title: "Web Programming with Flask", duration: "150m" }
    ],
    lastUpdated: Date.now(),
    badge: 'Code2'
  },
  {
    id: 'f-mkt-005',
    title: "Digital Marketing Specialization",
    subtitle: "University of Illinois / Coursera",
    description: "Master the basics of digital marketing, including search engine optimization (SEO), search engine marketing (SEM), and social media analytics.",
    duration: "8 Months",
    lessons: 45,
    difficulty: 'Beginner',
    category: 'Marketing',
    curriculum: [
      { title: "The Digital Marketing Revolution", duration: "45m" },
      { title: "Marketing in a Digital World", duration: "60m" },
      { title: "Digital Analytics for Marketers", duration: "90m" },
      { title: "Digital Marketing Channels", duration: "120m" }
    ],
    lastUpdated: Date.now(),
    badge: 'Megaphone'
  }
];

/**
 * Gets cached courses from the automated daily sync
 */
export async function getEducationCourses(): Promise<Course[]> {
  try {
    const q = query(
      collection(db, COURSES_COLLECTION), 
      orderBy('lastUpdatedServer', 'desc'), 
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn("Education Hub is empty. Using high-quality fallback courses.");
      return FALLBACK_COURSES;
    }

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Course));
  } catch (error) {
    console.error("Error getting education courses:", error);
    return FALLBACK_COURSES;
  }
}

/**
 * Gets the last sync timestamp
 */
export async function getLastSyncInfo() {
  try {
    const querySnapshot = await getDocs(collection(db, 'system'));
    const syncDoc = querySnapshot.docs.find(d => d.id === 'education_sync');
    return syncDoc?.data();
  } catch (e) {
    return null;
  }
}
