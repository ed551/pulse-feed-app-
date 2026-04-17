import React from 'react';
import { Search, Map, Mail, Cloud, Image, Languages } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function GoogleAppsModal() {
  const apps = [
    { name: 'Search', icon: Search, color: 'text-blue-500', url: 'https://google.com' },
    { name: 'Maps', icon: Map, color: 'text-green-500', url: 'https://maps.google.com' },
    { name: 'Mail', icon: Mail, color: 'text-red-500', url: 'https://gmail.com' },
    { name: 'Drive', icon: Cloud, color: 'text-yellow-500', url: 'https://drive.google.com' },
    { name: 'Photos', icon: Image, color: 'text-blue-400', url: 'https://photos.google.com' },
    { name: 'Translate', icon: Languages, color: 'text-blue-600', url: 'https://translate.google.com' }
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {apps.map(app => (
        <a 
          key={app.name} 
          href={app.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex flex-col items-center space-y-2 group"
        >
          <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-gray-700">
            {(() => {
              const AppIcon = app.icon;
              return <AppIcon className={cn("w-6 h-6", app.color)} />;
            })()}
          </div>
          <span className="text-xs font-medium">{app.name}</span>
        </a>
      ))}
    </div>
  );
}
