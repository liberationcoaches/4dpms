import { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './ClientAdminDashboard.module.css';
import logo from '@/assets/logo.png';
import TeamMemberCard from '@/components/TeamMemberCard/TeamMemberCard';
import KRAForm, { FunctionalKRAFormData } from '@/components/KRAForm/KRAForm';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,   } from 'recharts';
import { DIMENSION_COLORS } from '@/utils/dimensionColors';
import { fetchUserProfile as fetchUserProfileApi } from '@/utils/userProfile';

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

interface Proof {
  type: 'drive_link' | 'file_upload';
  value: string;
  fileName?: string;
  uploadedAt: string;
}

function ClientAdminDashboard() {
  const navigate = useNavigate();
  const [bosses, setBosses] = useState<Boss[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUsers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateBossForm, setShowCreateBossForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bosses' | 'users' | 'roles' | 'settings'>('dashboard');
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
  const [analytics, setAnalytics] = useState<any>(null);
  const [showProofDialog, setShowProofDialog] = useState<{ bossId: string; kraIndex: number; isOpen: boolean }>({
    bossId: '',
    kraIndex: -1,
    isOpen: false,
  });
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });
  const [sortPeriod, setSortPeriod] = useState('Last week');
  const [dimensionWeights, setDimensionWeights] = useState({
    functional: 0,
    organizational: 0,
    selfDevelopment: 0,
    developingOthers: 0,
  });
  const [weightsErrors, setWeightsErrors] = useState<string>('');
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightsSuccessMessage, setWeightsSuccessMessage] = useState('');
  const [expandedCard, setExpandedCard] = useState<'managers' | 'employees' | 'departments' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<'manager' | 'employee' | null>(null);
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [teamsForInvite, setTeamsForInvite] = useState<{ _id: string; name: string; code: string; managerName?: string }[]>([]);
  const [createdInvite, setCreatedInvite] = useState<{ link: string; code: string } | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [rolesFilterTab, setRolesFilterTab] = useState<'all' | 'boss' | 'manager' | 'employee'>('all');
  const [rolesSearchQuery, setRolesSearchQuery] = useState('');
  const [rolesSortBy, setRolesSortBy] = useState<'date' | 'name'>('date');
  const [addUserDropdownOpen, setAddUserDropdownOpen] = useState(false);
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [showAddCSVModal, setShowAddCSVModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const addUserDropdownRef = useRef<HTMLDivElement>(null);
  const inviteDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addUserDropdownRef.current && !addUserDropdownRef.current.contains(e.target as Node)) {
        setAddUserDropdownOpen(false);
      }
      if (inviteDropdownRef.current && !inviteDropdownRef.current.contains(e.target as Node)) {
        setInviteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    fetchAnalytics();
    fetchDimensionWeights();
  }, [navigate]);

  const fetchAnalytics = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/analytics?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchDimensionWeights = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/organizations/dimension-weights?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setDimensionWeights(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dimension weights:', error);
    }
  };

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

  const fetchTeamsForInvite = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/teams-for-invite?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setTeamsForInvite(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleCreateInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!organization?._id) return;
    if (inviteRole === 'employee' && !inviteTeamId) {
      alert('Select a team for Member invite.');
      return;
    }
    setIsCreatingInvite(true);
    setCreatedInvite(null);
    try {
      const userId = localStorage.getItem('userId');
      const body: { role: string; organizationId: string; teamId?: string } = {
        role: inviteRole!,
        organizationId: organization._id,
      };
      if (inviteRole === 'employee') body.teamId = inviteTeamId;
      const res = await fetch(`/api/invites?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success' && data.data) {
        const baseUrl = window.location.origin;
        const rawLink = data.data.link || '';
        const link = rawLink.startsWith('http') ? rawLink : (rawLink ? `${baseUrl}${rawLink}` : `${baseUrl}/join`);
        setCreatedInvite({
          link,
          code: data.data.code || '',
        });
      } else {
        alert(data.message || 'Failed to create invite');
      }
    } catch (error) {
      alert('Network error');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const openInviteModal = (role: 'manager' | 'employee') => {
    setInviteRole(role);
    setInviteTeamId('');
    setCreatedInvite(null);
    if (role === 'employee') fetchTeamsForInvite();
    setShowInviteModal(true);
  };

  const handleCSVUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      alert('Select a CSV file.');
      return;
    }
    setIsUploadingCSV(true);
    try {
      const csvText = await csvFile.text();
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/users/bulk-upload?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowAddCSVModal(false);
        setCsvFile(null);
        fetchBosses();
        fetchOrganizationUsers();
        alert(data.message || 'Users added.');
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setIsUploadingCSV(false);
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
        setShowAddManualModal(false);
        setNewBoss({ name: '', email: '', mobile: '' });
        fetchBosses();
        fetchOrganizationUsers();
        alert('Admin added.');
      } else {
        alert(data.message || 'Failed to create Admin');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleExportData = async (format: 'excel' | 'pdf' = 'excel') => {
    try {
      setIsExporting(true);
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/export?userId=${userId}&format=${format}`, {
        method: 'GET',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Failed to export data');
        setIsExporting(false);
        return;
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = format === 'pdf' ? 'Performance_Appraisal.pdf' : 'Performance_Appraisal.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsExporting(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
      setIsExporting(false);
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

  const [editingKRAIndex, setEditingKRAIndex] = useState<number | null>(null);

  const handleAddKRA = async (formData?: FunctionalKRAFormData) => {
    if (!selectedBoss) return;

    try {
      const userId = localStorage.getItem('userId');
      
      // Check if we're editing an existing KRA
      if (editingKRAIndex !== null && kraType === 'functional') {
        // Update existing KRA using client-admin endpoint
        const requestData = formData
          ? {
              kra: formData.kra,
              kpis: formData.kpis,
              reportsGenerated: formData.reportsGenerated || [],
              pilotWeight: formData.pilotWeight || 10,
              pilotScore: formData.pilotScore || 0,
            }
          : newKRA;

        const res = await fetch(`/api/client-admin/bosses/${selectedBoss._id}/kras/functional/${editingKRAIndex}?userId=${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        const data = await res.json();
        if (res.ok) {
          setShowKRAModal(false);
          setNewKRA({});
          setEditingKRAIndex(null);
          fetchBossKRAs(selectedBoss._id);
          alert('KRA updated.');
        } else {
          alert(data.message || 'Failed to update KRA');
        }
      } else {
        // Add new KRA
        const endpoint = `/api/client-admin/bosses/${selectedBoss._id}/kras/${kraType}`;
        
        const requestData = kraType === 'functional' && formData
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
          body: JSON.stringify(requestData),
        });

        const data = await res.json();
        if (res.ok) {
          setShowKRAModal(false);
          setNewKRA({});
          setEditingKRAIndex(null);
          fetchBossKRAs(selectedBoss._id);
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

  const rolesDisplayUsers = useMemo(() => {
    if (!organizationUsers) return [];
    const all = [
      ...organizationUsers.bosses.map((u: any) => ({ ...u, roleLabel: 'Admin', roleKey: 'boss' })),
      ...organizationUsers.managers.map((u: any) => ({ ...u, roleLabel: 'Supervisor', roleKey: 'manager' })),
      ...organizationUsers.employees.map((u: any) => ({ ...u, roleLabel: 'Member', roleKey: 'employee' })),
    ];
    let filtered = all;
    if (rolesFilterTab !== 'all') {
      filtered = all.filter((u) => u.roleKey === rolesFilterTab);
    }
    if (rolesSearchQuery.trim()) {
      const q = rolesSearchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.mobile?.includes(q)
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      if (rolesSortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return sorted;
  }, [organizationUsers, rolesFilterTab, rolesSearchQuery, rolesSortBy]);

  const handleWeightChange = (dimension: keyof typeof dimensionWeights, value: number) => {
    const numValue = Math.round(Math.max(0, Math.min(100, value)));
    setDimensionWeights((prev) => ({ ...prev, [dimension]: numValue }));
    setWeightsErrors('');
    setWeightsSuccessMessage('');
  };

  const handleSaveWeights = async (e: FormEvent) => {
    e.preventDefault();
    setWeightsErrors('');
    setWeightsSuccessMessage('');

    // Calculate total
    const total = dimensionWeights.functional + dimensionWeights.organizational + 
                  dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;

    // Validate sum is 100%
    if (total !== 100) {
      setWeightsErrors(`Weights must sum to 100%. Current sum: ${total}%`);
      return;
    }

    // Validate first 3 dimensions are mandatory (> 0)
    if (dimensionWeights.functional <= 0 || dimensionWeights.organizational <= 0 || 
        dimensionWeights.selfDevelopment <= 0) {
      setWeightsErrors('Functional, Organizational, and Self Development dimensions must have weights greater than 0%');
      return;
    }

    setIsSavingWeights(true);
    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/organizations/dimension-weights?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dimensionWeights),
      });

      const data = await response.json();

      if (response.ok) {
        setWeightsSuccessMessage('Weights saved. Applied org-wide.');
        setTimeout(() => setWeightsSuccessMessage(''), 5000);
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

  const handleAddProof = async (bossId: string, kraIndex: number, proof: Proof) => {
    if (!bossKRAs[bossId] || !bossKRAs[bossId].functionalKRAs) return;

    const kra = bossKRAs[bossId].functionalKRAs[kraIndex];
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
      // Find boss to get their team and member index
      const boss = bosses.find(b => b._id === bossId);
      if (!boss) return;

      // Fetch team to find member index
      const teamRes = await fetch(`/api/team/members?userId=${userId}`);
      const teamData = await teamRes.json();
      if (teamData.status === 'success' && teamData.data) {
        const memberIndex = teamData.data.findIndex((m: any) => m.mobile === boss.mobile);
        if (memberIndex !== -1) {
          const updateRes = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportsGenerated: updatedProofs }),
          });

          const updateData = await updateRes.json();
          if (updateRes.ok) {
            // Refresh boss KRAs
            fetchBossKRAs(bossId);
            setShowProofDialog({ bossId: '', kraIndex: -1, isOpen: false });
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bossId: string, kraIndex: number) => {
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
        handleAddProof(bossId, kraIndex, newProof);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleAddDriveLink = (bossId: string, kraIndex: number) => {
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
    handleAddProof(bossId, kraIndex, newProof);
  };

  // Helper to get member index for a boss in their team

  // Handle editing a KRA
  const handleEditKRA = async (boss: Boss, kraIndex: number) => {
    const kra = bossKRAs[boss._id]?.functionalKRAs?.[kraIndex];
    if (!kra) return;

    // Check if already edited once or locked
    if ((kra.editCount || 0) >= 1) {
      alert('This KRA can only be edited once. It has already been edited.');
      return;
    }
    if (kra.isScoreLocked) {
      alert('This KRA has been finalized and cannot be edited.');
      return;
    }

    // Set up edit mode
    setSelectedBoss(boss);
    setEditingKRAIndex(kraIndex);
    setShowKRAModal(true);
    setKraType('functional');
    // Set existing KRA data for editing - convert to form data format
    const kpis = Array.isArray(kra.kpis) ? kra.kpis : (kra.kpis ? [{ kpi: String(kra.kpis), target: '' }] : []);
    setNewKRA({
      kra: kra.kra,
      kpis: kpis,
      reportsGenerated: kra.reportsGenerated || [],
      pilotWeight: kra.pilotWeight || 10,
      pilotScore: kra.pilotScore || 0,
    });
  };

  // Handle deleting a KRA
  const handleDeleteKRA = async (boss: Boss, kraIndex: number) => {
    const kra = bossKRAs[boss._id]?.functionalKRAs?.[kraIndex];
    if (!kra) return;

    if (kra.isScoreLocked) {
      alert('Cannot delete a finalized KRA.');
      return;
    }

    if (!confirm('Are you sure you want to delete this KRA? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/bosses/${boss._id}/kras/functional/${kraIndex}?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchBossKRAs(boss._id);
        alert('KRA deleted.');
      } else {
        alert(data.message || 'Failed to delete KRA');
      }
    } catch (error) {
      console.error('Error deleting KRA:', error);
      alert('Failed to delete KRA');
    }
  };

  // Handle locking/finalizing KRA scores
  const handleLockKRAScores = async (boss: Boss, kraIndex: number) => {
    const kra = bossKRAs[boss._id]?.functionalKRAs?.[kraIndex];
    if (!kra) return;

    if (kra.isScoreLocked) {
      alert('This KRA is already finalized.');
      return;
    }

    if (!confirm('Are you sure you want to finalize these scores? Once locked, scores cannot be modified.')) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/client-admin/bosses/${boss._id}/kras/functional/${kraIndex}/lock?userId=${userId}`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchBossKRAs(boss._id);
        alert('Scores finalized & locked.');
      } else {
        alert(data.message || 'Failed to lock KRA scores');
      }
    } catch (error) {
      console.error('Error locking KRA scores:', error);
      alert('Failed to lock KRA scores');
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
                <span>Admins</span>
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

              <button
                className={`${baseStyles.menuItem} ${activeTab === 'roles' ? baseStyles.menuItemActive : ''}`}
                onClick={() => { setActiveTab('roles'); setShowMenu(false); }}
              >
                <svg className={baseStyles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Roles & Invites</span>
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
              {/* Header with Sort and Actions */}
              <div className={styles.dashboardHeader}>
                <div className={styles.headerLeft}>
                  <h1 className={styles.dashboardTitle}>
                    {organization?.name || 'Organization'} Performance Dashboard
                  </h1>
                  <p className={styles.welcomeText}>Welcome back, {user?.name || 'Admin'}</p>
                </div>
                <div className={styles.headerRight}>
                  <div className={styles.sortContainer}>
                    <label>Sort:</label>
                    <select 
                      value={sortPeriod} 
                      onChange={(e) => setSortPeriod(e.target.value)}
                      className={styles.sortSelect}
                    >
                      <option>Last week</option>
                      <option>Last month</option>
                      <option>Last quarter</option>
                      <option>Last year</option>
                    </select>
                  </div>
                  <button className={styles.actionButton}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Tier
                  </button>
                  <button className={styles.actionButton} onClick={() => setShowCreateBossForm(!showCreateBossForm)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <circle cx="16" cy="7" r="4"></circle>
                    </svg>
                    Add People
                  </button>
                  <button 
                    className={styles.actionButton} 
                    onClick={() => handleExportData('pdf')}
                    disabled={isExporting}
                    style={{ opacity: isExporting ? 0.6 : 1, cursor: isExporting ? 'not-allowed' : 'pointer' }}
                    title="Export to PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                  </button>
                </div>
              </div>

              {/* Top Section: 4D Index and Area Chart */}
              <div className={styles.topSection}>
                {/* 4D Index Card */}
                {analytics && (
                  <div className={styles.fourDIndexCard}>
                    <div className={styles.cardHeader}>
                      <h2>{organization?.name || 'Organization'} 4D Index</h2>
                      <button className={styles.cardMenuButton}>⋯</button>
                    </div>
                    <div className={styles.fourDIndexContent}>
                      <div className={styles.dimensionLegend}>
                        <h3>{analytics.departmentComparisons && analytics.departmentComparisons.length > 0 ? 'Departments' : '4 Dimensions'}</h3>
                        {analytics.departmentComparisons && analytics.departmentComparisons.length > 0 ? (
                          analytics.departmentComparisons.map((dept: any, index: number) => {
                            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
                            return (
                              <div key={dept.bossId} className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ backgroundColor: colors[index % colors.length] }}></span>
                                <span>{dept.departmentName} ({dept.fourDIndex}%)</span>
                              </div>
                            );
                          })
                        ) : (
                          <>
                            <div className={styles.legendItem}>
                              <span className={styles.legendDot} style={{ backgroundColor: '#4CAF50' }}></span>
                              <span>Functional</span>
                            </div>
                            <div className={styles.legendItem}>
                              <span className={styles.legendDot} style={{ backgroundColor: '#2196F3' }}></span>
                              <span>Organizational</span>
                            </div>
                            <div className={styles.legendItem}>
                              <span className={styles.legendDot} style={{ backgroundColor: '#FF9800' }}></span>
                              <span>Self Development</span>
                            </div>
                            <div className={styles.legendItem}>
                              <span className={styles.legendDot} style={{ backgroundColor: '#F44336' }}></span>
                              <span>Developing Others</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className={styles.donutChartContainer}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                                ? analytics.departmentComparisons.map((dept: any, index: number) => {
                                    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
                                    return {
                                      name: dept.departmentName.length > 6 ? dept.departmentName.substring(0, 6) : dept.departmentName,
                                      fullName: dept.departmentName,
                                      value: dept.fourDIndex,
                                      color: colors[index % colors.length],
                                    };
                                  })
                                : [
                                    { name: 'Functional', value: analytics.fourDIndex.dimensions.functional, color: '#4CAF50' },
                                    { name: 'Organizational', value: analytics.fourDIndex.dimensions.organizational, color: '#2196F3' },
                                    { name: 'Self Development', value: analytics.fourDIndex.dimensions.selfDevelopment, color: '#FF9800' },
                                    { name: 'Developing Others', value: analytics.fourDIndex.dimensions.developingOthers, color: '#F44336' },
                                  ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              label={false}
                            >
                              {(analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                                ? analytics.departmentComparisons.map((_dept: any, index: number) => {
                                    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
                                    return { color: colors[index % colors.length] };
                                  })
                                : [
                                    { color: '#4CAF50' },
                                    { color: '#2196F3' },
                                    { color: '#FF9800' },
                                    { color: '#F44336' },
                                  ]
                              ).map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.donutCenter}>
                          <div className={styles.indexValue}>{analytics.fourDIndex.overall}%</div>
                          <div className={styles.indexChange}>
                            {analytics.fourDIndex.change > 0 ? '+' : ''}{analytics.fourDIndex.change}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Area Chart Card */}
                {analytics && (
                  <div className={styles.areaChartCard}>
                    <h2>Department Performance Comparison</h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart 
                        data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                          ? analytics.departmentComparisons.map((dept: any) => ({
                              department: dept.departmentName,
                              functional: dept.dimensions.functional,
                              organizational: dept.dimensions.organizational,
                              selfDevelopment: dept.dimensions.selfDevelopment,
                              developingOthers: dept.dimensions.developingOthers,
                              fourDIndex: dept.fourDIndex,
                            }))
                          : analytics.trends
                        }
                      >
                        <defs>
                          <linearGradient id="colorFunctional" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOrganizational" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#2196F3" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSelfDev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF9800" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#FF9800" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDeveloping" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F44336" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F44336" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={analytics.departmentComparisons && analytics.departmentComparisons.length > 0 ? "department" : "period"} />
                        <YAxis />
                        <Tooltip />
                        {analytics.departmentComparisons && analytics.departmentComparisons.length > 0 ? (
                          <>
                            <Area type="monotone" dataKey="functional" stackId="1" stroke="#4CAF50" fill="url(#colorFunctional)" />
                            <Area type="monotone" dataKey="organizational" stackId="1" stroke="#2196F3" fill="url(#colorOrganizational)" />
                            <Area type="monotone" dataKey="selfDevelopment" stackId="1" stroke="#FF9800" fill="url(#colorSelfDev)" />
                            <Area type="monotone" dataKey="developingOthers" stackId="1" stroke="#F44336" fill="url(#colorDeveloping)" />
                          </>
                        ) : (
                          <>
                            <Area type="monotone" dataKey="functional" stackId="1" stroke="#4CAF50" fill="url(#colorFunctional)" />
                            <Area type="monotone" dataKey="organizational" stackId="1" stroke="#2196F3" fill="url(#colorOrganizational)" />
                            <Area type="monotone" dataKey="selfDevelopment" stackId="1" stroke="#FF9800" fill="url(#colorSelfDev)" />
                            <Area type="monotone" dataKey="developingOthers" stackId="1" stroke="#F44336" fill="url(#colorDeveloping)" />
                          </>
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Summary Cards Row */}
              {analytics && (
                <div className={styles.summaryCardsRow}>
                  {/* Managers Card */}
                  <div className={`${styles.summaryCard} ${expandedCard === 'managers' ? styles.summaryCardExpanded : ''}`}>
                    <div 
                      className={styles.summaryCardHeader}
                      onClick={() => setExpandedCard(expandedCard === 'managers' ? null : 'managers')}
                    >
                      <div>
                        <h3>Supervisors</h3>
                        <div className={styles.summaryValue}>{analytics.summary.managers}</div>
                      </div>
                      <div className={styles.summaryIcon}>
                        {expandedCard === 'managers' ? '−' : '+'}
                      </div>
                    </div>
                    {expandedCard === 'managers' && (
                      <div className={styles.summaryCardContent}>
                        {organizationUsers && organizationUsers.managers.length > 0 ? (
                          <div className={styles.summaryCardList}>
                            {organizationUsers.managers.map((manager) => (
                              <div key={manager._id} className={styles.summaryCardItem}>
                                <div className={styles.summaryCardItemName}>{manager.name}</div>
                                <div className={styles.summaryCardItemEmail}>{manager.email}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.summaryCardEmpty}>No Supervisors found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Members Card */}
                  <div className={`${styles.summaryCard} ${expandedCard === 'employees' ? styles.summaryCardExpanded : ''}`}>
                    <div 
                      className={styles.summaryCardHeader}
                      onClick={() => setExpandedCard(expandedCard === 'employees' ? null : 'employees')}
                    >
                      <div>
                        <h3>Members</h3>
                        <div className={styles.summaryValue}>{analytics.summary.employees}</div>
                      </div>
                      <div className={styles.summaryIcon}>
                        {expandedCard === 'employees' ? '−' : '+'}
                      </div>
                    </div>
                    {expandedCard === 'employees' && (
                      <div className={styles.summaryCardContent}>
                        {organizationUsers && organizationUsers.employees.length > 0 ? (
                          <div className={styles.summaryCardList}>
                            {organizationUsers.employees.map((employee) => (
                              <div key={employee._id} className={styles.summaryCardItem}>
                                <div className={styles.summaryCardItemName}>{employee.name}</div>
                                <div className={styles.summaryCardItemEmail}>{employee.email}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.summaryCardEmpty}>No Members found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Departments Card */}
                  <div className={`${styles.summaryCard} ${expandedCard === 'departments' ? styles.summaryCardExpanded : ''}`}>
                    <div 
                      className={styles.summaryCardHeader}
                      onClick={() => setExpandedCard(expandedCard === 'departments' ? null : 'departments')}
                    >
                      <div>
                        <h3>Departments</h3>
                        <div className={styles.summaryValue}>{analytics.summary.departments}</div>
                      </div>
                      <div className={styles.summaryIcon}>
                        {expandedCard === 'departments' ? '−' : '+'}
                      </div>
                    </div>
                    {expandedCard === 'departments' && (
                      <div className={styles.summaryCardContent}>
                        {organizationUsers && organizationUsers.bosses.length > 0 ? (
                          <div className={styles.summaryCardList}>
                            {organizationUsers.bosses.map((boss) => (
                              <div key={boss._id} className={styles.summaryCardItem}>
                                <div className={styles.summaryCardItemName}>{boss.name}</div>
                                <div className={styles.summaryCardItemEmail}>{boss.email}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.summaryCardEmpty}>No departments found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Top Performers and Dimensions Section */}
              {analytics && (
                <div className={styles.topPerformersAndDimensions}>
                  {/* Top Performers Section */}
                  {analytics.topPerformers.length > 0 && (
                    <div className={styles.topPerformersCard}>
                      <h2>Top Performers</h2>
                      <div className={styles.performersScrollable}>
                        {analytics.topPerformers.map((performer: any) => (
                          <div key={performer.rank} className={styles.performerItem}>
                            <div className={styles.performerAvatar}>
                              {performer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className={styles.performerInfo}>
                              <div className={styles.performerName}>{performer.name}</div>
                              <div className={styles.performerRank}>Rank {performer.rank}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dimension Cards */}
                  <div className={styles.dimensionsGrid}>
                  {/* Functional */}
                  <div className={styles.dimensionCard} style={{ borderLeft: '4px solid #4CAF50' }}>
                    <div className={styles.dimensionHeader}>
                      <h3>Functional - Department Comparison</h3>
                      <div className={styles.dimensionScore}>{analytics.dimensions.functional.score}%</div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart 
                        data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                          ? analytics.departmentComparisons.map((dept: any) => ({
                              name: dept.departmentName.length > 10 ? dept.departmentName.substring(0, 10) : dept.departmentName,
                              value: dept.dimensions.functional || 0,
                            }))
                          : analytics.dimensions.functional.items.map((item: any, idx: number) => ({ name: `0${idx}`, value: item.score }))
                        }
                      >
                        <Bar dataKey="value" fill="#4CAF50" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className={styles.dimensionItems}>
                      {analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                        ? analytics.departmentComparisons.map((dept: any) => (
                            <div key={dept.bossId} className={styles.dimensionItem}>
                              <span>{dept.departmentName}</span>
                              <span>{dept.dimensions.functional || 0}%</span>
                            </div>
                          ))
                        : analytics.dimensions.functional.items.map((item: any, idx: number) => (
                            <div key={idx} className={styles.dimensionItem}>
                              <span>{item.title}</span>
                              <span>{item.score}%</span>
                            </div>
                          ))
                      }
                    </div>
                  </div>

                  {/* Organizational */}
                  <div className={styles.dimensionCard} style={{ borderLeft: '4px solid #2196F3' }}>
                    <div className={styles.dimensionHeader}>
                      <h3>Organizational - Department Comparison</h3>
                      <div className={styles.dimensionScore}>{analytics.dimensions.organizational.score}%</div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart 
                        data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                          ? analytics.departmentComparisons.map((dept: any) => ({
                              name: dept.departmentName.length > 10 ? dept.departmentName.substring(0, 10) : dept.departmentName,
                              value: dept.dimensions.organizational || 0,
                            }))
                          : analytics.dimensions.organizational.items.map((item: any, idx: number) => ({ name: `0${idx}`, value: item.score }))
                        }
                      >
                        <Bar dataKey="value" fill="#2196F3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className={styles.dimensionItems}>
                      {analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                        ? analytics.departmentComparisons.map((dept: any) => (
                            <div key={dept.bossId} className={styles.dimensionItem}>
                              <span>{dept.departmentName}</span>
                              <span>{dept.dimensions.organizational || 0}%</span>
                            </div>
                          ))
                        : analytics.dimensions.organizational.items.map((item: any, idx: number) => (
                            <div key={idx} className={styles.dimensionItem}>
                              <span>{item.title}</span>
                              <span>{item.score}%</span>
                            </div>
                          ))
                      }
                    </div>
                  </div>

                  {/* Self Development */}
                  <div className={styles.dimensionCard} style={{ borderLeft: '4px solid #FF9800' }}>
                    <div className={styles.dimensionHeader}>
                      <h3>Self Development - Department Comparison</h3>
                      <div className={styles.dimensionScore}>{analytics.dimensions.selfDevelopment.score}%</div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart 
                        data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                          ? analytics.departmentComparisons.map((dept: any) => ({
                              name: dept.departmentName.length > 10 ? dept.departmentName.substring(0, 10) : dept.departmentName,
                              value: dept.dimensions.selfDevelopment || 0,
                            }))
                          : analytics.dimensions.selfDevelopment.items.map((item: any, idx: number) => ({ name: `0${idx}`, value: item.score }))
                        }
                      >
                        <Bar dataKey="value" fill="#FF9800" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className={styles.dimensionItems}>
                      {analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                        ? analytics.departmentComparisons.map((dept: any) => (
                            <div key={dept.bossId} className={styles.dimensionItem}>
                              <span>{dept.departmentName}</span>
                              <span>{dept.dimensions.selfDevelopment || 0}%</span>
                            </div>
                          ))
                        : analytics.dimensions.selfDevelopment.items.map((item: any, idx: number) => (
                            <div key={idx} className={styles.dimensionItem}>
                              <span>{item.title}</span>
                              <span>{item.score}%</span>
                            </div>
                          ))
                      }
                    </div>
                  </div>

                  {/* Developing Others */}
                  <div className={styles.dimensionCard} style={{ borderLeft: '4px solid #F44336' }}>
                    <div className={styles.dimensionHeader}>
                      <h3>Developing Others - Department Comparison</h3>
                      <div className={styles.dimensionScore}>{analytics.dimensions.developingOthers.score}%</div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart 
                        data={analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                          ? analytics.departmentComparisons.map((dept: any) => ({
                              name: dept.departmentName.length > 10 ? dept.departmentName.substring(0, 10) : dept.departmentName,
                              value: dept.dimensions.developingOthers || 0,
                            }))
                          : analytics.dimensions.developingOthers.items.map((item: any, idx: number) => ({ name: `0${idx}`, value: item.score }))
                        }
                      >
                        <Bar dataKey="value" fill="#F44336" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className={styles.dimensionItems}>
                      {analytics.departmentComparisons && analytics.departmentComparisons.length > 0
                        ? analytics.departmentComparisons.map((dept: any) => (
                            <div key={dept.bossId} className={styles.dimensionItem}>
                              <span>{dept.departmentName}</span>
                              <span>{dept.dimensions.developingOthers || 0}%</span>
                            </div>
                          ))
                        : analytics.dimensions.developingOthers.items.map((item: any, idx: number) => (
                            <div key={idx} className={styles.dimensionItem}>
                              <span>{item.title}</span>
                              <span>{item.score}%</span>
                            </div>
                          ))
                      }
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* Create Admin Form (shown when button clicked) */}
              {showCreateBossForm && (
                <div className={styles.createForm}>
                  <h2>Create New Admin</h2>
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
                        onChange={(e) => setNewBoss({ ...newBoss, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Admin
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bosses' && (
            <div className={styles.tabContent}>
              <div className={styles.pageHeader}>
                <h1>Admins</h1>
                <button
                  className={styles.createButton}
                  onClick={() => setShowCreateBossForm(!showCreateBossForm)}
                >
                  {showCreateBossForm ? 'Cancel' : '+ Create Admin'}
                </button>
              </div>

              {showCreateBossForm && (
                <div className={styles.createForm}>
                  <h2>Create New Admin</h2>
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
                        onChange={(e) => setNewBoss({ ...newBoss, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                        placeholder="10 digits"
                        required
                      />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                      Create Admin
                    </button>
                  </form>
                </div>
              )}

              {bosses.length === 0 ? (
                <p className={styles.empty}>No Admins found. Create one to get started.</p>
              ) : (
                <div className={styles.bossesGrid}>
                  {bosses.map((boss) => (
                    <TeamMemberCard
                      key={boss._id}
                      name={boss.name}
                      email={boss.email}
                      mobile={boss.mobile}
                      createdAt={boss.createdAt}
                      buttonText=""
                    >
                      <div className={styles.bossActions}>
                        <button
                          className={styles.bossActionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('functional');
                          }}
                        >
                          Add Functional KRA
                        </button>
                        <button
                          className={styles.bossActionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('organizational');
                          }}
                        >
                          Add Core Value
                        </button>
                        <button
                          className={styles.bossActionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoss(boss);
                            setShowKRAModal(true);
                            setKraType('self-development');
                          }}
                        >
                          Add Area of Concern
                        </button>
                        <button
                          className={styles.bossActionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (showKRAsView === boss._id) {
                              setShowKRAsView(null);
                            } else {
                              setShowKRAsView(boss._id);
                              fetchBossKRAs(boss._id);
                            }
                          }}
                        >
                          {showKRAsView === boss._id ? 'Hide Dimensions' : 'View Dimensions'}
                        </button>
                      </div>
                      {showKRAsView === boss._id && bossKRAs[boss._id] && (
                        <div className={styles.krasView}>
                          <h4>Functional KRAs</h4>
                          {bossKRAs[boss._id].functionalKRAs?.length > 0 ? (
                            bossKRAs[boss._id].functionalKRAs.map((kra: any, idx: number) => (
                              <div key={idx} style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '8px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <h5 style={{ marginTop: 0, marginBottom: 0, flex: 1 }}>{kra.kra}</h5>
                                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                    {/* Lock Status Badge */}
                                    {kra.isScoreLocked && (
                                      <span style={{ 
                                        padding: '0.25rem 0.5rem', 
                                        backgroundColor: '#4CAF50', 
                                        color: 'white', 
                                        borderRadius: '4px', 
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}>
                                        🔒 Finalized
                                      </span>
                                    )}
                                    {/* Edit Button */}
                                    {!kra.isScoreLocked && (kra.editCount || 0) < 1 && (
                                      <button
                                        onClick={() => handleEditKRA(boss, idx)}
                                        style={{
                                          padding: '0.25rem 0.75rem',
                                          backgroundColor: '#2196F3',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                        }}
                                        type="button"
                                      >
                                        ✏️ Edit
                                      </button>
                                    )}
                                    {/* Delete Button */}
                                    {!kra.isScoreLocked && (
                                      <button
                                        onClick={() => handleDeleteKRA(boss, idx)}
                                        style={{
                                          padding: '0.25rem 0.75rem',
                                          backgroundColor: '#f44336',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                        }}
                                        type="button"
                                      >
                                        🗑️ Delete
                                      </button>
                                    )}
                                    {/* Lock/Finalize Button */}
                                    {!kra.isScoreLocked && (
                                      <button
                                        onClick={() => handleLockKRAScores(boss, idx)}
                                        style={{
                                          padding: '0.25rem 0.75rem',
                                          backgroundColor: '#FF9800',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: 'bold'
                                        }}
                                        type="button"
                                      >
                                        🔒 Finalize
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
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
                                      setShowProofDialog({ bossId: boss._id, kraIndex: idx, isOpen: true });
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
                          {bossKRAs[boss._id].organizationalKRAs?.length > 0 ? (
                            <ul>
                              {bossKRAs[boss._id].organizationalKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.coreValues}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No core values added</p>
                          )}
                          <h4>Self Development (Areas of Concern)</h4>
                          {bossKRAs[boss._id].selfDevelopmentKRAs?.length > 0 ? (
                            <ul>
                              {bossKRAs[boss._id].selfDevelopmentKRAs.map((kra: any, idx: number) => (
                                <li key={idx}>{kra.areaOfConcern}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>No areas of concern added</p>
                          )}
                        </div>
                      )}
                    </TeamMemberCard>
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
                    <h2>Admins ({organizationUsers.bosses.length})</h2>
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
                    <h2>Supervisors ({organizationUsers.managers.length})</h2>
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
                    <h2>Members ({organizationUsers.employees.length})</h2>
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

          {activeTab === 'roles' && (
            <div className={styles.tabContent}>
              <h1 className={baseStyles.pageTitle} style={{ marginBottom: '1rem' }}>Roles & Permissions</h1>

              <div className={styles.rolesFilterTabs}>
                <button
                  type="button"
                  className={`${styles.rolesFilterTab} ${rolesFilterTab === 'all' ? styles.rolesFilterTabActive : ''}`}
                  onClick={() => setRolesFilterTab('all')}
                >
                  All users
                </button>
                <button
                  type="button"
                  className={`${styles.rolesFilterTab} ${rolesFilterTab === 'boss' ? styles.rolesFilterTabActive : ''}`}
                  onClick={() => setRolesFilterTab('boss')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className={`${styles.rolesFilterTab} ${rolesFilterTab === 'manager' ? styles.rolesFilterTabActive : ''}`}
                  onClick={() => setRolesFilterTab('manager')}
                >
                  Supervisor
                </button>
                <button
                  type="button"
                  className={`${styles.rolesFilterTab} ${rolesFilterTab === 'employee' ? styles.rolesFilterTabActive : ''}`}
                  onClick={() => setRolesFilterTab('employee')}
                >
                  Member
                </button>
              </div>

              <div className={styles.rolesToolbar}>
                <input
                  type="text"
                  className={styles.rolesSearch}
                  placeholder="Search users"
                  value={rolesSearchQuery}
                  onChange={(e) => setRolesSearchQuery(e.target.value)}
                />
                <select
                  className={styles.rolesSort}
                  value={rolesSortBy}
                  onChange={(e) => setRolesSortBy(e.target.value as 'date' | 'name')}
                >
                  <option value="date">Sort by date</option>
                  <option value="name">Sort by name</option>
                </select>
                <div className={styles.rolesActions}>
                  <div className={styles.rolesAddDropdown} ref={inviteDropdownRef}>
                    <button type="button" className={styles.rolesInviteBtn} onClick={() => setInviteDropdownOpen(!inviteDropdownOpen)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                      Invite new user
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {inviteDropdownOpen && (
                      <div className={styles.rolesAddMenu}>
                        <button type="button" className={styles.rolesAddMenuItem} onClick={() => { setInviteDropdownOpen(false); openInviteModal('manager'); }}>Invite Supervisor</button>
                        <button type="button" className={styles.rolesAddMenuItem} onClick={() => { setInviteDropdownOpen(false); openInviteModal('employee'); }}>Invite Member</button>
                      </div>
                    )}
                  </div>
                  <div className={styles.rolesAddDropdown} ref={addUserDropdownRef}>
                    <button
                      type="button"
                      className={styles.rolesAddBtn}
                      onClick={() => setAddUserDropdownOpen(!addUserDropdownOpen)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                      Add user
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    {addUserDropdownOpen && (
                      <div className={styles.rolesAddMenu}>
                        <button type="button" className={styles.rolesAddMenuItem} onClick={() => { setAddUserDropdownOpen(false); setShowAddManualModal(true); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Add manually
                        </button>
                        <button type="button" className={styles.rolesAddMenuItem} onClick={() => { setAddUserDropdownOpen(false); setShowAddCSVModal(true); }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                          Upload CSV (bulk)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.rolesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}><input type="checkbox" aria-label="Select all" /></th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Permissions</th>
                      <th>Date added</th>
                      <th></th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesDisplayUsers.map((u: any) => {
                      const isNew = u.createdAt && (Date.now() - new Date(u.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
                      const status = !u.isMobileVerified ? 'Pending' : u.isActive !== false ? 'Active' : 'Inactive';
                      const statusClass = status === 'Active' ? styles.rolesStatusActive : status === 'Pending' ? styles.rolesStatusPending : styles.rolesStatusInactive;
                      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                      return (
                        <tr key={u._id}>
                          <td><input type="checkbox" aria-label={`Select ${u.name}`} /></td>
                          <td>
                            <div className={styles.rolesUserCell}>
                              <div className={styles.rolesAvatar}>{getInitials(u.name || '')}</div>
                              <div className={styles.rolesUserInfo}>
                                <div className={styles.rolesUserName}>
                                  {u.name || '-'}
                                  {isNew && <span className={styles.rolesNewBadge}>New</span>}
                                </div>
                                <span className={styles.rolesUserEmail}>{u.email || '-'}</span>
                              </div>
                            </div>
                          </td>
                          <td><span className={`${styles.rolesStatusBadge} ${statusClass}`}>{status}</span></td>
                          <td className={styles.rolesPermission}>{u.roleLabel}</td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--color-main-grey-60)' }}>{dateStr}</td>
                          <td><a href="#" className={styles.rolesViewProfile} onClick={(e) => { e.preventDefault(); }}>View profile</a></td>
                          <td>
                            <button type="button" className={styles.rolesKebab} aria-label="More options">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rolesDisplayUsers.length === 0 && (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-main-grey-60)' }}>
                  No users found. Invite or add users to get started.
                </p>
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

              {/* Dimension Weights Section */}
              <div className={styles.dimensionWeightsSection}>
                <h2 className={baseStyles.pageTitle} style={{ marginTop: '2rem', marginBottom: '1rem' }}>Performance Dimension Weights</h2>
                <p className={styles.weightsDescription}>
                  Set dimension weights (%). First three required; Developing Others optional. Total = 100%. Applies org-wide.
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
                    <div className={baseStyles.errorText} role="alert" style={{ marginBottom: '1rem' }}>
                      {weightsErrors}
                    </div>
                  )}

                  {weightsSuccessMessage && (
                    <div className={baseStyles.successMessage} role="alert" style={{ marginBottom: '1rem' }}>
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
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && inviteRole && (
        <div className={styles.modalOverlay} onClick={() => { setShowInviteModal(false); setInviteRole(null); setCreatedInvite(null); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2>Invite {inviteRole === 'manager' ? 'Supervisor' : 'Member'}</h2>
              <button
                className={styles.closeButton}
                onClick={() => { setShowInviteModal(false); setInviteRole(null); setCreatedInvite(null); }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {!createdInvite ? (
                <form onSubmit={handleCreateInvite}>
                  {inviteRole === 'employee' && (
                    <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                      <label htmlFor="inviteTeam">Team *</label>
                      <select
                        id="inviteTeam"
                        className={baseStyles.input}
                        value={inviteTeamId}
                        onChange={(e) => setInviteTeamId(e.target.value)}
                        required={inviteRole === 'employee'}
                      >
                        <option value="">Select team</option>
                        {teamsForInvite.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name} {t.managerName ? `(${t.managerName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="submit" className={baseStyles.submitButton} disabled={isCreatingInvite}>
                      {isCreatingInvite ? 'Creating...' : 'Create invite'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInviteModal(false); setInviteRole(null); }}
                      style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ddd', padding: '0.5rem 1rem', borderRadius: '4px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p style={{ marginBottom: '0.75rem' }}>Share this link or code. They sign up without choosing a role.</p>
                  <div className={baseStyles.formGroup} style={{ marginBottom: '0.75rem' }}>
                    <label>Link</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" readOnly className={baseStyles.input} value={createdInvite.link} style={{ flex: 1 }} />
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(createdInvite.link); alert('Link copied.'); }}
                        className={baseStyles.submitButton}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                    <label>Code</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="text" readOnly className={baseStyles.input} value={createdInvite.code} style={{ flex: 1, fontFamily: 'monospace' }} />
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(createdInvite.code); alert('Code copied.'); }}
                        className={baseStyles.submitButton}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowInviteModal(false); setInviteRole(null); setCreatedInvite(null); }}
                    className={baseStyles.submitButton}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Manually Modal */}
      {showAddManualModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowAddManualModal(false); setNewBoss({ name: '', email: '', mobile: '' }); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2>Add Admin manually</h2>
              <button className={styles.closeButton} onClick={() => { setShowAddManualModal(false); setNewBoss({ name: '', email: '', mobile: '' }); }} aria-label="Close">×</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-main-grey-70)' }}>
                Add a new Administrator to your organization.
              </p>
              <form onSubmit={handleCreateBoss}>
                <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label htmlFor="addBossName">Name *</label>
                  <input id="addBossName" type="text" className={baseStyles.input} value={newBoss.name} onChange={(e) => setNewBoss((p) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label htmlFor="addBossEmail">Email *</label>
                  <input id="addBossEmail" type="email" className={baseStyles.input} value={newBoss.email} onChange={(e) => setNewBoss((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label htmlFor="addBossMobile">Mobile *</label>
                  <input id="addBossMobile" type="tel" className={baseStyles.input} value={newBoss.mobile} onChange={(e) => setNewBoss((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} placeholder="10 digits" required />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className={baseStyles.submitButton}>Add Admin</button>
                  <button type="button" onClick={() => { setShowAddManualModal(false); setNewBoss({ name: '', email: '', mobile: '' }); }} style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ddd', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add User CSV Modal */}
      {showAddCSVModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowAddCSVModal(false); setCsvFile(null); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2>Upload CSV (bulk add)</h2>
              <button className={styles.closeButton} onClick={() => { setShowAddCSVModal(false); setCsvFile(null); }} aria-label="Close">×</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-main-grey-70)' }}>
                Upload a CSV file with columns: name, email, mobile. Add Admins in bulk.
              </p>
              <form onSubmit={handleCSVUpload}>
                <div className={baseStyles.formGroup} style={{ marginBottom: '1rem' }}>
                  <label>CSV file</label>
                  <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="submit" className={baseStyles.submitButton} disabled={!csvFile || isUploadingCSV}>{isUploadingCSV ? 'Uploading...' : 'Upload'}</button>
                  <button type="button" onClick={() => { setShowAddCSVModal(false); setCsvFile(null); }} style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ddd', padding: '0.5rem 1rem', borderRadius: '4px' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* KRA Modal */}
      {showKRAModal && selectedBoss && (
        <div className={styles.modalOverlay} onClick={() => { setShowKRAModal(false); setEditingKRAIndex(null); setNewKRA({}); }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingKRAIndex !== null ? 'Edit' : 'Add'} {kraType === 'functional' ? 'Functional KRA' : kraType === 'organizational' ? 'Core Value' : 'Area of Concern'} for {selectedBoss.name}</h2>
              <button
                className={styles.closeButton}
                onClick={() => { setShowKRAModal(false); setEditingKRAIndex(null); setNewKRA({}); }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {kraType === 'functional' ? (
                <KRAForm
                  key={editingKRAIndex !== null ? `edit-${selectedBoss._id}-${editingKRAIndex}` : `add-${selectedBoss._id}`}
                  onSubmit={handleAddKRA}
                  onCancel={() => { setShowKRAModal(false); setEditingKRAIndex(null); setNewKRA({}); }}
                  mode={editingKRAIndex !== null ? "edit" : "add"}
                  initialData={editingKRAIndex !== null ? newKRA : undefined}
                />
              ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAddKRA();
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
                      onClick={() => { setShowKRAModal(false); setEditingKRAIndex(null); setNewKRA({}); }}
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
          onClick={() => setShowProofDialog({ bossId: '', kraIndex: -1, isOpen: false })}
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
                  onClick={() => handleAddDriveLink(showProofDialog.bossId, showProofDialog.kraIndex)}
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
                  onChange={(e) => handleFileUpload(e, showProofDialog.bossId, showProofDialog.kraIndex)}
                  style={{ marginBottom: '1rem' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProofDialog({ bossId: '', kraIndex: -1, isOpen: false })}
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

export default ClientAdminDashboard;

