import { useEffect } from "react";
import { Users, Shield, Plus } from "lucide-react";
import { elastic_db_manager, communication_bridge } from "../lib/engines";

export default function Groups() {
  useEffect(() => {
    elastic_db_manager();
    communication_bridge();
  }, []);

  const groups = [
    { id: 1, name: 'Gold Traders Elite', desc: 'Daily analysis and predictions for gold markets.', members: '12.4k', joined: true, admin: false },
    { id: 2, name: 'Tech Innovators', desc: 'Discussing the latest in AI and tech.', members: '8.2k', joined: false, admin: false },
    { id: 3, name: 'Supervybe Creators', desc: 'Official group for platform creators and developers.', members: '45k', joined: true, admin: true },
    { id: 4, name: 'Health & Wellness', desc: 'Tips for maintaining a healthy lifestyle using our AI checker.', members: '3.1k', joined: false, admin: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600">Discover Groups</h1>
        <button className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{group.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{group.members} members</span>
                </div>
              </div>
              {group.admin && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs px-2 py-1 rounded-md font-medium flex items-center">
                  <Shield className="w-3 h-3 mr-1" /> Admin
                </span>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 flex-grow">{group.desc}</p>
            
            <div className="flex items-center space-x-2 mt-auto">
              <button 
                className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                  group.joined 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {group.joined ? 'Leave Group' : 'Join Group'}
              </button>
              {group.admin && (
                <button className="flex-1 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl font-medium text-sm transition-colors">
                  Manage Group
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
