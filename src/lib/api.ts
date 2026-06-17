// Production API configuration for Pulse Feeds
const BASE_URL = 'https://pulse-feeds-server.onrender.com';

export const api = {
  // Check user balance
  async getBalance() {
    try {
      const response = await fetch(`${BASE_URL}/api/proxy/balance`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  },

  // Process tokenized gold reward withdrawal
  async withdraw(data: any) {
    try {
      const response = await fetch(`${BASE_URL}/api/proxy/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Withdrawal request failed');
      return await response.json();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      throw error;
    }
  }
};

