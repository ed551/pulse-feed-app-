import { useEffect, useRef } from 'react';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

export default function AdUnit({ slotId, format = 'auto', className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isDev = import.meta.env.DEV || !import.meta.env.VITE_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!isDev && adRef.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error', e);
      }
    }
  }, [isDev]);

  if (isDev) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center p-4 text-center rounded-xl overflow-hidden ${className}`} style={{ minHeight: '100px' }}>
        <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Advertisement Space</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">AdMob / AdSense (Slot: {slotId})</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">Configure VITE_ADSENSE_CLIENT_ID to show real ads</span>
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
