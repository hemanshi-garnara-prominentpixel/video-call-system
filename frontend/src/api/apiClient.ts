import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost';
const apiPort = import.meta.env.VITE_API_PORT;

const apiClient = axios.create({
  baseURL: apiPort ? `${apiUrl}:${apiPort}/api` : `${apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
