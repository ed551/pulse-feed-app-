import React from 'react';
import { PhoneCall, Phone } from 'lucide-react';

export default function CallModal() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
        <PhoneCall className="w-10 h-10 text-green-500" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(num => (
          <button key={num} className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl hover:bg-gray-200 dark:hover:bg-gray-600 mx-auto">
            {num}
          </button>
        ))}
      </div>
      <button onClick={() => console.log('Calling...')} className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
        <Phone className="w-5 h-5" />
        <span>Call Pulse Support</span>
      </button>
    </div>
  );
}
