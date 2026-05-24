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
}

const COURSES_COLLECTION = 'education_courses';

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
      console.warn("Education Hub is empty. Waiting for automated server sync...");
      return [];
    }

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Course));
  } catch (error) {
    console.error("Error getting education courses:", error);
    return [];
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
