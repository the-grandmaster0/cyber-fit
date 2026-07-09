
import axios from 'axios';
import { supabase } from './supabaseClient.js';

const api = axios.create({
  // In development the Vite proxy rewrites /api → http://localhost:3001/api.
  // In production set VITE_API_BASE_URL to the deployed server URL (no trailing slash).
  // e.g. VITE_API_BASE_URL=https://api.your-domain.com
  baseURL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      config.headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Unauthorized: sign out and redirect to login
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
