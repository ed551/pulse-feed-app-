import React, { createContext, useContext, useState, useEffect } from 'react';

interface IntelligenceContextType {
  country: string;
  insights: any[];
  isLoading: boolean;
}

const IntelligenceContext = createContext<IntelligenceContextType>({
  country: 'Unknown',
  insights: [],
  isLoading: true,
});

export const IntelligenceProvider = ({ children }: { children: React.ReactNode }) => {
  const [country, setCountry] = useState('Unknown');
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple localization simulation for now
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const detectedCountry = timeZone.includes('Africa/Nairobi') ? 'Kenya' : 'International';
    setCountry(detectedCountry);
    
    // Simulate fetching AI-driven insights based on user context
    const fetchInsights = async () => {
      // In a real app, call a server-side AI endpoint
      setInsights([
        { id: '1', category: 'wealth', content: 'Consider diversifying into local assets.' },
        { id: '2', category: 'health', content: 'Stay active!' }
      ]);
      setIsLoading(false);
    };
    
    fetchInsights();
  }, []);

  return (
    <IntelligenceContext.Provider value={{ country, insights, isLoading }}>
      {children}
    </IntelligenceContext.Provider>
  );
};

export const useIntelligence = () => useContext(IntelligenceContext);
