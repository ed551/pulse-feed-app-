import React from 'react';

export default function YouTubeSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Watch My Channel</h2>
      <div className="aspect-video w-full rounded-xl overflow-hidden">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/videoseries?list=PLJKQ-nLJ-21LgxH8A-7YMFZuZhUnLuGHY"
          title="YouTube playlist player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
