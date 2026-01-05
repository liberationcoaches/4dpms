import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './EmployeeDashboard.module.css';
import logo from '@/assets/logo.png';
import { getNavigationItems } from '@/utils/navigationConfig';
import { getDashboardPath } from '@/utils/dashboardRoutes';

interface PerformanceData {
  employee: {
    _id: string;
    name: string;
    email: string;
  };
  currentScore: number;
  historicalScores: Array<{
    period: number;
    score: number;
    date: string;
  }>;
  nextReviewDate: string | null;
  currentPeriod: number;
  kras: any;
}

interface UserProfile {
  name: string;
  email: string;
  mobile: string;
}

type ActiveTab = 'dashboard' | 'settings';

function EmployeeDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [actionPlan, setActionPlan] = useState('');
  const [user, setUser] = useState<{ name: string; email: string; mobile?: string } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    mobile: '',
  });
  const [profileErrors, setProfileErrors] = useState<Partial<UserProfile>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchUserProfile();
    fetchNotificationCount();
    fetchPerformanceData();
  }, [navigate]);

  const fetchUserProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/user/profile?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const userData = {
          name: data.data.name || '',
          email: data.data.email || '',
          mobile: data.data.mobile || '',
        };
        setUser(userData);
        setProfile(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationCount(data.data?.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNotificationClick = () => {
    navigate('/dashboard/notifications');
  };

  const handleProfileClick = () => {
    setActiveTab('settings');
  };

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setProfileSuccessMessage('');
  };

  const validateProfile = (): boolean => {
    const newErrors: Partial<UserProfile> = {};

    if (!profile.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!profile.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(profile.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Invalid mobile number (10 digits required)';
    }

    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSuccessMessage('');

    if (!validateProfile()) {
      return;
    }

    setIsSavingProfile(true);
    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccessMessage('Profile updated successfully!');
        setUser(profile);
        setTimeout(() => setProfileSuccessMessage(''), 3000);
      } else {
        setProfileErrors({ email: data.message || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileErrors({ email: 'Network error. Please try again.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogoClick = () => {
    navigate('/dashboard/employee');
  };

  const navigationItems = getNavigationItems('employee');
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchPerformanceData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/employee/performance?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setPerformanceData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!actionPlan.trim()) {
      alert('Please enter an action plan');
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/employee/acknowledge?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionPlan }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Review acknowledged and action plan saved!');
        setShowActionPlan(false);
        setActionPlan('');
      } else {
        alert(data.message || 'Failed to acknowledge review');
      }
    } catch (error) {
      console.error('Failed to acknowledge review:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  if (isLoading) {
    return <div className={baseStyles.loading}>Loading...</div>;
  }

  if (!performanceData) {
    return <div className={baseStyles.empty}>Performance data not found</div>;
  }

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
              {user?.name ? getInitials(user.name) : (performanceData?.employee.name ? getInitials(performanceData.employee.name) : 'E')}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || performanceData?.employee.name || 'Employee'}</span>
              <span className={baseStyles.profileEmail}>{user?.email || performanceData?.employee.email || ''}</span>
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
                {user?.name ? getInitials(user.name) : 'E'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Employee'}</span>
                <span className={baseStyles.userRole}>Employee</span>
              </div>
            </div>

            <div className={baseStyles.navItems}>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/dashboard' && location.pathname === '/dashboard');
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
                className={`${baseStyles.menuItem} ${activeTab === 'settings' ? baseStyles.menuItemActive : ''}`}
                onClick={() => {
                  setActiveTab('settings');
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
        <div className={baseStyles.content}>
          {activeTab === 'dashboard' && (
            <>
              <div className={styles.pageHeader}>
                <h1>Employee Dashboard</h1>
                <p className={styles.welcome}>Welcome, {performanceData.employee.name}</p>
              </div>

      <div className={styles.overview}>
        <div className={styles.scoreCard}>
          <h2>Current Score</h2>
          <div className={styles.scoreValue}>{performanceData.currentScore.toFixed(1)}</div>
          <div className={styles.scoreLabel}>Out of 100</div>
        </div>

        <div className={styles.infoCard}>
          <h3>Next Review Date</h3>
          <p className={styles.date}>
            {performanceData.nextReviewDate
              ? new Date(performanceData.nextReviewDate).toLocaleDateString()
              : 'Not scheduled'}
          </p>
        </div>

        <div className={styles.infoCard}>
          <h3>Current Period</h3>
          <p className={styles.period}>Period {performanceData.currentPeriod}</p>
        </div>
      </div>

      <div className={styles.historical}>
        <h2>Historical Trends</h2>
        {performanceData.historicalScores.length > 0 ? (
          <div className={styles.trendsChart}>
            {performanceData.historicalScores.map((item, index) => (
              <div key={index} className={styles.trendItem}>
                <div className={styles.trendBar}>
                  <div
                    className={styles.trendFill}
                    style={{ height: `${item.score}%` }}
                  />
                </div>
                <div className={styles.trendLabel}>
                  <div>Period {item.period}</div>
                  <div className={styles.trendScore}>{item.score.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noData}>No historical data available yet</p>
        )}
      </div>

      {/* My KRAs Section */}
      {performanceData.kras && (
        <div className={styles.myKRAsSection}>
          <h2>My KRAs</h2>
          <div className={styles.krasGrid}>
            <div className={styles.kraCategory}>
              <h3>Functional KRAs ({performanceData.kras.functionalKRAs?.length || 0})</h3>
              {performanceData.kras.functionalKRAs?.length > 0 ? (
                <ul>
                  {performanceData.kras.functionalKRAs.map((kra: any, idx: number) => (
                    <li key={idx}>{kra.kra}</li>
                  ))}
                </ul>
              ) : (
                <p>No Functional KRAs assigned</p>
              )}
            </div>
            <div className={styles.kraCategory}>
              <h3>Organizational KRAs ({performanceData.kras.organizationalKRAs?.length || 0})</h3>
              {performanceData.kras.organizationalKRAs?.length > 0 ? (
                <ul>
                  {performanceData.kras.organizationalKRAs.map((kra: any, idx: number) => (
                    <li key={idx}>{kra.coreValues}</li>
                  ))}
                </ul>
              ) : (
                <p>No Organizational KRAs assigned</p>
              )}
            </div>
            <div className={styles.kraCategory}>
              <h3>Self Development KRAs ({performanceData.kras.selfDevelopmentKRAs?.length || 0})</h3>
              {performanceData.kras.selfDevelopmentKRAs?.length > 0 ? (
                <ul>
                  {performanceData.kras.selfDevelopmentKRAs.map((kra: any, idx: number) => (
                    <li key={idx}>{kra.areaOfConcern}</li>
                  ))}
                </ul>
              ) : (
                <p>No Self Development KRAs assigned</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={styles.feedback}>
        <h2>Feedback & Comments</h2>
        <div className={styles.feedbackCard}>
          {performanceData.kras?.functionalKRAs?.length > 0 ? (
            <div>
              <h3>Functional Dimension</h3>
              {performanceData.kras.functionalKRAs.map((kra: any, index: number) => (
                <div key={index} className={styles.feedbackItem}>
                  <strong>{kra.kra}</strong>
                  <p>{kra[`r${performanceData.currentPeriod}ActualPerf`] || 'No feedback yet'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noData}>No feedback available yet</p>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.actionPlanButton}
          onClick={() => setShowActionPlan(!showActionPlan)}
        >
          {showActionPlan ? 'Cancel' : 'Create Action Plan'}
        </button>
      </div>

      {showActionPlan && (
        <div className={styles.actionPlanForm}>
          <h2>Create Action Plan</h2>
          <textarea
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            placeholder="Enter your action plan for improvement..."
            className={styles.actionPlanTextarea}
          />
          <button className={styles.acknowledgeButton} onClick={handleAcknowledge}>
            Acknowledge Review & Save Action Plan
          </button>
        </div>
      )}
            </>
          )}

          {activeTab === 'settings' && (
            <div className={baseStyles.tabContent}>
              <h1 className={baseStyles.pageTitle}>Profile & Settings</h1>
              
              <form onSubmit={handleSaveProfile} className={styles.profileForm}>
                <div className={baseStyles.formGroup}>
                  <label htmlFor="profileName">Name</label>
                  <input
                    id="profileName"
                    type="text"
                    className={`${baseStyles.input} ${profileErrors.name ? baseStyles.inputError : ''}`}
                    value={profile.name}
                    onChange={(e) => handleProfileChange('name', e.target.value)}
                  />
                  {profileErrors.name && (
                    <span className={baseStyles.errorText}>{profileErrors.name}</span>
                  )}
                </div>

                <div className={baseStyles.formGroup}>
                  <label htmlFor="profileEmail">Email</label>
                  <input
                    id="profileEmail"
                    type="email"
                    className={`${baseStyles.input} ${profileErrors.email ? baseStyles.inputError : ''}`}
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                  />
                  {profileErrors.email && (
                    <span className={baseStyles.errorText}>{profileErrors.email}</span>
                  )}
                </div>

                <div className={baseStyles.formGroup}>
                  <label htmlFor="profileMobile">Mobile</label>
                  <input
                    id="profileMobile"
                    type="tel"
                    className={`${baseStyles.input} ${profileErrors.mobile ? baseStyles.inputError : ''}`}
                    value={profile.mobile}
                    onChange={(e) => handleProfileChange('mobile', e.target.value.replace(/\D/g, ''))}
                    maxLength={10}
                  />
                  {profileErrors.mobile && (
                    <span className={baseStyles.errorText}>{profileErrors.mobile}</span>
                  )}
                </div>

                {profileSuccessMessage && (
                  <div className={baseStyles.successMessage} role="alert">
                    {profileSuccessMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className={baseStyles.submitButton}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeDashboard;

