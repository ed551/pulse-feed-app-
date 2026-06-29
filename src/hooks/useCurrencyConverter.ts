import { useState, useEffect } from 'react';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export const useCurrencyConverter = () => {
  // Rates relative to USD (Base: 1 USD)
  const [rates] = useState<ExchangeRates>({ 
    USD: 1.0,
    USDT: 1.0,
    KES: 130.0,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.37,
    AUD: 1.50,
    JPY: 155.0,
    INR: 83.5,
    NGN: 1500.0
  });

  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('preferred_currency') || 'USDT';
  });

  const changeCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
    // Dispatch a custom event to notify other components of the currency change
    window.dispatchEvent(new Event('preferred-currency-changed'));
  };

  useEffect(() => {
    const handleCurrencyChange = () => {
      const saved = localStorage.getItem('preferred_currency');
      if (saved) {
        setCurrencyState(saved);
      }
    };
    window.addEventListener('preferred-currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('preferred-currency-changed', handleCurrencyChange);
    };
  }, []);

  const convert = (amount: number, fromCurrency: string = 'USD'): string => {
    if (isNaN(amount)) return `${currency} 0.00`;
    
    // 1. Convert input amount from its source currency to USD baseline
    let usdAmount = amount;
    if (fromCurrency !== 'USD') {
      const sourceRate = rates[fromCurrency] || 1;
      usdAmount = amount / sourceRate;
    }

    // 2. Convert USD amount to the target currency
    const targetRate = rates[currency] || 1;
    const finalAmount = usdAmount * targetRate;

    return `${currency} ${finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatReward = (points: number): string => {
    return convert(points, 'USD');
  };

  const formatCurrency = (amountInUSD: number): string => {
    return convert(amountInUSD, 'USD');
  };

  return {
    currency,
    rates,
    changeCurrency,
    convert,
    formatReward,
    formatCurrency,
    loading: false,
    availableCurrencies: ['USDT', 'KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'NGN']
  };
};
