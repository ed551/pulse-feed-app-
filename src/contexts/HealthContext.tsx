import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HealthMetrics {
  heartRate: number;
  sleepScore: number;
  lastScanDate: string | null;
}

interface HealthContextType {
  metrics: HealthMetrics;
  updateMetrics: (newMetrics: Partial<HealthMetrics>) => void;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export function HealthProvider({ children }: { children: ReactNode }) {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    heartRate: 72,
    sleepScore: 85,
    lastScanDate: null,
  });

  const updateMetrics = (newMetrics: Partial<HealthMetrics>) => {
    setMetrics((prev) => ({
      ...prev,
      ...newMetrics,
    }));
  };

  return (
    <HealthContext.Provider value={{ metrics, updateMetrics }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}
