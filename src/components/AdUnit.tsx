import { useEffect, useRef } from 'react';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

export default function AdUnit({ slotId, format = 'auto', className = '' }: AdUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const isDev = !import.meta.env.VITE_ADSENSE_CLIENT_ID;

  const isTestId = import.meta.env.VITE_ADSENSE_CLIENT_ID === 'ca-pub-3940256099942544';

  useEffect(() => {
    if (isDev || !adRef.current || pushedRef.current) return;

    let retryCount = 0;
    const maxRetries = 10;

    const tryPush = () => {
      if (!adRef.current || pushedRef.current) return;

      const width = adRef.current.offsetWidth;
      if (width > 0) {
        try {
          pushedRef.current = true;
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (e) {
          console.error('AdSense push error:', e);
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryPush, 500);
      }
    };

    // Initial delay to let layout settle
    const initialTimer = setTimeout(tryPush, 500);

    return () => clearTimeout(initialTimer);
  }, [isDev, slotId]);

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
    <div className={`relative group ${className}`}>
      {isTestId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none border border-purple-500/20 rounded-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-500/40">Google Test Ad Active</span>
        </div>
      )}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '100px', minWidth: '250px' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
