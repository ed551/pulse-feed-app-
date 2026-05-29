import { useState, useEffect } from 'react';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export const useCurrencyConverter = () => {
  const [rates, setRates] = useState<ExchangeRates>({ USD: 1 });
  const [currency, setCurrency] = useState<string>('G');
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
        const response = await fetch('/api/rates');
        if (response.ok) {
          const data = await response.json();
          setRates(data.rates);
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

  const GOLD_PRICE_USD = 80;

  const convert = (amountInUSD: number): string => {
    if (currency === 'G') {
      const grams = amountInUSD / GOLD_PRICE_USD;
      return `${grams.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} G`;
    }

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
