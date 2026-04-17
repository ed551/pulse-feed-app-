import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ClockModalProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function ClockModal({ activeTab, onTabChange }: ClockModalProps) {
  const [time, setTime] = useState(new Date());
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-4 border-b border-gray-100 dark:border-gray-700 pb-4">
        {['clock', 'watch', 'alarm'].map(tab => (
          <button 
            key={tab} 
            onClick={() => onTabChange(tab)}
            className={cn(
              "px-4 py-1 rounded-full text-xs font-bold capitalize transition-all",
              activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'clock' && (
        <div className="text-center space-y-4">
          <div className="text-5xl font-mono font-bold text-blue-500 drop-shadow-sm">
            {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-sm text-gray-500">{time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      {activeTab === 'watch' && (
        <div className="text-center space-y-6">
          <div className="text-5xl font-mono font-bold text-orange-500">
            {Math.floor(stopwatchTime / 60000).toString().padStart(2, '0')}:
            {Math.floor((stopwatchTime % 60000) / 1000).toString().padStart(2, '0')}.
            {Math.floor((stopwatchTime % 1000) / 10).toString().padStart(2, '0')}
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-white transition-all",
                isStopwatchRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
              )}
            >
              {isStopwatchRunning ? 'Stop' : 'Start'}
            </button>
            <button 
              onClick={() => { setStopwatchTime(0); setIsStopwatchRunning(false); }}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {activeTab === 'alarm' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <input 
              type="time" 
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              className="text-3xl font-mono font-bold p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none"
            />
            <button 
              onClick={() => {
                if (alarmTime) console.log(`Alarm set for ${alarmTime}`);
                else console.warn('Please select a time');
              }}
              className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all"
            >
              Set Alarm
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="font-bold">07:00 AM</span>
              <div className="w-10 h-5 bg-green-500 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
