import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import baseStyles from '@/styles/DashboardBase.module.css';
import logo from '@/assets/logo.png';
import { getNavigationItems } from '@/utils/navigationConfig';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import { fetchUserProfile } from '@/utils/userProfile';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ name: string; email: string; mobile: string; role?: string } | null>(null);
  const [userRole, setUserRole] = useState<'platform_admin' | 'client_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'>('employee');
  const [notificationCount, setNotificationCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || '';

    if (!userId) {
      navigate('/auth/signup');
      return;
    }

    // Fetch user profile (clears storage and redirects to login on 404/stale user)
    fetchUserProfile(userId).then((data) => {
      if (data?.status === 'success' && data.data) {
        setUser(data.data as { name: string; email: string; mobile: string; role?: string });
        const role = (data.data.role as string) || localStorage.getItem('userRole') || 'employee';
        setUserRole(role as typeof userRole);
        localStorage.setItem('userRole', role);
        if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
          navigate(getDashboardPath(role as UserRole));
        }
      }
    }).catch(console.error);

    // Fetch notification count
    fetch(apiUrl(`/api/notifications/count?userId=${userId}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setNotificationCount(data.data?.count || 0);
        }
      })
      .catch(console.error);
  }, [navigate, location.pathname]);

  const handleNotificationClick = () => {
    navigate('/dashboard/notifications');
  };

  const handleProfileClick = () => {
    navigate('/dashboard/settings');
  };

  const handleLogoClick = () => {
    const role = userRole || (localStorage.getItem('userRole') as any) || 'employee';
    navigate(getDashboardPath(role));
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('userId');
    localStorage.removeItem('dev_mobileOTP');
    localStorage.clear();
    
    // Redirect to home page
    navigate('/');
  };

  const navigationItems = getNavigationItems(userRole);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  return (
    <div className={baseStyles.dashboard}>
      {/* Top Header */}
      <header className={baseStyles.header}>
        <button
          className={baseStyles.menuButton}
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Toggle menu"
        >
          <span className={baseStyles.hamburger}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className={baseStyles.logoContainer} onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Logo" className={baseStyles.logo} />
          <span className={baseStyles.logoText}>4DPMS</span>
        </div>

        <div className={baseStyles.headerRight}>
          {/* Notifications */}
          <div className={baseStyles.notificationContainer}>
            <button
              className={baseStyles.notificationButton}
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <svg
                className={baseStyles.bellIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notificationCount > 0 && (
                <span className={baseStyles.notificationBadge}>{notificationCount}</span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className={baseStyles.profileSection} onClick={handleProfileClick}>
            <div className={baseStyles.profileAvatar}>
              {user?.name ? getInitials(user.name) : 'U'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'User'}</span>
              <span className={baseStyles.profileEmail}>{user?.email || ''}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Side Menu Overlay */}
      {showMenu && (
        <div className={baseStyles.menuOverlay} onClick={() => setShowMenu(false)}>
          <nav className={baseStyles.sideMenu} onClick={(e) => e.stopPropagation()}>
            <button
              className={baseStyles.closeButton}
              onClick={() => setShowMenu(false)}
              aria-label="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div className={baseStyles.userProfileSection}>
              <div className={baseStyles.userAvatar}>
                {user?.name ? getInitials(user.name) : 'U'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'User'}</span>
                <span className={baseStyles.userRole}>{userRole || 'User'}</span>
              </div>
            </div>

            <div className={baseStyles.navItems}>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/dashboard' && location.pathname === '/dashboard') ||
                  (item.path === '/dashboard/settings' && location.pathname.startsWith('/dashboard/settings'));
                return (
                  <button
                    key={item.path}
                    className={`${baseStyles.menuItem} ${isActive ? baseStyles.menuItemActive : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      setShowMenu(false);
                    }}
                  >
                    <span className={baseStyles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={baseStyles.sidebarFooter}>
              <div className={baseStyles.navDivider}></div>
              <button
                className={`${baseStyles.menuItem} ${location.pathname === '/dashboard/settings' ? baseStyles.menuItemActive : ''}`}
                onClick={() => {
                  navigate('/dashboard/settings');
                  setShowMenu(false);
                }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
                <span>Settings</span>
              </button>
              <button className={baseStyles.logoutButton} onClick={handleLogout}>
                <svg className={baseStyles.logoutIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Log out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className={baseStyles.mainContainer}>
        <main className={baseStyles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

