/**
 * Utility for robust speech synthesis across the platform.
 * Fixes truncation issues by using a sequential queue and ensures voice prioritization.
 */

let speechQueue: string[] = [];
let isProcessingQueue = false;
let currentRate = 1.1; 
let preferredGender: 'female' | 'male' = 'female';
let onCompleteCallback: (() => void) | null = null;

export const setSpeechConfig = (config: { rate?: number; gender?: 'female' | 'male' }) => {
  if (config.rate) currentRate = config.rate;
  if (config.gender) preferredGender = config.gender;
};

export const getPlatformVoices = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
};

export const getBestVoice = (gender: 'female' | 'male' = preferredGender) => {
  const voices = getPlatformVoices();
  const langFilter = (v: SpeechSynthesisVoice) => v.lang.startsWith('en');
  
  if (gender === 'female') {
    const preferred = voices.find(v => {
      const name = v.name.toLowerCase();
      return (
        (name.includes('female') || 
         v.name.includes('samantha') || 
         v.name.includes('victoria') ||
         v.name.includes('karen') ||
         v.name.includes('moira') ||
         v.name.includes('hazel') ||
         v.name.includes('zira') ||
         v.name.includes('google uk english female') || 
         v.name.includes('google us english female')) && langFilter(v)
      );
    });
    // For female fallback, explicitly EXCLUDE voices that contain "male" explicitly
    const secondaryFallback = voices.find(v => langFilter(v) && !v.name.toLowerCase().includes('male'));
    return preferred || secondaryFallback || voices.find(v => langFilter(v)) || voices[0];
  } else {
    const preferred = voices.find(v => {
      const name = v.name.toLowerCase();
      const isExplicitMale = /\bmale\b/i.test(v.name) || (name.includes('male') && !name.includes('female'));
      return (
        (isExplicitMale || 
         v.name.includes('daniel') || 
         v.name.includes('alex') ||
         v.name.includes('fred') ||
         v.name.includes('james') ||
         v.name.includes('david') ||
         v.name.includes('google uk english male') || 
         v.name.includes('google us english male')) && langFilter(v)
      );
    });
    // For male fallback, explicitly EXCLUDE voices that contain "female"
    const secondaryFallback = voices.find(v => langFilter(v) && !v.name.toLowerCase().includes('female'));
    return preferred || secondaryFallback || voices.find(v => langFilter(v)) || voices[0];
  }
};

const processQueue = () => {
  if (speechQueue.length === 0) {
    isProcessingQueue = false;
    if (onCompleteCallback) onCompleteCallback();
    return;
  }

  isProcessingQueue = true;
  const text = speechQueue.shift();
  if (!text) {
    isProcessingQueue = false;
    if (onCompleteCallback) onCompleteCallback();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestVoice();
  if (voice) utterance.voice = voice;
  
  utterance.rate = currentRate; 
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Track the utterance to prevent garbage collection
  if (!(window as any)._activeUtterances) (window as any)._activeUtterances = [];
  (window as any)._activeUtterances.push(utterance);
  // Keep only a small history to save memory but enough to prevent GC during playback
  if ((window as any)._activeUtterances.length > 10) (window as any)._activeUtterances.shift();

  utterance.onend = () => {
    processQueue();
  };

  utterance.onerror = (event) => {
    console.error('Speech error:', event);
    // On some browsers, speech hangs. Attempting to resume or cancel and continue.
    window.speechSynthesis.resume();
    processQueue();
  };

  // Chrome bug fix: voice stops after 15s. Heartbeat prevents it.
  const heartbeat = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      clearInterval(heartbeat);
    }
  }, 10000);

  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  speechQueue = [];
  isProcessingQueue = false;
  onCompleteCallback = null;
};

export const speak = (text: string, options?: { rate?: number; gender?: 'female' | 'male', onEnd?: () => void }) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const rate = options?.rate || currentRate;
  const gender = options?.gender || preferredGender;
  onCompleteCallback = options?.onEnd || null;
  
  setSpeechConfig({ rate, gender });

  stopSpeech();
  onCompleteCallback = options?.onEnd || null; // Re-set after stopSpeech clears it
  
  // Clean text and split by distinct sentences/pauses
  // Handles extremely long notes without truncation
  // Added split by long chunks just in case
  const chunks = text
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .filter(c => c.trim().length > 0)
    .flatMap(c => {
      // If a single chunk is too long (> 200 chars), try to split by comma
      if (c.length > 200) {
        return c.split(',').map((part, i, arr) => i < arr.length - 1 ? part + ',' : part);
      }
      return [c];
    });

  speechQueue = chunks;
  processQueue();
};

/**
 * Narrates the current page by extracting meaningful text from the DOM.
 */
export const narratePage = (onEnd?: () => void) => {
  const mainContent = document.querySelector('main') || document.querySelector('#root') || document.body;
  
  // Extract visible text from major headings and paragraphs
  const elements = mainContent.querySelectorAll('h1, h2, h3, p, [role="article"]');
  const textParts: string[] = [];
  
  elements.forEach(el => {
    // Only capture visible, meaningful text
    const text = (el as HTMLElement).innerText.trim();
    if (text.length > 3 && !text.includes('Loading') && (el as HTMLElement).offsetParent !== null) {
      textParts.push(text);
    }
  });

  const fullText = textParts.slice(0, 30).join('. '); // Cap it at 30 segments for sanity
  if (fullText) {
    speak(`Reading current page. ${fullText}`, { onEnd });
  } else {
    speak("No significant text found to read on this page.");
  }
};

// Initialize
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const initVoices = () => {
    window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.onvoiceschanged = initVoices;
  initVoices();
}

