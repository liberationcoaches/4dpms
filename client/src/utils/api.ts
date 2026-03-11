/**
 * In dev: use relative URLs so Vite proxy forwards /api to the backend (no CORS).
 * In prod: use full API URL.
 */
const BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://performance-management-server-production.up.railway.app');

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
