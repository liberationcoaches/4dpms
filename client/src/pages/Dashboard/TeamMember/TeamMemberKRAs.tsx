import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './TeamMemberKRAs.module.css';
import { DIMENSION_COLORS } from '@/utils/dimensionColors';

type TabType = 'functional' | 'organizational' | 'selfDevelopment' | 'developingOthers';

interface KRA {
  _id?: string;
  kra: string;
  kpiTarget?: string;
  reportsGenerated?: string;
  pilotWeight?: number;
  pilotActualPerf?: string;
  r1Weight?: number;
  r1Score?: number;
  r1ActualPerf?: string;
  r2Weight?: number;
  r2Score?: number;
  r2ActualPerf?: string;
  r3Weight?: number;
  r3Score?: number;
  r3ActualPerf?: string;
  r4Weight?: number;
  r4Score?: number;
  r4ActualPerf?: string;
  averageScore?: number;
}

interface OrganizationalDimension {
  _id?: string;
  coreValue: string;
  pilotScore?: number;
  pilotCriticalIncident?: string;
  r1Score?: number;
  r1CriticalIncident?: string;
  r2Score?: number;
  r2CriticalIncident?: string;
  r3Score?: number;
  r3CriticalIncident?: string;
  r4Score?: number;
  r4CriticalIncident?: string;
  averageScore?: number;
}

interface SelfDevelopment {
  _id?: string;
  areaOfConcern: string;
  actionPlanInitiative?: string;
  pilotScore?: number;
  pilotReason?: string;
  r1Score?: number;
  r1Reason?: string;
  r2Score?: number;
  r2Reason?: string;
  r3Score?: number;
  r3Reason?: string;
  r4Score?: number;
  r4Reason?: string;
  averageScore?: number;
}

interface DevelopingOthers {
  _id?: string;
  person: string;
  areaOfDevelopment?: string;
  pilotScore?: number;
  pilotReason?: string;
  r1Score?: number;
  r1Reason?: string;
  r2Score?: number;
  r2Reason?: string;
  r3Score?: number;
  r3Reason?: string;
  r4Score?: number;
  r4Reason?: string;
  averageScore?: number;
}

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  mobile: string;
  kras?: KRA[];
  organizationalDimensions?: OrganizationalDimension[];
  selfDevelopments?: SelfDevelopment[];
  developingOthers?: DevelopingOthers[];
}

function TeamMemberKRAs() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('functional');
  const [showAddKRA, setShowAddKRA] = useState(false);
  const [newKRA, setNewKRA] = useState<Partial<KRA>>({
    kra: '',
    kpiTarget: '',
    reportsGenerated: '',
  });
  const [showAddOrganizational, setShowAddOrganizational] = useState(false);
  const [newOrganizational, setNewOrganizational] = useState<Partial<OrganizationalDimension>>({
    coreValue: '',
  });
  const [showAddSelfDevelopment, setShowAddSelfDevelopment] = useState(false);
  const [newSelfDevelopment, setNewSelfDevelopment] = useState<Partial<SelfDevelopment>>({
    areaOfConcern: '',
  });
  const [showAddDevelopingOthers, setShowAddDevelopingOthers] = useState(false);
  const [newDevelopingOthers, setNewDevelopingOthers] = useState<Partial<DevelopingOthers>>({
    person: '',
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dimensionWeights, setDimensionWeights] = useState<{
    functional: number;
    organizational: number;
    selfDevelopment: number;
    developingOthers: number;
  } | null>(null);
  const [isLoadingWeights, setIsLoadingWeights] = useState(true);

  // Show notification popup
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }

    // Parse memberId (format: teamId-index, e.g., "507f1f77bcf86cd799439011-0")
    // Get the last part after splitting by '-'
    const parts = memberId.split('-');
    let index: number;
    
    // Try to parse the last segment as index
    const lastPart = parts[parts.length - 1];
    index = parseInt(lastPart);
    
    if (isNaN(index) && parts.length > 1) {
      // If last part is not a number, try the second-to-last
      index = parseInt(parts[parts.length - 2]);
    }
    
    if (isNaN(index)) {
      console.error('Invalid memberId format:', memberId);
      setIsLoading(false);
      return;
    }

    const userId = localStorage.getItem('userId') || '';

    // Fetch dimension weights
    fetch(`/api/team/dimension-weights?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.data) {
          setDimensionWeights(data.data);
        }
        setIsLoadingWeights(false);
      })
      .catch((error) => {
        console.error('Failed to fetch dimension weights:', error);
        setIsLoadingWeights(false);
      });

    fetch(`/api/team/members?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.data && Array.isArray(data.data)) {
          const memberData = data.data[index];
          if (memberData) {
            setMember({
              ...memberData,
              kras: memberData.kras || memberData.functionalKRAs || [],
              organizationalDimensions: memberData.organizationalDimensions || memberData.organizationalKRAs || [],
              selfDevelopments: memberData.selfDevelopments || memberData.selfDevelopmentKRAs || [],
              developingOthers: memberData.developingOthers || memberData.developingOthersKRAs || [],
            });
          } else {
            console.error('Member not found at index:', index);
          }
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch member:', error);
        setIsLoading(false);
      });
  }, [memberId]);

  // Check if weights are configured (sum to 100%)
  const areWeightsConfigured = () => {
    if (!dimensionWeights) return false;
    const total = dimensionWeights.functional + dimensionWeights.organizational + 
                  dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;
    return total === 100;
  };

  const handleAddKRA = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKRA.kra?.trim() || !memberId) return;

    // Parse memberId to get index
    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/members/${memberIndex}/kras?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKRA),
      });

      const data = await response.json();
      if (response.ok && member) {
        const updatedKRAs = [...(member.kras || []), { ...data.data, _id: Date.now().toString() }];
        setMember({ ...member, kras: updatedKRAs });
        setNewKRA({ kra: '', kpiTarget: '', reportsGenerated: '' });
        setShowAddKRA(false);
        showNotification('KRA added successfully!');
      } else {
        console.error('Failed to add KRA:', data.message);
        showNotification(data.message || 'Failed to add KRA', 'error');
      }
    } catch (error) {
      console.error('Error adding KRA:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleUpdateKRA = async (kraId: string, field: keyof KRA, value: any) => {
    if (!member || !member.kras || !memberId) return;

    const kraIndex = member.kras.findIndex((k) => k._id === kraId);
    if (kraIndex === -1) return;

    // Parse memberId to get index
    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    // Handle numeric fields - don't send 0 if field is empty
    let updateValue = value;
    if (typeof value === 'number' && (isNaN(value) || value === 0)) {
      // For numeric fields, only send if it's a valid number > 0
      // Otherwise, we might want to clear it, but for now, keep the existing value
      const currentValue = member.kras[kraIndex][field];
      if (value === 0 && (field.includes('Weight') || field.includes('Score'))) {
        // Allow 0 for weights and scores, but handle empty string case
        updateValue = value;
      } else if (isNaN(value)) {
        return; // Don't update if invalid
      }
    }

    const updatedKRA = { ...member.kras[kraIndex], [field]: updateValue };
    
    // Recalculate average score if any R score changes
    if (['r1Score', 'r2Score', 'r3Score', 'r4Score'].includes(field)) {
      const scores = [updatedKRA.r1Score, updatedKRA.r2Score, updatedKRA.r3Score, updatedKRA.r4Score]
        .filter((s) => s !== undefined && s !== null && !isNaN(s) && s > 0) as number[];
      updatedKRA.averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    }

    // Optimistically update UI
    const updatedKRAs = [...member.kras];
    updatedKRAs[kraIndex] = updatedKRA;
    setMember({ ...member, kras: updatedKRAs });

    // Save to backend
    try {
      const response = await fetch(`/api/team/members/${memberIndex}/kras/${kraIndex}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updateValue }),
      });

      const data = await response.json();
      if (response.ok && data.data) {
        // Update with server response (includes recalculated average)
        updatedKRAs[kraIndex] = { ...data.data, _id: kraId };
        setMember({ ...member, kras: updatedKRAs });
      } else {
        // Revert on error
        setMember({ ...member, kras: member.kras });
        showNotification(data.message || 'Failed to update KRA', 'error');
      }
    } catch (error) {
      console.error('Error updating KRA:', error);
      // Revert on error
      setMember({ ...member, kras: member.kras });
      showNotification('Network error. Please try again.', 'error');
    }
  };

  // Handlers for Organizational Dimension
  const handleAddOrganizational = async (e: FormEvent) => {
    e.preventDefault();
    if (!newOrganizational.coreValue?.trim() || !memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/members/${memberIndex}/organizational?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrganizational),
      });

      const data = await response.json();
      if (response.ok && member) {
        const updated = [...(member.organizationalDimensions || []), { ...data.data, _id: Date.now().toString() }];
        setMember({ ...member, organizationalDimensions: updated });
        setNewOrganizational({ coreValue: '' });
        setShowAddOrganizational(false);
        showNotification('Organizational Dimension added successfully!');
      } else {
        showNotification(data.message || 'Failed to add Organizational Dimension', 'error');
      }
    } catch (error) {
      console.error('Error adding Organizational Dimension:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleUpdateOrganizational = async (dimensionId: string, field: keyof OrganizationalDimension, value: any) => {
    if (!member || !member.organizationalDimensions || !memberId) return;

    const dimensionIndex = member.organizationalDimensions.findIndex((d) => d._id === dimensionId);
    if (dimensionIndex === -1) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const updatedDimensions = [...member.organizationalDimensions];
    updatedDimensions[dimensionIndex] = { ...updatedDimensions[dimensionIndex], [field]: value };

    // Recalculate average if score changes
    if (['r1Score', 'r2Score', 'r3Score', 'r4Score'].includes(field)) {
      const scores = [
        updatedDimensions[dimensionIndex].r1Score,
        updatedDimensions[dimensionIndex].r2Score,
        updatedDimensions[dimensionIndex].r3Score,
        updatedDimensions[dimensionIndex].r4Score,
      ].filter((s) => s !== undefined && s !== null && s !== 0) as number[];
      updatedDimensions[dimensionIndex].averageScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    }

    setMember({ ...member, organizationalDimensions: updatedDimensions });

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/organizational/${dimensionIndex}?userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        }
      );

      const data = await response.json();
      if (response.ok && data.data) {
        updatedDimensions[dimensionIndex] = { ...data.data, _id: dimensionId };
        setMember({ ...member, organizationalDimensions: updatedDimensions });
      }
    } catch (error) {
      console.error('Error updating Organizational Dimension:', error);
      setMember({ ...member, organizationalDimensions: member.organizationalDimensions });
      showNotification('Failed to update Organizational Dimension', 'error');
    }
  };

  // Handlers for Self Development
  const handleAddSelfDevelopment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSelfDevelopment.areaOfConcern?.trim() || !memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/members/${memberIndex}/self-development?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSelfDevelopment),
      });

      const data = await response.json();
      if (response.ok && member) {
        const updated = [...(member.selfDevelopments || []), { ...data.data, _id: Date.now().toString() }];
        setMember({ ...member, selfDevelopments: updated });
        setNewSelfDevelopment({ areaOfConcern: '' });
        setShowAddSelfDevelopment(false);
        showNotification('Self Development added successfully!');
      } else {
        showNotification(data.message || 'Failed to add Self Development', 'error');
      }
    } catch (error) {
      console.error('Error adding Self Development:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleUpdateSelfDevelopment = async (developmentId: string, field: keyof SelfDevelopment, value: any) => {
    if (!member || !member.selfDevelopments || !memberId) return;

    const developmentIndex = member.selfDevelopments.findIndex((d) => d._id === developmentId);
    if (developmentIndex === -1) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const updatedDevelopments = [...member.selfDevelopments];
    updatedDevelopments[developmentIndex] = { ...updatedDevelopments[developmentIndex], [field]: value };

    // Recalculate average if score changes
    if (['r1Score', 'r2Score', 'r3Score', 'r4Score'].includes(field)) {
      const scores = [
        updatedDevelopments[developmentIndex].r1Score,
        updatedDevelopments[developmentIndex].r2Score,
        updatedDevelopments[developmentIndex].r3Score,
        updatedDevelopments[developmentIndex].r4Score,
      ].filter((s) => s !== undefined && s !== null && s !== 0) as number[];
      updatedDevelopments[developmentIndex].averageScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    }

    setMember({ ...member, selfDevelopments: updatedDevelopments });

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/self-development/${developmentIndex}?userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        }
      );

      const data = await response.json();
      if (response.ok && data.data) {
        updatedDevelopments[developmentIndex] = { ...data.data, _id: developmentId };
        setMember({ ...member, selfDevelopments: updatedDevelopments });
      }
    } catch (error) {
      console.error('Error updating Self Development:', error);
      setMember({ ...member, selfDevelopments: member.selfDevelopments });
      showNotification('Failed to update Self Development', 'error');
    }
  };

  // Handlers for Developing Others
  const handleAddDevelopingOthers = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDevelopingOthers.person?.trim() || !memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/members/${memberIndex}/developing-others?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevelopingOthers),
      });

      const data = await response.json();
      if (response.ok && member) {
        const updated = [...(member.developingOthers || []), { ...data.data, _id: Date.now().toString() }];
        setMember({ ...member, developingOthers: updated });
        setNewDevelopingOthers({ person: '' });
        setShowAddDevelopingOthers(false);
        showNotification('Developing Others added successfully!');
      } else {
        showNotification(data.message || 'Failed to add Developing Others', 'error');
      }
    } catch (error) {
      console.error('Error adding Developing Others:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleUpdateDevelopingOthers = async (developingId: string, field: keyof DevelopingOthers, value: any) => {
    if (!member || !member.developingOthers || !memberId) return;

    const developingIndex = member.developingOthers.findIndex((d) => d._id === developingId);
    if (developingIndex === -1) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const updatedDeveloping = [...member.developingOthers];
    updatedDeveloping[developingIndex] = { ...updatedDeveloping[developingIndex], [field]: value };

    // Recalculate average if score changes
    if (['r1Score', 'r2Score', 'r3Score', 'r4Score'].includes(field)) {
      const scores = [
        updatedDeveloping[developingIndex].r1Score,
        updatedDeveloping[developingIndex].r2Score,
        updatedDeveloping[developingIndex].r3Score,
        updatedDeveloping[developingIndex].r4Score,
      ].filter((s) => s !== undefined && s !== null && s !== 0) as number[];
      updatedDeveloping[developingIndex].averageScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    }

    setMember({ ...member, developingOthers: updatedDeveloping });

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/developing-others/${developingIndex}?userId=${userId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        }
      );

      const data = await response.json();
      if (response.ok && data.data) {
        updatedDeveloping[developingIndex] = { ...data.data, _id: developingId };
        setMember({ ...member, developingOthers: updatedDeveloping });
      }
    } catch (error) {
      console.error('Error updating Developing Others:', error);
      setMember({ ...member, developingOthers: member.developingOthers });
      showNotification('Failed to update Developing Others', 'error');
    }
  };

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!member) {
    return <div className={styles.container}>Team member not found</div>;
  }

  // Submit handler - saves all changes and shows notification, then navigates to dashboard
  const handleSubmit = async () => {
    showNotification('All changes saved successfully!');
    // Navigate to dashboard home after a short delay to show the notification
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className={styles.container}>
      {/* Notification Toast */}
      {notification && (
        <div className={`${styles.notification} ${styles[`notification${notification.type === 'success' ? 'Success' : 'Error'}`]}`}>
          <div className={styles.notificationContent}>
            <span className={styles.notificationIcon}>
              {notification.type === 'success' ? '✓' : '✕'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => {
          const userRole = localStorage.getItem('userRole');
          if (userRole === 'manager') {
            navigate('/dashboard/manager');
          } else {
            navigate('/dashboard');
          }
        }}>
          ← Back
        </button>
        <div>
          <h2 className={styles.memberName}>{member.name}</h2>
          <p className={styles.memberRole}>{member.role} • {member.mobile}</p>
        </div>
      </div>

      {/* Dimension Weights Warning */}
      {!isLoadingWeights && !areWeightsConfigured() && (
        <div className={styles.weightsWarning}>
          <div className={styles.warningIcon}>⚠️</div>
          <div className={styles.warningContent}>
            <strong>Dimension weights not configured</strong>
            <p>
              Please configure performance dimension weights in Settings before adding KRAs. 
              The weights must sum to 100%.
            </p>
            <button 
              className={styles.settingsButton}
              onClick={() => navigate('/dashboard/settings')}
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}

      {/* Dimension Weights Info */}
      {!isLoadingWeights && areWeightsConfigured() && dimensionWeights && (
        <div className={styles.weightsInfo}>
          <strong>Dimension Weights:</strong>
          <span>Functional: {dimensionWeights.functional}%</span>
          <span>Organizational: {dimensionWeights.organizational}%</span>
          <span>Self Development: {dimensionWeights.selfDevelopment}%</span>
          {dimensionWeights.developingOthers > 0 && (
            <span>Developing Others: {dimensionWeights.developingOthers}%</span>
          )}
        </div>
      )}

      <div className={styles.kraSection}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'functional' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('functional')}
            style={{
              borderBottomColor: activeTab === 'functional' ? DIMENSION_COLORS.functional.primary : 'transparent',
              color: activeTab === 'functional' ? DIMENSION_COLORS.functional.primary : 'var(--color-main-grey-60)',
              backgroundColor: activeTab === 'functional' ? DIMENSION_COLORS.functional.light : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'functional') {
                e.currentTarget.style.color = DIMENSION_COLORS.functional.primary;
                e.currentTarget.style.backgroundColor = DIMENSION_COLORS.functional.light;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'functional') {
                e.currentTarget.style.color = 'var(--color-main-grey-60)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Functional Dimension
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'organizational' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('organizational')}
            style={{
              borderBottomColor: activeTab === 'organizational' ? DIMENSION_COLORS.organizational.primary : 'transparent',
              color: activeTab === 'organizational' ? DIMENSION_COLORS.organizational.primary : 'var(--color-main-grey-60)',
              backgroundColor: activeTab === 'organizational' ? DIMENSION_COLORS.organizational.light : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'organizational') {
                e.currentTarget.style.color = DIMENSION_COLORS.organizational.primary;
                e.currentTarget.style.backgroundColor = DIMENSION_COLORS.organizational.light;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'organizational') {
                e.currentTarget.style.color = 'var(--color-main-grey-60)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Organizational Dimension
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'selfDevelopment' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('selfDevelopment')}
            style={{
              borderBottomColor: activeTab === 'selfDevelopment' ? DIMENSION_COLORS.selfDevelopment.primary : 'transparent',
              color: activeTab === 'selfDevelopment' ? DIMENSION_COLORS.selfDevelopment.primary : 'var(--color-main-grey-60)',
              backgroundColor: activeTab === 'selfDevelopment' ? DIMENSION_COLORS.selfDevelopment.light : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'selfDevelopment') {
                e.currentTarget.style.color = DIMENSION_COLORS.selfDevelopment.primary;
                e.currentTarget.style.backgroundColor = DIMENSION_COLORS.selfDevelopment.light;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'selfDevelopment') {
                e.currentTarget.style.color = 'var(--color-main-grey-60)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Self Development
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'developingOthers' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('developingOthers')}
            style={{
              borderBottomColor: activeTab === 'developingOthers' ? DIMENSION_COLORS.developingOthers.primary : 'transparent',
              color: activeTab === 'developingOthers' ? DIMENSION_COLORS.developingOthers.primary : 'var(--color-main-grey-60)',
              backgroundColor: activeTab === 'developingOthers' ? DIMENSION_COLORS.developingOthers.light : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'developingOthers') {
                e.currentTarget.style.color = DIMENSION_COLORS.developingOthers.primary;
                e.currentTarget.style.backgroundColor = DIMENSION_COLORS.developingOthers.light;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'developingOthers') {
                e.currentTarget.style.color = 'var(--color-main-grey-60)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            Developing Others
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'functional' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 style={{ color: DIMENSION_COLORS.functional.primary, borderLeft: `4px solid ${DIMENSION_COLORS.functional.primary}`, paddingLeft: 'var(--spacing-sm)' }}>
                Functional Dimension - Key Result Areas (KRAs)
              </h3>
              <button
                className={styles.addButton}
                onClick={() => {
                  if (!areWeightsConfigured()) {
                    showNotification('Please configure dimension weights in Settings first', 'error');
                    return;
                  }
                  setShowAddKRA(!showAddKRA);
                }}
                disabled={!areWeightsConfigured()}
              >
                + Add KRA
              </button>
            </div>

            {showAddKRA && (
              <form onSubmit={handleAddKRA} className={styles.addKRAForm}>
                <input
                  type="text"
                  placeholder="KRA Name *"
                  value={newKRA.kra || ''}
                  onChange={(e) => setNewKRA({ ...newKRA, kra: e.target.value })}
                  required
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="KPI (Target)"
                  value={newKRA.kpiTarget || ''}
                  onChange={(e) => setNewKRA({ ...newKRA, kpiTarget: e.target.value })}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Reports Generated"
                  value={newKRA.reportsGenerated || ''}
                  onChange={(e) => setNewKRA({ ...newKRA, reportsGenerated: e.target.value })}
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.saveButton}>
                    Add KRA
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddKRA(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

        <div className={styles.kraList}>
          {member.kras && member.kras.length > 0 ? (
            member.kras.map((kra) => (
              <div key={kra._id} className={styles.kraCard}>
                <div className={styles.kraHeader}>
                  <h4>{kra.kra}</h4>
                  <div className={styles.averageScore}>
                    Avg: {kra.averageScore?.toFixed(2) || 'N/A'}
                  </div>
                </div>

                <div className={styles.kraFields}>
                  <div className={styles.fieldRow}>
                    <label>KPI (Target)</label>
                    <input
                      type="text"
                      value={kra.kpiTarget || ''}
                      onChange={(e) => handleUpdateKRA(kra._id!, 'kpiTarget', e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label>Reports Generated</label>
                    <input
                      type="text"
                      value={kra.reportsGenerated || ''}
                      onChange={(e) => handleUpdateKRA(kra._id!, 'reportsGenerated', e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  {/* Pilot Period */}
                  <div className={styles.reviewPeriods}>
                    <h5>Pilot Period</h5>
                    <div className={styles.reviewPeriod}>
                      <div className={styles.reviewFields}>
                        <div>
                          <label>Weight</label>
                          <input
                            type="number"
                            value={kra.pilotWeight || ''}
                            onChange={(e) =>
                              handleUpdateKRA(kra._id!, 'pilotWeight', parseFloat(e.target.value) || 0)
                            }
                            className={styles.inputSmall}
                          />
                        </div>
                        <div className={styles.commentField}>
                          <label>Actual Perf/Comment</label>
                          <textarea
                            value={kra.pilotActualPerf || ''}
                            onChange={(e) => handleUpdateKRA(kra._id!, 'pilotActualPerf', e.target.value)}
                            className={styles.textarea}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Periods */}
                  <div className={styles.reviewPeriods}>
                    <h5>Review Periods</h5>
                    {['R1', 'R2', 'R3', 'R4'].map((period) => {
                      const weightKey = `${period.toLowerCase()}Weight` as keyof KRA;
                      const scoreKey = `${period.toLowerCase()}Score` as keyof KRA;
                      const perfKey = `${period.toLowerCase()}ActualPerf` as keyof KRA;

                      return (
                        <div key={period} className={styles.reviewPeriod}>
                          <h6>{period}</h6>
                          <div className={styles.reviewFields}>
                            <div>
                              <label>Weight</label>
                              <input
                                type="number"
                                value={kra[weightKey] || ''}
                                onChange={(e) =>
                                  handleUpdateKRA(kra._id!, weightKey, parseFloat(e.target.value) || 0)
                                }
                                className={styles.inputSmall}
                              />
                            </div>
                            <div>
                              <label>Score</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={kra[scoreKey] || ''}
                                onChange={(e) =>
                                  handleUpdateKRA(kra._id!, scoreKey, parseFloat(e.target.value) || 0)
                                }
                                className={styles.inputSmall}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Actual Perf/Comment</label>
                              <textarea
                                value={kra[perfKey] || ''}
                                onChange={(e) => handleUpdateKRA(kra._id!, perfKey, e.target.value)}
                                className={styles.textarea}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              No KRAs added yet. Click "Add KRA" to start.
            </div>
          )}
        </div>
            <div className={styles.submitSection}>
              <button className={styles.submitButton} onClick={handleSubmit}>
                Submit Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'organizational' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 style={{ color: DIMENSION_COLORS.organizational.primary, borderLeft: `4px solid ${DIMENSION_COLORS.organizational.primary}`, paddingLeft: 'var(--spacing-sm)' }}>
                Organizational Dimension - Core Values
              </h3>
              <button
                className={styles.addButton}
                onClick={() => {
                  if (!areWeightsConfigured()) {
                    showNotification('Please configure dimension weights in Settings first', 'error');
                    return;
                  }
                  setShowAddOrganizational(!showAddOrganizational);
                }}
                disabled={!areWeightsConfigured()}
              >
                + Add Core Value
              </button>
            </div>

            {showAddOrganizational && (
              <form onSubmit={handleAddOrganizational} className={styles.addKRAForm}>
                <input
                  type="text"
                  placeholder="Core Value *"
                  value={newOrganizational.coreValue || ''}
                  onChange={(e) => setNewOrganizational({ ...newOrganizational, coreValue: e.target.value })}
                  required
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.saveButton}>
                    Add Core Value
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddOrganizational(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className={styles.kraList}>
              {member.organizationalDimensions && member.organizationalDimensions.length > 0 ? (
                member.organizationalDimensions.map((dimension) => (
                  <div key={dimension._id} className={styles.kraCard}>
                    <div className={styles.kraHeader}>
                      <h4>{dimension.coreValue}</h4>
                      <div className={styles.averageScore}>
                        Avg: {dimension.averageScore?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className={styles.kraFields}>
                      {/* Pilot Period */}
                      <div className={styles.reviewPeriods}>
                        <h5>Pilot Period</h5>
                        <div className={styles.reviewPeriod}>
                          <div className={styles.reviewFields}>
                            <div>
                              <label>Score</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={dimension.pilotScore || ''}
                                onChange={(e) =>
                                  handleUpdateOrganizational(
                                    dimension._id!,
                                    'pilotScore',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={styles.inputSmall}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Critical Incident</label>
                              <textarea
                                value={dimension.pilotCriticalIncident || ''}
                                onChange={(e) =>
                                  handleUpdateOrganizational(
                                    dimension._id!,
                                    'pilotCriticalIncident',
                                    e.target.value
                                  )
                                }
                                className={styles.textarea}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Periods */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', scoreKey: 'r1Score' as const, incidentKey: 'r1CriticalIncident' as const },
                          { period: 'R2', scoreKey: 'r2Score' as const, incidentKey: 'r2CriticalIncident' as const },
                          { period: 'R3', scoreKey: 'r3Score' as const, incidentKey: 'r3CriticalIncident' as const },
                          { period: 'R4', scoreKey: 'r4Score' as const, incidentKey: 'r4CriticalIncident' as const },
                        ].map(({ period, scoreKey, incidentKey }) => (
                          <div key={period} className={styles.reviewPeriod}>
                            <h6>{period}</h6>
                            <div className={styles.reviewFields}>
                              <div>
                                <label>Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={dimension[scoreKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateOrganizational(
                                      dimension._id!,
                                      scoreKey,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={styles.inputSmall}
                                />
                              </div>
                              <div className={styles.commentField}>
                                <label>Critical Incident</label>
                                <textarea
                                  value={dimension[incidentKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateOrganizational(dimension._id!, incidentKey, e.target.value)
                                  }
                                  className={styles.textarea}
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No core values added yet. Click "Add Core Value" to start.
                </div>
              )}
            </div>
            <div className={styles.submitSection}>
              <button className={styles.submitButton} onClick={handleSubmit}>
                Submit Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'selfDevelopment' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 style={{ color: DIMENSION_COLORS.selfDevelopment.primary, borderLeft: `4px solid ${DIMENSION_COLORS.selfDevelopment.primary}`, paddingLeft: 'var(--spacing-sm)' }}>
                Self Development - Areas of Concern
              </h3>
              <button
                className={styles.addButton}
                onClick={() => {
                  if (!areWeightsConfigured()) {
                    showNotification('Please configure dimension weights in Settings first', 'error');
                    return;
                  }
                  setShowAddSelfDevelopment(!showAddSelfDevelopment);
                }}
                disabled={!areWeightsConfigured()}
              >
                + Add Area of Concern
              </button>
            </div>

            {showAddSelfDevelopment && (
              <form onSubmit={handleAddSelfDevelopment} className={styles.addKRAForm}>
                <input
                  type="text"
                  placeholder="Area of Concern *"
                  value={newSelfDevelopment.areaOfConcern || ''}
                  onChange={(e) => setNewSelfDevelopment({ ...newSelfDevelopment, areaOfConcern: e.target.value })}
                  required
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Action Plan/Initiative"
                  value={newSelfDevelopment.actionPlanInitiative || ''}
                  onChange={(e) =>
                    setNewSelfDevelopment({ ...newSelfDevelopment, actionPlanInitiative: e.target.value })
                  }
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.saveButton}>
                    Add Area of Concern
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddSelfDevelopment(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className={styles.kraList}>
              {member.selfDevelopments && member.selfDevelopments.length > 0 ? (
                member.selfDevelopments.map((development) => (
                  <div key={development._id} className={styles.kraCard}>
                    <div className={styles.kraHeader}>
                      <h4>{development.areaOfConcern}</h4>
                      <div className={styles.averageScore}>
                        Avg: {development.averageScore?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className={styles.kraFields}>
                      <div className={styles.fieldRow}>
                        <label>Action Plan/Initiative</label>
                        <input
                          type="text"
                          value={development.actionPlanInitiative || ''}
                          onChange={(e) =>
                            handleUpdateSelfDevelopment(development._id!, 'actionPlanInitiative', e.target.value)
                          }
                          className={styles.input}
                        />
                      </div>

                      {/* Pilot Period */}
                      <div className={styles.reviewPeriods}>
                        <h5>Pilot Period</h5>
                        <div className={styles.reviewPeriod}>
                          <div className={styles.reviewFields}>
                            <div>
                              <label>Score</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={development.pilotScore || ''}
                                onChange={(e) =>
                                  handleUpdateSelfDevelopment(
                                    development._id!,
                                    'pilotScore',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={styles.inputSmall}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Reason</label>
                              <textarea
                                value={development.pilotReason || ''}
                                onChange={(e) =>
                                  handleUpdateSelfDevelopment(development._id!, 'pilotReason', e.target.value)
                                }
                                className={styles.textarea}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Periods */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', scoreKey: 'r1Score' as const, reasonKey: 'r1Reason' as const },
                          { period: 'R2', scoreKey: 'r2Score' as const, reasonKey: 'r2Reason' as const },
                          { period: 'R3', scoreKey: 'r3Score' as const, reasonKey: 'r3Reason' as const },
                          { period: 'R4', scoreKey: 'r4Score' as const, reasonKey: 'r4Reason' as const },
                        ].map(({ period, scoreKey, reasonKey }) => (
                          <div key={period} className={styles.reviewPeriod}>
                            <h6>{period}</h6>
                            <div className={styles.reviewFields}>
                              <div>
                                <label>Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={development[scoreKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateSelfDevelopment(
                                      development._id!,
                                      scoreKey,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={styles.inputSmall}
                                />
                              </div>
                              <div className={styles.commentField}>
                                <label>Reason</label>
                                <textarea
                                  value={development[reasonKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateSelfDevelopment(development._id!, reasonKey, e.target.value)
                                  }
                                  className={styles.textarea}
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No areas of concern added yet. Click "Add Area of Concern" to start.
                </div>
              )}
            </div>
            <div className={styles.submitSection}>
              <button className={styles.submitButton} onClick={handleSubmit}>
                Submit Changes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'developingOthers' && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h3 style={{ color: DIMENSION_COLORS.developingOthers.primary, borderLeft: `4px solid ${DIMENSION_COLORS.developingOthers.primary}`, paddingLeft: 'var(--spacing-sm)' }}>
                Developing Others - Team Members
              </h3>
              <button
                className={styles.addButton}
                onClick={() => {
                  if (!areWeightsConfigured()) {
                    showNotification('Please configure dimension weights in Settings first', 'error');
                    return;
                  }
                  // Check if Developing Others dimension is enabled (weight > 0)
                  if (dimensionWeights && dimensionWeights.developingOthers <= 0) {
                    showNotification('Developing Others dimension is not enabled. Set its weight in Settings to use this dimension.', 'error');
                    return;
                  }
                  setShowAddDevelopingOthers(!showAddDevelopingOthers);
                }}
                disabled={!areWeightsConfigured() || (dimensionWeights?.developingOthers || 0) <= 0}
              >
                + Add Person
              </button>
            </div>

            {showAddDevelopingOthers && (
              <form onSubmit={handleAddDevelopingOthers} className={styles.addKRAForm}>
                <input
                  type="text"
                  placeholder="Person *"
                  value={newDevelopingOthers.person || ''}
                  onChange={(e) => setNewDevelopingOthers({ ...newDevelopingOthers, person: e.target.value })}
                  required
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="Area of Development"
                  value={newDevelopingOthers.areaOfDevelopment || ''}
                  onChange={(e) =>
                    setNewDevelopingOthers({ ...newDevelopingOthers, areaOfDevelopment: e.target.value })
                  }
                  className={styles.input}
                />
                <div className={styles.buttonGroup}>
                  <button type="submit" className={styles.saveButton}>
                    Add Person
                  </button>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setShowAddDevelopingOthers(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className={styles.kraList}>
              {member.developingOthers && member.developingOthers.length > 0 ? (
                member.developingOthers.map((developing) => (
                  <div key={developing._id} className={styles.kraCard}>
                    <div className={styles.kraHeader}>
                      <h4>{developing.person}</h4>
                      <div className={styles.averageScore}>
                        Avg: {developing.averageScore?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className={styles.kraFields}>
                      <div className={styles.fieldRow}>
                        <label>Area of Development</label>
                        <input
                          type="text"
                          value={developing.areaOfDevelopment || ''}
                          onChange={(e) =>
                            handleUpdateDevelopingOthers(developing._id!, 'areaOfDevelopment', e.target.value)
                          }
                          className={styles.input}
                        />
                      </div>

                      {/* Pilot Period */}
                      <div className={styles.reviewPeriods}>
                        <h5>Pilot Period</h5>
                        <div className={styles.reviewPeriod}>
                          <div className={styles.reviewFields}>
                            <div>
                              <label>Score</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={developing.pilotScore || ''}
                                onChange={(e) =>
                                  handleUpdateDevelopingOthers(
                                    developing._id!,
                                    'pilotScore',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className={styles.inputSmall}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Reason</label>
                              <textarea
                                value={developing.pilotReason || ''}
                                onChange={(e) =>
                                  handleUpdateDevelopingOthers(developing._id!, 'pilotReason', e.target.value)
                                }
                                className={styles.textarea}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Periods */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', scoreKey: 'r1Score' as const, reasonKey: 'r1Reason' as const },
                          { period: 'R2', scoreKey: 'r2Score' as const, reasonKey: 'r2Reason' as const },
                          { period: 'R3', scoreKey: 'r3Score' as const, reasonKey: 'r3Reason' as const },
                          { period: 'R4', scoreKey: 'r4Score' as const, reasonKey: 'r4Reason' as const },
                        ].map(({ period, scoreKey, reasonKey }) => (
                          <div key={period} className={styles.reviewPeriod}>
                            <h6>{period}</h6>
                            <div className={styles.reviewFields}>
                              <div>
                                <label>Score</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={developing[scoreKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateDevelopingOthers(
                                      developing._id!,
                                      scoreKey,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className={styles.inputSmall}
                                />
                              </div>
                              <div className={styles.commentField}>
                                <label>Reason</label>
                                <textarea
                                  value={developing[reasonKey] || ''}
                                  onChange={(e) =>
                                    handleUpdateDevelopingOthers(developing._id!, reasonKey, e.target.value)
                                  }
                                  className={styles.textarea}
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No persons added yet. Click "Add Person" to start.
                </div>
              )}
            </div>
            <div className={styles.submitSection}>
              <button className={styles.submitButton} onClick={handleSubmit}>
                Submit Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamMemberKRAs;

