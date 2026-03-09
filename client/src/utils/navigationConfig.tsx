/**
 * Navigation configuration for dashboard
 * Defines navigation items based on user roles
 */

import React from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Array<'platform_admin' | 'client_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'>;
}

export const getNavigationItems = (role: 'platform_admin' | 'client_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'): NavItem[] => {
  const allItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      roles: ['platform_admin', 'client_admin', 'reviewer', 'boss', 'manager', 'employee'],
    },
    {
      label: 'Profile',
      path: '/dashboard/settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      roles: ['platform_admin', 'client_admin', 'reviewer', 'boss', 'manager'],
    },
    {
      label: 'Settings',
      path: '/dashboard/settings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ),
      roles: ['platform_admin', 'client_admin', 'reviewer', 'boss', 'manager'],
    },
  ];

  return allItems.filter(item => item.roles.includes(role));
};

