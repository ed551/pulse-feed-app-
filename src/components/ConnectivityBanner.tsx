import React, { useEffect, useState } from 'react';
import { onConnectionStatusChange, ConnectionStatus } from '../lib/firebase';
import { WifiOff, ShieldAlert, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ConnectivityBanner: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('initial');

  useEffect(() => {
    return onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  if (status === 'connected' || status === 'initial') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-950 border-b border-amber-900/50 text-amber-200 px-4 py-2 flex items-center justify-between text-xs font-medium sticky top-0 z-50 overflow-hidden"
      >
        <div className="flex items-center gap-3">
          {status === 'testing' ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-400" />
          )}
          
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-bold text-amber-100">
              {status === 'error' ? 'DATABASE UNREACHABLE' : 'CONNECTING TO ENDPOINT...'}
              <ShieldAlert className="w-3 h-3" />
            </span>
            <span className="text-[10px] opacity-75">
              {status === 'error' 
                ? 'Check your internet connection or network permissions. The app is running in offline mode.'
                : 'Stabilizing connection to secure data nodes...'}
            </span>
          </div>
        </div>

        {status === 'error' && (
          <button 
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded transition-colors text-amber-300"
          >
            Retry Connection
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
