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
    
    // Add Gold (mg) and KES to rates locally
    setRates(prev => ({ 
      ...prev, 
      G: 100, // 1 balance unit = 100 mg Gold
      KES: 10, // 1 balance unit = 10 KES (since 10 mg Gold = 1 KES)
      USD: 10 / 130 // 1 balance unit = 0.0769 USD (since 130 KES = 1 USD)
    }));

    // Fetch exchange rates
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/rates');
        if (response.ok) {
          const data = await response.json();
          // Merge with custom overrides
          setRates(prev => ({ 
            ...prev, 
            ...data.rates, 
            G: 100, 
            KES: 10,
            USD: 10 / 130 
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
    // Current application logic treats 100 units of Gold mg (Points) as 1 balance unit
    if (currency === 'PTS' || currency === 'G') {
      const goldMg = amountInBalance * 100;
      return `${Math.floor(goldMg).toLocaleString()} Gold mg`;
    }

    // Default rate is KES (135)
    const rate = rates[currency] || (currency === 'KES' ? 135 : 1);
    const converted = amountInBalance * rate;
    
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency === 'USD' ? 'KES' : currency,
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
