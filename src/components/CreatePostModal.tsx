import React, { useState, useRef } from 'react';
import { X, Send, Image, Video, Radio, Type, Loader2, AlertTriangle, Check, BarChart2, Smile, Megaphone, RefreshCw, Plus, Brain, Sparkles, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../contexts/AuthContext';
import { moderateContent } from '../services/moderationService';
import { useNotifications } from '../hooks/useNotifications';
import { generateContentWithRetry } from '../lib/ai';
import { cn } from '../lib/utils';

interface CreatePostModalProps {
  type: 'text' | 'video' | 'live' | 'poll' | 'announcement' | 'update' | 'gif';
  onClose: () => void;
}

export default function CreatePostModal({ type: initialType, onClose }: CreatePostModalProps) {
  const { addPost } = usePosts();
  const { currentUser } = useAuth();
  const { showNotification } = useNotifications();
  
  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [images, setImages] = useState<string[]>([]);
  const [gifUrl, setGifUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const CATEGORIES = ['General', 'Tech', 'News', 'Gaming', 'Finance', 'Life', 'Announcement'];

  const handleAiGenerate = async (mode: 'draft' | 'refine' | 'poll') => {
    setIsGenerating(true);
    setError(null);
    try {
      let prompt = "";
      if (mode === 'draft') {
        prompt = `Generate a short, engaging ${type} post for a social media feed. 
                 Context: ${title || content || "Something interesting about " + category}. 
                 Keep it under 200 words. Use a friendly and professional tone.
                 Return ONLY the post content.`;
      } else if (mode === 'refine') {
        prompt = `Refine and improve this social media post content to be more engaging and professional:
                 "${content}"
                 Return ONLY the refined content.`;
      } else if (mode === 'poll') {
        prompt = `Generate 4 distinct and interesting poll options for this question: "${pollQuestion}".
                 Return ONLY the options as a comma-separated list.`;
      }

      const response = await generateContentWithRetry({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const result = response.text?.trim() || "";
      
      if (mode === 'poll') {
        const options = result.split(',').map(o => o.trim()).filter(o => o).slice(0, 5);
        if (options.length >= 2) {
          setPollOptions(options);
        }
      } else if (mode === 'draft' || mode === 'refine') {
        setContent(result);
      }
      
      showNotification("AI Magic Applied!", { body: "Your content has been updated by Gemini." });
    } catch (err: any) {
      setError(err.message || "AI generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const readers: Promise<string>[] = [];
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new Promise<string>((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => resolve(e.target?.result as string);
        fileReader.readAsDataURL(file);
      });
      readers.push(reader);
    });

    Promise.all(readers).then(results => {
      setImages(prev => [...prev, ...results]);
    });
    e.target.value = '';
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePost = async () => {
    if (type === 'poll') {
      if (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim())) {
        setError("Please fill in the poll question and all options.");
        return;
      }
    } else if (!content.trim() && images.length === 0 && !videoUrl.trim() && !gifUrl.trim()) {
      setError("Please add some content to your post.");
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      if (!currentUser) {
        setError("You must be logged in to post.");
        setIsPosting(false);
        return;
      }

      const fullContent = `${title} ${content} ${videoUrl} ${pollQuestion} ${pollOptions.join(' ')}`;
      const moderationResult = await moderateContent(fullContent, 'post');

      if (!moderationResult.isApproved) {
        setError(`Content flagged: ${moderationResult.reason}`);
        setIsPosting(false);
        return;
      }

      const postData: any = {
        authorId: currentUser.uid,
        author: currentUser.displayName || "Anonymous",
        avatar: currentUser.photoURL || "A",
        title: title || (type === 'poll' ? pollQuestion : ""),
        content: content,
        type: type === 'text' ? 'post' : type,
        category: category,
        tags: [type],
        images: images,
        gifUrl: gifUrl,
        videoUrl: videoUrl,
        likes: 0,
        comments: 0,
        shares: 0,
        time: new Date().toISOString(),
        isLiked: false,
        commentsList: [],
        analytics: []
      };

      if (type === 'poll') {
        postData.poll = {
          question: pollQuestion,
          options: pollOptions.map(opt => ({ text: opt, votes: 0, voters: [] }))
        };
      }

      await addPost(postData);

      showNotification("Post Published!", {
        body: `Your ${type} is now live!`,
      });
      onClose();
    } catch (err) {
      console.error("Post failed:", err);
      setError("Failed to publish post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const getTypeIcon = (t: string) => {
    switch(t) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'live': return <Radio className="w-5 h-5" />;
      case 'poll': return <BarChart2 className="w-5 h-5" />;
      case 'announcement': return <Megaphone className="w-5 h-5" />;
      case 'update': return <RefreshCw className="w-5 h-5" />;
      case 'gif': return <Smile className="w-5 h-5" />;
      default: return <Type className="w-5 h-5" />;
    }
  };

  const getTypeColor = (t: string) => {
    switch(t) {
      case 'video': return "bg-red-500";
      case 'live': return "bg-orange-500";
      case 'poll': return "bg-emerald-500";
      case 'announcement': return "bg-purple-500";
      case 'update': return "bg-blue-500";
      case 'gif': return "bg-pink-500";
      default: return "bg-indigo-500";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl text-white", getTypeColor(type))}>
              {getTypeIcon(type)}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
              Create {type}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['text', 'video', 'live', 'poll', 'announcement', 'update', 'gif'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t as any)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2",
                  type === t 
                    ? `${getTypeColor(t)} text-white shadow-md` 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                {getTypeIcon(t)}
                <span className="capitalize">{t}</span>
              </button>
            ))}
          </div>

          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          />

          {type === 'poll' ? (
            <div className="space-y-3">
              <div className="relative">
                <textarea 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  rows={2}
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none pr-12"
                />
                <button 
                  onClick={() => handleAiGenerate('poll')}
                  disabled={isGenerating || !pollQuestion.trim()}
                  className="absolute right-3 top-3 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  title="Generate Smart Options"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(idx)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button 
                    onClick={addPollOption}
                    className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-400 hover:text-emerald-500 hover:border-emerald-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAiGenerate('draft')}
                    disabled={isGenerating}
                    className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Magic Draft
                  </button>
                  {content.length > 10 && (
                    <button 
                      onClick={() => handleAiGenerate('refine')}
                      disabled={isGenerating}
                      className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      Smart Refine
                    </button>
                  )}
                </div>
              </div>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'announcement' ? "Make an announcement..." : "What's on your mind?"}
                rows={4}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
              />
            </div>
          )}

          {type === 'gif' && (
            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search GIFs..."
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  onChange={(e) => {
                    // Simulated GIF search
                    if (e.target.value.length > 2) {
                      setGifUrl(`https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxXmN1XmN2/giphy.gif`);
                    }
                  }}
                />
                <Smile className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
              </div>
              {gifUrl && (
                <div className="relative rounded-xl overflow-hidden group">
                  <img src={gifUrl} alt="Selected GIF" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setGifUrl('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {(type === 'video' || type === 'live') && (
            <input 
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={type === 'live' ? "Live Stream URL (YouTube/Twitch)" : "Video URL (YouTube/Vimeo)"}
              className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">GIF URL</label>
              <div className="relative">
                <input 
                  type="url"
                  value={gifUrl}
                  onChange={(e) => setGifUrl(e.target.value)}
                  placeholder="Paste GIF link..."
                  className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Smile className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {type !== 'poll' && (
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Images</label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 transition-all"
                >
                  <Image className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase mt-1">Add</span>
                </button>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handlePost}
            disabled={isPosting}
            className={cn(
              "px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2",
              getTypeColor(type)
            )}
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPosting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
