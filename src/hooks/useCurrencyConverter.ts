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

    // Fetch exchange rates
    const fetchRates = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
          const data = await response.json();
          setRates(data.rates);
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

  const convert = (amountInUSD: number): string => {
    const rate = rates[currency] || 1;
    const converted = amountInUSD * rate;
    
    return new Intl.NumberFormat('en-US', {
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
