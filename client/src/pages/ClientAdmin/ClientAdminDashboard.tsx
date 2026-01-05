import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ClientAdminDashboard.module.css';
import logo from '@/assets/logo.png';

interface Boss {
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
  contact: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  reviewerId?: { _id: string; name: string; email: string };
  bossId?: { _id: string; name: string; email: string };
  createdAt: string;
}

interface OrganizationUsers {
  bosses: Boss[];
  managers: any[];
  employees: any[];
}

function ClientAdminDashboard() {
  const navigate = useNavigate();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUsers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateBossForm, setShowCreateBossForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bosses' | 'users' | 'settings'>('dashboard');
  const [user, setUser] = useState<{ name: string; email: string; mobile?: string } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profile, setProfile] = useState<{ name: string; email: string; mobile: string }>({
    name: '',
    email: '',
    mobile: '',
  });
  const [profileErrors, setProfileErrors] = useState<Partial<{ name: string; email: string; mobile: string }>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [newBoss, setNewBoss] = useState({
    name: '',
    email: '',
    mobile: '',
  });
  const [selectedBoss, setSelectedBoss] = useState<Boss | null>(null);
  const [showKRAModal, setShowKRAModal] = useState(false);
  const [kraType, setKraType] = useState<'functional' | 'organizational' | 'self-development'>('functional');
  const [newKRA, setNewKRA] = useState<any>({});
  const [bossKRAs, setBossKRAs] = useState<{ [bossId: string]: any }>({});
  const [showKRAsView, setShowKRAsView] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }
    fetchUserProfile();
    fetchNotificationCount();
    fetchBosses();
    fetchOrganization();
    fetchOrganizationUsers();
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

  const fetchBosses = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/bosses?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setBosses(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bosses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/organization?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrganization(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

  const fetchOrganizationUsers = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/users?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrganizationUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch organization users:', error);
    }
  };

  const handleCreateBoss = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/bosses?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBoss,
          mobile: newBoss.mobile.replace(/\D/g, ''),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateBossForm(false);
        setNewBoss({ name: '', email: '', mobile: '' });
        fetchBosses();
        fetchOrganizationUsers();
        alert('Boss created successfully!');
      } else {
        alert(data.message || 'Failed to create boss');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const fetchBossKRAs = async (bossId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/bosses/${bossId}/kras?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setBossKRAs((prev) => ({ ...prev, [bossId]: data.data }));
      }
    } catch (error) {
      console.error('Failed to fetch boss KRAs:', error);
    }
  };

  const handleAddKRA = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBoss) return;

    try {
      const userId = localStorage.getItem('userId');
      const endpoint = `/api/client-admin/bosses/${selectedBoss._id}/kras/${kraType}`;
      const res = await fetch(`${endpoint}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKRA),
      });

      const data = await res.json();
      if (res.ok) {
        setShowKRAModal(false);
        setNewKRA({});
        fetchBossKRAs(selectedBoss._id); // Refresh KRAs
        alert('KRA added successfully!');
      } else {
        alert(data.message || 'Failed to add KRA');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNotificationClick = () => {
    navigate('/dashboard/notifications');
  };

  const handleLogoClick = () => {
    navigate('/client-admin/dashboard');
  };

  const handleProfileClick = () => {
    setActiveTab('settings');
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
              {user?.name ? getInitials(user.name) : 'CA'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'Client Admin'}</span>
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
                {user?.name ? getInitials(user.name) : 'CA'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Client Admin'}</span>
                <span className={baseStyles.userRole}>Client Admin</span>
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
                className={`${baseStyles.menuItem} ${activeTab === 'bosses' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('bosses'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Bosses</span>
              </button>

              <button
                className={`${baseStyles.menuItem} ${activeTab === 'users' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('users'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>All Users</span>
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
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Client Admin Dashboard</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateBossForm(!showCreateBossForm)}
                >
                  {showCreateBossForm ? 'Cancel' : '+ Create Boss'}
                </button>
              </div>

              {showCreateBossForm && (
                <div className={styles.createForm}>
                  <h2>Create New Boss</h2>
                  <form onSubmit={handleCreateBoss}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newBoss.name}
                        onChange={(e) => setNewBoss({ ...newBoss, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newBoss.email}
                        onChange={(e) => setNewBoss({ ...newBoss, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        value={newBoss.mobile}
                        onChange={(e) => setNewBoss({ ...newBoss, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Boss
                    </button>
                  </form>
                </div>
              )}

              {organization && (
                <div className={styles.orgCard}>
                  <h2>Organization</h2>
                  <p><strong>Name:</strong> {organization.name}</p>
                  <p><strong>Industry:</strong> {organization.industry}</p>
                  <p><strong>Size:</strong> {organization.size} employees</p>
                </div>
              )}

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Bosses</h3>
                  <div className={styles.statValue}>{bosses.length}</div>
                </div>
                <div className={styles.statCard}>
                  <h3>Managers</h3>
                  <div className={styles.statValue}>{organizationUsers?.managers.length || 0}</div>
                </div>
                <div className={styles.statCard}>
                  <h3>Employees</h3>
                  <div className={styles.statValue}>{organizationUsers?.employees.length || 0}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bosses' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Bosses</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateBossForm(!showCreateBossForm)}
                >
                  {showCreateBossForm ? 'Cancel' : '+ Create Boss'}
                </button>
              </div>

              {showCreateBossForm && (
                <div className={styles.createForm}>
                  <h2>Create New Boss</h2>
                  <form onSubmit={handleCreateBoss}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newBoss.name}
                        onChange={(e) => setNewBoss({ ...newBoss, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newBoss.email}
                        onChange={(e) => setNewBoss({ ...newBoss, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        value={newBoss.mobile}
                        onChange={(e) => setNewBoss({ ...newBoss, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Boss
                    </button>
                  </form>
                </div>
              )}

              {bosses.length === 0 ? (
                <p className={styles.empty}>No bosses found. Create one to get started.</p>
              ) : (
                <div className={styles.bossesGrid}>
                  {bosses.map((boss) => (
                    <div key={boss._id} className={styles.bossCard}>
                      <h3>{boss.name}</h3>
                      <p><strong>Email:</strong> {boss.email}</p>
                      <p><strong>Mobile:</strong> {boss.mobile}</p>
                      <div className={styles.bossActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('functional');
                          }}
                        >
                          Add Functional KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('organizational');
                          }}
                        >
                          Add Organizational KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('self-development');
                          }}
                        >
                          Add Self Development KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => {
                            if (showKRAsView === boss._id) {
                              setShowKRAsView(null);
                            } else {
                              setShowKRAsView(boss._id);
                              fetchBossKRAs(boss._id);
                            }
                          }}
                        >
                          {showKRAsView === boss._id ? 'Hide KRAs' : 'View KRAs'}
                        </button>
                      </div>
                      {showKRAsView === boss._id && bossKRAs[boss._id] && (
                        <div className={styles.krasView}>
                          <h4>Functional KRAs</h4>
                          {bossKRAs[boss._id].functionalKRAs?.length > 0 ? (
                            <ul>
                              {bossKRAs[boss._id].functionalKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.kra}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No Functional KRAs</p>
                          )}
                          <h4>Organizational KRAs</h4>
                          {bossKRAs[boss._id].organizationalKRAs?.length > 0 ? (
                            <ul>
                              {bossKRAs[boss._id].organizationalKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.coreValues}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No Organizational KRAs</p>
                          )}
                          <h4>Self Development KRAs</h4>
                          {bossKRAs[boss._id].selfDevelopmentKRAs?.length > 0 ? (
                            <ul>
                              {bossKRAs[boss._id].selfDevelopmentKRAs.map((kra: any, idx: number) => (
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

          {activeTab === 'users' && (
            <div className={styles.tabContent}>
              <h1>All Users</h1>
              {organizationUsers && (
                <div className={styles.usersSection}>
                  <div className={styles.userCategory}>
                    <h2>Bosses ({organizationUsers.bosses.length})</h2>
                    <div className={styles.userList}>
                      {organizationUsers.bosses.map((boss) => (
                        <div key={boss._id} className={styles.userCard}>
                          <h3>{boss.name}</h3>
                          <p><strong>Email:</strong> {boss.email}</p>
                          <p><strong>Mobile:</strong> {boss.mobile}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.userCategory}>
                    <h2>Managers ({organizationUsers.managers.length})</h2>
                    <div className={styles.userList}>
                      {organizationUsers.managers.map((manager) => (
                        <div key={manager._id} className={styles.userCard}>
                          <h3>{manager.name}</h3>
                          <p><strong>Email:</strong> {manager.email}</p>
                          <p><strong>Mobile:</strong> {manager.mobile}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.userCategory}>
                    <h2>Employees ({organizationUsers.employees.length})</h2>
                    <div className={styles.userList}>
                      {organizationUsers.employees.map((employee) => (
                        <div key={employee._id} className={styles.userCard}>
                          <h3>{employee.name}</h3>
                          <p><strong>Email:</strong> {employee.email}</p>
                          <p><strong>Mobile:</strong> {employee.mobile}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

      {/* KRA Modal */}
      {showKRAModal && selectedBoss && (
        <div className={styles.modalOverlay} onClick={() => setShowKRAModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add {kraType === 'functional' ? 'Functional' : kraType === 'organizational' ? 'Organizational' : 'Self Development'} KRA for {selectedBoss.name}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowKRAModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAddKRA}>
                {kraType === 'functional' && (
                  <>
                    <div className={styles.formGroup}>
                      <label>KRA *</label>
                      <input
                        type="text"
                        value={newKRA.kra || ''}
                        onChange={(e) => setNewKRA({ ...newKRA, kra: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>KPI Target</label>
                      <input
                        type="text"
                        value={newKRA.kpiTarget || ''}
                        onChange={(e) => setNewKRA({ ...newKRA, kpiTarget: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {kraType === 'organizational' && (
                  <div className={styles.formGroup}>
                    <label>Core Values *</label>
                    <input
                      type="text"
                      value={newKRA.coreValues || ''}
                      onChange={(e) => setNewKRA({ ...newKRA, coreValues: e.target.value })}
                      required
                    />
                  </div>
                )}
                {kraType === 'self-development' && (
                  <div className={styles.formGroup}>
                    <label>Area of Concern *</label>
                    <input
                      type="text"
                      value={newKRA.areaOfConcern || ''}
                      onChange={(e) => setNewKRA({ ...newKRA, areaOfConcern: e.target.value })}
                      required
                    />
                  </div>
                )}
                <button type="submit" className={styles.submitButton}>
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

export default ClientAdminDashboard;

