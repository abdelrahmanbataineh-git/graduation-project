import axios from 'axios';

// When served from FastAPI, use relative URL (same origin)
// When running with vite dev server, the proxy in vite.config.ts forwards /api/* to FastAPI
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
