import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export const useCurrencyConverter = () => {
  // Default rates (Base: 1 USD)
  const [rates, setRates] = useState<ExchangeRates>({ 
    USD: 1,
    USDT: 1,
    KES: 1, // unified to 1 USDT
    GOLD: 31.1035 / 2375.40, // ~0.01309 g per USD
    BTC: 1 / 67000
  });
  const [currency, setCurrency] = useState<string>('USDT');
  const [loading, setLoading] = useState(true);
  const [goldPriceUSD, setGoldPriceUSD] = useState<number>(2375.40); 
  const [btcPriceUSD, setBtcPriceUSD] = useState<number>(67000);

  useEffect(() => {
    // Default to USDT for this app
    setCurrency('USDT');
    localStorage.setItem('preferred_currency', 'USDT');
    setLoading(false);
  }, []);

  const changeCurrency = (newCurrency: string) => {
    setCurrency('USDT');
    localStorage.setItem('preferred_currency', 'USDT');
  };

  const convert = (amount: number, fromCurrency: string = 'USD'): string => {
    if (isNaN(amount)) return 'USDT 0.00';
    // If from KES, convert to USDT using the 130 rate
    let usdAmount = amount;
    if (fromCurrency === 'KES') {
      usdAmount = amount / 130;
    }
    return `USDT ${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatReward = (points: number): string => {
    return `USDT ${points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = (amountInUSD: number): string => {
    return convert(amountInUSD);
  };

  return {
    currency: 'USDT',
    rates: { USDT: 1, KES: 130, USD: 1 },
    changeCurrency,
    convert,
    formatReward,
    formatCurrency,
    loading: false,
    availableCurrencies: ['USDT']
  };
};
