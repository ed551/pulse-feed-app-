import { useEffect, useState } from "react";
import { Users, Shield, Plus, X, Image as ImageIcon, Globe, Lock, RefreshCw } from "lucide-react";
import { elastic_db_manager, communication_bridge } from "../lib/engines";
import { motion, AnimatePresence } from "motion/react";
import { useSearchParams } from "react-router-dom";

export default function Groups() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageView, setManageView] = useState<'overview' | 'members' | 'visuals'>('overview');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState('bg-indigo-600');
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [groupMembers, setGroupMembers] = useState([
    { id: 1, name: 'Alex Johnson', role: 'Moderator', joined: '2 days ago' },
    { id: 2, name: 'Sarah Williams', role: 'Member', joined: '1 week ago' },
    { id: 3, name: 'Mike Miller', role: 'Member', joined: '3 days ago' },
  ]);
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

  const [groupList, setGroupList] = useState([
    { id: 1, name: 'Market Traders Elite', desc: 'Daily analysis and predictions for yield markets.', members: '12.4k', joined: true, admin: false },
    { id: 2, name: 'Tech Innovators', desc: 'Discussing the latest in AI and tech.', members: '8.2k', joined: false, admin: false },
    { id: 3, name: 'Pulse Feeds Creators', desc: 'Official group for platform creators and developers.', members: '45k', joined: true, admin: true },
    { id: 4, name: 'Health & Wellness', desc: 'Tips for maintaining a healthy lifestyle using our AI checker.', members: '3.1k', joined: false, admin: false },
  ]);

  const toggleJoin = (id: number) => {
    setGroupList(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, joined: !g.joined };
      }
      return g;
    }));
  };

  const handleManage = (group: any) => {
    setSelectedGroup(group);
    setManageView('overview');
    setSelectedColor(group.color || 'bg-indigo-600');
    setGroupIcon(group.iconImage || null);
    setIsManageModalOpen(true);
  };

  const removeMember = (id: number) => {
    setGroupMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: Date.now(),
      name: newGroup.name,
      desc: newGroup.desc,
      members: '1',
      joined: true,
      admin: true
    };
    setGroupList(prev => [newEntry, ...prev]);
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
        {groupList.map((group: any) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner overflow-hidden",
                  group.color || "bg-gradient-to-br from-green-400 to-teal-500"
                )}>
                  {group.iconImage ? (
                    <img src={group.iconImage} alt={group.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6" />
                  )}
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
                onClick={() => toggleJoin(group.id)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  group.joined 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' 
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-100 dark:shadow-none'
                }`}
              >
                {group.joined ? 'Leave Group' : 'Join Group'}
              </button>
              {group.admin && (
                <button 
                  onClick={() => handleManage(group)}
                  className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl font-bold text-sm transition-all border border-indigo-100 dark:border-indigo-800"
                >
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

      {/* Manage Group Modal */}
      <AnimatePresence>
        {isManageModalOpen && selectedGroup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 dark:border-gray-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Admin Hub</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{selectedGroup.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {manageView === 'overview' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Members</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{selectedGroup.members}</span>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Status</span>
                        <span className="text-sm font-bold text-green-600 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Admin Controls</h4>
                      
                      <button 
                        onClick={() => setManageView('members')}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-indigo-500 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                          <div className="text-left">
                            <span className="text-sm font-bold block">Member Management</span>
                            <span className="text-[10px] text-gray-500">Approve or remove members</span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-300" />
                      </button>

                      <button 
                        onClick={() => setManageView('visuals')}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-indigo-500 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                          <div className="text-left">
                            <span className="text-sm font-bold block">Visual Settings</span>
                            <span className="text-[10px] text-gray-500">Update logo and banners</span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-gray-300" />
                      </button>
                    </div>
                  </>
                )}

                {manageView === 'members' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setManageView('overview')}
                      className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all mb-4"
                    >
                      ← Back to Overview
                    </button>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-2">Recent Members</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {groupMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-bold block text-gray-900 dark:text-white">{member.name}</span>
                              <span className="text-[9px] text-gray-500">{member.role} • Joined {member.joined}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeMember(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {groupMembers.length === 0 && (
                        <div className="py-8 text-center text-gray-500 italic text-sm">No members found.</div>
                      )}
                    </div>
                  </div>
                )}

                {manageView === 'visuals' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setManageView('overview')}
                      className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all mb-4"
                    >
                      ← Back to Overview
                    </button>
                    <div className="space-y-4">
                      <div 
                        onClick={() => document.getElementById('group-icon-upload')?.click()}
                        className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center group hover:border-indigo-500 transition-all cursor-pointer overflow-hidden relative"
                      >
                        {groupIcon ? (
                          <img src={groupIcon} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        ) : null}
                        <ImageIcon className={cn("w-10 h-10 mb-2 transition-colors", groupIcon ? "text-indigo-500" : "text-gray-300 group-hover:text-indigo-500")} />
                        <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">
                          {groupIcon ? "Change Icon" : "Upload New Icon"}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-1">PNG, JPG up to 2MB</span>
                        <input 
                          id="group-icon-upload"
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setGroupIcon(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                          {['bg-indigo-600', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-rose-600'].map((color) => (
                            <button 
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center",
                                color,
                                selectedColor === color ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60"
                              )}
                            >
                              {selectedColor === color && <div className="w-2 h-2 rounded-full bg-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => {
                      setIsSaving(true);
                      setTimeout(() => {
                        setGroupList(prev => prev.map(g => 
                          g.id === selectedGroup.id 
                            ? { ...g, color: selectedColor, iconImage: groupIcon } 
                            : g
                        ));
                        setIsSaving(false);
                        setIsManageModalOpen(false);
                      }, 1200);
                    }}
                    disabled={isSaving}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl dark:shadow-none flex items-center justify-center gap-2",
                      isSaving ? "bg-green-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
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
