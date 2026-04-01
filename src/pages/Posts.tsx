import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Image, Video, FileText, Smile, Send, BarChart2, Loader2, AlertTriangle, Heart, MessageCircle, Share2, MoreHorizontal, Save, Trash2, FolderOpen, Link as LinkIcon, TrendingUp, X, Tag, Plus, Check, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from 'recharts';
import { intelligent_dispatcher, security_audit } from "../lib/engines";
import { moderateContent } from "../services/moderationService";
import { motion, AnimatePresence } from "motion/react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../contexts/AuthContext";
import { usePosts, Post as FirebasePost } from "../hooks/usePosts";
import { cn } from "../lib/utils";
import ReactQuill from 'react-quill-new';

interface PostComment {
  id: string;
  authorId: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  time: string;
  replies?: PostComment[];
}

interface PostAnalytics {
  name: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
}

interface Post {
  id: string;
  authorId: string;
  author: string;
  avatar: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  time: string;
  isLiked: boolean;
  commentsList: PostComment[];
  analytics: PostAnalytics[];
}

interface CommentItemProps {
  comment: PostComment;
  postId: string;
  onLike: (postId: string, commentId: string) => void;
  onReply: (postId: string, commentId: string, author: string) => void;
  depth?: number;
}

const CommentItem = ({ comment, postId, onLike, onReply, depth = 0 }: CommentItemProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-4 sm:ml-8 mt-3 border-l-2 border-gray-100 dark:border-gray-700/50 pl-4")}>
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-start space-x-3 group"
      >
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs flex-shrink-0">
          {comment.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-gray-900 dark:text-white truncate">{comment.author}</span>
              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{comment.time}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{comment.content}</p>
          </div>
          <div className="flex items-center space-x-4 mt-1 ml-2">
            <button 
              onClick={() => onLike(postId, comment.id)}
              className={cn(
                "text-[10px] font-bold transition-colors flex items-center space-x-1",
                comment.isLiked ? "text-pink-500" : "text-gray-500 hover:text-pink-500"
              )}
            >
              <Heart className={cn("w-3 h-3", comment.isLiked && "fill-current")} />
              <span>{comment.likes > 0 ? comment.likes : 'Like'}</span>
            </button>
            <button 
              onClick={() => onReply(postId, comment.id, comment.author)}
              className="text-[10px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
            >
              Reply
            </button>
            {hasReplies && (
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-[10px] font-bold text-purple-500 hover:text-purple-600 transition-colors flex items-center space-x-1"
              >
                <span>{isCollapsed ? `Show ${comment.replies?.length} replies` : 'Hide replies'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
      
      {!isCollapsed && hasReplies && (
        <div className="space-y-3">
          {comment.replies?.map(reply => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              postId={postId} 
              onLike={onLike} 
              onReply={onReply} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Posts() {
  const { currentUser } = useAuth();
  const { posts: firebasePosts, addPost, updatePost, deletePost: firebaseDeletePost, loading: postsLoading } = usePosts();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('feed');
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postTags, setPostTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [editSelectedImages, setEditSelectedImages] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<{id: string, title: string, content: string, category: string, tags: string[], date: string}[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showAnalyticsId, setShowAnalyticsId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [replyingTo, setReplyingTo] = useState<{postId: string, commentId: string, author: string} | null>(null);
  const commentInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotifications();

  const CATEGORIES = ['General', 'Gold Prediction', 'Tech', 'News', 'Gaming', 'Finance'];

  const posts = firebasePosts.filter(p => !p.isUserAdded);

  useEffect(() => {
    intelligent_dispatcher();
    security_audit();
    
    // Load drafts from localStorage
    const savedDrafts = localStorage.getItem('post_drafts');
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        console.error("Failed to parse drafts", e);
      }
    }
  }, []);

  const saveDraft = () => {
    if (!postContent.trim() && !postTitle.trim() && selectedImages.length === 0) return;

    const draftData = {
      title: postTitle,
      content: postContent,
      category: selectedCategory,
      tags: postTags,
      images: selectedImages,
      date: new Date().toLocaleString()
    };

    let updatedDrafts;
    if (currentDraftId) {
      // Update existing draft
      updatedDrafts = drafts.map(d => d.id === currentDraftId ? { ...d, ...draftData } : d);
      showNotification("Draft Updated!", {
        body: "Your changes to the draft have been saved.",
      });
    } else {
      // Create new draft
      const newId = Date.now().toString();
      const newDraft = { id: newId, ...draftData };
      updatedDrafts = [newDraft, ...drafts];
      setCurrentDraftId(newId);
      showNotification("Draft Saved!", {
        body: "You can access your drafts anytime to continue editing.",
      });
    }

    setDrafts(updatedDrafts);
    localStorage.setItem('post_drafts', JSON.stringify(updatedDrafts));
  };

  const loadDraft = (draft: any) => {
    setPostTitle(draft.title);
    setPostContent(draft.content);
    setSelectedCategory(draft.category);
    setPostTags(draft.tags || []);
    setSelectedImages(draft.images || []);
    setCurrentDraftId(draft.id);
    setShowDrafts(false);
    showNotification("Draft Loaded", {
      body: "Draft content has been loaded into the editor.",
    });
  };

  const deleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('post_drafts', JSON.stringify(updatedDrafts));
  };

  const handleShare = async (post: any) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${post.id}`;
    const shareData = {
      title: post.title || 'Check out this post!',
      text: post.content,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showNotification("Shared!", { body: "Post shared successfully." });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showNotification("Link Copied!", { body: "Post link copied to clipboard." });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error("Error sharing post:", err);
      }
    }
  };

  const copyLink = async (postId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotification("Link Copied!", { body: "Post link copied to clipboard." });
    } catch (err) {
      console.error("Error copying link:", err);
    }
  };

  const deletePost = async (postId: string) => {
    if (firebasePosts.find(p => p.id === postId)) {
      await firebaseDeletePost(postId);
    }
    showNotification("Post Deleted", { body: "Your post has been removed." });
    setActiveMenuId(null);
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tags = tagInput.split(',').map(t => t.trim()).filter(t => t);
      const newTags = [...postTags];
      tags.forEach(tag => {
        if (tag && !newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
      setPostTags(newTags);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setPostTags(postTags.filter(tag => tag !== tagToRemove));
  };

  const addEditTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tags = editTagInput.split(',').map(t => t.trim()).filter(t => t);
      const newTags = [...editTags];
      tags.forEach(tag => {
        if (tag && !newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
      setEditTags(newTags);
      setEditTagInput("");
    }
  };

  const removeEditTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list',
    'link'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
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
      if (isEdit) {
        setEditSelectedImages(prev => [...prev, ...results]);
      } else {
        setSelectedImages(prev => [...prev, ...results]);
      }
    });

    // Reset input
    e.target.value = '';
  };

  const removeSelectedImage = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditSelectedImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePost = async () => {
    if (!postContent.trim() || postContent === '<p><br></p>') return;

    setIsPosting(true);
    setError(null);

    try {
      // Strip HTML for moderation or moderate as is? 
      // Let's strip HTML for moderation to avoid false positives with tags
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = postContent;
      const textOnly = tempDiv.textContent || tempDiv.innerText || "";

      if (!currentUser) {
        setError("You must be logged in to create a post.");
        setIsPosting(false);
        return;
      }

      if (!textOnly.trim() && selectedImages.length === 0) {
        setError("Post must have text or at least one image.");
        setIsPosting(false);
        return;
      }
      
      const fullContent = `${postTitle}\n${textOnly}`;
      const moderationResult = await moderateContent(fullContent, 'post');

      if (!moderationResult.isApproved) {
        setError(`Content flagged: ${moderationResult.reason} (${moderationResult.flaggedCategories?.join(', ')})`);
        setIsPosting(false);
        return;
      }

      const newPostData = {
        authorId: currentUser.uid,
        author: currentUser.displayName || "You",
        avatar: currentUser.photoURL || "U",
        title: postTitle || "",
        content: postContent,
        category: selectedCategory,
        tags: postTags,
        images: selectedImages,
        likes: 0,
        comments: 0,
        shares: 0,
        time: "Just now",
        isLiked: false,
        commentsList: [],
        analytics: [
          { name: 'Mon', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Tue', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Wed', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Thu', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Fri', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Sat', views: 0, likes: 0, shares: 0, comments: 0 },
          { name: 'Sun', views: 0, likes: 0, shares: 0, comments: 0 },
        ]
      };

      try {
        await addPost(newPostData);
        showNotification("Post Published!", {
          body: `Your post in ${selectedCategory} is now live!`,
          icon: '/icon-192x192.png'
        });
      } catch (err) {
        console.error("Firebase post failed", err);
        setError("Failed to publish post. Please try again.");
      }

      setPostContent("");
      setPostTitle("");
      setPostTags([]);
      setSelectedImages([]);
      setSelectedCategory("General");
      setIsPosting(false);
      
      if (currentDraftId) {
        const updatedDrafts = drafts.filter(d => d.id !== currentDraftId);
        setDrafts(updatedDrafts);
        localStorage.setItem('post_drafts', JSON.stringify(updatedDrafts));
        setCurrentDraftId(null);
      }

    } catch (err) {
      setError("Failed to moderate content. Please try again.");
      setIsPosting(false);
    }
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const moderationResult = await moderateContent(content, 'comment');
      if (!moderationResult.isApproved) {
        showNotification("Comment Flagged", {
          body: `Your comment was not posted: ${moderationResult.reason}`,
        });
        return;
      }

      const newComment: PostComment = {
        id: Date.now().toString(),
        authorId: currentUser?.uid || 'anonymous',
        author: currentUser?.displayName || "You",
        avatar: currentUser?.photoURL || "U",
        content: content,
        likes: 0,
        isLiked: false,
        time: "Just now",
        replies: []
      };

      const addReplyToComments = (comments: PostComment[], parentId: string, reply: PostComment): PostComment[] => {
        return comments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [reply, ...(comment.replies || [])]
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: addReplyToComments(comment.replies, parentId, reply)
            };
          }
          return comment;
        });
      };

      if (firebasePosts.find(p => p.id === postId)) {
        const post = firebasePosts.find(p => p.id === postId)!;
        let updatedCommentsList: PostComment[];
        if (replyingTo && replyingTo.postId === postId) {
          updatedCommentsList = addReplyToComments(post.commentsList, replyingTo.commentId, newComment);
        } else {
          updatedCommentsList = [newComment, ...(post.commentsList || [])];
        }
        await updatePost(postId, {
          comments: post.comments + 1,
          commentsList: updatedCommentsList
        });
      }

      setCommentInputs({ ...commentInputs, [postId]: "" });
      setReplyingTo(null);
      showNotification("Comment Posted", { body: "Your comment is now visible." });
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  const handleReply = (postId: string, commentId: string, author: string) => {
    setReplyingTo({ postId, commentId, author });
    // Focus the input for this post
    setTimeout(() => {
      const input = commentInputRefs.current[postId];
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    const toggleLikeInComments = (comments: PostComment[]): PostComment[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          const newIsLiked = !comment.isLiked;
          return {
            ...comment,
            isLiked: newIsLiked,
            likes: newIsLiked ? comment.likes + 1 : comment.likes - 1
          };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: toggleLikeInComments(comment.replies)
          };
        }
        return comment;
      });
    };

    if (firebasePosts.find(p => p.id === postId)) {
      const post = firebasePosts.find(p => p.id === postId)!;
      await updatePost(postId, {
        commentsList: toggleLikeInComments(post.commentsList)
      });
    }
  };

  const handleLike = async (postId: string) => {
    const postToLike = posts.find(p => p.id === postId);
    if (!postToLike) return;

    const newIsLiked = !postToLike.isLiked;
    const newLikes = newIsLiked ? postToLike.likes + 1 : postToLike.likes - 1;

    if (firebasePosts.find(p => p.id === postId)) {
      await updatePost(postId, {
        isLiked: newIsLiked,
        likes: newLikes
      });
    }

    if (newIsLiked) {
      showNotification("Post Liked!", {
        body: `You liked ${postToLike.author}'s post.`,
      });
    }
  };

  const startEditing = (post: any) => {
    setEditingPostId(post.id);
    setEditTitle(post.title || "");
    setEditContent(post.content);
    setEditCategory(post.category);
    setEditTags(post.tags || []);
    setEditSelectedImages(post.images || []);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditTitle("");
    setEditContent("");
    setEditCategory("");
    setEditTags([]);
    setEditSelectedImages([]);
    setError(null);
  };

  const saveEdit = async (postId: string) => {
    if (!editContent.trim() || editContent === '<p><br></p>') return;

    setIsSavingEdit(true);
    setError(null);

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editContent;
      const textOnly = tempDiv.textContent || tempDiv.innerText || "";
      
      const fullContent = `${editTitle}\n${textOnly}`;
      const moderationResult = await moderateContent(fullContent, 'post');

      if (!moderationResult.isApproved) {
        setError(`Content flagged: ${moderationResult.reason} (${moderationResult.flaggedCategories?.join(', ')})`);
        setIsSavingEdit(false);
        return;
      }

      const updatedData = {
        title: editTitle,
        content: editContent,
        category: editCategory,
        tags: editTags,
        images: editSelectedImages
      };

      if (firebasePosts.find(p => p.id === postId)) {
        await updatePost(postId, updatedData);
      }

      setEditingPostId(null);
      setEditSelectedImages([]);
      setIsSavingEdit(false);
      showNotification("Post Updated!", {
        body: "Your changes have been saved successfully.",
      });
    } catch (err) {
      setError("Failed to moderate content. Please try again.");
      setIsSavingEdit(false);
    }
  };

  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    // No-op for now, could implement Firestore pagination here
  }, []);

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600">Feed</h1>
        {drafts.length > 0 && (
          <button 
            onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Drafts ({drafts.length})</span>
          </button>
        )}
      </div>
         <AnimatePresence>
        {showDrafts && drafts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-4 border border-purple-100 dark:border-purple-800/30 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Your Saved Drafts</h2>
                <button onClick={() => setShowDrafts(false)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-purple-100 dark:border-purple-800/50 group relative">
                    <div className="pr-8">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{draft.title || "Untitled Draft"}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">{draft.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-0.5 rounded-full">{draft.category}</span>
                        <span className="text-[10px] text-gray-400 italic">{draft.date}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => loadDraft(draft)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        title="Load Draft"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => deleteDraft(draft.id)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        title="Delete Draft"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create Post Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700" id="add-post">
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xl">
            U
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post Title (optional)" 
              className="w-full bg-transparent border-none focus:ring-0 text-lg font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 mb-2 outline-none"
            />
            
              <div className="mb-4">
                <ReactQuill 
                  theme="snow"
                  value={postContent}
                  onChange={setPostContent}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="What's on your mind?"
                  className="rich-editor"
                />
              </div>

              {selectedImages.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image Previews</label>
                    <button 
                      onClick={() => setSelectedImages([])}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                        <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => removeSelectedImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 transition-all"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-[10px] font-bold uppercase mt-1">Add More</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center space-x-2",
                        selectedCategory === cat 
                          ? "bg-purple-600 text-white shadow-md" 
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      )}
                    >
                      {selectedCategory === cat && <Check className="w-3 h-3" />}
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2 items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  {postTags.map(tag => (
                    <span key={tag} className="flex items-center space-x-1 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg text-xs font-medium shadow-sm border border-purple-100 dark:border-purple-900/50">
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      <button onClick={() => removeTag(tag)} className="hover:text-purple-800 dark:hover:text-purple-200">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center flex-1 min-w-[150px]">
                    <input 
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                      placeholder="Add tags (comma separated)..."
                      className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                    />
                    {tagInput.trim() && (
                      <button 
                        onClick={() => {
                          const tag = tagInput.trim();
                          if (tag && !postTags.includes(tag)) {
                            setPostTags([...postTags, tag]);
                          }
                          setTagInput("");
                        }}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded-md"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleImageSelect(e)} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" 
              title="Add Image"
            >
              <Image className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors" title="Add Video">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors" title="Create Poll">
              <BarChart2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-full transition-colors" title="Add Emoji">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors" title="Add GIF">
              <FileText className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {currentDraftId && (
              <button 
                onClick={() => {
                  setCurrentDraftId(null);
                  setPostTitle("");
                  setPostContent("");
                  setPostTags([]);
                  setSelectedImages([]);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider px-2"
              >
                Cancel Draft
              </button>
            )}
            <button 
              onClick={saveDraft}
              disabled={!postContent.trim() && !postTitle.trim()}
              className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 px-4 py-2 rounded-full font-medium transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{currentDraftId ? 'Update Draft' : 'Save Draft'}</span>
            </button>
            <button 
              onClick={handlePost}
              disabled={isPosting || !postContent.trim()}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-medium transition-all shadow-md hover:shadow-lg flex-1 sm:flex-none"
            >
              <span>{isPosting ? 'Checking...' : 'Post'}</span>
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        <AnimatePresence>
          {posts.map((post, index) => (
            <motion.div 
              key={post.id}
              ref={index === posts.length - 1 ? lastPostElementRef : null}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                    {post.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{post.author}</h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{post.time}</span>
                      <span>•</span>
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{post.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {post.author === "You" && editingPostId !== post.id && (
                    <button 
                      onClick={() => startEditing(post)}
                      className="text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {activeMenuId === post.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden"
                        >
                          <button 
                            onClick={() => {
                              copyLink(post.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <LinkIcon className="w-4 h-4" />
                            <span>Copy Link</span>
                          </button>
                          {post.author === "You" && (
                            <button 
                              onClick={() => deletePost(post.id)}
                              className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete Post</span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
                       {editingPostId === post.id ? (
                <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Post Title" 
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-lg font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  
                  <div className="mb-4">
                    <ReactQuill 
                      theme="snow"
                      value={editContent}
                      onChange={setEditContent}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="What's on your mind?"
                      className="rich-editor"
                    />
                  </div>

                  {editSelectedImages.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image Previews</label>
                        <button 
                          onClick={() => setEditSelectedImages([])}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {editSelectedImages.map((img, idx) => (
                          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                            <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => removeSelectedImage(idx, true)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => editFileInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 hover:border-purple-500 transition-all"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setEditCategory(cat)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center space-x-1",
                              editCategory === cat 
                                ? "bg-purple-600 text-white shadow-sm" 
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            )}
                          >
                            {editCategory === cat && <Check className="w-2.5 h-2.5" />}
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Tags</label>
                      <div className="flex flex-wrap gap-2 items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        {editTags.map(tag => (
                          <span key={tag} className="flex items-center space-x-1 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg text-xs font-medium shadow-sm border border-purple-100 dark:border-purple-900/50">
                            <Tag className="w-3 h-3" />
                            <span>{tag}</span>
                            <button onClick={() => removeEditTag(tag)} className="hover:text-purple-800 dark:hover:text-purple-200">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center flex-1 min-w-[120px]">
                          <input 
                            type="text"
                            value={editTagInput}
                            onChange={(e) => setEditTagInput(e.target.value)}
                            onKeyDown={addEditTag}
                            placeholder="Add tags (comma separated)..."
                            className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                          />
                          {editTagInput.trim() && (
                            <button 
                              onClick={() => {
                                const tag = editTagInput.trim();
                                if (tag && !editTags.includes(tag)) {
                                  setEditTags([...editTags, tag]);
                                }
                                setEditTagInput("");
                              }}
                              className="p-1 text-purple-600 hover:bg-purple-50 rounded-md"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <input 
                      type="file" 
                      ref={editFileInputRef} 
                      onChange={(e) => handleImageSelect(e, true)} 
                      multiple 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      onClick={() => editFileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors mr-auto" 
                      title="Add Image"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={cancelEditing}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => saveEdit(post.id)}
                      disabled={isSavingEdit || !editContent.trim() || editContent === '<p><br></p>'}
                      className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-medium rounded-full hover:from-pink-600 hover:to-rose-700 transition-all shadow-md disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isSavingEdit ? (
                        <>
                          <span>Saving...</span>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                  {error && editingPostId === post.id && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {post.title && <h2 className="text-lg font-bold text-gray-900 dark:text-white">{post.title}</h2>}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {post.tags.map(tag => (
                        <span key={tag} className="flex items-center space-x-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  {post.images && post.images.length > 0 && (
                    <div className={cn(
                      "grid gap-2 mt-4",
                      post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    )}>
                      {post.images.map((img: string, idx: number) => (
                        <div key={idx} className={cn(
                          "rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm",
                          post.images.length === 3 && idx === 0 ? "row-span-2" : ""
                        )}>
                          <img 
                            src={img} 
                            alt={`Post content ${idx + 1}`} 
                            className="w-full h-full object-cover max-h-[500px]" 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center space-x-1 sm:space-x-4">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleLike(post.id)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors",
                      post.isLiked 
                        ? "text-pink-500 bg-pink-50 dark:bg-pink-900/20" 
                        : "text-gray-500 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", post.isLiked && "fill-current")} />
                    <span className="text-sm font-medium">{post.likes > 0 ? post.likes : 'Like'}</span>
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.comments}</span>
                  </motion.button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleShare(post)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    title="Share Post"
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{post.shares}</span>
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyLink(post.id)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Copy Link"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAnalyticsId(showAnalyticsId === post.id ? null : post.id)}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors",
                      showAnalyticsId === post.id 
                        ? "text-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                        : "text-gray-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    )}
                    title="View Analytics"
                  >
                    <TrendingUp className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Analytics Section */}
              <AnimatePresence>
                {showAnalyticsId === post.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                              <TrendingUp className="w-4 h-4 text-purple-500" />
                              <span>Post Performance</span>
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                              <div className="flex items-center space-x-1.5 group cursor-help transition-opacity hover:opacity-100 opacity-80"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div><span>Views</span></div>
                              <div className="flex items-center space-x-1.5 group cursor-help transition-opacity hover:opacity-100 opacity-80"><div className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-sm shadow-pink-500/50"></div><span>Likes</span></div>
                              <div className="flex items-center space-x-1.5 group cursor-help transition-opacity hover:opacity-100 opacity-80"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div><span>Shares</span></div>
                              <div className="flex items-center space-x-1.5 group cursor-help transition-opacity hover:opacity-100 opacity-80"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></div><span>Comments</span></div>
                            </div>
                          </div>

                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={post.analytics}>
                                <defs>
                                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#fff', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                                  }}
                                />
                                <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                                <Area type="monotone" dataKey="likes" stroke="#ec4899" fillOpacity={1} fill="url(#colorLikes)" strokeWidth={2} />
                                <Area type="monotone" dataKey="comments" stroke="#a855f7" fillOpacity={1} fill="url(#colorComments)" strokeWidth={2} />
                                <Area type="monotone" dataKey="shares" stroke="#10b981" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                            <h4 className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase mb-4 flex items-center space-x-2">
                              <Zap className="w-3 h-3" />
                              <span>Quick Insights</span>
                            </h4>
                            <div className="space-y-4">
                              <div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Peak Activity Day</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                  {post.analytics.reduce((prev, curr) => (prev.views > curr.views) ? prev : curr).name}
                                </p>
                                <p className="text-[10px] text-purple-600 font-bold flex items-center space-x-1">
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  <span>Highest views recorded</span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Engagement Rate</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                  {((post.analytics.reduce((acc, curr) => acc + curr.likes + curr.comments + curr.shares, 0) / 
                                    (post.analytics.reduce((acc, curr) => acc + curr.views, 0) || 1)) * 100).toFixed(1)}%
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full" 
                                      style={{ width: `${Math.min(100, (post.analytics.reduce((acc, curr) => acc + curr.likes + curr.comments + curr.shares, 0) / (post.analytics.reduce((acc, curr) => acc + curr.views, 0) || 1)) * 500)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] text-green-600 font-bold whitespace-nowrap">Above avg</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Top Commenter</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                  {post.commentsList.length > 0 
                                    ? post.commentsList.reduce((acc: {[key: string]: number}, curr) => {
                                        acc[curr.author] = (acc[curr.author] || 0) + 1;
                                        return acc;
                                      }, {}) && Object.entries(post.commentsList.reduce((acc: {[key: string]: number}, curr) => {
                                        acc[curr.author] = (acc[curr.author] || 0) + 1;
                                        return acc;
                                      }, {})).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                                    : "No comments yet"}
                                </p>
                                <p className="text-[10px] text-blue-600 font-bold">Most active contributor</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Viral Potential</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                  {((post.analytics.reduce((acc, curr) => acc + curr.shares, 0) / 
                                    (post.analytics.reduce((acc, curr) => acc + curr.views, 0) || 1)) * 1000).toFixed(1)}
                                </p>
                                <p className="text-[10px] text-orange-600 font-bold">Share-to-view ratio</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-4">Engagement Distribution</h4>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                  { name: 'Likes', value: post.analytics.reduce((acc, curr) => acc + curr.likes, 0), fill: '#ec4899' },
                                  { name: 'Shares', value: post.analytics.reduce((acc, curr) => acc + curr.shares, 0), fill: '#10b981' },
                                  { name: 'Comments', value: post.analytics.reduce((acc, curr) => acc + curr.comments, 0), fill: '#a855f7' },
                                ]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8 }} />
                                  <YAxis hide />
                                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Total Views', value: post.analytics.reduce((acc: number, curr: PostAnalytics) => acc + curr.views, 0), color: 'text-blue-600', icon: TrendingUp, growth: '+12.5%' },
                          { label: 'Total Likes', value: post.analytics.reduce((acc: number, curr: PostAnalytics) => acc + curr.likes, 0), color: 'text-pink-600', icon: Heart, growth: '+8.2%' },
                          { label: 'Total Shares', value: post.analytics.reduce((acc: number, curr: PostAnalytics) => acc + curr.shares, 0), color: 'text-green-600', icon: Share2, growth: '+15.1%' },
                          { label: 'Avg Engagement', value: Math.round(post.analytics.reduce((acc: number, curr: PostAnalytics) => acc + curr.comments + curr.likes + curr.shares, 0) / 7), color: 'text-purple-600', icon: MessageCircle, growth: '+5.4%' },
                        ].map((stat, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 group hover:bg-white dark:hover:bg-gray-800 transition-all cursor-default relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                              <stat.icon className="w-12 h-12" />
                            </div>
                            <div className="flex items-center justify-between mb-2 relative z-10">
                              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{stat.label}</p>
                              <span className="text-[9px] font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-md">{stat.growth}</span>
                            </div>
                            <div className="flex items-baseline space-x-1 relative z-10">
                              <p className={cn("text-2xl font-black", stat.color)}>{stat.value.toLocaleString()}</p>
                            </div>
                            <div className="mt-2 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative z-10">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '70%' }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className={cn("h-full rounded-full opacity-50", stat.color.replace('text-', 'bg-'))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comments Section */}
              <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-700/50 space-y-4">
                <div className="flex flex-col">
                  {replyingTo && replyingTo.postId === post.id && (
                    <div className="flex items-center justify-between px-4 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-t-2xl text-[10px] text-purple-600 dark:text-purple-400 font-bold border-x border-t border-purple-100 dark:border-purple-800/50 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>Replying to {replyingTo.author}</span>
                      </div>
                      <button 
                        onClick={() => setReplyingTo(null)}
                        className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs flex-shrink-0">
                      U
                    </div>
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        ref={el => { commentInputRefs.current[post.id] = el; }}
                        value={commentInputs[post.id] || ""}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                        placeholder={replyingTo && replyingTo.postId === post.id ? `Reply to ${replyingTo.author}...` : "Write a comment..."} 
                        className={cn(
                          "w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-purple-500 transition-all",
                          replyingTo && replyingTo.postId === post.id ? "rounded-b-2xl" : "rounded-full"
                        )}
                      />
                      <button 
                        onClick={() => handleComment(post.id)}
                        disabled={!commentInputs[post.id]?.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-purple-600 disabled:opacity-30 transition-opacity"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
 
                <div className="space-y-4">
                  <AnimatePresence>
                    {post.commentsList?.map((comment: PostComment) => (
                      <CommentItem 
                        key={comment.id} 
                        comment={comment} 
                        postId={post.id} 
                        onLike={handleLikeComment}
                        onReply={handleReply}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {postsLoading && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2 text-purple-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-medium">Loading posts...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
