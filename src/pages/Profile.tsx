import { useEffect, useState, useRef, useCallback } from "react";
import { Settings, LogOut, Edit3, Shield, Star, Activity, Check, X, Loader2, AlertTriangle, Fingerprint, Camera, Sparkles, Upload, RotateCcw, Sliders, Award, Trophy, Zap, Users, Heart as HeartIcon, Beaker, Trash2, MessageSquare, Share2, Heart, PlusSquare, Brain, Wand2, MoreHorizontal, PlusCircle, MinusCircle, Bookmark, EyeOff, Bell, Link, XCircle, AlertCircle, Copy, ExternalLink, Pin, Tag, Globe, Archive, Crown } from "lucide-react";
import { auth_logic, user_history, wallet_engine } from "../lib/engines";
import { moderateContent } from "../services/moderationService";
import { generateAvatar } from "../services/imageService";
import { generateContentWithRetry } from "../lib/ai";
import FingerprintModal from "../components/FingerprintModal";
import Cropper from 'react-easy-crop';
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePosts } from "../hooks/usePosts";
import { db, handleFirestoreError, OperationType, storage } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "motion/react";

export default function Profile() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const { posts, deletePost, updatePost } = usePosts();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [smartSummary, setSmartSummary] = useState<string | null>(null);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
  };

  const handleCancelPostEdit = () => {
    setEditingPostId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleSavePostEdit = async (postId: string) => {
    setIsSavingPost(true);
    try {
      await updatePost(postId, {
        title: editTitle,
        content: editContent
      });
      setEditingPostId(null);
    } catch (err) {
      console.error("Failed to save post:", err);
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleGenerateSummary = async () => {
    const userPosts = posts.filter(p => p.authorId === currentUser?.uid);
    if (userPosts.length === 0) return;

    setIsGeneratingSummary(true);
    try {
      const postsText = userPosts.map(p => `${p.title || 'Untitled'}: ${p.content}`).join('\n\n');
      const prompt = `Based on these posts by ${currentUser?.displayName || 'the user'}, provide a short, 2-sentence "Smart Personality Summary" that captures their vibe and interests:\n\n${postsText}`;
      const response = await generateContentWithRetry({ 
        model: "gemini-3-flash-preview",
        contents: prompt 
      });
      setSmartSummary(response.text || null);
    } catch (err) {
      console.error("Failed to generate summary:", err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateSmartTitle = async (postId: string, content: string) => {
    setIsGeneratingTitle(postId);
    try {
      const prompt = `Generate a short, catchy title (max 5 words) for this post content: "${content}". Return ONLY the title text.`;
      const response = await generateContentWithRetry({ 
        model: "gemini-3-flash-preview",
        contents: prompt 
      });
      const smartTitle = response.text;
      if (smartTitle) {
        await updatePost(postId, { title: smartTitle.replace(/"/g, '') });
      }
    } catch (err) {
      console.error("Failed to generate smart title:", err);
    } finally {
      setIsGeneratingTitle(null);
    }
  };
  const [bio, setBio] = useState(userData?.bio || "Digital creator & tech enthusiast. Building the future one line of code at a time. 🚀");
  const [tempBio, setTempBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userData?.photoURL || currentUser?.photoURL || null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData?.bio) setBio(userData.bio);
    if (userData?.photoURL) setAvatarUrl(userData.photoURL);
  }, [userData]);

  const userPostsCount = posts.filter(p => p.authorId === currentUser?.uid).length;

  // Image Editing State
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [filter, setFilter] = useState('none');

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAvatar(true);
    setAvatarError(null);
    try {
      const generatedImage = await generateAvatar(aiPrompt);
      setEditingImage(generatedImage);
      setAiPrompt("");
    } catch (err) {
      setAvatarError("Failed to generate avatar. Please try again.");
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const getCroppedImg = async () => {
    if (!editingImage || !croppedAreaPixels) return;

    const image = new window.Image();
    image.src = editingImage;
    
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const { x, y, width, height } = croppedAreaPixels as any;
    canvas.width = width;
    canvas.height = height;

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${filter !== 'none' ? filter : ''}`;
    
    ctx.drawImage(
      image,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

    const base64Image = canvas.toDataURL('image/jpeg');
    
    if (currentUser) {
      try {
        // Upload to Firebase Storage
        const storageRef = ref(storage, `avatars/${currentUser.uid}`);
        await uploadString(storageRef, base64Image, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        // Update Firestore with the download URL
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: downloadURL
        });
        setAvatarUrl(downloadURL);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
    
    setEditingImage(null);
    setShowAvatarModal(false);
    // Reset filters
    setBrightness(100);
    setContrast(100);
    setZoom(1);
  };

  useEffect(() => {
    auth_logic();
    user_history();
    wallet_engine();
  }, []);

  const handleEditBio = () => {
    setTempBio(bio);
    setIsEditingBio(true);
    setBioError(null);
  };

  const handleSaveBio = async () => {
    if (!tempBio.trim()) {
      setIsEditingBio(false);
      return;
    }

    setIsSavingBio(true);
    setBioError(null);

    try {
      const moderationResult = await moderateContent(tempBio, 'profile');

      if (!moderationResult.isApproved) {
        setBioError(`Bio flagged: ${moderationResult.reason}`);
        setIsSavingBio(false);
        return;
      }

      // If approved, save
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          bio: tempBio
        });
      }
      setBio(tempBio);
      setIsEditingBio(false);
      setIsSavingBio(false);
    } catch (err) {
      setBioError("Failed to moderate bio. Please try again.");
      setIsSavingBio(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingBio(false);
    setBioError(null);
  };

  const achievements = [
    { id: 'top-contributor', name: "Top Contributor", icon: <Trophy className="w-5 h-5 text-yellow-500" />, description: "Top 1% of active posters this month", color: "bg-yellow-50 dark:bg-yellow-900/20", borderColor: "border-yellow-100 dark:border-yellow-800/30" },
    { id: 'community-helper', name: "Community Helper", icon: <HeartIcon className="w-5 h-5 text-pink-500" />, description: "Answered 50+ support questions", color: "bg-pink-50 dark:bg-pink-900/20", borderColor: "border-pink-100 dark:border-pink-800/30" },
    { id: 'early-adopter', name: "Early Adopter", icon: <Zap className="w-5 h-5 text-blue-500" />, description: "Joined during the beta phase", color: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-100 dark:border-blue-800/30" },
    ...((userData?.badges || []).map((badge: any, index: number) => ({
      id: `ai-badge-${index}`,
      name: badge.name,
      icon: <Award className="w-5 h-5 text-purple-500" />,
      description: badge.description || "Awarded for real-world problem detection.",
      color: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-100 dark:border-purple-800/30"
    })))
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-purple-500 to-blue-600"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6 mt-12">
          <div className="relative group w-32 h-32 flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile Avatar" className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-lg" />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {currentUser?.displayName ? currentUser.displayName.charAt(0) : "U"}
              </div>
            )}
            <button 
              onClick={() => setShowAvatarModal(true)}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-transparent"
              title="Change Avatar"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{currentUser?.displayName || "User Name"}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-3">
              {currentUser?.email ? `@${currentUser.email.split('@')[0]}` : "@username"} • Joined March 2026
            </p>
            
            <div className="mb-4 max-w-md">
              {isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="Write something about yourself..."
                  />
                  {bioError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{bioError}</span>
                    </div>
                  )}
                  <div className="flex space-x-2 justify-end">
                    <button 
                      onClick={handleCancelEdit}
                      disabled={isSavingBio}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={handleSaveBio}
                      disabled={isSavingBio || !tempBio.trim()}
                      className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 flex items-center"
                    >
                      {isSavingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{bio}</p>
                  <button 
                    onClick={handleEditBio}
                    className="absolute -right-6 top-0 p-1 text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit Bio"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                <Activity className="w-3 h-3 mr-1" /> Active
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleEditBio}
              className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all active:scale-95 text-purple-600 dark:text-purple-400"
              title="Edit Profile"
            >
              <Edit3 className="w-6 h-6" />
            </button>
            <button 
              onClick={() => navigate('/lab')}
              className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all active:scale-95 text-indigo-600 dark:text-indigo-400"
              title="Gemini Lab"
            >
              <Beaker className="w-6 h-6" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all active:scale-95 text-blue-600 dark:text-blue-400"
              title="Account Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{userPostsCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Posts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Groups</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(userData?.balance || 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
              {userData?.points || 0} Points
            </div>
          </div>
        </div>
      </div>

      {/* Achievements & Badges Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-500" />
            Achievements & Badges
          </h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{achievements.length} Earned</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((badge) => (
            <div 
              key={badge.id} 
              className={cn(
                "p-4 rounded-2xl border flex items-start space-x-4 transition-all hover:shadow-md group cursor-default",
                badge.color,
                badge.borderColor
              )}
            >
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                {badge.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{badge.name}</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{badge.description}</p>
              </div>
            </div>
          ))}
          
          <div className="p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-center group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="space-y-1">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto text-gray-400 group-hover:text-purple-500 transition-colors">
                <Star className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">View All Locked</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Posts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <PlusSquare className="w-5 h-5 mr-2 text-blue-500" />
            {currentUser?.displayName || 'My'} Posts
            <span className="ml-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] font-black uppercase tracking-tighter rounded flex items-center">
              <Brain className="w-2 h-2 mr-0.5" /> AI Managed
            </span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary || userPostsCount === 0}
              className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all disabled:opacity-50"
              title="Generate AI Summary"
            >
              {isGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{userPostsCount} Posts</span>
          </div>
        </div>

        <AnimatePresence>
          {smartSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-100 dark:border-purple-800/30 rounded-2xl relative group"
            >
              <button 
                onClick={() => setSmartSummary(null)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">AI Personality Insight</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">"{smartSummary}"</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts
              .filter(post => post.authorId === currentUser?.uid)
              .sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
              })
              .map((post) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">
                          {post.title || currentUser?.displayName || "Untitled Post"}
                        </h3>
                        {!post.title && (
                          <button
                            onClick={() => handleGenerateSmartTitle(post.id, post.content)}
                            disabled={isGeneratingTitle === post.id}
                            className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
                            title="Generate Smart Title"
                          >
                            {isGeneratingTitle === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{post.category} • {post.time}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                          className="p-2 text-gray-400 hover:text-purple-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="More options"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {activeMenuPostId === post.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveMenuPostId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="fixed inset-x-0 bottom-0 sm:absolute sm:right-0 sm:top-full sm:bottom-auto sm:inset-x-auto mt-2 w-full sm:w-64 bg-white dark:bg-gray-800 rounded-t-[2rem] sm:rounded-2xl shadow-2xl border-t sm:border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
                              >
                                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto my-3 sm:hidden" />
                                <div className="p-2 sm:p-2 space-y-1 pb-8 sm:pb-2">
                                  <div className="px-4 py-2 sm:hidden">
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Post Options</h3>
                                  </div>
                                  
                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Pin className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Pin post</span>
                                  </button>

                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Turn off notifications for this post</span>
                                  </button>

                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Bookmark className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Save post</span>
                                  </button>

                                  <button 
                                    onClick={async () => {
                                      if (navigator.share) {
                                        try {
                                          await navigator.share({
                                            title: post.title || 'Post',
                                            text: post.content,
                                            url: window.location.href
                                          });
                                        } catch (err) {
                                          // Ignore AbortError (user canceled)
                                          if (err instanceof Error && err.name !== 'AbortError') {
                                            console.error('Error sharing:', err);
                                          }
                                        }
                                      }
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Share2 className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Share</span>
                                  </button>

                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Tag className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Tag photo</span>
                                  </button>

                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Globe className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Edit Privacy</span>
                                  </button>

                                  <button 
                                    onClick={() => {
                                      handleStartEdit(post);
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Edit3 className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Edit Post</span>
                                  </button>

                                  <button 
                                    onClick={() => setActiveMenuPostId(null)}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Archive className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Move to archive</span>
                                  </button>

                                  <button 
                                    onClick={async () => {
                                      if (confirm("Move this post to recycle bin? Items in your bin are deleted after 30 days.")) {
                                        await deletePost(post.id);
                                      }
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <div>
                                      <div className="font-bold">Move to recycle bin</div>
                                      <div className="text-[10px] text-gray-500">Items in your bin are deleted after 30 days.</div>
                                    </div>
                                  </button>

                                  <button 
                                    onClick={() => {
                                      const url = `${window.location.origin}/post/${post.id}`;
                                      navigator.clipboard.writeText(url);
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 sm:px-3 py-3 sm:py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl sm:rounded-xl transition-colors text-left"
                                  >
                                    <Link className="w-5 h-5 sm:w-4 sm:h-4 text-gray-500" />
                                    <span className="font-bold">Copy link</span>
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  {editingPostId === post.id ? (
                    <div className="space-y-3 mb-3">
                      <input 
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Post Title"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <textarea 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Post Content"
                        rows={3}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={handleCancelPostEdit}
                          className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSavePostEdit(post.id)}
                          disabled={isSavingPost || !editContent.trim()}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {isSavingPost ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {post.content}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {post.comments}
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" /> {post.shares}
                    </div>
                    <div className="ml-auto">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider",
                        post.type === 'announcement' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30" :
                        post.type === 'poll' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" :
                        "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                      )}>
                        {post.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
          
          {userPostsCount === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
              <PlusSquare className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">You haven't posted anything yet.</p>
              <button 
                onClick={() => navigate('/')}
                className="mt-4 text-blue-500 font-bold text-sm hover:underline"
              >
                Create your first post
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-indigo-500" /> Account Settings
          </h2>
          <ul className="space-y-3">
            <li><button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300 font-medium">Personal Information</button></li>
            <li><button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300 font-medium flex items-center justify-between">
              <span>Privacy Preferences</span>
              <Fingerprint className="w-4 h-4 text-gray-400" />
            </button></li>
            <li><button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-300 font-medium flex items-center justify-between">
              <span>Security & Fingerprint</span>
              <Fingerprint className="w-4 h-4 text-gray-400" />
            </button></li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <LogOut className="w-5 h-5 mr-2 text-red-500" /> Actions
          </h2>
          <ul className="space-y-3">
            <li><button onClick={async () => { if(confirm('Are you sure you want to sign out?')) { await logout(); window.location.href = '/'; } }} className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors font-bold">Sign Out</button></li>
            <li><button onClick={() => navigate('/settings')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-500 dark:text-gray-400 font-medium flex items-center justify-between">
              <span>Delete Account</span>
              <Fingerprint className="w-4 h-4 text-gray-400" />
            </button></li>
          </ul>
        </div>
      </div>

      {/* Avatar Settings Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <Camera className="w-5 h-5 mr-2 text-purple-500" />
                Update Avatar
              </h2>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {editingImage ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="relative h-64 w-full bg-gray-900 rounded-2xl overflow-hidden">
                    <Cropper
                      image={editingImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      cropShape="round"
                      showGrid={false}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-bold text-gray-500 w-12">Zoom</span>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                          <Sliders className="w-3 h-3 mr-1" /> Brightness
                        </label>
                        <input
                          type="range"
                          value={brightness}
                          min={50}
                          max={150}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                          <Sliders className="w-3 h-3 mr-1" /> Contrast
                        </label>
                        <input
                          type="range"
                          value={contrast}
                          min={50}
                          max={150}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" /> Filters
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['none', 'grayscale(1)', 'sepia(1)', 'invert(1)', 'hue-rotate(90deg)', 'brightness(1.5)', 'contrast(1.5)'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                              filter === f 
                                ? "bg-purple-600 text-white border-purple-600" 
                                : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                            )}
                          >
                            {f === 'none' ? 'Original' : f.split('(')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button 
                        onClick={() => setEditingImage(null)}
                        className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                      </button>
                      <button 
                        onClick={getCroppedImg}
                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center shadow-md"
                      >
                        <Check className="w-4 h-4 mr-2" /> Save Avatar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Upload Option */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                      <Upload className="w-4 h-4 mr-2 text-blue-500" /> Upload from Device
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose an image file from your computer or phone.</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Select File
                    </button>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">OR</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                  </div>

                  {/* Generate Option */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                    <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-purple-500" /> Generate with AI
                    </h3>
                    <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mb-4">Describe the avatar you want, and our AI will create it for you.</p>
                    
                    <div className="space-y-3">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="E.g., A futuristic robot cat with neon glasses..."
                        className="w-full bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        rows={3}
                      />
                      
                      {avatarError && (
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex items-start space-x-2 text-red-600 dark:text-red-400 text-xs">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{avatarError}</span>
                        </div>
                      )}

                      <button 
                        onClick={handleGenerateAvatar}
                        disabled={isGeneratingAvatar || !aiPrompt.trim()}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
                      >
                        {isGeneratingAvatar ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" /> Generate Avatar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
