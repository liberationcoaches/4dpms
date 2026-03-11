import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './AdminDashboard.module.css';
import logo from '@/assets/logo.png';
import { fetchUserProfile as fetchUserProfileApi } from '@/utils/userProfile';

interface Organization {
  _id: string;
  name: string;
  code?: string;
  industry: string;
  size: number;
  contact: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  reviewerId?: { _id: string; name: string; email: string };
  bossId?: { _id: string; name: string; email: string };
  createdAt: string;
}

interface Analytics {
  organizations: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    withReviewers: number;
  };
  users: {
    reviewers: number;
    clientAdmins?: number;
    bosses: number;
    managers: number;
    employees: number;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  companyName?: string;
  industry?: string;
  createdAt: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReviewerForm, setShowReviewerForm] = useState(false);
  const [showClientAdminForm, setShowClientAdminForm] = useState(false);
  const [clientAdmins, setClientAdmins] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [userListRole, setUserListRole] = useState<string | null>(null);
  const [userList, setUserList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'organizations' | 'users' | 'reviewers' | 'client-admins' | 'analytics' | 'settings'>('dashboard');
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
  const [newOrg, setNewOrg] = useState({
    name: '',
    industry: 'Technology',
    size: '',
    contact: '',
    bossEmail: '',
  });
  const [newReviewer, setNewReviewer] = useState({
    name: '',
    email: '',
    mobile: '',
  });
  const [newClientAdmin, setNewClientAdmin] = useState({
    name: '',
    email: '',
    mobile: '',
    organizationId: '',
  });

  // Edit/Delete organization state
  const [showEditOrgModal, setShowEditOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    industry: '',
    size: '',
    contact: '',
  });
  const [showDeleteOrgConfirm, setShowDeleteOrgConfirm] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }
    fetchUserProfile();
    fetchNotificationCount();
    fetchOrganizations();
    fetchReviewers();
    fetchClientAdmins();
    fetchAnalytics();
  }, [navigate]);

  // Refresh client admins when switching to that tab
  useEffect(() => {
    if (activeTab === 'client-admins') {
      fetchClientAdmins();
    }
  }, [activeTab]);

  const fetchUserProfile = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const data = await fetchUserProfileApi(userId);
      if (data?.status === 'success' && data.data) {
        const userData = {
          name: (data.data.name as string) || '',
          email: (data.data.email as string) || '',
          mobile: (data.data.mobile as string) || '',
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
      const res = await fetch(apiUrl(`/api/notifications/count?userId=${userId}`));
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

  const handleLogoClick = () => {
    navigate('/admin/dashboard');
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
      const response = await fetch(apiUrl(`/api/user/profile?userId=${userId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccessMessage('Profile saved.');
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
      const res = await fetch(apiUrl('/api/organizations'));
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

  const fetchReviewers = async () => {
    try {
      const res = await fetch(apiUrl('/api/user/list?role=reviewer'));
      const data = await res.json();
      if (data.status === 'success') {
        if (data.data.reviewers) {
          setReviewers(data.data.reviewers);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reviewers:', error);
    }
  };

  const fetchClientAdmins = async () => {
    try {
      const res = await fetch(apiUrl('/api/organizations/client-admins'));
      const data = await res.json();
      if (data.status === 'success') {
        setClientAdmins(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch client admins:', error);
    }
  };

  const handleCreateReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newReviewer, 
          signupType: 'reviewer',
          name: newReviewer.name,
          email: newReviewer.email,
          mobile: newReviewer.mobile.replace(/\D/g, ''),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowReviewerForm(false);
        setNewReviewer({ name: '', email: '', mobile: '' });
        fetchReviewers();
        fetchAnalytics();
        alert('Reviewer added.');
      } else {
        alert(data.message || 'Failed to create reviewer');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleCreateClientAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/organizations/client-admins'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClientAdmin,
          mobile: newClientAdmin.mobile.replace(/\D/g, ''),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowClientAdminForm(false);
        setNewClientAdmin({ name: '', email: '', mobile: '', organizationId: '' });
        fetchClientAdmins();
        fetchOrganizations(); // Refresh organizations so the detail page shows the client admin
        fetchAnalytics();
        alert('Client admin added.');
      } else {
        alert(data.message || 'Failed to create client admin');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(apiUrl('/api/organizations/analytics'));
      const data = await res.json();
      if (data.status === 'success') {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl('/api/organizations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrg),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowCreateForm(false);
        setNewOrg({ name: '', industry: 'Technology', size: '', contact: '', bossEmail: '' });
        fetchOrganizations();
        fetchAnalytics();
        const orgCode = data.data?.orgCode || data.data?.code;
        if (orgCode) {
          alert(`Org created. Code: ${orgCode} — share with managers to join.`);
        } else {
          alert('Org created.');
        }
      } else {
        alert(data.message || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  const fetchUsersByRole = async (role: string) => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(apiUrl(`/api/user/list?role=${role}`));
      const data = await res.json();
      if (data.status === 'success') {
        let users: User[] = [];
        if (role === 'manager' && data.data.managers) {
          users = data.data.managers;
        } else if (role === 'employee' && data.data.employees) {
          users = data.data.employees;
        } else if (role === 'boss' && data.data.bosses) {
          users = data.data.bosses;
        } else if (role === 'reviewer' && data.data.reviewers) {
          users = data.data.reviewers;
        }
        setUserList(users);
        setUserListRole(role);
        setShowUserList(true);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to fetch users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserCountClick = (role: string) => {
    fetchUsersByRole(role);
  };

  // Organization Edit/Delete handlers
  const showNotificationMessage = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const openEditOrgModal = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrg(org);
    setEditOrgForm({
      name: org.name,
      industry: org.industry,
      size: org.size?.toString() || '',
      contact: org.contact || '',
    });
    setShowEditOrgModal(true);
  };

  const closeEditOrgModal = () => {
    setShowEditOrgModal(false);
    setEditingOrg(null);
    setEditOrgForm({ name: '', industry: '', size: '', contact: '' });
  };

  const handleEditOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      const res = await fetch(apiUrl(`/api/organizations/${editingOrg._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editOrgForm.name,
          industry: editOrgForm.industry,
          size: parseInt(editOrgForm.size) || 0,
          contact: editOrgForm.contact,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        closeEditOrgModal();
        fetchOrganizations();
        showNotificationMessage('success', 'Organization updated successfully');
      } else {
        showNotificationMessage('error', data.message || 'Failed to update organization');
      }
    } catch (error) {
      showNotificationMessage('error', 'Network error. Please try again.');
    }
  };

  const openDeleteOrgConfirm = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingOrg(org);
    setShowDeleteOrgConfirm(true);
  };

  const closeDeleteOrgConfirm = () => {
    setShowDeleteOrgConfirm(false);
    setDeletingOrg(null);
  };

  const handleDeleteOrg = async () => {
    if (!deletingOrg) return;

    try {
      const res = await fetch(apiUrl(`/api/organizations/${deletingOrg._id}`), {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        closeDeleteOrgConfirm();
        fetchOrganizations();
        fetchAnalytics();
        showNotificationMessage('success', 'Organization deleted successfully');
      } else {
        showNotificationMessage('error', data.message || 'Failed to delete organization');
      }
    } catch (error) {
      showNotificationMessage('error', 'Network error. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'trial':
        return styles.statusTrial;
      case 'expired':
        return styles.statusExpired;
      default:
        return '';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'reviewer':
        return 'Reviewers';
      case 'boss':
        return 'Admins';
      case 'manager':
        return 'Supervisors';
      case 'employee':
        return 'Members';
      default:
        return role;
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
              {user?.name ? getInitials(user.name) : 'A'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'Platform Admin'}</span>
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
                {user?.name ? getInitials(user.name) : 'A'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Platform Admin'}</span>
                <span className={baseStyles.userRole}>Platform Admin</span>
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
                className={`${baseStyles.menuItem} ${activeTab === 'organizations' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('organizations'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Organizations</span>
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
                  <span>Users</span>
                </button>

                <button
                  className={`${baseStyles.menuItem} ${activeTab === 'reviewers' ? baseStyles.menuItemActive : ''}`}
                  onClick={() => { setActiveTab('reviewers'); setShowMenu(false); }}
                >
                  <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  <span>Reviewers</span>
                </button>

                <button
                  className={`${baseStyles.menuItem} ${activeTab === 'client-admins' ? baseStyles.menuItemActive : ''}`}
                  onClick={() => { 
                    setActiveTab('client-admins'); 
                    setShowMenu(false);
                    fetchClientAdmins();
                  }}
                >
                  <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>Client Admins</span>
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
                <h1>Platform Admin Dashboard</h1>
                <div className={styles.headerButtons}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setShowReviewerForm(!showReviewerForm)}
                  >
                    {showReviewerForm ? 'Cancel' : '+ Add Reviewer'}
                  </button>
                  <button
                    className={styles.createButton}
                    onClick={() => setShowCreateForm(!showCreateForm)}
                  >
                    {showCreateForm ? 'Cancel' : '+ Create Organization'}
                  </button>
                </div>
              </div>

              {showReviewerForm && (
                <div className={styles.createForm}>
                  <h2>Add New External Reviewer</h2>
                  <form onSubmit={handleCreateReviewer}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newReviewer.name}
                        onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newReviewer.email}
                        onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        value={newReviewer.mobile}
                        onChange={(e) => setNewReviewer({ ...newReviewer, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Reviewer
                    </button>
                  </form>
                </div>
              )}

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Organization</h2>
                  <form onSubmit={handleCreateOrganization}>
                    <div className={styles.formGroup}>
                      <label>Organization Name *</label>
                      <input
                        type="text"
                        value={newOrg.name}
                        onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Industry *</label>
                      <select
                        value={newOrg.industry}
                        onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                        required
                      >
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Education">Education</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Retail">Retail</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Size (Number of Members) *</label>
                      <input
                        type="number"
                        min="1"
                        value={newOrg.size}
                        onChange={(e) => setNewOrg({ ...newOrg, size: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Contact (Email/Phone) *</label>
                      <input
                        type="text"
                        value={newOrg.contact}
                        onChange={(e) => setNewOrg({ ...newOrg, contact: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Admin Email (Optional)</label>
                      <input
                        type="email"
                        value={newOrg.bossEmail}
                        onChange={(e) => setNewOrg({ ...newOrg, bossEmail: e.target.value })}
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Organization
                    </button>
                  </form>
                </div>
              )}

              {analytics && (
                <div className={styles.analytics}>
                  <h2>System Analytics</h2>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                      <h3>Organizations</h3>
                      <div className={styles.stats}>
                        <div>
                          <span className={styles.statLabel}>Total:</span>
                          <span className={styles.statValue}>{analytics.organizations.total}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Active:</span>
                          <span className={styles.statValue}>{analytics.organizations.active}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Trial:</span>
                          <span className={styles.statValue}>{analytics.organizations.trial}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Expired:</span>
                          <span className={styles.statValue}>{analytics.organizations.expired}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>With Reviewers:</span>
                          <span className={styles.statValue}>{analytics.organizations.withReviewers}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Users</h3>
                      <div className={styles.stats}>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('reviewer')}
                          title="Click to view reviewers"
                        >
                          <span className={styles.statLabel}>Reviewers:</span>
                          <span className={styles.statValue}>{analytics.users.reviewers}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => setActiveTab('client-admins')}
                          title="Click to view client admins"
                        >
                          <span className={styles.statLabel}>Client Admins:</span>
                          <span className={styles.statValue}>{analytics.users.clientAdmins || 0}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('boss')}
                          title="Click to view bosses"
                        >
                          <span className={styles.statLabel}>Admins:</span>
                          <span className={styles.statValue}>{analytics.users.bosses}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('manager')}
                          title="Click to view managers"
                        >
                          <span className={styles.statLabel}>Supervisors:</span>
                          <span className={styles.statValue}>{analytics.users.managers}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('employee')}
                          title="Click to view employees"
                        >
                          <span className={styles.statLabel}>Members:</span>
                          <span className={styles.statValue}>{analytics.users.employees}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Organizations</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Organization'}
                </button>
              </div>

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Organization</h2>
                  <form onSubmit={handleCreateOrganization}>
                    <div className={styles.formGroup}>
                      <label>Organization Name *</label>
                      <input
                        type="text"
                        value={newOrg.name}
                        onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Industry *</label>
                      <select
                        value={newOrg.industry}
                        onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                        required
                      >
                        <option value="Technology">Technology</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Finance">Finance</option>
                        <option value="Education">Education</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Retail">Retail</option>
                        <option value="Consulting">Consulting</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Size (Number of Members) *</label>
                      <input
                        type="number"
                        min="1"
                        value={newOrg.size}
                        onChange={(e) => setNewOrg({ ...newOrg, size: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Contact (Email/Phone) *</label>
                      <input
                        type="text"
                        value={newOrg.contact}
                        onChange={(e) => setNewOrg({ ...newOrg, contact: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Admin Email (Optional)</label>
                      <input
                        type="email"
                        value={newOrg.bossEmail}
                        onChange={(e) => setNewOrg({ ...newOrg, bossEmail: e.target.value })}
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Organization
                    </button>
                  </form>
                </div>
              )}

              {organizations.length === 0 ? (
                <p className={styles.empty}>No organizations found. Create one to get started.</p>
              ) : (
                <div className={styles.organizationsGrid}>
                  {organizations.map((org) => (
                    <div
                      key={org._id}
                      className={styles.orgCard}
                      onClick={() => navigate(`/admin/organizations/${org._id}`)}
                    >
                      <div className={styles.orgHeader}>
                        <h3>{org.name}</h3>
                        <span className={`${styles.statusBadge} ${getStatusColor(org.subscriptionStatus)}`}>
                          {org.subscriptionStatus}
                        </span>
                      </div>
                      <div className={styles.orgDetails}>
                        {org.code && (
                          <p><strong>Org Code:</strong> <span className={styles.orgCodeBadge} title="Click to copy" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(org.code!); }}>{org.code}</span></p>
                        )}
                        <p><strong>Industry:</strong> {org.industry}</p>
                        <p><strong>Size:</strong> {org.size} employees</p>
                        <p><strong>Contact:</strong> {org.contact}</p>
                        {org.reviewerId && (
                          <p><strong>Reviewer:</strong> {org.reviewerId.name}</p>
                        )}
                        {org.bossId && (
                          <p><strong>Admin:</strong> {org.bossId.name}</p>
                        )}
                      </div>
                      <div className={styles.orgActions}>
                        <button
                          className={styles.editButton}
                          onClick={(e) => openEditOrgModal(org, e)}
                          title="Edit organization"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={(e) => openDeleteOrgConfirm(org, e)}
                          title="Delete organization"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className={styles.tabContent}>
              <h1>All Users</h1>
              <div className={styles.userStatsGrid}>
                <div
                  className={styles.userStatCard}
                  onClick={() => handleUserCountClick('reviewer')}
                >
                  <h3>Reviewers</h3>
                  <div className={styles.statValue}>{analytics?.users.reviewers || 0}</div>
                </div>
                <div
                  className={styles.userStatCard}
                  onClick={() => handleUserCountClick('boss')}
                >
                  <h3>Admins</h3>
                  <div className={styles.statValue}>{analytics?.users.bosses || 0}</div>
                </div>
                <div
                  className={styles.userStatCard}
                  onClick={() => handleUserCountClick('manager')}
                >
                  <h3>Supervisors</h3>
                  <div className={styles.statValue}>{analytics?.users.managers || 0}</div>
                </div>
                <div
                  className={styles.userStatCard}
                  onClick={() => handleUserCountClick('employee')}
                >
                  <h3>Members</h3>
                  <div className={styles.statValue}>{analytics?.users.employees || 0}</div>
                </div>
              </div>
              <p className={styles.hint}>Click on any card above to view detailed user list</p>
            </div>
          )}

          {activeTab === 'reviewers' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Reviewer Pool</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowReviewerForm(!showReviewerForm)}
                >
                  {showReviewerForm ? 'Cancel' : '+ Add Reviewer'}
                </button>
              </div>

              {showReviewerForm && (
                <div className={styles.createForm}>
                  <h2>Add New External Reviewer</h2>
                  <form onSubmit={handleCreateReviewer}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newReviewer.name}
                        onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newReviewer.email}
                        onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        value={newReviewer.mobile}
                        onChange={(e) => setNewReviewer({ ...newReviewer, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Reviewer
                    </button>
                  </form>
                </div>
              )}

              {reviewers.length === 0 ? (
                <p className={styles.empty}>No reviewers found. Add one to get started.</p>
              ) : (
                <div className={styles.reviewersGrid}>
                  {reviewers.map((rev) => (
                    <div key={rev._id} className={styles.reviewerCard}>
                      <h3>{rev.name}</h3>
                      <p><strong>Email:</strong> {rev.email}</p>
                      <p><strong>Mobile:</strong> {rev.mobile}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'client-admins' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Client Admins</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowClientAdminForm(!showClientAdminForm)}
                >
                  {showClientAdminForm ? 'Cancel' : '+ Add Client Admin'}
                </button>
              </div>

              {showClientAdminForm && (
                <div className={styles.createForm}>
                  <h2>Create New Client Admin</h2>
                  <form onSubmit={handleCreateClientAdmin}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={newClientAdmin.name}
                        onChange={(e) => setNewClientAdmin({ ...newClientAdmin, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        value={newClientAdmin.email}
                        onChange={(e) => setNewClientAdmin({ ...newClientAdmin, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        value={newClientAdmin.mobile}
                        onChange={(e) => setNewClientAdmin({ ...newClientAdmin, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Organization *</label>
                      <select
                        value={newClientAdmin.organizationId}
                        onChange={(e) => setNewClientAdmin({ ...newClientAdmin, organizationId: e.target.value })}
                        required
                      >
                        <option value="">Select Organization</option>
                        {organizations.map((org) => (
                          <option key={org._id} value={org._id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Client Admin
                    </button>
                  </form>
                </div>
              )}

              {clientAdmins.length === 0 ? (
                <p className={styles.empty}>No client admins found. Add one to get started.</p>
              ) : (
                <div className={styles.reviewersGrid}>
                  {clientAdmins.map((ca) => (
                    <div key={ca._id} className={styles.reviewerCard}>
                      <h3>{ca.name}</h3>
                      <p><strong>Email:</strong> {ca.email}</p>
                      <p><strong>Mobile:</strong> {ca.mobile}</p>
                      {ca.organizationId && typeof ca.organizationId === 'object' && (
                        <p><strong>Organization:</strong> {ca.organizationId.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className={styles.tabContent}>
              <h1>System Analytics</h1>
              {analytics && (
                <div className={styles.analytics}>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.analyticsCard}>
                      <h3>Organizations</h3>
                      <div className={styles.stats}>
                        <div>
                          <span className={styles.statLabel}>Total:</span>
                          <span className={styles.statValue}>{analytics.organizations.total}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Active:</span>
                          <span className={styles.statValue}>{analytics.organizations.active}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Trial:</span>
                          <span className={styles.statValue}>{analytics.organizations.trial}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>Expired:</span>
                          <span className={styles.statValue}>{analytics.organizations.expired}</span>
                        </div>
                        <div>
                          <span className={styles.statLabel}>With Reviewers:</span>
                          <span className={styles.statValue}>{analytics.organizations.withReviewers}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.analyticsCard}>
                      <h3>Users</h3>
                      <div className={styles.stats}>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('reviewer')}
                          title="Click to view reviewers"
                        >
                          <span className={styles.statLabel}>Reviewers:</span>
                          <span className={styles.statValue}>{analytics.users.reviewers}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => setActiveTab('client-admins')}
                          title="Click to view client admins"
                        >
                          <span className={styles.statLabel}>Client Admins:</span>
                          <span className={styles.statValue}>{analytics.users.clientAdmins || 0}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('boss')}
                          title="Click to view bosses"
                        >
                          <span className={styles.statLabel}>Admins:</span>
                          <span className={styles.statValue}>{analytics.users.bosses}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('manager')}
                          title="Click to view managers"
                        >
                          <span className={styles.statLabel}>Supervisors:</span>
                          <span className={styles.statValue}>{analytics.users.managers}</span>
                        </div>
                        <div
                          className={styles.clickableStat}
                          onClick={() => handleUserCountClick('employee')}
                          title="Click to view employees"
                        >
                          <span className={styles.statLabel}>Members:</span>
                          <span className={styles.statValue}>{analytics.users.employees}</span>
                        </div>
                      </div>
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

      {/* User List Modal */}
      {showUserList && (
        <div className={styles.modalOverlay} onClick={() => setShowUserList(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{getRoleDisplayName(userListRole || '')}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowUserList(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {isLoadingUsers ? (
                <div className={styles.loading}>Loading users...</div>
              ) : userList.length === 0 ? (
                <p className={styles.empty}>No {getRoleDisplayName(userListRole || '').toLowerCase()} found.</p>
              ) : (
                <div className={styles.userList}>
                  {userList.map((user) => (
                    <div key={user._id} className={styles.userCard}>
                      <div className={styles.userHeader}>
                        <h3>{user.name}</h3>
                        <span className={styles.userRole}>{user.role}</span>
                      </div>
                      <div className={styles.userDetails}>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Mobile:</strong> {user.mobile}</p>
                        {user.companyName && (
                          <p><strong>Company:</strong> {user.companyName}</p>
                        )}
                        {user.industry && (
                          <p><strong>Industry:</strong> {user.industry}</p>
                        )}
                        <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {showEditOrgModal && editingOrg && (
        <div className={styles.modalOverlay} onClick={closeEditOrgModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Edit Organization</h2>
              <button className={styles.closeButton} onClick={closeEditOrgModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleEditOrgSubmit}>
                <div className={styles.formGroup}>
                  <label>Organization Name *</label>
                  <input
                    type="text"
                    value={editOrgForm.name}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Industry *</label>
                  <select
                    value={editOrgForm.industry}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, industry: e.target.value })}
                    required
                  >
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Size (Number of Members) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editOrgForm.size}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, size: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Contact (Email/Phone)</label>
                  <input
                    type="text"
                    value={editOrgForm.contact}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, contact: e.target.value })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelButton} onClick={closeEditOrgModal}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitButton}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation */}
      {showDeleteOrgConfirm && deletingOrg && (
        <div className={styles.modalOverlay} onClick={closeDeleteOrgConfirm}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Organization</h3>
            <p>Are you sure you want to delete <strong>{deletingOrg.name}</strong>?</p>
            <p className={styles.warningText}>This will also delete all users associated with this organization. This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelButton} onClick={closeDeleteOrgConfirm}>
                Cancel
              </button>
              <button className={styles.deleteConfirmButton} onClick={handleDeleteOrg}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
