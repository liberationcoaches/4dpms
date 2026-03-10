const BASE_URL = import.meta.env.VITE_API_URL || 'https://performance-management-server-production.up.railway.app';

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}