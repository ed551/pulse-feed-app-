import axios from 'axios';

async function getIp() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    console.log('Server IP:', response.data.ip);
  } catch (error) {
    console.error('Failed to get IP:', error);
  }
}

getIp();
