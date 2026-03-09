import { apiUrl } from './api';

/**
 * Fetches user profile. On 404 or "User not found", clears localStorage
 * and redirects to login so stale session after DB re-seed is handled.
 */
export async function fetchUserProfile(
  userId: string
): Promise<{ status: string; data: Record<string, unknown> } | null> {
  const res = await fetch(apiUrl(`/api/user/profile?userId=${userId}`));
  const data = await res.json().catch(() => ({}));
  const isUserNotFound =
    res.status === 404 ||
    (data.message && String(data.message).includes('User not found'));
  if (isUserNotFound) {
    localStorage.clear();
    window.location.href = '/auth/login';
    return null;
  }
  return data;
}
