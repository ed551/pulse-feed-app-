import { useState, useEffect } from 'react';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export const useCurrencyConverter = () => {
  const [rates, setRates] = useState<ExchangeRates>({ USD: 1 });
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved currency
    const savedCurrency = localStorage.getItem('preferred_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
    
    // Standardized Exchange Rates (Base: 1 USD)
    setRates(prev => ({ 
      ...prev, 
      USD: 1,
      KES: 130,
      G: 1300,   // 1 USD = 1300 mg Gold
      PTS: 1300  // 1 USD = 1300 Points
    }));

    // Fetch exchange rates
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/rates');
        if (response.ok) {
          const data = await response.json();
          // Merge with custom overrides safely
          setRates(prev => ({ 
            ...prev, 
            ...data.rates, 
            USD: 1,
            KES: 130, // Override with authoritative local rate
            G: 1300, 
            PTS: 1300
          }));
        } else {
          const err = await response.json().catch(() => ({}));
          console.error('Exchange rate API returned error:', err);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const changeCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
  };

  const convert = (amountInBalance: number): string => {
    // Standard: 1300 mg Gold (Points) = $1.00
    if (currency === 'PTS' || currency === 'G') {
      const goldMg = amountInBalance * 1300;
      return `${Math.floor(goldMg).toLocaleString()} Gold mg`;
    }

    // Default rate check
    const rate = rates[currency] || (currency === 'KES' ? 130 : 1);
    const converted = amountInBalance * rate;
    
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  return {
    currency,
    rates,
    changeCurrency,
    convert,
    loading,
    availableCurrencies: Object.keys(rates).sort()
  };
};
