import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Clock, Timer, Bell, Plus, Globe, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ClockModalProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function ClockModal({ activeTab, onTabChange }: ClockModalProps) {
  const { userData, currentUser } = useAuth();
  const [time, setTime] = useState(new Date());
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [alarmTime, setAlarmTime] = useState('');

  const currentAlarms = userData?.alarms || [
    { id: '1', time: '07:00', active: true }
  ];

  const updateAlarmsInDb = async (newAlarms: { id: string, time: string, active: boolean }[]) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        alarms: newAlarms
      });
    } catch (error) {
      console.error("Error updating alarms:", error);
    }
  };

  const toggleAlarm = (id: string) => {
    const newAlarms = currentAlarms.map(a => a.id === id ? { ...a, active: !a.active } : a);
    updateAlarmsInDb(newAlarms);
  };

  const deleteAlarm = (id: string) => {
    const newAlarms = currentAlarms.filter(a => a.id !== id);
    updateAlarmsInDb(newAlarms);
  };

  const addAlarm = () => {
    if (!alarmTime) return;
    const newAlarms = [...currentAlarms, { id: Date.now().toString(), time: alarmTime, active: true }];
    updateAlarmsInDb(newAlarms);
    setAlarmTime('');
  };

  const is24h = (userData?.timeFormat || '24h') === '24h';
  const dateFormat = userData?.dateFormat || 'DD/MM/YYYY';
  const isPrecise = userData?.isSportsWatchPrecise ?? true;
  const timezone = userData?.timezone || 'Africa/Nairobi';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(prev => prev + (isPrecise ? 10 : 100));
      }, isPrecise ? 10 : 100);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning, isPrecise]);

  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: !is24h,
      timeZone: timezone
    });
  };

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    
    // We can't easily format with timeZone using simple manual string building without Intl
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    
    if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
    return `${day}/${month}/${year}`;
  };

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
        <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative inline-block">
            <div className="absolute -inset-8 bg-blue-500/5 rounded-full blur-2xl" />
            <div className="relative text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
              {formatDisplayTime(time)}
              <span className="text-xl ml-1 text-blue-500 font-mono align-top">{time.getSeconds().toString().padStart(2, '0')}</span>
            </div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">
            {time.toLocaleDateString(undefined, { weekday: 'long', timeZone: timezone })} • {formatDisplayDate(time)}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-900/50 text-[9px] font-black uppercase tracking-widest">
              <Globe className="w-3 h-3" />
              Global Sync Active
            </div>
          </div>
        </div>
      )}

      {activeTab === 'watch' && (
        <div className="text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-orange-500/10 rounded-full blur-xl animate-pulse" />
            <div className="relative text-6xl font-mono font-black text-orange-500 tracking-tighter">
              {Math.floor(stopwatchTime / 60000).toString().padStart(2, '0')}:
              {Math.floor((stopwatchTime % 60000) / 1000).toString().padStart(2, '0')}.
              <span className="text-3xl opacity-70">
                {isPrecise 
                  ? Math.floor((stopwatchTime % 1000) / 10).toString().padStart(2, '0')
                  : Math.floor((stopwatchTime % 1000) / 100).toString() + '0'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
                className={cn(
                  "flex-1 py-4 rounded-[1.5rem] font-black text-white transition-all shadow-lg active:scale-95",
                  isStopwatchRunning 
                    ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                )}
              >
                {isStopwatchRunning ? 'STOP' : 'START'}
              </button>
              <button 
                onClick={() => { setStopwatchTime(0); setIsStopwatchRunning(false); }}
                className="px-8 py-4 bg-gray-100 dark:bg-gray-800 rounded-[1.5rem] font-black text-xs text-gray-500 hover:bg-gray-200 transition-all uppercase tracking-widest"
              >
                Reset
              </button>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sports Performance Mode</p>
              <p className="text-[9px] text-gray-500">
                {isPrecise ? 'Millisecond precision active' : 'Standard precision active'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alarm' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2 w-full">
              <input 
                type="time" 
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                className="flex-1 text-2xl font-mono font-bold p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={addAlarm}
                className="p-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
            {currentAlarms.map(alarm => (
              <div key={alarm.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 group hover:border-emerald-200 dark:hover:border-emerald-900 transition-all">
                <div className="flex items-center gap-3">
                  <Bell className={cn("w-4 h-4", alarm.active ? "text-emerald-500" : "text-gray-400")} />
                  <span className={cn("text-xl font-mono font-black", !alarm.active && "opacity-40")}>
                    {alarm.time}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => deleteAlarm(alarm.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleAlarm(alarm.id)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all",
                      alarm.active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      alarm.active ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            ))}
            {currentAlarms.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4 uppercase tracking-widest font-black">No alarms set</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
