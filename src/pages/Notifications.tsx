import { useEffect } from "react";
import { Bell, MessageSquare, Users, Gem, Star, Save } from "lucide-react";
import { language_engine, performance_optimizer } from "../lib/engines";

export default function Notifications() {
  useEffect(() => {
    language_engine();
    performance_optimizer();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-600 flex items-center">
          <Bell className="w-8 h-8 mr-3 text-orange-500" />
          Notification Settings
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
        
        {/* Toggle Options */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">What you get notified about</h2>
          <div className="space-y-4">
            {[
              { id: 'replies', label: 'Replies & Mentions', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { id: 'groups', label: 'Group Updates', icon: Users, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
              { id: 'rewards', label: 'Rewards & Points', icon: Gem, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
              { id: 'premium', label: 'Priority Alerts (Premium)', icon: Star, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', premium: true },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>
                      <Icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-lg flex items-center">
                        {item.label}
                        {item.premium && <span className="ml-2 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={!item.premium} />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Frequency Control */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">How often you get notified</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['Instant', 'Daily Digest', 'Weekly Summary'].map((freq, idx) => (
              <button key={freq} className={`p-4 rounded-2xl border-2 font-bold text-center transition-all ${idx === 0 ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-300 dark:hover:border-orange-700/50'}`}>
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
            <Save className="w-6 h-6" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
