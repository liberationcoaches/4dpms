import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ManagerDashboard.module.css';
import logo from '@/assets/logo.png';
import { DIMENSION_COLORS } from '@/utils/dimensionColors';

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

interface DimensionWeights {
  functional: number;
  organizational: number;
  selfDevelopment: number;
  developingOthers: number;
}

type ActiveTab = 'dashboard' | 'team' | 'performance' | 'dimensions' | 'settings';

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
  const [dimensionWeights, setDimensionWeights] = useState<DimensionWeights>({
    functional: 0,
    organizational: 0,
    selfDevelopment: 0,
    developingOthers: 0,
  });
  const [weightsErrors, setWeightsErrors] = useState('');
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightsSuccessMessage, setWeightsSuccessMessage] = useState('');
  const [profileErrors, setProfileErrors] = useState<Partial<UserProfile>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [myKRAs, setMyKRAs] = useState<any>(null);

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
    fetchDimensionWeights();
    fetchMyKRAs();
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

  const fetchDimensionWeights = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/team/dimension-weights?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setDimensionWeights(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dimension weights:', error);
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

  const handleEmployeeClick = async (employee: Employee) => {
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch team members to find the employee's index
      const teamRes = await fetch(`/api/team/members?userId=${userId}`);
      const teamData = await teamRes.json();
      
      if (teamData.status === 'success' && teamData.data && Array.isArray(teamData.data)) {
        // Find the employee in the team members list by mobile (most reliable match)
        const teamMemberIndex = teamData.data.findIndex(
          (member: any) => member.mobile === employee.mobile
        );
        
        if (teamMemberIndex !== -1) {
          // Use the team member ID which is already in format teamId-index
          const memberId = teamData.data[teamMemberIndex]._id;
          navigate(`/dashboard/manager/team/${memberId}`);
        } else {
          // Employee not found in team - they need to be added to the team first
          alert('This employee is not yet added to the team. Please add them to the team first before adding dimension details.');
        }
      } else {
        alert('Unable to fetch team information. Please try again.');
      }
    } catch (error) {
      console.error('Failed to navigate to employee details:', error);
      alert('Failed to open employee details. Please try again.');
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
        alert('Employee created successfully!');
      } else {
        alert(data.message || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  const handleWeightChange = (dimension: keyof DimensionWeights, value: number) => {
    const numValue = Math.round(Math.max(0, Math.min(100, value)));
    setDimensionWeights((prev) => ({ ...prev, [dimension]: numValue }));
    setWeightsErrors('');
    setWeightsSuccessMessage('');
  };

  const handleSaveWeights = async (e: FormEvent) => {
    e.preventDefault();
    setWeightsErrors('');
    setWeightsSuccessMessage('');

    const total = dimensionWeights.functional + dimensionWeights.organizational + 
                  dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;

    if (total !== 100) {
      setWeightsErrors(`Weights must sum to 100%. Current sum: ${total}%`);
      return;
    }

    if (dimensionWeights.functional <= 0 || dimensionWeights.organizational <= 0 || 
        dimensionWeights.selfDevelopment <= 0) {
      setWeightsErrors('Functional, Organizational, and Self Development dimensions must have weights greater than 0%');
      return;
    }

    setIsSavingWeights(true);
    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/dimension-weights?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dimensionWeights),
      });

      const data = await response.json();

      if (response.ok) {
        setWeightsSuccessMessage('Dimension weights saved successfully!');
        setTimeout(() => setWeightsSuccessMessage(''), 3000);
      } else {
        setWeightsErrors(data.message || 'Failed to save dimension weights');
      }
    } catch (error) {
      setWeightsErrors('Network error. Please try again.');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const calculateTotal = () => {
    return dimensionWeights.functional + dimensionWeights.organizational + 
           dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;
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
              <span className={baseStyles.profileName}>{user?.name || 'Manager'}</span>
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
                <span className={baseStyles.userName}>{user?.name || 'Manager'}</span>
                <span className={baseStyles.userRole}>Manager</span>
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
                className={`${baseStyles.menuItem} ${activeTab === 'dimensions' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('dimensions'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <span>Dimension Weights</span>
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

          {activeTab === 'team' && (
            <div className={styles.tabContent}>
              <div className={baseStyles.pageHeader}>
                <h1 className={baseStyles.pageTitle}>Team Members</h1>
                <button
                  className={baseStyles.createButton}
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? 'Cancel' : '+ Create Employee'}
                </button>
              </div>

              {showCreateForm && (
                <div className={styles.createForm}>
                  <h2>Create New Employee</h2>
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
                      Create Employee
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
                        <div 
                          key={employee._id} 
                          className={styles.employeeCard}
                          onClick={() => handleEmployeeClick(employee)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h3>{employee.name}</h3>
                          <p><strong>Email:</strong> {employee.email}</p>
                          <p><strong>Mobile:</strong> {employee.mobile}</p>
                          {employee.designation && <p><strong>Designation:</strong> {employee.designation}</p>}
                          <div className={styles.scoreBadge}>
                            <strong>Score:</strong> {employeeScore.toFixed(1)}
                          </div>
                          <p className={styles.createdDate}>
                            Created: {new Date(employee.createdAt).toLocaleDateString()}
                          </p>
                          <div className={styles.viewDetailsButton}>
                            View/Edit Dimensions →
                          </div>
                        </div>
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

          {activeTab === 'dimensions' && (
            <div className={baseStyles.tabContent}>
              <h1 className={baseStyles.pageTitle}>Performance Dimension Weights</h1>
              <p className={baseStyles.pageSubtitle}>
                Configure the weight distribution for performance evaluation dimensions. 
                The first three dimensions are mandatory, while "Developing Others" is optional.
                Total must equal 100%.
              </p>

              <form onSubmit={handleSaveWeights} className={styles.weightsForm}>
                <div className={styles.weightsGrid}>
                  <div 
                    className={styles.weightInputGroup}
                    style={{ 
                      borderLeft: `4px solid ${DIMENSION_COLORS.functional.primary}`,
                      backgroundColor: DIMENSION_COLORS.functional.light,
                    }}
                  >
                    <label htmlFor="functional" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.functional.primary }}>
                      Functional Dimension <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.weightInputWrapper}>
                      <input
                        id="functional"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={dimensionWeights.functional}
                        onChange={(e) => handleWeightChange('functional', parseInt(e.target.value) || 0)}
                        className={styles.weightInput}
                        style={{ borderColor: DIMENSION_COLORS.functional.border }}
                      />
                      <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.functional.primary }}>%</span>
                    </div>
                  </div>

                  <div 
                    className={styles.weightInputGroup}
                    style={{ 
                      borderLeft: `4px solid ${DIMENSION_COLORS.organizational.primary}`,
                      backgroundColor: DIMENSION_COLORS.organizational.light,
                    }}
                  >
                    <label htmlFor="organizational" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.organizational.primary }}>
                      Organizational Dimension <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.weightInputWrapper}>
                      <input
                        id="organizational"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={dimensionWeights.organizational}
                        onChange={(e) => handleWeightChange('organizational', parseInt(e.target.value) || 0)}
                        className={styles.weightInput}
                        style={{ borderColor: DIMENSION_COLORS.organizational.border }}
                      />
                      <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.organizational.primary }}>%</span>
                    </div>
                  </div>

                  <div 
                    className={styles.weightInputGroup}
                    style={{ 
                      borderLeft: `4px solid ${DIMENSION_COLORS.selfDevelopment.primary}`,
                      backgroundColor: DIMENSION_COLORS.selfDevelopment.light,
                    }}
                  >
                    <label htmlFor="selfDevelopment" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.selfDevelopment.primary }}>
                      Self Development <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.weightInputWrapper}>
                      <input
                        id="selfDevelopment"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={dimensionWeights.selfDevelopment}
                        onChange={(e) => handleWeightChange('selfDevelopment', parseInt(e.target.value) || 0)}
                        className={styles.weightInput}
                        style={{ borderColor: DIMENSION_COLORS.selfDevelopment.border }}
                      />
                      <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.selfDevelopment.primary }}>%</span>
                    </div>
                  </div>

                  <div 
                    className={styles.weightInputGroup}
                    style={{ 
                      borderLeft: `4px solid ${DIMENSION_COLORS.developingOthers.primary}`,
                      backgroundColor: DIMENSION_COLORS.developingOthers.light,
                    }}
                  >
                    <label htmlFor="developingOthers" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.developingOthers.primary }}>
                      Developing Others <span className={styles.optional}>(Optional)</span>
                    </label>
                    <div className={styles.weightInputWrapper}>
                      <input
                        id="developingOthers"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={dimensionWeights.developingOthers}
                        onChange={(e) => handleWeightChange('developingOthers', parseInt(e.target.value) || 0)}
                        className={styles.weightInput}
                        style={{ borderColor: DIMENSION_COLORS.developingOthers.border }}
                      />
                      <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.developingOthers.primary }}>%</span>
                    </div>
                  </div>
                </div>

                <div className={styles.totalDisplay}>
                  <strong>Total: {calculateTotal()}%</strong>
                  {calculateTotal() !== 100 && (
                    <span className={styles.totalError}> (Must be 100%)</span>
                  )}
                </div>

                {weightsErrors && (
                  <div className={baseStyles.errorText} role="alert" style={{ marginBottom: 'var(--spacing-md)' }}>
                    {weightsErrors}
                  </div>
                )}

                {weightsSuccessMessage && (
                  <div className={baseStyles.successMessage} role="alert">
                    {weightsSuccessMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className={baseStyles.submitButton}
                  disabled={isSavingWeights || calculateTotal() !== 100}
                >
                  {isSavingWeights ? 'Saving...' : 'Save Dimension Weights'}
                </button>
              </form>
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
    </div>
  );
}

export default ManagerDashboard;
