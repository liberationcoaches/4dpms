/**
 * Utility functions for dashboard routing based on user roles
 */

export type UserRole = 'platform_admin' | 'client_admin' | 'reviewer' | 'boss' | 'manager' | 'employee';

/**
 * Get the dashboard path for a specific user role
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'platform_admin':
      return '/admin/dashboard';
    case 'client_admin':
      return '/client-admin/dashboard';
    case 'reviewer':
      return '/reviewer/dashboard';
    case 'boss':
      return '/dashboard/boss';
    case 'manager':
      return '/dashboard/manager';
    case 'employee':
      return '/dashboard/employee';
    default:
      return '/dashboard/employee';
  }
}

/**
 * Get user role from localStorage
 */
export function getUserRole(): UserRole {
  const role = localStorage.getItem('userRole') as UserRole | null;
  return role || 'employee';
}

