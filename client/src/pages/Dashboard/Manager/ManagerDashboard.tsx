import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ManagerDashboard.module.css';
import logo from '@/assets/logo.png';
import TeamMemberCard from '@/components/TeamMemberCard/TeamMemberCard';
import KRAForm, { FunctionalKRAFormData } from '@/components/KRAForm/KRAForm';
import { fetchUserProfile as fetchUserProfileApi } from '@/utils/userProfile';

interface Employee {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  designation?: string;
  createdAt: string;
}

interface TeamPerformance {
  teamSize: number;
  employees: Array<{
    _id: string;
    name: string;
    email: string;
    mobile: string;
    score?: number;
  }>;
  performanceMetrics: {
    averageScore: number;
    topPerformers: any[];
    needsImprovement: any[];
  };
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

type ActiveTab = 'dashboard' | 'team' | 'performance' | 'settings';

function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    mobile: '',
    designation: '',
  });
  const [user, setUser] = useState<UserProfile | null>(null);
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
  const [myKRAs, setMyKRAs] = useState<any>(null);
  const [showKRAModal, setShowKRAModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [kraType, setKraType] = useState<'functional' | 'organizational' | 'self-development'>('functional');
  const [showKRAsView, setShowKRAsView] = useState<string | null>(null);
  const [employeeKRAs, setEmployeeKRAs] = useState<{ [key: string]: any }>({});
  const [newKRA, setNewKRA] = useState<any>({});
  const [showProofDialog, setShowProofDialog] = useState<{ employeeId: string; kraIndex: number; isOpen: boolean }>({
    employeeId: '',
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
    fetchEmployees();
    fetchTeamPerformance();
    fetchNotificationCount();
    fetchMyKRAs();
  }, [navigate]);

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
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationCount(data.data?.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchMyKRAs = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/my-kras?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setMyKRAs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch my KRAs:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/employees?userId=${userId}`);
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

  const fetchTeamPerformance = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/team-performance?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setTeamPerformance(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team performance:', error);
    }
  };

  const fetchEmployeeKRAs = async (employeeId: string, memberIndex: number) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/team/members?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data && data.data[memberIndex]) {
        const member = data.data[memberIndex];
        setEmployeeKRAs((prev) => ({
          ...prev,
          [employeeId]: {
            functionalKRAs: member.functionalKRAs || [],
            organizationalKRAs: member.organizationalKRAs || [],
            selfDevelopmentKRAs: member.selfDevelopmentKRAs || [],
          },
        }));
      }
    } catch (error) {
      console.error('Failed to fetch employee KRAs:', error);
    }
  };

  const handleAddEmployeeKRA = async (formData?: FunctionalKRAFormData) => {
    if (!selectedEmployee) return;

    try {
      const userId = localStorage.getItem('userId');
      
      // Use manager-specific endpoint for adding employee KRAs
      const endpoint = `/api/manager/employees/${selectedEmployee._id}/kras/${kraType}`;
      
      // For functional KRAs, use the unified form data
      // For other types, use the old structure
      const apiData = kraType === 'functional' && formData
        ? {
            kra: formData.kra,
            kpis: formData.kpis,
            reportsGenerated: formData.reportsGenerated || [],
            pilotWeight: formData.pilotWeight || 10,
            pilotScore: formData.pilotScore || 0,
          }
        : newKRA;

      const res = await fetch(`${endpoint}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const data = await res.json();
      if (res.ok) {
        setShowKRAModal(false);
        setNewKRA({});
        // Refresh employee KRAs
        const teamRes = await fetch(`/api/team/members?userId=${userId}`);
        const teamData = await teamRes.json();
        if (teamData.status === 'success' && teamData.data) {
          const memberIndex = teamData.data.findIndex(
            (m: any) => m.mobile === selectedEmployee.mobile
          );
          if (memberIndex !== -1) {
            fetchEmployeeKRAs(selectedEmployee._id, memberIndex);
          }
        }
        alert(
          kraType === 'functional'
            ? 'KRA added.'
            : kraType === 'organizational'
              ? 'Core value added.'
              : 'Area of concern added.'
        );
      } else {
        alert(data.message || (kraType === 'functional' ? 'Failed to add KRA' : kraType === 'organizational' ? 'Failed to add Core Value' : 'Failed to add Area of Concern'));
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/employees?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowCreateForm(false);
        setNewEmployee({ name: '', email: '', mobile: '', designation: '' });
        fetchEmployees();
        fetchTeamPerformance();
        alert('Member added.');
      } else {
        alert(data.message || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Network error. Please check if the server is running.');
    }
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

  const handleLogoClick = () => {
    navigate('/dashboard/manager');
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddProof = async (employeeId: string, kraIndex: number, proof: Proof) => {
    // Handle manager's own KRAs
    if (employeeId === 'self') {
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
      
      // Update the manager's own KRA
      try {
        const userId = localStorage.getItem('userId');
        // Find manager in team to get member index
        const teamRes = await fetch(`/api/team/members?userId=${userId}`);
        const teamData = await teamRes.json();
        if (teamData.status === 'success' && teamData.data) {
          const userProfile = await fetchUserProfileApi(userId!);
          if (userProfile?.status === 'success' && userProfile.data) {
            const memberIndex = teamData.data.findIndex((m: any) => m.mobile === userProfile.data.mobile);
            if (memberIndex !== -1) {
              const updateRes = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reportsGenerated: updatedProofs }),
              });

              const updateData = await updateRes.json();
              if (updateRes.ok) {
                // Refresh manager's KRAs
                fetchMyKRAs();
                setShowProofDialog({ employeeId: '', kraIndex: -1, isOpen: false });
                setProofInput({ type: 'drive_link', value: '' });
                alert('Proof added.');
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

    // Handle employee KRAs
    if (!employeeKRAs[employeeId] || !employeeKRAs[employeeId].functionalKRAs) return;

    const kra = employeeKRAs[employeeId].functionalKRAs[kraIndex];
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
      // Find employee to get their team and member index
      const employee = employees.find(e => e._id === employeeId);
      if (!employee) return;

      // Fetch team to find member index
      const teamRes = await fetch(`/api/team/members?userId=${userId}`);
      const teamData = await teamRes.json();
      if (teamData.status === 'success' && teamData.data) {
        const memberIndex = teamData.data.findIndex((m: any) => m.mobile === employee.mobile);
        if (memberIndex !== -1) {
          const updateRes = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportsGenerated: updatedProofs }),
          });

          const updateData = await updateRes.json();
          if (updateRes.ok) {
            // Refresh employee KRAs
            fetchEmployeeKRAs(employeeId, memberIndex);
            setShowProofDialog({ employeeId: '', kraIndex: -1, isOpen: false });
            setProofInput({ type: 'drive_link', value: '' });
            alert('Proof added.');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, employeeId: string, kraIndex: number) => {
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
        handleAddProof(employeeId, kraIndex, newProof);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleAddDriveLink = (employeeId: string, kraIndex: number) => {
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
    handleAddProof(employeeId, kraIndex, newProof);
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
              {user?.name ? getInitials(user.name) : 'M'}
            </div>
            <div className={baseStyles.profileInfo}>
              <span className={baseStyles.profileName}>{user?.name || 'Supervisor'}</span>
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
                {user?.name ? getInitials(user.name) : 'M'}
              </div>
              <div className={baseStyles.userInfo}>
                <span className={baseStyles.userName}>{user?.name || 'Supervisor'}</span>
                <span className={baseStyles.userRole}>Supervisor</span>
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
                className={`${baseStyles.menuItem} ${activeTab === 'team' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('team'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Team Members</span>
              </button>

              <button
                className={`${baseStyles.menuItem} ${activeTab === 'performance' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('performance'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Performance</span>
              </button>


              <button
                className={`${baseStyles.menuItem} ${activeTab === 'settings' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('settings'); setShowMenu(false); }}
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
            <div className={baseStyles.tabContent}>
              <h1 className={baseStyles.pageTitle}>Dashboard</h1>
              
              {teamPerformance && (
                <div className={styles.teamStats}>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <h3>Team Size</h3>
                      <div className={styles.statValue}>{teamPerformance.teamSize}</div>
                    </div>
                    <div className={styles.statCard}>
                      <h3>Average Score</h3>
                      <div className={styles.statValue}>
                        {teamPerformance.performanceMetrics.averageScore.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </div>

                  {teamPerformance.performanceMetrics.topPerformers.length > 0 && (
                    <div className={styles.performanceSection}>
                      <h3>Top Performers</h3>
                      <div className={styles.performersList}>
                        {teamPerformance.performanceMetrics.topPerformers.map((performer: any, index: number) => (
                          <div key={index} className={styles.performerCard}>
                            <span className={styles.rank}>#{index + 1}</span>
                            <span className={styles.name}>{performer.name}</span>
                            <span className={styles.score}>{performer.score.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        <h3 style={{ margin: 0 }}>Organizational Dimension - Core Values ({myKRAs.organizationalKRAs?.length || 0})</h3>
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
                        <p>No core values assigned</p>
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
                        <p>No areas of concern assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <div className={styles.tabContent}>
              <div className={baseStyles.pageHeader}>
                <h1 className={baseStyles.pageTitle}>Team Members</h1>
                <button
                  className={baseStyles.createButton}
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Member'}
                </button>
              </div>

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Member</h2>
                  <form onSubmit={handleCreateEmployee}>
                    <div className={baseStyles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Email *</label>
                      <input
                        type="email"
                        className={baseStyles.input}
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Mobile *</label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        className={baseStyles.input}
                        value={newEmployee.mobile}
                        onChange={(e) => setNewEmployee({ ...newEmployee, mobile: e.target.value })}
                        required
                      />
                    </div>
                    <div className={baseStyles.formGroup}>
                      <label>Designation</label>
                      <input
                        type="text"
                        className={baseStyles.input}
                        value={newEmployee.designation}
                        onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                        placeholder="e.g., Developer, Analyst"
                      />
                    </div>
                    <button type="submit" className={baseStyles.submitButton}>
                      Create Member
                    </button>
                  </form>
                </div>
              )}

              <div className={styles.employees}>
                {employees.length === 0 ? (
                  <p className={styles.empty}>No employees yet. Create one to get started.</p>
                ) : (
                  <div className={styles.employeesGrid}>
                    {employees.map((employee) => {
                      const employeeScore = teamPerformance?.employees.find(
                        (e) => e._id === employee._id
                      )?.score || 0;
                      
                      return (
                        <TeamMemberCard
                          key={employee._id}
                          name={employee.name}
                          email={employee.email}
                          mobile={employee.mobile}
                          designation={employee.designation}
                          score={employeeScore}
                          createdAt={employee.createdAt}
                          buttonText=""
                        >
                          <div className={styles.managerActions}>
                            <button
                              className={styles.actionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
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
                                setSelectedEmployee(employee);
                                setShowKRAModal(true);
                                setKraType('organizational');
                              }}
                            >
                              Add Core Value
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                                setShowKRAModal(true);
                                setKraType('self-development');
                              }}
                            >
                              Add Area of Concern
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (showKRAsView === employee._id) {
                                  setShowKRAsView(null);
                                } else {
                                  setShowKRAsView(employee._id);
                                  // Find employee in team to get member index
                                  const userId = localStorage.getItem('userId');
                                  fetch(`/api/team/members?userId=${userId}`)
                                    .then((res) => res.json())
                                    .then((data) => {
                                      if (data.status === 'success' && data.data) {
                                        const memberIndex = data.data.findIndex(
                                          (m: any) => m.mobile === employee.mobile
                                        );
                                        if (memberIndex !== -1) {
                                          fetchEmployeeKRAs(employee._id, memberIndex);
                                        }
                                      }
                                    });
                                }
                              }}
                            >
                              {showKRAsView === employee._id ? 'Hide Dimensions' : 'View Dimensions'}
                            </button>
                          </div>
                          {showKRAsView === employee._id && employeeKRAs[employee._id] && (
                            <div className={styles.krasView}>
                              <h4>Functional KRAs</h4>
                              {employeeKRAs[employee._id].functionalKRAs?.length > 0 ? (
                                employeeKRAs[employee._id].functionalKRAs.map((kra: any, idx: number) => (
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
                                      setShowProofDialog({ employeeId: employee._id, kraIndex: idx, isOpen: true });
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
                              <h4>Organizational Dimension (Core Values)</h4>
                              {employeeKRAs[employee._id].organizationalKRAs?.length > 0 ? (
                                <ul>
                                  {employeeKRAs[employee._id].organizationalKRAs.map((kra: any, idx: number) => (
                                    <li key={idx}>{kra.coreValues}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No core values added</p>
                              )}
                              <h4>Self Development (Areas of Concern)</h4>
                              {employeeKRAs[employee._id].selfDevelopmentKRAs?.length > 0 ? (
                                <ul>
                                  {employeeKRAs[employee._id].selfDevelopmentKRAs.map((kra: any, idx: number) => (
                                    <li key={idx}>{kra.areaOfConcern}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>No areas of concern added</p>
                              )}
                            </div>
                          )}
                        </TeamMemberCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className={baseStyles.tabContent}>
              <h1 className={baseStyles.pageTitle}>Performance Overview</h1>
              <p className={baseStyles.pageSubtitle}>Performance metrics and analytics for your team.</p>
              {/* Performance content can be expanded here */}
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

      {/* KRA Modal for Members */}
      {showKRAModal && selectedEmployee && (
        <div className={styles.modalOverlay} onClick={() => setShowKRAModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Add {kraType === 'functional' ? 'Functional KRA' : kraType === 'organizational' ? 'Core Value' : 'Area of Concern'} for {selectedEmployee.name}</h2>
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
                  onSubmit={handleAddEmployeeKRA}
                  onCancel={() => setShowKRAModal(false)}
                  mode="add"
                />
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddEmployeeKRA();
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
                      {kraType === 'organizational' ? 'Add Core Value' : 'Add Area of Concern'}
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
                    setShowProofDialog({ employeeId: selectedKRA.type === 'self' ? 'self' : '', kraIndex: selectedKRA.index, isOpen: true });
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
          onClick={() => setShowProofDialog({ employeeId: '', kraIndex: -1, isOpen: false })}
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
                  onClick={() => handleAddDriveLink(showProofDialog.employeeId, showProofDialog.kraIndex)}
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
                  onChange={(e) => handleFileUpload(e, showProofDialog.employeeId, showProofDialog.kraIndex)}
                  style={{ marginBottom: '1rem' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProofDialog({ employeeId: '', kraIndex: -1, isOpen: false })}
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

export default ManagerDashboard;
