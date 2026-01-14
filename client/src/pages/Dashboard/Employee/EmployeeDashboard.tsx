import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './EmployeeDashboard.module.css';
import logo from '@/assets/logo.png';
import { getNavigationItems } from '@/utils/navigationConfig';

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

interface Proof {
  type: 'drive_link' | 'file_upload';
  value: string;
  fileName?: string;
  uploadedAt: string;
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
  const [selectedKRA, setSelectedKRA] = useState<{ kra: any; index: number; type: 'self' } | null>(null);
  const [showKRADetailModal, setShowKRADetailModal] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState<{ kraIndex: number; isOpen: boolean }>({
    kraIndex: -1,
    isOpen: false,
  });
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });
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

  const handleAddProof = async (kraIndex: number, proof: Proof) => {
    if (!performanceData?.kras?.functionalKRAs) return;

    const kra = performanceData.kras.functionalKRAs[kraIndex];
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
    
    // Update the employee's KRA
    try {
      const userId = localStorage.getItem('userId');
      // Find employee in team to get member index
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
              // Refresh performance data
              fetchPerformanceData();
              setShowProofDialog({ kraIndex: -1, isOpen: false });
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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, kraIndex: number) => {
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
        handleAddProof(kraIndex, newProof);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleAddDriveLink = (kraIndex: number) => {
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
    handleAddProof(kraIndex, newProof);
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
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedCategories({ ...expandedCategories, functional: !expandedCategories.functional })}
              >
                <h3 style={{ margin: 0 }}>Functional KRAs ({performanceData.kras.functionalKRAs?.length || 0})</h3>
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
              {expandedCategories.functional && performanceData.kras.functionalKRAs?.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {(showAllKRAs.functional 
                      ? performanceData.kras.functionalKRAs 
                      : performanceData.kras.functionalKRAs.slice(0, 3)
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
                  {performanceData.kras.functionalKRAs.length > 3 && (
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
                      {showAllKRAs.functional ? `Show Less (${performanceData.kras.functionalKRAs.length - 3} hidden)` : `Show All (${performanceData.kras.functionalKRAs.length - 3} more)`}
                    </button>
                  )}
                </>
              )}
              {!expandedCategories.functional && performanceData.kras.functionalKRAs?.length > 0 && (
                <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
              )}
              {performanceData.kras.functionalKRAs?.length === 0 && (
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
                <h3 style={{ margin: 0 }}>Organizational KRAs ({performanceData.kras.organizationalKRAs?.length || 0})</h3>
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
              {expandedCategories.organizational && performanceData.kras.organizationalKRAs?.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {(showAllKRAs.organizational 
                      ? performanceData.kras.organizationalKRAs 
                      : performanceData.kras.organizationalKRAs.slice(0, 3)
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
                  {performanceData.kras.organizationalKRAs.length > 3 && (
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
                      {showAllKRAs.organizational ? `Show Less (${performanceData.kras.organizationalKRAs.length - 3} hidden)` : `Show All (${performanceData.kras.organizationalKRAs.length - 3} more)`}
                    </button>
                  )}
                </>
              )}
              {!expandedCategories.organizational && performanceData.kras.organizationalKRAs?.length > 0 && (
                <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
              )}
              {performanceData.kras.organizationalKRAs?.length === 0 && (
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
                <h3 style={{ margin: 0 }}>Self Development KRAs ({performanceData.kras.selfDevelopmentKRAs?.length || 0})</h3>
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
              {expandedCategories.selfDevelopment && performanceData.kras.selfDevelopmentKRAs?.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {(showAllKRAs.selfDevelopment 
                      ? performanceData.kras.selfDevelopmentKRAs 
                      : performanceData.kras.selfDevelopmentKRAs.slice(0, 3)
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
                  {performanceData.kras.selfDevelopmentKRAs.length > 3 && (
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
                      {showAllKRAs.selfDevelopment ? `Show Less (${performanceData.kras.selfDevelopmentKRAs.length - 3} hidden)` : `Show All (${performanceData.kras.selfDevelopmentKRAs.length - 3} more)`}
                    </button>
                  )}
                </>
              )}
              {!expandedCategories.selfDevelopment && performanceData.kras.selfDevelopmentKRAs?.length > 0 && (
                <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '14px' }}>Click to expand and view KRAs</p>
              )}
              {performanceData.kras.selfDevelopmentKRAs?.length === 0 && (
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
                    setShowProofDialog({ kraIndex: selectedKRA.index, isOpen: true });
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
            zIndex: 1001,
          }}
          onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}
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
                  onClick={() => handleAddDriveLink(showProofDialog.kraIndex)}
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
                  onChange={(e) => handleFileUpload(e, showProofDialog.kraIndex)}
                  style={{ marginBottom: '1rem' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}
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

export default EmployeeDashboard;

