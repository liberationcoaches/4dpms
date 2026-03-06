import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ManagerDashboard.module.css';
import logo from '@/assets/logo.png';
import TeamMemberCard from '@/components/TeamMemberCard/TeamMemberCard';
import { fetchUserProfile as fetchUserProfileApi } from '@/utils/userProfile';
import KRAEditorSelfService from '@/pages/Dashboard/Employee/KRAEditor';
import DimensionWeightsEditor from '@/pages/Dashboard/Employee/DimensionWeightsEditor';
import ProfileEditor from '@/pages/Dashboard/Employee/ProfileEditor';
import Notifications from '@/pages/Dashboard/Notifications/Notifications';

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

type ActiveTab =
  | 'dashboard'
  | 'team'
  | 'performance'
  | 'settings'
  | 'notifications'
  | 'my4DFunctional'
  | 'my4DOrganizational'
  | 'my4DSelfDevelopment'
  | 'my4DDevelopingOthers';

function ManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [is4DMenuExpanded, setIs4DMenuExpanded] = useState(false);
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
  const [myKRAs, setMyKRAs] = useState<any>(null);
  const [showKRAsView, setShowKRAsView] = useState<string | null>(null);
  const [employeeKRAs, setEmployeeKRAs] = useState<{ [key: string]: any }>({});
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
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [dimensionWeights, setDimensionWeights] = useState<{
    functional: number;
    organizational: number;
    selfDevelopment: number;
    developingOthers: number;
  } | null>(null);
  const [showAllKRAs, setShowAllKRAs] = useState<{ [key: string]: boolean }>({
    functional: false,
    organizational: false,
    selfDevelopment: false,
  });

  // Edit/Delete employee state
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: '',
    email: '',
    mobile: '',
    designation: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const is4DTabActive =
    activeTab === 'my4DFunctional' ||
    activeTab === 'my4DOrganizational' ||
    activeTab === 'my4DSelfDevelopment' ||
    activeTab === 'my4DDevelopingOthers';
  const KRAEditorSelfServiceAny = KRAEditorSelfService as any;
  const NotificationsAny = Notifications as any;

  const showNotificationMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
    fetchDimensionWeights();
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

  const handleFinalizeEmployeeKRAs = async (employee: Employee) => {
    const kras = employeeKRAs[employee._id];
    if (!kras) return;

    // Check if already finalized
    if (kras.krasFinalized) {
      alert('KRAs for this team member are already finalized.');
      return;
    }

    if (!confirm(`Are you sure you want to finalize all KRAs for ${employee.name}? Once finalized, scores cannot be modified.`)) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/employees/${employee._id}/kras/finalize?userId=${userId}`, {
        method: 'PUT',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        // Refresh the KRAs
        const teamRes = await fetch(`/api/team/members?userId=${userId}`);
        const teamData = await teamRes.json();
        if (teamData.status === 'success' && teamData.data) {
          const memberIndex = teamData.data.findIndex(
            (m: any) => m.mobile === employee.mobile
          );
          if (memberIndex !== -1) {
            fetchEmployeeKRAs(employee._id, memberIndex);
          }
        }
        alert(`KRAs for ${employee.name} have been finalized successfully.`);
      } else {
        alert(data.message || 'Failed to finalize KRAs');
      }
    } catch (error) {
      console.error('Error finalizing KRAs:', error);
      alert('Failed to finalize KRAs');
    }
  };

  // Edit employee handlers
  const openEditEmployeeModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployeeForm({
      name: employee.name || '',
      email: employee.email || '',
      mobile: employee.mobile || '',
      designation: employee.designation || employee.role || '',
    });
    setShowEditEmployeeModal(true);
  };

  const closeEditEmployeeModal = () => {
    setShowEditEmployeeModal(false);
    setEditingEmployee(null);
    setEditEmployeeForm({ name: '', email: '', mobile: '', designation: '' });
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSubmittingEdit(true);
    const userId = localStorage.getItem('userId');

    try {
      // Find employee index
      const employeeIndex = employees.findIndex(emp => emp._id === editingEmployee._id);
      if (employeeIndex === -1) {
        showNotificationMessage('Employee not found', 'error');
        return;
      }

      const response = await fetch(`/api/manager/employees/${employeeIndex}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editEmployeeForm),
      });

      const data = await response.json();
      if (response.ok) {
        showNotificationMessage('Employee updated successfully');
        closeEditEmployeeModal();
        fetchEmployees();
      } else {
        showNotificationMessage(data.message || 'Failed to update employee', 'error');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      showNotificationMessage('Network error. Please try again.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete employee handlers
  const openDeleteConfirm = (employee: Employee) => {
    setDeletingEmployee(employee);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingEmployee(null);
  };

  const handleDeleteEmployee = async () => {
    if (!deletingEmployee) return;

    setIsSubmittingEdit(true);
    const userId = localStorage.getItem('userId');

    try {
      // Find employee index
      const employeeIndex = employees.findIndex(emp => emp._id === deletingEmployee._id);
      if (employeeIndex === -1) {
        showNotificationMessage('Employee not found', 'error');
        return;
      }

      const response = await fetch(`/api/manager/employees/${employeeIndex}?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        showNotificationMessage('Employee removed successfully');
        closeDeleteConfirm();
        fetchEmployees();
        fetchTeamPerformance();
      } else {
        showNotificationMessage(data.message || 'Failed to remove employee', 'error');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      showNotificationMessage('Network error. Please try again.', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleDownloadReport = async () => {
    try {
      setIsDownloadingReport(true);
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/user/my-report?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `My_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const fetchDimensionWeights = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const response = await fetch(`/api/team/dimension-weights?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          setDimensionWeights(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dimension weights:', error);
    }
  };

  const handleNotificationClick = () => {
    setActiveTab('notifications');
    setShowMenu(false);
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
          {/* Download My Report */}
          <button
            onClick={handleDownloadReport}
            disabled={isDownloadingReport}
            aria-label="Download My Report"
            title="Download My Report as PDF"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-main-grey-40)',
              background: 'var(--color-core-white)',
              cursor: isDownloadingReport ? 'not-allowed' : 'pointer',
              opacity: isDownloadingReport ? 0.6 : 1,
              fontSize: '14px',
              color: 'var(--color-primary-main-blue)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            {isDownloadingReport ? 'Downloading...' : 'My Report'}
          </button>

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
              <div className={`${baseStyles.dropdownWrapper} ${is4DMenuExpanded ? baseStyles.dropdownOpen : ''}`}>
                <button
                  className={`${baseStyles.menuItem} ${baseStyles.dropdownTrigger} ${is4DTabActive ? baseStyles.menuItemActive : ''}`}
                  onClick={() => setIs4DMenuExpanded((prev) => !prev)}
                >
                  <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  <span>My 4 Dimensions</span>
                  <span className={`${baseStyles.subMenuArrow} ${baseStyles.dropdownChevron}`}>▼</span>
                </button>
                <div className={baseStyles.subMenu}>
                  <button
                    className={`${baseStyles.subMenuItem} ${activeTab === 'my4DFunctional' ? baseStyles.subMenuItemActive : ''}`}
                    onClick={() => {
                      setActiveTab('my4DFunctional');
                      setShowMenu(false);
                    }}
                  >
                    Functional
                  </button>
                  <button
                    className={`${baseStyles.subMenuItem} ${activeTab === 'my4DOrganizational' ? baseStyles.subMenuItemActive : ''}`}
                    onClick={() => {
                      setActiveTab('my4DOrganizational');
                      setShowMenu(false);
                    }}
                  >
                    Organizational
                  </button>
                  <button
                    className={`${baseStyles.subMenuItem} ${activeTab === 'my4DSelfDevelopment' ? baseStyles.subMenuItemActive : ''}`}
                    onClick={() => {
                      setActiveTab('my4DSelfDevelopment');
                      setShowMenu(false);
                    }}
                  >
                    Self-Development
                  </button>
                  <button
                    className={`${baseStyles.subMenuItem} ${activeTab === 'my4DDevelopingOthers' ? baseStyles.subMenuItemActive : ''}`}
                    onClick={() => {
                      setActiveTab('my4DDevelopingOthers');
                      setShowMenu(false);
                    }}
                  >
                    Developing Others
                  </button>
                </div>
              </div>

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

              {/* Dimension Weights Section */}
              {dimensionWeights && (
                <div className={styles.dimensionWeightsSection}>
                  <h3>Performance Dimension Weights</h3>
                  <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Organization-defined weights for each performance dimension
                  </p>
                  <div className={styles.weightsGrid}>
                    <div className={styles.weightCard}>
                      <span className={styles.weightLabel}>Functional</span>
                      <span className={styles.weightValue}>{dimensionWeights.functional}%</span>
                    </div>
                    <div className={styles.weightCard}>
                      <span className={styles.weightLabel}>Organizational</span>
                      <span className={styles.weightValue}>{dimensionWeights.organizational}%</span>
                    </div>
                    <div className={styles.weightCard}>
                      <span className={styles.weightLabel}>Self Development</span>
                      <span className={styles.weightValue}>{dimensionWeights.selfDevelopment}%</span>
                    </div>
                    <div className={styles.weightCard}>
                      <span className={styles.weightLabel}>Developing Others</span>
                      <span className={styles.weightValue}>{dimensionWeights.developingOthers}%</span>
                    </div>
                  </div>
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
                        onChange={(e) => setNewEmployee({ ...newEmployee, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
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
                              {showKRAsView === employee._id ? 'Hide Dimensions' : 'View 4D Data'}
                            </button>
                            <div className={styles.editDeleteActions}>
                              <button
                                className={styles.editButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditEmployeeModal(employee);
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className={styles.deleteButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteConfirm(employee);
                                }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          {showKRAsView === employee._id && employeeKRAs[employee._id] && (
                            <div className={styles.krasView}>
                              {/* Finalize All KRAs Button */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                <div>
                                  {employeeKRAs[employee._id].krasFinalized ? (
                                    <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                      🔒 All KRAs Finalized
                                    </span>
                                  ) : (
                                    <span style={{ color: '#666' }}>
                                      KRAs pending finalization
                                    </span>
                                  )}
                                </div>
                                {!employeeKRAs[employee._id].krasFinalized && (
                                  <button
                                    onClick={() => handleFinalizeEmployeeKRAs(employee)}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      backgroundColor: '#FF9800',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      fontSize: '14px',
                                    }}
                                    type="button"
                                  >
                                    🔒 Finalize All KRAs
                                  </button>
                                )}
                              </div>
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

          {activeTab === 'my4DFunctional' && (
            <div className={baseStyles.tabContent}>
              <KRAEditorSelfServiceAny userId={localStorage.getItem('userId') || ''} activeDimension="functional" />
            </div>
          )}

          {activeTab === 'my4DOrganizational' && (
            <div className={baseStyles.tabContent}>
              <KRAEditorSelfServiceAny userId={localStorage.getItem('userId') || ''} activeDimension="organizational" />
            </div>
          )}

          {activeTab === 'my4DSelfDevelopment' && (
            <div className={baseStyles.tabContent}>
              <KRAEditorSelfServiceAny userId={localStorage.getItem('userId') || ''} activeDimension="selfDevelopment" />
            </div>
          )}

          {activeTab === 'my4DDevelopingOthers' && (
            <div className={baseStyles.tabContent}>
              <KRAEditorSelfServiceAny userId={localStorage.getItem('userId') || ''} activeDimension="developingOthers" />
            </div>
          )}


          {activeTab === 'settings' && (
            <div className={baseStyles.tabContent}>
              <h1 className={baseStyles.pageTitle}>Profile & Settings</h1>

              <ProfileEditor
                userId={localStorage.getItem('userId') || ''}
                onProfileUpdate={(p) => setUser({ name: p.name, email: p.email, mobile: p.mobile })}
              />

              <div style={{ marginTop: '2rem' }}>
                <DimensionWeightsEditor userId={localStorage.getItem('userId') || ''} />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={baseStyles.tabContent}>
              <NotificationsAny
                roleContext="manager"
                embedded
                onNavigateToResolvedRoute={(route: string) => {
                  if (route === '/dashboard/manager') {
                    setActiveTab('dashboard');
                    return true;
                  }
                  return false;
                }}
              />
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

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1001,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            background: notification.type === 'success' ? '#4CAF50' : '#f44336',
            color: 'white',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>
            {notification.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditEmployeeModal && editingEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={closeEditEmployeeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '450px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #eee',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#333' }}>Edit Team Member</h3>
              <button
                onClick={closeEditEmployeeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#999',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditEmployeeSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={editEmployeeForm.name}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editEmployeeForm.email}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>
                  Mobile
                </label>
                <input
                  type="tel"
                  value={editEmployeeForm.mobile}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  placeholder="10 digits"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#333' }}>
                  Designation/Role
                </label>
                <input
                  type="text"
                  value={editEmployeeForm.designation}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, designation: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeEditEmployeeModal}
                  disabled={isSubmittingEdit}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #ddd',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#666',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={closeDeleteConfirm}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#333' }}>Remove Team Member?</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{deletingEmployee.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={closeDeleteConfirm}
                disabled={isSubmittingEdit}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #ddd',
                  background: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={isSubmittingEdit}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  background: '#f44336',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {isSubmittingEdit ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerDashboard;
