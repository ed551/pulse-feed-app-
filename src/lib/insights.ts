import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type InsightType = 'developer' | 'user';
export type InsightCategory = 'life' | 'security' | 'health' | 'wealth' | 'general';

export interface Insight {
  type: InsightType;
  category: InsightCategory;
  content: string;
  authorId: string;
  timestamp: any;
}

export async function saveInsight(type: InsightType, category: InsightCategory, content: string) {
  if (!auth.currentUser) return;
  
  try {
    await addDoc(collection(db, 'insights'), {
      type,
      category,
      content,
      authorId: auth.currentUser.uid,
      timestamp: new Date().toISOString()
    });
    console.log(`Insight saved: [${type}:${category}] ${content.substring(0, 50)}...`);
  } catch (err) {
    console.error("Error saving insight:", err);
  }
}

export function extractInsights(text: string): { type: InsightType, category: InsightCategory, content: string }[] {
  const insights: { type: InsightType, category: InsightCategory, content: string }[] = [];
  const regex = /\[INSIGHT:(developer|user):(life|security|health|wealth|general):(.*?)\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    insights.push({
      type: match[1] as InsightType,
      category: match[2] as InsightCategory,
      content: match[3].trim()
    });
  }
  
  return insights;
}
