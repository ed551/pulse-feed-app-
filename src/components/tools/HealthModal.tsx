import React from 'react';
import { HeartPulse } from 'lucide-react';

export default function HealthModal() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
        <HeartPulse className="w-10 h-10 text-red-500 animate-pulse" />
      </div>
      <div>
        <h4 className="font-bold text-xl">Health Report Checker</h4>
        <p className="text-gray-500 dark:text-gray-400 mt-2">AI-powered diagnostic tool</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 block">Heart Rate</span>
          <span className="text-lg font-bold">72 BPM</span>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 block">Sleep Score</span>
          <span className="text-lg font-bold">85/100</span>
        </div>
      </div>
      <button onClick={() => alert('Scanning health data...')} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors">Run Full Diagnostic</button>
    </div>
  );
}
