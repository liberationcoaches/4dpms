import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ReviewerDashboard.module.css';
import logo from '@/assets/logo.png';
import TeamMemberCard from '@/components/TeamMemberCard/TeamMemberCard';

interface Organization {
  _id: string;
  name: string;
  industry: string;
  subscriptionStatus: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  manager: string;
}

interface UserProfile {
  name: string;
  email: string;
  mobile: string;
}

type ActiveTab = 'dashboard' | 'settings';

function ReviewerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; mobile?: string } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
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
    fetchOrganizations();
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

  const handleLogoClick = (): void => {
    navigate('/reviewer/dashboard');
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const fetchOrganizations = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/organizations?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrganizations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrg = async (org: Organization) => {
    setIsLoading(true);
    setSelectedOrg(org);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/organizations/${org._id}/employees?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !selectedOrg) {
    return <div className={baseStyles.loading}>Loading Organizations...</div>;
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
              {user?.name ? getInitials(user.name) : 'R'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'Reviewer'}</span>
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
                {user?.name ? getInitials(user.name) : 'R'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Reviewer'}</span>
                <span className={baseStyles.userRole}>Reviewer</span>
              </div>
            </div>

            <div className={baseStyles.navItems}>
              <button
                className={`${baseStyles.menuItem} ${activeTab === 'dashboard' ? baseStyles.menuItemActive : ''}`}
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedOrg(null);
                  setShowMenu(false);
                }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Dashboard</span>
              </button>

              <button
                className={baseStyles.menuItem}
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedOrg(null);
                  setShowMenu(false);
                }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Organizations</span>
              </button>
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
                <h1>Reviewer Dashboard</h1>
                {selectedOrg && (
                  <div className={styles.breadcrumb}>
                    <button onClick={() => setSelectedOrg(null)} className={styles.backLink}>
                      ← Back to Organizations
                    </button>
                    <span className={styles.currentOrg}> / {selectedOrg.name}</span>
                  </div>
                )}
              </div>

          {!selectedOrg ? (
            <div className={styles.organizations}>
          {organizations.length === 0 ? (
            <p className={styles.empty}>No organizations assigned for review.</p>
          ) : (
            <div className={styles.orgGrid}>
              {organizations.map((org) => (
                <div
                  key={org._id}
                  className={styles.orgCard}
                  onClick={() => handleSelectOrg(org)}
                >
                  <div className={styles.orgIcon}>🏢</div>
                  <h3>{org.name}</h3>
                  <p>{org.industry}</p>
                  <span className={styles.badge}>{org.subscriptionStatus}</span>
                  <div className={styles.actionButton}>View Employees</div>
                </div>
              ))}
            </div>
          )}
            </div>
          ) : (
            <div className={styles.employees}>
          {isLoading ? (
            <div className={styles.loading}>Loading Employees...</div>
          ) : employees.length === 0 ? (
            <p className={styles.empty}>No employees found in this organization.</p>
          ) : (
            <div className={styles.employeesGrid}>
              {employees.map((employee) => (
                <TeamMemberCard
                  key={employee._id}
                  name={employee.name}
                  email={employee.email}
                  mobile={employee.mobile}
                  buttonText="Enter Scores →"
                  onClick={() => navigate(`/reviewer/scoring/${employee._id}`)}
                >
                  {employee.manager && <p><strong>Manager:</strong> {employee.manager}</p>}
                </TeamMemberCard>
              ))}
            </div>
            )}
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

export default ReviewerDashboard;

