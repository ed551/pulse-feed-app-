import { Type } from "@google/genai";
import { generateContentWithRetry } from "../lib/ai";

export interface ModerationSettings {
  sensitivity: 'low' | 'medium' | 'high';
  customRules: string[];
}

export const defaultSettings: ModerationSettings = {
  sensitivity: 'medium',
  customRules: [
    "No hate speech or harassment",
    "No explicit or adult content",
    "No spam or self-promotion"
  ]
};

export const getModerationSettings = (): ModerationSettings => {
  const stored = localStorage.getItem('moderation_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

export const saveModerationSettings = (settings: ModerationSettings) => {
  localStorage.setItem('moderation_settings', JSON.stringify(settings));
};

export interface ModerationResult {
  isApproved: boolean;
  reason?: string;
  flaggedCategories?: string[];
}

export const moderateContent = async (content: string, type: 'post' | 'comment' | 'profile'): Promise<ModerationResult> => {
  if (!content || content.trim() === '') {
    return { isApproved: true };
  }

  const settings = getModerationSettings();
  
  const prompt = `
You are an AI content moderator for a community platform.
Evaluate the following ${type} content based on these rules:
Sensitivity Level: ${settings.sensitivity} (low = lenient, medium = balanced, high = strict)
Custom Rules:
${settings.customRules.map(r => "- " + r).join('\n')}

Content to evaluate:
"""
${content}
"""

Determine if the content should be approved or rejected.
If rejected, provide a brief reason and list the flagged categories.
`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isApproved: {
              type: Type.BOOLEAN,
              description: "Whether the content is approved for posting."
            },
            reason: {
              type: Type.STRING,
              description: "Reason for rejection if not approved."
            },
            flaggedCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of categories the content violates."
            }
          },
          required: ["isApproved"]
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      return JSON.parse(resultText) as ModerationResult;
    }
    return { isApproved: true };
  } catch (error) {
    console.error("Moderation error:", error);
    return { isApproved: true, reason: "Moderation service unavailable" };
  }
};
