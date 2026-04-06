import React from 'react';
import { cn } from '../../lib/utils';

export default function CalendarModal() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} />);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = i === today;
    days.push(
      <div key={i} className={cn("h-8 flex items-center justify-center rounded-lg text-sm", isToday ? "bg-purple-600 text-white font-bold" : "bg-gray-100 dark:bg-gray-800")}>
        {i}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">
          Today is {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div className="font-bold text-lg">
          {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days}
      </div>
    </div>
  );
}
