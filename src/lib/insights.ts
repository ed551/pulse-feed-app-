import { db, auth } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
    // Generate a highly unique ID to prevent any potential collisions or "Already Exists" errors
    // which can sometimes occur with addDoc if the client SDK retries a write.
    const uniqueId = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    
    await setDoc(doc(db, 'insights', uniqueId), {
      type,
      category,
      content: content.trim(),
      authorId: auth.currentUser.uid,
      timestamp: serverTimestamp() // Use server-side timestamp for consistency
    });
    console.log(`Insight saved [ID: ${uniqueId}]: [${type}:${category}] ${content.substring(0, 50)}...`);
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
