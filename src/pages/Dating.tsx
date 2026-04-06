import React, { useState, useEffect } from 'react';
import { Heart, Star, MapPin, MessageCircle, Filter, Search, Loader2, User, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, onSnapshot, where, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface Profile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  interests: string[];
  location: string;
  age: number;
  gender: string;
  likes: string[];
  // New parameters
  tribe?: string;
  radius?: number;
  hobbies?: string[];
  job?: string;
  religion?: string;
  foods?: string[];
  education?: string;
  status?: string;
  sports?: string[];
}

export default function Dating() {
  const { currentUser, userData } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'matches' | 'my-profile'>('discover');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // My Profile states
  const [isDatingActive, setIsDatingActive] = useState(userData?.isDatingActive || false);
  const [datingTribe, setDatingTribe] = useState(userData?.tribe || "");
  const [datingRadius, setDatingRadius] = useState(userData?.radius || 50);
  const [datingAge, setDatingAge] = useState(userData?.age || 18);
  const [datingGender, setDatingGender] = useState(userData?.gender || "Male");
  const [datingLocation, setDatingLocation] = useState(userData?.location || "");
  const [datingHobbies, setDatingHobbies] = useState(userData?.hobbies?.join(", ") || "");
  const [datingJob, setDatingJob] = useState(userData?.job || "");
  const [datingReligion, setDatingReligion] = useState(userData?.religion || "");
  const [datingFoods, setDatingFoods] = useState(userData?.foods?.join(", ") || "");
  const [datingEducation, setDatingEducation] = useState(userData?.education || "");
  const [datingStatus, setDatingStatus] = useState(userData?.status || "Single");
  const [datingSports, setDatingSports] = useState(userData?.sports?.join(", ") || "");

  useEffect(() => {
    if (userData) {
      setIsDatingActive(userData.isDatingActive || false);
      setDatingTribe(userData.tribe || "");
      setDatingRadius(userData.radius || 50);
      setDatingAge(userData.age || 18);
      setDatingGender(userData.gender || "Male");
      setDatingLocation(userData.location || "");
      setDatingHobbies(userData.hobbies?.join(", ") || "");
      setDatingJob(userData.job || "");
      setDatingReligion(userData.religion || "");
      setDatingFoods(userData.foods?.join(", ") || "");
      setDatingEducation(userData.education || "");
      setDatingStatus(userData.status || "Single");
      setDatingSports(userData.sports?.join(", ") || "");
    }
  }, [userData]);

  const handleSaveDatingProfile = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isDatingActive,
        tribe: datingTribe,
        radius: Number(datingRadius),
        age: Number(datingAge),
        gender: datingGender,
        location: datingLocation,
        hobbies: datingHobbies.split(",").map(s => s.trim()).filter(s => s !== ""),
        job: datingJob,
        religion: datingReligion,
        foods: datingFoods.split(",").map(s => s.trim()).filter(s => s !== ""),
        education: datingEducation,
        status: datingStatus,
        sports: datingSports.split(",").map(s => s.trim()).filter(s => s !== "")
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating dating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users'),
      where('isDatingActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as Profile))
        .filter(p => p.uid !== currentUser.uid);
      setProfiles(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLike = async (targetUid: string) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      datingLikes: arrayUnion(targetUid)
    });
    setCurrentIndex(prev => prev + 1);
  };

  const handlePass = () => {
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="max-w-md mx-auto h-full flex flex-col p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-pink-500 flex items-center gap-2">
          <Heart className="w-8 h-8 fill-pink-500" />
          Dating Hub
        </h1>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('discover')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'discover' ? "bg-white dark:bg-gray-700 text-pink-500 shadow-sm" : "text-gray-500"
            )}
          >
            Discover
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'matches' ? "bg-white dark:bg-gray-700 text-pink-500 shadow-sm" : "text-gray-500"
            )}
          >
            Matches
          </button>
          <button 
            onClick={() => setActiveTab('my-profile')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'my-profile' ? "bg-white dark:bg-gray-700 text-pink-500 shadow-sm" : "text-gray-500"
            )}
          >
            My Profile
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'discover' ? (
          <motion.div 
            key="discover"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 relative"
          >
            {currentProfile ? (
              <div className="relative h-[60vh] rounded-3xl overflow-hidden shadow-2xl group">
                <img 
                  src={currentProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentProfile.uid}`} 
                  alt={currentProfile.displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">{currentProfile.displayName}, {currentProfile.age || 24}</h2>
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-80 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{currentProfile.location || 'Nairobi, Kenya'} {currentProfile.radius ? `(${currentProfile.radius}km)` : ''}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentProfile.tribe && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {currentProfile.tribe}
                      </span>
                    )}
                    {currentProfile.status && (
                      <span className="px-2 py-0.5 bg-pink-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {currentProfile.status}
                      </span>
                    )}
                    {currentProfile.religion && (
                      <span className="px-2 py-0.5 bg-blue-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {currentProfile.religion}
                      </span>
                    )}
                    {currentProfile.education && (
                      <span className="px-2 py-0.5 bg-purple-500/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {currentProfile.education}
                      </span>
                    )}
                  </div>

                  <p className="text-sm line-clamp-2 mb-4 opacity-90 italic">
                    "{currentProfile.bio || 'Looking for someone to explore the world with.'}"
                  </p>

                  {(currentProfile.hobbies?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {currentProfile.hobbies?.slice(0, 3).map((hobby, i) => (
                        <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">#{hobby}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-center gap-6">
                    <button 
                      onClick={handlePass}
                      className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all border border-white/30"
                    >
                      <Filter className="w-6 h-6 text-white" />
                    </button>
                    <button 
                      onClick={() => handleLike(currentProfile.uid)}
                      className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-pink-500/40"
                    >
                      <Heart className="w-8 h-8 text-white fill-white" />
                    </button>
                    <button 
                      className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-all border border-white/30"
                    >
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold">No more profiles</h3>
                <p className="text-gray-500 text-sm">Check back later for more potential matches!</p>
                <button 
                  onClick={() => {
                    setCurrentIndex(0);
                    // Force a small state update to ensure re-render if needed
                    setLoading(true);
                    setTimeout(() => setLoading(false), 100);
                  }}
                  className="px-6 py-2 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-500/20"
                >
                  Start Over
                </button>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'matches' ? (
          <motion.div 
            key="matches"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3">
                  <div className="relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=match${i}`} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-pink-100"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm">Sarah {i}</p>
                    <p className="text-[10px] text-gray-500">Matched 2h ago</p>
                  </div>
                  <button className="w-full py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <MessageCircle className="w-3 h-3" />
                    Chat
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="my-profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-20"
          >
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between p-3 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/30">
                <div>
                  <p className="text-sm font-bold text-pink-900 dark:text-pink-300">Dating Hub Active</p>
                  <p className="text-[10px] text-pink-700/70 dark:text-pink-400/70">Show your profile in the Dating Hub</p>
                </div>
                <button 
                  onClick={() => setIsDatingActive(!isDatingActive)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    isDatingActive ? "bg-pink-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    isDatingActive ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tribe</label>
                  <input 
                    type="text" 
                    value={datingTribe}
                    onChange={(e) => setDatingTribe(e.target.value)}
                    placeholder="e.g. Kikuyu"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Radius (km)</label>
                  <input 
                    type="number" 
                    value={datingRadius}
                    onChange={(e) => setDatingRadius(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Age</label>
                  <input 
                    type="number" 
                    value={datingAge}
                    onChange={(e) => setDatingAge(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sex</label>
                  <select 
                    value={datingGender}
                    onChange={(e) => setDatingGender(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</label>
                  <input 
                    type="text" 
                    value={datingLocation}
                    onChange={(e) => setDatingLocation(e.target.value)}
                    placeholder="City, Country"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Favourite Job</label>
                  <input 
                    type="text" 
                    value={datingJob}
                    onChange={(e) => setDatingJob(e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Religion</label>
                  <input 
                    type="text" 
                    value={datingReligion}
                    onChange={(e) => setDatingReligion(e.target.value)}
                    placeholder="Christian"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Education</label>
                  <input 
                    type="text" 
                    value={datingEducation}
                    onChange={(e) => setDatingEducation(e.target.value)}
                    placeholder="University Degree"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <select 
                    value={datingStatus}
                    onChange={(e) => setDatingStatus(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widower">Widower</option>
                    <option value="Widowee">Widowee</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hobbies (comma separated)</label>
                <input 
                  type="text" 
                  value={datingHobbies}
                  onChange={(e) => setDatingHobbies(e.target.value)}
                  placeholder="Reading, Travel, Music"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Foods (comma separated)</label>
                <input 
                  type="text" 
                  value={datingFoods}
                  onChange={(e) => setDatingFoods(e.target.value)}
                  placeholder="Pizza, Sushi, Pasta"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sports (comma separated)</label>
                <input 
                  type="text" 
                  value={datingSports}
                  onChange={(e) => setDatingSports(e.target.value)}
                  placeholder="Football, Basketball, Tennis"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              <button 
                onClick={handleSaveDatingProfile}
                disabled={isSaving}
                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
                {saveSuccess ? "Saved Successfully" : "Save Dating Profile"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
