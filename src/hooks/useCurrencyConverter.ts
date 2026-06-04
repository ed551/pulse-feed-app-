import { useState, useEffect } from 'react';

export interface ExchangeRates {
  [currencyCode: string]: number;
}

export const useCurrencyConverter = () => {
  // Default rates (Base: 1 USD)
  const [rates, setRates] = useState<ExchangeRates>({ 
    USD: 1,
    KES: 130, // authoritative local rate
    GOLD: 31.1035 / 2375.40, // ~0.01309 g per USD
    BTC: 1 / 67000
  });
  const [currency, setCurrency] = useState<string>('GOLD');
  const [loading, setLoading] = useState(true);
  const [goldPriceUSD, setGoldPriceUSD] = useState<number>(2375.40); 
  const [btcPriceUSD, setBtcPriceUSD] = useState<number>(67000);

  useEffect(() => {
    // Load saved currency
    const savedCurrency = localStorage.getItem('preferred_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    } else {
      // Default to PAXG for this app
      setCurrency('GOLD');
    }
    
    // Fetch exchange rates and crypto prices (PAXG for Gold)
    const fetchData = async () => {
      try {
        const response = await fetch('/api/binance/prices');
        if (response.ok) {
          const data = await response.json();
          const prices = data.prices || [];
          
          const paxgTicker = prices.find((p: any) => p.symbol === 'PAXGUSDT');
          const btcTicker = prices.find((p: any) => p.symbol === 'BTCUSDT');
          
          if (paxgTicker && paxgTicker.price) {
            const price = parseFloat(paxgTicker.price);
            if (!isNaN(price) && price > 0) {
              setGoldPriceUSD(price);
              const gPerUSD = 31.1035 / price;
              setRates(prev => ({ ...prev, GOLD: gPerUSD }));
            }
          }

          if (btcTicker && btcTicker.price) {
            const btcPrice = parseFloat(btcTicker.price);
            if (!isNaN(btcPrice) && btcPrice > 0) {
              setBtcPriceUSD(btcPrice);
              setRates(prev => ({ ...prev, BTC: 1 / btcPrice }));
            }
          }
        } else {
          console.warn('Gold rate fetch returned non-OK status. Using fallback.');
        }
      } catch (error) {
        // Reduced log severity as we have fallbacks
        console.warn('Real-time gold rates unavailable, staying with current rates.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const changeCurrency = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferred_currency', newCurrency);
  };

  const convert = (amount: number, fromCurrency: string = 'USD'): string => {
    if (isNaN(amount)) return '0.00 PAXG';

    // Convert input to USD base first
    const rateFrom = rates[fromCurrency] || 1;
    const amountInUSD = fromCurrency === 'USD' ? amount : amount / rateFrom;

    if (currency === 'GOLD' || currency === 'BTC_GOLD') {
      const gRate = rates['GOLD'] || (31.1035 / 2375.40);
      const grams = amountInUSD * gRate;
      const paxg = grams / 31.1035;
      return `${paxg.toFixed(6)} PAXG`;
    }

    if (currency === 'BTC') {
      const btcRate = rates['BTC'] || (1/67000);
      return `${(amountInUSD * btcRate).toFixed(8)} BTC`;
    }

    if (currency === 'KES') {
      const rate = rates['KES'] || 130;
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
      }).format(amountInUSD * rate);
    }

    // Default to USD formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amountInUSD);
  };

  const formatReward = (points: number): string => {
    // 1 point = 1 gram of Gold internally
    // 1 PAXG = 1 Troy Ounce = 31.1035 grams
    const paxg = points / 31.1035;
    return `${paxg.toFixed(6)} PAXG`;
  };

  const formatCurrency = (amountInUSD: number): string => {
    return convert(amountInUSD);
  };

  return {
    currency,
    rates,
    changeCurrency,
    convert,
    formatReward,
    formatCurrency,
    loading,
    availableCurrencies: Object.keys(rates).sort()
  };
};
