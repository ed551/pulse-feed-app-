import { useEffect, useState } from "react";
import { Users, Shield, Plus, X, Image as ImageIcon, Globe, Lock } from "lucide-react";
import { elastic_db_manager, communication_bridge } from "../lib/engines";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "react-router-dom";

export default function Groups() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', desc: '', privacy: 'public' });

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
      // Clear the param so it doesn't reopen on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    elastic_db_manager();
    communication_bridge();
  }, []);

  const groups = [
    { id: 1, name: 'Gold Traders Elite', desc: 'Daily analysis and predictions for gold markets.', members: '12.4k', joined: true, admin: false },
    { id: 2, name: 'Tech Innovators', desc: 'Discussing the latest in AI and tech.', members: '8.2k', joined: false, admin: false },
    { id: 3, name: 'Pulse Feeds Creators', desc: 'Official group for platform creators and developers.', members: '45k', joined: true, admin: true },
    { id: 4, name: 'Health & Wellness', desc: 'Tips for maintaining a healthy lifestyle using our AI checker.', members: '3.1k', joined: false, admin: false },
  ];

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to Firestore
    alert(`Group "${newGroup.name}" created successfully!`);
    setIsCreateModalOpen(false);
    setNewGroup({ name: '', desc: '', privacy: 'public' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600">Pulse Feeds</h1>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{group.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{group.members} members</span>
                </div>
              </div>
              {group.admin && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center">
                  <Shield className="w-3 h-3 mr-1" /> Admin
                </span>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 flex-grow leading-relaxed">{group.desc}</p>
            
            <div className="flex items-center space-x-2 mt-auto">
              <button 
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  group.joined 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' 
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-100 dark:shadow-none'
                }`}
              >
                {group.joined ? 'Leave Group' : 'Join Group'}
              </button>
              {group.admin && (
                <button className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl font-bold text-sm transition-all border border-indigo-100 dark:border-indigo-800">
                  Manage
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 dark:border-gray-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 dark:shadow-none">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Create Group</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Start a new community</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Group Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Tech Enthusiasts"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Description</label>
                  <textarea 
                    required
                    placeholder="What is this group about?"
                    value={newGroup.desc}
                    onChange={(e) => setNewGroup({...newGroup, desc: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500 rounded-2xl px-4 py-3 text-sm outline-none transition-all h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewGroup({...newGroup, privacy: 'public'})}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 transition-all gap-2",
                      newGroup.privacy === 'public' 
                        ? "bg-green-50 border-green-500 dark:bg-green-900/20" 
                        : "bg-gray-50 border-transparent dark:bg-gray-800"
                    )}
                  >
                    <Globe className={cn("w-6 h-6", newGroup.privacy === 'public' ? "text-green-600" : "text-gray-400")} />
                    <span className="text-xs font-bold">Public</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewGroup({...newGroup, privacy: 'private'})}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-2xl border-2 transition-all gap-2",
                      newGroup.privacy === 'private' 
                        ? "bg-green-50 border-green-500 dark:bg-green-900/20" 
                        : "bg-gray-50 border-transparent dark:bg-gray-800"
                    )}
                  >
                    <Lock className={cn("w-6 h-6", newGroup.privacy === 'private' ? "text-green-600" : "text-gray-400")} />
                    <span className="text-xs font-bold">Private</span>
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 mt-4"
                >
                  Launch Group
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
