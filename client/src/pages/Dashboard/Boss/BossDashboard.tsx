import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './BossDashboard.module.css';
import logo from '@/assets/logo.png';
import { getNavigationItems } from '@/utils/navigationConfig';

interface Manager {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  createdAt: string;
}

interface Organization {
  _id: string;
  name: string;
  industry: string;
  size: number;
  subscriptionStatus: string;
  reviewerId?: { name: string; email: string };
}

interface DepartmentStat {
  managerId: string;
  managerName: string;
  employeeCount: number;
  averageScore: number;
}

interface Analytics {
  managers: {
    total: number;
    list: Array<{ _id: string; name: string; email: string }>;
  };
  employees: {
    total: number;
  };
  departments: number;
  departmentStats?: DepartmentStat[];
  orgAverageScore?: number;
}

function BossDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'managers' | 'analytics' | 'profile'>('dashboard');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', mobile: '' });
  const [profileErrors, setProfileErrors] = useState<Partial<{ name: string; email: string; mobile: string }>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [newManager, setNewManager] = useState({
    name: '',
    email: '',
    mobile: '',
    designation: '',
  });
  const [myKRAs, setMyKRAs] = useState<any>(null);
  const [managerKRAs, setManagerKRAs] = useState<{ [managerId: string]: any }>({});
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [showKRAModal, setShowKRAModal] = useState(false);
  const [kraType, setKraType] = useState<'functional' | 'organizational' | 'self-development'>('functional');
  const [newKRA, setNewKRA] = useState<any>({});
  const [showKRAsView, setShowKRAsView] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchUserProfile();
    fetchNotificationCount();
    fetchManagers();
    fetchOrganization();
    fetchAnalytics();
    fetchMyKRAs();
  }, [navigate]);

  const fetchUserProfile = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/user/profile?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setUser({ name: data.data.name, email: data.data.email });
        setProfile({
          name: data.data.name || '',
          email: data.data.email || '',
          mobile: data.data.mobile || '',
        });
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
    setActiveTab('profile');
  };

  const handleLogoClick = () => {
    navigate('/dashboard/boss');
  };

  const navigationItems = getNavigationItems('boss');
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileChange = (field: 'name' | 'email' | 'mobile', value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setProfileSuccessMessage('');
  };

  const validateProfile = (): boolean => {
    const newErrors: Partial<{ name: string; email: string; mobile: string }> = {};

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
        setUser({ name: profile.name, email: profile.email });
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

  const fetchManagers = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/managers?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setManagers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/organization?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrganization(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/analytics?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchMyKRAs = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/my-kras?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setMyKRAs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch my KRAs:', error);
    }
  };

  const fetchManagerKRAs = async (managerId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/managers/${managerId}/kras?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setManagerKRAs((prev) => ({ ...prev, [managerId]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch manager KRAs:', error);
    }
  };

  const handleAddManagerKRA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager) return;

    try {
      const userId = localStorage.getItem('userId');
      const endpoint = `/api/boss/managers/${selectedManager._id}/kras/${kraType}`;
      const res = await fetch(`${endpoint}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKRA),
      });

      const data = await res.json();
      if (res.ok) {
        setShowKRAModal(false);
        setNewKRA({});
        fetchManagerKRAs(selectedManager._id);
        alert('KRA added successfully!');
      } else {
        alert(data.message || 'Failed to add KRA');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/boss/managers?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManager),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowCreateForm(false);
        setNewManager({ name: '', email: '', mobile: '', designation: '' });
        fetchManagers();
        fetchAnalytics();
        alert('Manager created successfully!');
      } else {
        alert(data.message || 'Failed to create manager');
      }
    } catch (error) {
      console.error('Failed to create manager:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  if (isLoading) {
    return <div className={baseStyles.loading}>Loading...</div>;
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
              {user?.name ? getInitials(user.name) : 'B'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'Boss'}</span>
              <span className={baseStyles.profileEmail}>{user?.email || ''}</span>
            </div>
          </div>

          {/* Add People Button */}
          <button className={baseStyles.addPeopleButton} onClick={() => setShowCreateForm(!showCreateForm)}>
            Add People
          </button>
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
                {user?.name ? getInitials(user.name) : 'B'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Boss'}</span>
                <span className={baseStyles.userRole}>Boss</span>
              </div>
            </div>

            <div className={baseStyles.navItems}>
              <button
                className={`${baseStyles.menuItem} ${activeTab === 'dashboard' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('dashboard'); setShowMenu(false); }}
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
                className={`${baseStyles.menuItem} ${activeTab === 'managers' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('managers'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Managers</span>
              </button>

              <button
                className={`${baseStyles.menuItem} ${activeTab === 'analytics' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('analytics'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Analytics</span>
              </button>

              <button
                className={`${baseStyles.menuItem} ${activeTab === 'profile' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('profile'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile</span>
              </button>
            </div>

            <div className={baseStyles.sidebarFooter}>
              <div className={baseStyles.navDivider}></div>
              <button
                className={`${baseStyles.menuItem} ${activeTab === 'profile' ? baseStyles.menuItemActive : ''}`}
                onClick={() => {
                  setActiveTab('profile');
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
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <div>
                  <h1>Boss Dashboard</h1>
                  {organization && (
                    <p className={styles.orgName}>{organization.name}</p>
                  )}
                </div>
              </div>

              {/* My KRAs Section */}
              {myKRAs && (
                <div className={styles.myKRAsSection}>
                  <h2>My KRAs</h2>
                  <div className={styles.krasGrid}>
                    <div className={styles.kraCategory}>
                      <h3>Functional KRAs ({myKRAs.functionalKRAs?.length || 0})</h3>
                      {myKRAs.functionalKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.functionalKRAs.map((kra: any, idx: number) => (
                            <li key={idx}>{kra.kra}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No Functional KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <h3>Organizational KRAs ({myKRAs.organizationalKRAs?.length || 0})</h3>
                      {myKRAs.organizationalKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.organizationalKRAs.map((kra: any, idx: number) => (
                            <li key={idx}>{kra.coreValues}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No Organizational KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <h3>Self Development KRAs ({myKRAs.selfDevelopmentKRAs?.length || 0})</h3>
                      {myKRAs.selfDevelopmentKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.selfDevelopmentKRAs.map((kra: any, idx: number) => (
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

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Manager</h2>
                  <form onSubmit={handleCreateManager}>
                    <div className={baseStyles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newManager.name}
                        onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        className={baseStyles.input}
                        value={newManager.email}
                        onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        className={baseStyles.input}
                        value={newManager.mobile}
                        onChange={(e) => setNewManager({ ...newManager, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Designation</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newManager.designation}
                        onChange={(e) => setNewManager({ ...newManager, designation: e.target.value })}
                        placeholder="e.g., Department Head, Team Lead"
                      />
                    </div>
                    <button type="submit" className={baseStyles.submitButton}>
                      Create Manager
                    </button>
                  </form>
                </div>
              )}

              {analytics && (
                <div className={styles.analytics}>
                  <h2>Organization Overview</h2>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                      <h3>Managers</h3>
                      <div className={styles.statValue}>{analytics.managers.total}</div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Employees</h3>
                      <div className={styles.statValue}>{analytics.employees.total}</div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Departments</h3>
                      <div className={styles.statValue}>{analytics.departments}</div>
                    </div>
                    {analytics.orgAverageScore !== undefined && (
                      <div className={styles.analyticsCard}>
                        <h3>Org Average Score</h3>
                        <div className={styles.statValue}>{analytics.orgAverageScore.toFixed(1)}</div>
                      </div>
                    )}
                  </div>

                  {analytics.departmentStats && analytics.departmentStats.length > 0 && (
                    <div className={styles.departmentComparison}>
                      <h3>Department Comparisons</h3>
                      <div className={styles.departmentsList}>
                        {analytics.departmentStats
                          .sort((a, b) => b.averageScore - a.averageScore)
                          .map((dept, index) => (
                            <div key={dept.managerId} className={styles.departmentCard}>
                              <div className={styles.deptRank}>#{index + 1}</div>
                              <div className={styles.deptInfo}>
                                <h4>{dept.managerName}</h4>
                                <p>{dept.employeeCount} employees</p>
                              </div>
                              <div className={styles.deptScore}>{dept.averageScore.toFixed(1)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.managers}>
                <h2>Managers</h2>
                {managers.length === 0 ? (
                  <p className={styles.empty}>No managers yet. Create one to get started.</p>
                ) : (
                  <div className={styles.managersGrid}>
                    {managers.map((manager) => (
                      <div key={manager._id} className={styles.managerCard}>
                        <h3>{manager.name}</h3>
                        <p><strong>Email:</strong> {manager.email}</p>
                        <p><strong>Mobile:</strong> {manager.mobile}</p>
                        <p className={styles.createdDate}>
                          Created: {new Date(manager.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'managers' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Managers</h1>
              </div>

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Manager</h2>
                  <form onSubmit={handleCreateManager}>
                    <div className={baseStyles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newManager.name}
                        onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        className={baseStyles.input}
                        value={newManager.email}
                        onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        className={baseStyles.input}
                        value={newManager.mobile}
                        onChange={(e) => setNewManager({ ...newManager, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Designation</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newManager.designation}
                        onChange={(e) => setNewManager({ ...newManager, designation: e.target.value })}
                        placeholder="e.g., Department Head, Team Lead"
                      />
                    </div>
                    <button type="submit" className={baseStyles.submitButton}>
                      Create Manager
                    </button>
                  </form>
                </div>
              )}

              {managers.length === 0 ? (
                <p className={styles.empty}>No managers yet. Create one to get started.</p>
              ) : (
                <div className={styles.managersGrid}>
                  {managers.map((manager) => (
                    <div key={manager._id} className={styles.managerCard}>
                      <h3>{manager.name}</h3>
                      <p><strong>Email:</strong> {manager.email}</p>
                      <p><strong>Mobile:</strong> {manager.mobile}</p>
                      <p className={styles.createdDate}>
                        Created: {new Date(manager.createdAt).toLocaleDateString()}
                      </p>
                      <div className={styles.managerActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('functional');
                          }}
                        >
                          Add Functional KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('organizational');
                          }}
                        >
                          Add Organizational KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('self-development');
                          }}
                        >
                          Add Self Development KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            if (showKRAsView === manager._id) {
                              setShowKRAsView(null);
                            } else {
                              setShowKRAsView(manager._id);
                              fetchManagerKRAs(manager._id);
                            }
                          }}
                        >
                          {showKRAsView === manager._id ? 'Hide KRAs' : 'View KRAs'}
                        </button>
                      </div>
                      {showKRAsView === manager._id && managerKRAs[manager._id] && (
                        <div className={styles.krasView}>
                          <h4>Functional KRAs</h4>
                          {managerKRAs[manager._id].functionalKRAs?.length > 0 ? (
                            <ul>
                              {managerKRAs[manager._id].functionalKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.kra}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No Functional KRAs</p>
                          )}
                          <h4>Organizational KRAs</h4>
                          {managerKRAs[manager._id].organizationalKRAs?.length > 0 ? (
                            <ul>
                              {managerKRAs[manager._id].organizationalKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.coreValues}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No Organizational KRAs</p>
                          )}
                          <h4>Self Development KRAs</h4>
                          {managerKRAs[manager._id].selfDevelopmentKRAs?.length > 0 ? (
                            <ul>
                              {managerKRAs[manager._id].selfDevelopmentKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.areaOfConcern}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No Self Development KRAs</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className={styles.tabContent}>
              <h1>Analytics</h1>
              {analytics && (
                <div className={styles.analytics}>
                  <h2>Organization Overview</h2>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                      <h3>Managers</h3>
                      <div className={styles.statValue}>{analytics.managers.total}</div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Employees</h3>
                      <div className={styles.statValue}>{analytics.employees.total}</div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Departments</h3>
                      <div className={styles.statValue}>{analytics.departments}</div>
                    </div>
                    {analytics.orgAverageScore !== undefined && (
                      <div className={styles.analyticsCard}>
                        <h3>Org Average Score</h3>
                        <div className={styles.statValue}>{analytics.orgAverageScore.toFixed(1)}</div>
                      </div>
                    )}
                  </div>

                  {analytics.departmentStats && analytics.departmentStats.length > 0 && (
                    <div className={styles.departmentComparison}>
                      <h3>Department Comparisons</h3>
                      <div className={styles.departmentsList}>
                        {analytics.departmentStats
                          .sort((a, b) => b.averageScore - a.averageScore)
                          .map((dept, index) => (
                            <div key={dept.managerId} className={styles.departmentCard}>
                              <div className={styles.deptRank}>#{index + 1}</div>
                              <div className={styles.deptInfo}>
                                <h4>{dept.managerName}</h4>
                                <p>{dept.employeeCount} employees</p>
                              </div>
                              <div className={styles.deptScore}>{dept.averageScore.toFixed(1)}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.tabContent}>
              <h1>Profile & Settings</h1>
              <div className={styles.profileForm}>
                <form onSubmit={handleSaveProfile}>
                  <div className={baseStyles.formGroup}>
                    <label htmlFor="profile-name">Name *</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleProfileChange('name', e.target.value)}
                      className={`${baseStyles.input} ${profileErrors.name ? baseStyles.inputError : ''}`}
                    />
                    {profileErrors.name && (
                      <span className={baseStyles.errorText}>{profileErrors.name}</span>
                    )}
                  </div>

                  <div className={baseStyles.formGroup}>
                    <label htmlFor="profile-email">Email *</label>
                    <input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className={`${baseStyles.input} ${profileErrors.email ? baseStyles.inputError : ''}`}
                    />
                    {profileErrors.email && (
                      <span className={baseStyles.errorText}>{profileErrors.email}</span>
                    )}
                  </div>

                  <div className={baseStyles.formGroup}>
                    <label htmlFor="profile-mobile">Mobile *</label>
                    <input
                      id="profile-mobile"
                      type="tel"
                      value={profile.mobile}
                      onChange={(e) => handleProfileChange('mobile', e.target.value)}
                      className={`${baseStyles.input} ${profileErrors.mobile ? baseStyles.inputError : ''}`}
                    />
                    {profileErrors.mobile && (
                      <span className={baseStyles.errorText}>{profileErrors.mobile}</span>
                    )}
                  </div>

                  {profileSuccessMessage && (
                    <div className={baseStyles.successMessage}>{profileSuccessMessage}</div>
                  )}

                  <button
                    type="submit"
                    className={baseStyles.submitButton}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>

              {/* My KRAs in Profile */}
              {myKRAs && (
                <div className={styles.myKRAsSection}>
                  <h2>My KRAs</h2>
                  <div className={styles.krasGrid}>
                    <div className={styles.kraCategory}>
                      <h3>Functional KRAs ({myKRAs.functionalKRAs?.length || 0})</h3>
                      {myKRAs.functionalKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.functionalKRAs.map((kra: any, idx: number) => (
                            <li key={idx}>{kra.kra}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No Functional KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <h3>Organizational KRAs ({myKRAs.organizationalKRAs?.length || 0})</h3>
                      {myKRAs.organizationalKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.organizationalKRAs.map((kra: any, idx: number) => (
                            <li key={idx}>{kra.coreValues}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No Organizational KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <h3>Self Development KRAs ({myKRAs.selfDevelopmentKRAs?.length || 0})</h3>
                      {myKRAs.selfDevelopmentKRAs?.length > 0 ? (
                        <ul>
                          {myKRAs.selfDevelopmentKRAs.map((kra: any, idx: number) => (
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
            </div>
          )}
        </div>
      </div>

      {/* KRA Modal for Managers */}
      {showKRAModal && selectedManager && (
        <div className={styles.modalOverlay} onClick={() => setShowKRAModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add {kraType === 'functional' ? 'Functional' : kraType === 'organizational' ? 'Organizational' : 'Self Development'} KRA for {selectedManager.name}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowKRAModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAddManagerKRA}>
                {kraType === 'functional' && (
                  <>
                    <div className={baseStyles.formGroup}>
                      <label>KRA *</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newKRA.kra || ''}
                        onChange={(e) => setNewKRA({ ...newKRA, kra: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>KPI Target</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newKRA.kpiTarget || ''}
                        onChange={(e) => setNewKRA({ ...newKRA, kpiTarget: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {kraType === 'organizational' && (
                  <div className={baseStyles.formGroup}>
                    <label>Core Values *</label>
                    <input
                      type="text"
                      className={baseStyles.input}
                      value={newKRA.coreValues || ''}
                      onChange={(e) => setNewKRA({ ...newKRA, coreValues: e.target.value })}
                      required
                    />
                  </div>
                )}
                {kraType === 'self-development' && (
                  <div className={baseStyles.formGroup}>
                    <label>Area of Concern *</label>
                    <input
                      type="text"
                      className={baseStyles.input}
                      value={newKRA.areaOfConcern || ''}
                      onChange={(e) => setNewKRA({ ...newKRA, areaOfConcern: e.target.value })}
                      required
                    />
                  </div>
                )}
                <button type="submit" className={baseStyles.submitButton}>
                  Add KRA
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BossDashboard;

