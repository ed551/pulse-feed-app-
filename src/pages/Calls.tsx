import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Users, Search, Plus, Video, X, Mic, MicOff, VideoOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallRecord {
  id: string;
  name: string;
  type: 'incoming' | 'outgoing' | 'missed' | 'group';
  time: string;
  avatar: string;
}

const Calls: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallRecord | null>(null);

  const calls: CallRecord[] = [
    { id: '1', name: 'John Doe', type: 'incoming', time: '10:30 AM', avatar: 'https://picsum.photos/seed/john/100' },
    { id: '2', name: 'Design Team', type: 'group', time: 'Yesterday', avatar: 'https://picsum.photos/seed/team/100' },
    { id: '3', name: 'Jane Smith', type: 'missed', time: 'Monday', avatar: 'https://picsum.photos/seed/jane/100' },
    { id: '4', name: 'Mike Ross', type: 'outgoing', time: 'Sunday', avatar: 'https://picsum.photos/seed/mike/100' },
  ];

  const filteredCalls = activeTab === 'all' ? calls : calls.filter(c => c.type === 'missed');

  const handleStartCall = (call: CallRecord) => {
    setCurrentCall(call);
    setIsCalling(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
            Calls
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Connect with users and groups</p>
        </div>
        <button className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-64">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('missed')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'missed' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-600' : 'text-gray-500'
          }`}
        >
          Missed
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search contacts or groups..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      {/* Call List */}
      <div className="space-y-3">
        {filteredCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={call.avatar}
                  alt={call.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                  referrerPolicy="no-referrer"
                />
                {call.type === 'group' && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-800">
                    <Users className="w-2 h-2" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{call.name}</h3>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  {call.type === 'incoming' && <PhoneIncoming className="w-3 h-3 text-green-500" />}
                  {call.type === 'outgoing' && <PhoneOutgoing className="w-3 h-3 text-blue-500" />}
                  {call.type === 'missed' && <PhoneIncoming className="w-3 h-3 text-red-500" />}
                  {call.type === 'group' && <Users className="w-3 h-3 text-purple-500" />}
                  <span>{call.time}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStartCall(call)}
                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-full transition-colors"
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleStartCall(call)}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-full transition-colors"
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Call Overlay */}
      <AnimatePresence>
        {isCalling && currentCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-gray-900 w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl border border-gray-800 flex flex-col items-center py-12 px-6 text-center space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                <img
                  src={currentCall.avatar}
                  alt={currentCall.name}
                  className="w-32 h-32 rounded-full border-4 border-blue-500 relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{currentCall.name}</h2>
                <p className="text-blue-400 animate-pulse">Calling...</p>
              </div>

              <div className="flex items-center justify-center space-x-6">
                <button className="p-4 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors">
                  <MicOff className="w-6 h-6" />
                </button>
                <button className="p-4 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors">
                  <VideoOff className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setIsCalling(false)}
                  className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all hover:scale-110 shadow-lg shadow-red-600/20"
                >
                  <PhoneCall className="w-8 h-8 rotate-[135deg]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
        <div className="flex items-start space-x-3">
          <PhoneCall className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Smart Calling</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Pulse Feeds supports end-to-end encrypted voice and video calls for both individual users and groups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calls;
