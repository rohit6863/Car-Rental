import axios from 'axios';

let cachedCsrfToken = null;

const api = axios.create({
  baseURL: '',
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchCsrfToken() {
  try {
    const res = await axios.get('/api/auth/csrf', { withCredentials: true });
    cachedCsrfToken = res.data.csrfToken;
    return cachedCsrfToken;
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
    return null;
  }
}

export function setCsrfToken(token) {
  cachedCsrfToken = token;
}

api.interceptors.request.use(async (config) => {
  const method = config.method ? config.method.toUpperCase() : 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!cachedCsrfToken) {
      await fetchCsrfToken();
    }
    if (cachedCsrfToken) {
      config.headers['X-CSRF-Token'] = cachedCsrfToken;
    }
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => {
    // If backend returned a fresh csrfToken in response body, cache it
    if (response.data && response.data.csrfToken) {
      cachedCsrfToken = response.data.csrfToken;
    }
    return response;
  },
  async (error) => {
    // If CSRF token was invalid/expired, retry once with a fresh token
    const originalRequest = error.config;
    if (error.response && error.response.status === 403 && error.response.data && error.response.data.error === 'Invalid CSRF token' && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await fetchCsrfToken();
      if (newToken) {
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export function getVehicleImageUrl(filename) {
  if (!filename) return '/assets/images/recent-car-1.jpg';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  // If stored as relative or plain filename, serve from /uploads/
  return `/uploads/${filename}`;
}

export default api;
