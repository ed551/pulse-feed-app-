import React from 'react';

interface TranslateModalProps {
  onClose: () => void;
}

export default function TranslateModal({ onClose }: TranslateModalProps) {
  const languages = ['English', 'Swahili', 'French', 'Spanish', 'German', 'Chinese', 'Japanese', 'Arabic'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {languages.map(lang => (
          <button 
            key={lang} 
            onClick={() => { alert(`Language changed to ${lang}`); onClose(); }} 
            className="py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {lang}
          </button>
        ))}
      </div>
    </div>
  );
}
