import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './BossDashboard.module.css';
import logo from '@/assets/logo.png';
import KRAForm, { FunctionalKRAFormData } from '@/components/KRAForm/KRAForm';
import TeamMemberCard from '@/components/TeamMemberCard/TeamMemberCard';
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

interface Proof {
  type: 'drive_link' | 'file_upload';
  value: string;
  fileName?: string;
  uploadedAt: string;
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
  const [showProofDialog, setShowProofDialog] = useState<{ managerId: string; kraIndex: number; isOpen: boolean }>({
    managerId: '',
    kraIndex: -1,
    isOpen: false,
  });
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });
  const [selectedKRA, setSelectedKRA] = useState<{ kra: any; index: number; type: 'self' | string } | null>(null);
  const [showKRADetailModal, setShowKRADetailModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    functional: false,
    organizational: false,
    selfDevelopment: false,
  });
  const [showAllKRAs, setShowAllKRAs] = useState<{ [key: string]: boolean }>({
    functional: false,
    organizational: false,
    selfDevelopment: false,
  });

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

  const handleAddManagerKRA = async (formData?: FunctionalKRAFormData) => {
    if (!selectedManager) return;

    try {
      const userId = localStorage.getItem('userId');
      const endpoint = `/api/boss/managers/${selectedManager._id}/kras/${kraType}`;
      
      // For functional KRAs, use the unified form data
      // For other types, use the old structure (will be updated later)
      const requestData = kraType === 'functional' && formData
        ? {
            kra: formData.kra,
            kpis: formData.kpis,
            reportsGenerated: formData.reportsGenerated || [],
            pilotWeight: formData.pilotWeight || 0,
            pilotScore: formData.pilotScore || 0,
          }
        : newKRA;

      const res = await fetch(`${endpoint}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
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

  const handleAddProof = async (managerId: string, kraIndex: number, proof: Proof) => {
    // Handle boss's own KRAs
    if (managerId === 'self') {
      if (!myKRAs || !myKRAs.functionalKRAs) return;
      const kra = myKRAs.functionalKRAs[kraIndex];
      if (!kra) return;

      // Convert reportsGenerated to array if it's a string (backward compatibility)
      let currentProofs: Proof[] = [];
      if (Array.isArray(kra.reportsGenerated)) {
        currentProofs = kra.reportsGenerated;
      } else if (typeof kra.reportsGenerated === 'string' && kra.reportsGenerated.trim()) {
        currentProofs = [{
          type: 'drive_link',
          value: kra.reportsGenerated,
          uploadedAt: new Date().toISOString(),
        }];
      }

      const updatedProofs = [...currentProofs, proof];
      
      // Update the boss's own KRA
      try {
        const userId = localStorage.getItem('userId');
        // Find boss in team to get member index
        const teamRes = await fetch(`/api/team/members?userId=${userId}`);
        const teamData = await teamRes.json();
        if (teamData.status === 'success' && teamData.data) {
          const userProfile = await fetch(`/api/user/profile?userId=${userId}`).then(r => r.json());
          if (userProfile.status === 'success' && userProfile.data) {
            const memberIndex = teamData.data.findIndex((m: any) => m.mobile === userProfile.data.mobile);
            if (memberIndex !== -1) {
              const updateRes = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportsGenerated: updatedProofs }),
              });

              const updateData = await updateRes.json();
              if (updateRes.ok) {
                // Refresh boss's KRAs
                fetchMyKRAs();
                setShowProofDialog({ managerId: '', kraIndex: -1, isOpen: false });
                setProofInput({ type: 'drive_link', value: '' });
                alert('Proof added successfully!');
              } else {
                alert(updateData.message || 'Failed to add proof');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error adding proof:', error);
        alert('Failed to add proof');
      }
      return;
    }

    // Handle manager KRAs
    if (!managerKRAs[managerId] || !managerKRAs[managerId].functionalKRAs) return;

    const kra = managerKRAs[managerId].functionalKRAs[kraIndex];
    if (!kra) return;

    // Convert reportsGenerated to array if it's a string (backward compatibility)
    let currentProofs: Proof[] = [];
    if (Array.isArray(kra.reportsGenerated)) {
      currentProofs = kra.reportsGenerated;
    } else if (typeof kra.reportsGenerated === 'string' && kra.reportsGenerated.trim()) {
      currentProofs = [{
        type: 'drive_link',
        value: kra.reportsGenerated,
        uploadedAt: new Date().toISOString(),
      }];
    }

    const updatedProofs = [...currentProofs, proof];
    
    // Update the KRA with new proofs
    try {
      const userId = localStorage.getItem('userId');
      // Find manager to get their team and member index
      const manager = managers.find(m => m._id === managerId);
      if (!manager) return;

      // Fetch team to find member index
      const teamRes = await fetch(`/api/team/members?userId=${userId}`);
      const teamData = await teamRes.json();
      if (teamData.status === 'success' && teamData.data) {
        const memberIndex = teamData.data.findIndex((m: any) => m.mobile === manager.mobile);
        if (memberIndex !== -1) {
          const updateRes = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportsGenerated: updatedProofs }),
          });

          const updateData = await updateRes.json();
          if (updateRes.ok) {
            // Refresh manager KRAs
            fetchManagerKRAs(managerId);
            setShowProofDialog({ managerId: '', kraIndex: -1, isOpen: false });
            setProofInput({ type: 'drive_link', value: '' });
            alert('Proof added successfully!');
          } else {
            alert(updateData.message || 'Failed to add proof');
          }
        }
      }
    } catch (error) {
      console.error('Error adding proof:', error);
      alert('Failed to add proof');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, managerId: string, kraIndex: number) => {
    // Handle both 'self' (boss's own KRAs) and manager IDs
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i) && file.type !== 'application/pdf') {
      alert('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newProof: Proof = {
          type: 'file_upload',
          value: base64String,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        };
        handleAddProof(managerId, kraIndex, newProof);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleAddDriveLink = (managerId: string, kraIndex: number) => {
    // Handle both 'self' (boss's own KRAs) and manager IDs
    if (!proofInput.value.trim()) {
      alert('Please enter a drive link');
      return;
    }

    if (!proofInput.value.includes('drive.google.com') && !proofInput.value.includes('docs.google.com')) {
      alert('Please enter a valid Google Drive link');
      return;
    }

    const newProof: Proof = {
      type: 'drive_link',
      value: proofInput.value.trim(),
      uploadedAt: new Date().toISOString(),
    };
    handleAddProof(managerId, kraIndex, newProof);
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
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedCategories({ ...expandedCategories, functional: !expandedCategories.functional })}
                      >
                        <h3 style={{ margin: 0 }}>Functional KRAs ({myKRAs.functionalKRAs?.length || 0})</h3>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#666',
                            padding: '0.25rem 0.5rem',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories({ ...expandedCategories, functional: !expandedCategories.functional });
                          }}
                        >
                          {expandedCategories.functional ? '▼' : '▶'}
                        </button>
                      </div>
                      {expandedCategories.functional && myKRAs.functionalKRAs?.length > 0 && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {(showAllKRAs.functional 
                              ? myKRAs.functionalKRAs 
                              : myKRAs.functionalKRAs.slice(0, 3)
                            ).map((kra: any, idx: number) => {
                              const actualIndex = showAllKRAs.functional ? idx : idx;
                              return (
                                <div 
                                  key={actualIndex} 
                                  onClick={() => {
                                    setSelectedKRA({ kra, index: actualIndex, type: 'self' });
                                    setShowKRADetailModal(true);
                                  }}
                              style={{ 
                                padding: '1.5rem', 
                                border: '2px solid #e0e0e0', 
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: '#fff',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#2196F3';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e0e0e0';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>{kra.kra}</h4>
                              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                                {(() => {
                                  let kpis: Array<{ kpi: string; target?: string }> = [];
                                  if (Array.isArray(kra.kpis)) {
                                    kpis = kra.kpis;
                                  } else if (kra.kpis) {
                                    kpis = [{ kpi: String(kra.kpis) }];
                                  }
                                  return kpis.length > 0 ? `${kpis.length} KPI${kpis.length > 1 ? 's' : ''}` : 'No KPIs';
                                })()}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '12px' }}>
                                {(() => {
                                  let proofs: any[] = [];
                                  if (Array.isArray(kra.reportsGenerated)) {
                                    proofs = kra.reportsGenerated;
                                  } else if (typeof kra.reportsGenerated === 'string' && kra.reportsGenerated.trim()) {
                                    proofs = [{ type: 'drive_link', value: kra.reportsGenerated }];
                                  }
                                  return proofs.length > 0 ? `${proofs.length} proof${proofs.length > 1 ? 's' : ''} submitted` : 'No proof submitted';
                                })()}
                              </p>
                              <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#2196F3', fontWeight: '600' }}>
                                Click to view details →
                                </div>
                              </div>
                            );
                            })}
                          </div>
                          {myKRAs.functionalKRAs.length > 3 && (
                            <button
                              onClick={() => setShowAllKRAs({ ...showAllKRAs, functional: !showAllKRAs.functional })}
                              style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#2196F3',
                                fontWeight: '600',
                              }}
                            >
                              {showAllKRAs.functional ? `Show Less (${myKRAs.functionalKRAs.length - 3} hidden)` : `Show All (${myKRAs.functionalKRAs.length - 3} more)`}
                            </button>
                          )}
                        </>
                      )}
                      {!expandedCategories.functional && myKRAs.functionalKRAs?.length > 0 && (
                        <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
                      )}
                      {myKRAs.functionalKRAs?.length === 0 && (
                        <p>No Functional KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedCategories({ ...expandedCategories, organizational: !expandedCategories.organizational })}
                      >
                        <h3 style={{ margin: 0 }}>Organizational KRAs ({myKRAs.organizationalKRAs?.length || 0})</h3>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#666',
                            padding: '0.25rem 0.5rem',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories({ ...expandedCategories, organizational: !expandedCategories.organizational });
                          }}
                        >
                          {expandedCategories.organizational ? '▼' : '▶'}
                        </button>
                      </div>
                      {expandedCategories.organizational && myKRAs.organizationalKRAs?.length > 0 && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {(showAllKRAs.organizational 
                              ? myKRAs.organizationalKRAs 
                              : myKRAs.organizationalKRAs.slice(0, 3)
                            ).map((kra: any, idx: number) => {
                              const actualIndex = showAllKRAs.organizational ? idx : idx;
                              return (
                                <div 
                                  key={actualIndex} 
                                  onClick={() => {
                                    setSelectedKRA({ kra, index: actualIndex, type: 'self' });
                                    setShowKRADetailModal(true);
                                  }}
                                  style={{ 
                                    padding: '1.5rem', 
                                    border: '2px solid #e0e0e0', 
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#fff',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#2196F3';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>{kra.coreValues}</h4>
                                  <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#2196F3', fontWeight: '600' }}>
                                    Click to view details →
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {myKRAs.organizationalKRAs.length > 3 && (
                            <button
                              onClick={() => setShowAllKRAs({ ...showAllKRAs, organizational: !showAllKRAs.organizational })}
                              style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#2196F3',
                                fontWeight: '600',
                              }}
                            >
                              {showAllKRAs.organizational ? `Show Less (${myKRAs.organizationalKRAs.length - 3} hidden)` : `Show All (${myKRAs.organizationalKRAs.length - 3} more)`}
                            </button>
                          )}
                        </>
                      )}
                      {!expandedCategories.organizational && myKRAs.organizationalKRAs?.length > 0 && (
                        <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
                      )}
                      {myKRAs.organizationalKRAs?.length === 0 && (
                        <p>No Organizational KRAs assigned</p>
                      )}
                    </div>
                    <div className={styles.kraCategory}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedCategories({ ...expandedCategories, selfDevelopment: !expandedCategories.selfDevelopment })}
                      >
                        <h3 style={{ margin: 0 }}>Self Development KRAs ({myKRAs.selfDevelopmentKRAs?.length || 0})</h3>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#666',
                            padding: '0.25rem 0.5rem',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories({ ...expandedCategories, selfDevelopment: !expandedCategories.selfDevelopment });
                          }}
                        >
                          {expandedCategories.selfDevelopment ? '▼' : '▶'}
                        </button>
                      </div>
                      {expandedCategories.selfDevelopment && myKRAs.selfDevelopmentKRAs?.length > 0 && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                            {(showAllKRAs.selfDevelopment 
                              ? myKRAs.selfDevelopmentKRAs 
                              : myKRAs.selfDevelopmentKRAs.slice(0, 3)
                            ).map((kra: any, idx: number) => {
                              const actualIndex = showAllKRAs.selfDevelopment ? idx : idx;
                              return (
                                <div 
                                  key={actualIndex} 
                                  onClick={() => {
                                    setSelectedKRA({ kra, index: actualIndex, type: 'self' });
                                    setShowKRADetailModal(true);
                                  }}
                                  style={{ 
                                    padding: '1.5rem', 
                                    border: '2px solid #e0e0e0', 
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#fff',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#2196F3';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#333' }}>{kra.areaOfConcern}</h4>
                                  <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#2196F3', fontWeight: '600' }}>
                                    Click to view details →
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {myKRAs.selfDevelopmentKRAs.length > 3 && (
                            <button
                              onClick={() => setShowAllKRAs({ ...showAllKRAs, selfDevelopment: !showAllKRAs.selfDevelopment })}
                              style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#2196F3',
                                fontWeight: '600',
                              }}
                            >
                              {showAllKRAs.selfDevelopment ? `Show Less (${myKRAs.selfDevelopmentKRAs.length - 3} hidden)` : `Show All (${myKRAs.selfDevelopmentKRAs.length - 3} more)`}
                            </button>
                          )}
                        </>
                      )}
                      {!expandedCategories.selfDevelopment && myKRAs.selfDevelopmentKRAs?.length > 0 && (
                        <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
                      )}
                      {myKRAs.selfDevelopmentKRAs?.length === 0 && (
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
                    <TeamMemberCard
                      key={manager._id}
                      name={manager.name}
                      email={manager.email}
                      mobile={manager.mobile}
                      createdAt={manager.createdAt}
                      buttonText=""
                    >
                      <div className={styles.managerActions}>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('functional');
                          }}
                        >
                          Add Functional KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('organizational');
                          }}
                        >
                          Add Organizational KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedManager(manager);
                            setShowKRAModal(true);
                            setKraType('self-development');
                          }}
                        >
                          Add Self Development KRA
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
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
                            managerKRAs[manager._id].functionalKRAs.map((kra: any, idx: number) => (
                              <div key={idx} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                <h5 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{kra.kra}</h5>
                                
                                {/* KPIs Section */}
                                <div style={{ marginBottom: '1rem' }}>
                                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>KPIs (Key Performance Indicators)</label>
                                  {(() => {
                                    let kpis: Array<{ kpi: string; target?: string }> = [];
                                    if (Array.isArray(kra.kpis)) {
                                      kpis = kra.kpis.map((kpi: any) => {
                                        if (typeof kpi === 'string') {
                                          return { kpi };
                                        }
                                        return { kpi: kpi.kpi || '', target: kpi.target };
                                      });
                                    } else if (kra.kpis) {
                                      kpis = [{ kpi: String(kra.kpis) }];
                                    }

                                    return kpis.length > 0 ? (
                                      <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                        {kpis.map((kpi, kpiIndex: number) => (
                                          <li key={kpiIndex} style={{ marginBottom: '0.25rem' }}>
                                            <strong>{kpi.kpi}</strong>
                                            {kpi.target && <span style={{ color: '#666' }}> - Target: {kpi.target}</span>}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p style={{ color: '#999', margin: 0 }}>No KPIs defined</p>
                                    );
                                  })()}
                                </div>

                                {/* Reports/Proof Section */}
                                <div style={{ marginBottom: '1rem' }}>
                                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                                    Reports/Proof of Work <span style={{ color: '#999', fontWeight: 'normal' }}>(Optional)</span>
                                  </label>
                                  {(() => {
                                    let proofs: any[] = [];
                                    if (Array.isArray(kra.reportsGenerated)) {
                                      proofs = kra.reportsGenerated;
                                    } else if (typeof kra.reportsGenerated === 'string' && kra.reportsGenerated.trim()) {
                                      proofs = [{
                                        type: 'drive_link',
                                        value: kra.reportsGenerated,
                                        uploadedAt: new Date().toISOString(),
                                      }];
                                    }

                                    return proofs.length > 0 ? (
                                      <div style={{ marginBottom: '0.5rem' }}>
                                        {proofs.map((proof: any, proofIndex: number) => (
                                          <div key={proofIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            {proof.type === 'drive_link' ? (
                                              <a href={proof.value} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3', textDecoration: 'none' }}>
                                                📎 Drive Link
                                              </a>
                                            ) : (
                                              <span style={{ color: '#666' }}>📄 {proof.fileName || 'Uploaded File'}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p style={{ color: '#999', margin: '0 0 0.5rem 0' }}>No proof submitted</p>
                                    );
                                  })()}
                                  <button
                                    onClick={() => {
                                      setShowProofDialog({ managerId: manager._id, kraIndex: idx, isOpen: true });
                                    }}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#2196F3',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                    }}
                                    type="button"
                                  >
                                    + Add Proof
                                  </button>
                                </div>
                              </div>
                            ))
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
                    </TeamMemberCard>
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
              {kraType === 'functional' ? (
                <KRAForm
                  onSubmit={handleAddManagerKRA}
                  onCancel={() => setShowKRAModal(false)}
                  mode="add"
                />
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddManagerKRA();
                }}>
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
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="submit" className={baseStyles.submitButton}>
                      Add KRA
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKRAModal(false)}
                      className={baseStyles.cancelButton}
                      style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ddd' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KRA Detail Modal */}
      {showKRADetailModal && selectedKRA && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowKRADetailModal(false);
            setSelectedKRA(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>KRA Details</h2>
              <button
                onClick={() => {
                  setShowKRADetailModal(false);
                  setSelectedKRA(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>{selectedKRA.kra.kra}</h3>
              
              {/* KPIs Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '16px' }}>KPIs (Key Performance Indicators)</label>
                {(() => {
                  let kpis: Array<{ kpi: string; target?: string }> = [];
                  if (Array.isArray(selectedKRA.kra.kpis)) {
                    kpis = selectedKRA.kra.kpis.map((kpi: any) => {
                      if (typeof kpi === 'string') {
                        return { kpi };
                      }
                      return { kpi: kpi.kpi || '', target: kpi.target };
                    });
                  } else if (selectedKRA.kra.kpis) {
                    kpis = [{ kpi: String(selectedKRA.kra.kpis) }];
                  }

                  return kpis.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {kpis.map((kpi, kpiIndex: number) => (
                        <li key={kpiIndex} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                          <strong>{kpi.kpi}</strong>
                          {kpi.target && <span style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>Target: {kpi.target}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: '#999', margin: 0 }}>No KPIs defined</p>
                  );
                })()}
              </div>

              {/* Reports/Proof Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem', fontSize: '16px' }}>
                  Reports/Proof of Work <span style={{ color: '#999', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                {(() => {
                  let proofs: any[] = [];
                  if (Array.isArray(selectedKRA.kra.reportsGenerated)) {
                    proofs = selectedKRA.kra.reportsGenerated;
                  } else if (typeof selectedKRA.kra.reportsGenerated === 'string' && selectedKRA.kra.reportsGenerated.trim()) {
                    proofs = [{
                      type: 'drive_link',
                      value: selectedKRA.kra.reportsGenerated,
                      uploadedAt: new Date().toISOString(),
                    }];
                  }

                  return proofs.length > 0 ? (
                    <div style={{ marginBottom: '0.5rem' }}>
                      {proofs.map((proof: any, proofIndex: number) => (
                        <div key={proofIndex} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '0.5rem', 
                          marginBottom: '0.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                        }}>
                          {proof.type === 'drive_link' ? (
                            <a href={proof.value} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3', textDecoration: 'none', fontWeight: '500' }}>
                              📎 Drive Link
                            </a>
                          ) : (
                            <span style={{ color: '#666', fontWeight: '500' }}>📄 {proof.fileName || 'Uploaded File'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#999', margin: '0 0 0.5rem 0' }}>No proof submitted</p>
                  );
                })()}
                <button
                  onClick={() => {
                    setShowProofDialog({ managerId: selectedKRA.type, kraIndex: selectedKRA.index, isOpen: true });
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                  type="button"
                >
                  + Add Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Dialog */}
      {showProofDialog.isOpen && showProofDialog.kraIndex !== -1 && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowProofDialog({ managerId: '', kraIndex: -1, isOpen: false })}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Add Proof of Work</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: proofInput.type === 'drive_link' ? '#2196F3' : '#e0e0e0',
                  color: proofInput.type === 'drive_link' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setProofInput({ ...proofInput, type: 'drive_link' })}
              >
                Drive Link
              </button>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: proofInput.type === 'file_upload' ? '#2196F3' : '#e0e0e0',
                  color: proofInput.type === 'file_upload' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setProofInput({ ...proofInput, type: 'file_upload' })}
              >
                File Upload
              </button>
            </div>
            {proofInput.type === 'drive_link' ? (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Google Drive Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={proofInput.value}
                  onChange={(e) => setProofInput({ ...proofInput, value: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '1rem' }}>Enter a Google Drive or Google Docs link</p>
                <button
                  type="button"
                  onClick={() => handleAddDriveLink(showProofDialog.managerId, showProofDialog.kraIndex)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Add Link
                </button>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Upload File (JPG, PNG, or PDF - Max 10MB)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, showProofDialog.managerId, showProofDialog.kraIndex)}
                  style={{ marginBottom: '1rem' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProofDialog({ managerId: '', kraIndex: -1, isOpen: false })}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '1rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BossDashboard;

