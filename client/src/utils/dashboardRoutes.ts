/**
 * Utility functions for dashboard routing based on user roles
 */

export type UserRole =
  | 'platform_admin'
  | 'client_admin'
  | 'org_admin'
  | 'reviewer'
  | 'boss'
  | 'manager'
  | 'employee';

/**
 * Get the dashboard path for a specific user role
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'platform_admin':
      return '/admin/dashboard';
    case 'client_admin':
      return '/client-admin/dashboard';
    case 'org_admin':
      return '/org-admin/dashboard';
    case 'reviewer':
      return '/reviewer/dashboard';
    case 'boss':
    case 'manager':
    case 'employee':
      return '/member-dashboard';
    default:
      return '/member-dashboard';
  }
}

/**
 * Get user role from localStorage
 */
export function getUserRole(): UserRole {
  const role = localStorage.getItem('userRole') as UserRole | null;
  return role || 'employee';
}
