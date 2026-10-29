import axios from 'axios';

const client = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

let cachedCsrfToken = null;

export async function fetchCsrfToken(forceRefresh = false) {
  if (cachedCsrfToken && !forceRefresh) return cachedCsrfToken;
  try {
    const res = await axios.get('/api/auth/csrf', { withCredentials: true });
    cachedCsrfToken = res.data.csrfToken;
    return cachedCsrfToken;
  } catch (err) {
    console.warn('Could not fetch CSRF token:', err);
    return null;
  }
}

client.interceptors.request.use(async (config) => {
  const method = (config.method || '').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    let token = cachedCsrfToken;
    if (!token) {
      token = await fetchCsrfToken();
    }
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

client.interceptors.response.use(
  (res) => {
    if (res.data && res.data.csrfToken) {
      cachedCsrfToken = res.data.csrfToken;
    }
    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      typeof error.response.data.error === 'string' &&
      error.response.data.error.includes('CSRF') &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const newToken = await fetchCsrfToken(true);
      if (newToken) {
        originalRequest.headers['X-CSRF-Token'] = newToken;
        return client(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export function getVehicleImageUrl(filename) {
  if (!filename) return '/img/vehicleimages/placeholder.jpg';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  if (filename.startsWith('/uploads/')) return filename;
  return `/uploads/vehicles/${filename}`;
}

export default client;
