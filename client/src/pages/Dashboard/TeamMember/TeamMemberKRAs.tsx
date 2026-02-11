import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './TeamMemberKRAs.module.css';
import { DIMENSION_COLORS } from '@/utils/dimensionColors';
import KRAForm, { FunctionalKRAFormData } from '@/components/KRAForm/KRAForm';

type TabType = 'functional' | 'organizational' | 'selfDevelopment' | 'developingOthers';

interface Proof {
  type: 'drive_link' | 'file_upload';
  value: string;
  fileName?: string;
  uploadedAt?: string;
}

interface KPI {
  kpi: string;
  target?: string;
}

interface KRA {
  _id?: string;
  kra: string;
  kpis?: KPI[];
  kpiTarget?: string;
  reportsGenerated?: Proof[] | string;
  pilotWeight?: number;
  pilotScore?: number;
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
  coreValue?: string;
  coreValues?: string;
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
  const [showProofDialog, setShowProofDialog] = useState<{ kraIndex: number; isOpen: boolean }>({
    kraIndex: -1,
    isOpen: false,
  });
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });
  const [reviewCycle, setReviewCycle] = useState<{
    currentReviewPeriod: number;
    r1Date?: string;
    r2Date?: string;
    r3Date?: string;
    r4Date?: string;
    r1Facilitator?: string;
    r2Facilitator?: string;
    r3Facilitator?: string;
    r4Facilitator?: string;
  } | null>(null);

  // Show notification popup
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchMemberData = async () => {
    if (!memberId) return;

    const parts = memberId.split('-');
    let index: number;
    const lastPart = parts[parts.length - 1];
    index = parseInt(lastPart);
    
    if (isNaN(index) && parts.length > 1) {
      index = parseInt(parts[parts.length - 2]);
    }
    
    if (isNaN(index)) {
      console.error('Invalid memberId format:', memberId);
      return;
    }

    const userId = localStorage.getItem('userId') || '';
    
    try {
      const response = await fetch(`/api/team/members?userId=${userId}`);
      const data = await response.json();
      if (data.status === 'success' && data.data && Array.isArray(data.data)) {
        const memberData = data.data[index];
        if (memberData) {
          // Ensure functionalKRAs are properly mapped and have IDs
          const functionalKRAs = (memberData.functionalKRAs || memberData.kras || []).map((kra: any, idx: number) => ({
            ...kra,
            _id: kra._id || `${memberId}-kra-${idx}`,
            // Ensure kpis is always an array
            kpis: Array.isArray(kra.kpis) ? kra.kpis : (kra.kpis ? [kra.kpis] : []),
            // Ensure reportsGenerated is always an array
            reportsGenerated: Array.isArray(kra.reportsGenerated) 
              ? kra.reportsGenerated 
              : (kra.reportsGenerated ? [kra.reportsGenerated] : []),
          }));
          
          console.log('Fetched member data:', {
            functionalKRAs,
            memberData: memberData.functionalKRAs,
          });
          
          setMember({
            ...memberData,
            kras: functionalKRAs,
            organizationalDimensions: memberData.organizationalDimensions || memberData.organizationalKRAs || [],
            selfDevelopments: memberData.selfDevelopments || memberData.selfDevelopmentKRAs || [],
            developingOthers: memberData.developingOthers || memberData.developingOthersKRAs || [],
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch member data:', error);
    }
  };

  // Check if weights are configured (sum to 100%)
  const areWeightsConfigured = () => {
    if (!dimensionWeights) return false;
    const total = dimensionWeights.functional + dimensionWeights.organizational + 
                  dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;
    return total === 100;
  };

  const fetchReviewCycle = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const res = await fetch(`/api/review-cycles/organization/me?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setReviewCycle({
          currentReviewPeriod: data.data.currentReviewPeriod ?? 1,
          r1Date: data.data.r1Date,
          r2Date: data.data.r2Date,
          r3Date: data.data.r3Date,
          r4Date: data.data.r4Date,
          r1Facilitator: data.data.r1Facilitator,
          r2Facilitator: data.data.r2Facilitator,
          r3Facilitator: data.data.r3Facilitator,
          r4Facilitator: data.data.r4Facilitator,
        });
      }
    } catch (e) {
      console.error('Failed to fetch review cycle', e);
    }
  };

  useEffect(() => {
    if (!memberId) {
      setIsLoading(false);
      return;
    }
    fetchReviewCycle();

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

    fetchMemberData();
    setIsLoading(false);
  }, [memberId]);

  const handleAddKRA = async (formData: FunctionalKRAFormData) => {
    if (!memberId) return;

    // Parse memberId to get index
    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';

    try {
      // Convert form data to API format
      const apiData = {
        kra: formData.kra,
        kpis: formData.kpis,
        reportsGenerated: formData.reportsGenerated || [],
        pilotWeight: formData.pilotWeight || 10,
        pilotScore: formData.pilotScore || 0,
      };

      const response = await fetch(`/api/team/members/${memberIndex}/kras?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });

      const data = await response.json();
      if (response.ok) {
        setShowAddKRA(false);
        showNotification('KRA added.');
        // Refresh member data from server to get the complete structure
        await fetchMemberData();
      } else {
        console.error('Failed to add KRA:', data.message);
        showNotification(data.message || 'Failed to add KRA', 'error');
      }
    } catch (error) {
      console.error('Error adding KRA:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleAddProof = async (kraIndex: number, proof: Proof) => {
    if (!member || !member.kras || !memberId) return;

    const kra = member.kras[kraIndex];
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
    await handleUpdateKRA(kra._id!, 'reportsGenerated', updatedProofs);
    
    setShowProofDialog({ kraIndex: -1, isOpen: false });
    setProofInput({ type: 'drive_link', value: '' });
  };

  const handleRemoveProof = async (kraIndex: number, proofIndex: number) => {
    if (!member || !member.kras || !memberId) return;

    const kra = member.kras[kraIndex];
    if (!kra || !Array.isArray(kra.reportsGenerated)) return;

    const updatedProofs = kra.reportsGenerated.filter((_, i) => i !== proofIndex);
    await handleUpdateKRA(kra._id!, 'reportsGenerated', updatedProofs);
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

  const handleUpdateKRA = async (kraId: string, field: keyof KRA, value: any) => {
    if (!member || !member.kras || !memberId) return;

    // Find KRA by ID or by index if ID doesn't match
    let kraIndex = member.kras.findIndex((k) => k._id === kraId);
    if (kraIndex === -1) {
      // Try to find by index if _id is in format memberId-kra-index
      const parts = kraId.split('-kra-');
      if (parts.length > 1) {
        const idx = parseInt(parts[1]);
        if (!isNaN(idx) && idx < member.kras.length) {
          kraIndex = idx;
        }
      }
    }
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
        updatedKRAs[kraIndex] = { ...data.data, _id: kraId || updatedKRAs[kraIndex]._id };
        setMember({ ...member, kras: updatedKRAs });
        // Refresh member data to ensure we have the latest structure
        await fetchMemberData();
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
        showNotification('Organizational dimension added.');
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
        showNotification('Self development added.');
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
        showNotification('Developing others added.');
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
    showNotification('All changes saved.');
    // Navigate to dashboard home after a short delay to show the notification
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  // Lock handlers for each dimension
  const handleLockKRA = async (kraIndex: number) => {
    if (!memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const reviewPeriod = reviewCycle?.currentReviewPeriod || 1;

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/kras/${kraIndex}/lock?userId=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewPeriod }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        showNotification('KRA score locked successfully');
        await fetchMemberData();
      } else {
        showNotification(data.message || 'Failed to lock KRA', 'error');
      }
    } catch (error) {
      console.error('Error locking KRA:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleLockOrganizational = async (dimensionIndex: number) => {
    if (!memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const reviewPeriod = reviewCycle?.currentReviewPeriod || 1;

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/organizational/${dimensionIndex}/lock?userId=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewPeriod }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        showNotification('Organizational score locked successfully');
        await fetchMemberData();
      } else {
        showNotification(data.message || 'Failed to lock Organizational score', 'error');
      }
    } catch (error) {
      console.error('Error locking Organizational score:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleLockSelfDevelopment = async (developmentIndex: number) => {
    if (!memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const reviewPeriod = reviewCycle?.currentReviewPeriod || 1;

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/self-development/${developmentIndex}/lock?userId=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewPeriod }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        showNotification('Self Development score locked successfully');
        await fetchMemberData();
      } else {
        showNotification(data.message || 'Failed to lock Self Development score', 'error');
      }
    } catch (error) {
      console.error('Error locking Self Development score:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleLockDevelopingOthers = async (developingIndex: number) => {
    if (!memberId) return;

    const parts = memberId.split('-');
    let memberIndex = parseInt(parts[parts.length - 1]);
    if (isNaN(memberIndex) && parts.length > 1) {
      memberIndex = parseInt(parts[parts.length - 2]);
    }
    if (isNaN(memberIndex)) return;

    const userId = localStorage.getItem('userId') || '';
    const reviewPeriod = reviewCycle?.currentReviewPeriod || 1;

    try {
      const response = await fetch(
        `/api/team/members/${memberIndex}/developing-others/${developingIndex}/lock?userId=${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewPeriod }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        showNotification('Developing Others score locked successfully');
        await fetchMemberData();
      } else {
        showNotification(data.message || 'Failed to lock Developing Others score', 'error');
      }
    } catch (error) {
      console.error('Error locking Developing Others score:', error);
      showNotification('Network error. Please try again.', 'error');
    }
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

      {/* Review cycle: current period & quarterly dates / facilitators */}
      {reviewCycle && (
        <div className={styles.reviewCycleBanner}>
          <strong>Current period: R{reviewCycle.currentReviewPeriod}</strong>
          <span className={styles.reviewCycleHint}>Only R{reviewCycle.currentReviewPeriod} scores are editable.</span>
          <div className={styles.quarterDatesRow}>
            {([1, 2, 3, 4] as const).map((n) => (
              <span key={n} className={n === reviewCycle.currentReviewPeriod ? styles.quarterDateCurrent : styles.quarterDate}>
                R{n}: {reviewCycle[`r${n}Date`] ? new Date(reviewCycle[`r${n}Date`]).toLocaleDateString() : '—'}
                {reviewCycle[`r${n}Facilitator`] && ` · ${reviewCycle[`r${n}Facilitator`]}`}
              </span>
            ))}
          </div>
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
              <div className={styles.kraFormContainer}>
                <KRAForm
                  onSubmit={handleAddKRA}
                  onCancel={() => setShowAddKRA(false)}
                  mode="add"
                />
              </div>
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
                  {/* KPIs Section */}
                  <div className={styles.fieldRow}>
                    <label>KPIs (Key Performance Indicators)</label>
                    {(() => {
                      // Normalize KPIs to always be an array of objects
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
                        <ul className={styles.kpiList}>
                          {kpis.map((kpi, kpiIndex: number) => (
                            <li key={kpiIndex}>
                              <strong>{kpi.kpi}</strong>
                              {kpi.target && <span className={styles.kpiTarget}> - Target: {kpi.target}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.noData}>No KPIs defined</p>
                      );
                    })()}
                  </div>

                  {/* Reports/Proof Section */}
                  <div className={styles.fieldRow}>
                    <label>Reports/Proof of Work <span className={styles.optionalLabel}>(Optional)</span></label>
                    {(() => {
                      // Handle backward compatibility - convert string to array if needed
                      let proofs: Proof[] = [];
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
                        <div className={styles.proofList}>
                          {proofs.map((proof: Proof, proofIndex: number) => (
                            <div key={proofIndex} className={styles.proofItem}>
                              {proof.type === 'drive_link' ? (
                                <a href={proof.value} target="_blank" rel="noopener noreferrer" className={styles.driveLink}>
                                  📎 Drive Link
                                </a>
                              ) : (
                                <span className={styles.fileItem}>
                                  📄 {proof.fileName || 'Uploaded File'}
                                </span>
                              )}
                    <button
                      onClick={() => {
                        // Find KRA index - use array index as fallback
                        let kraIndex = member.kras?.findIndex((k) => k._id === kra._id) ?? -1;
                        if (kraIndex === -1) {
                          // Fallback to array index
                          kraIndex = member.kras?.findIndex((k) => k === kra) ?? -1;
                        }
                        if (kraIndex !== -1) {
                          handleRemoveProof(kraIndex, proofIndex);
                        }
                      }}
                      className={styles.removeProof}
                      title="Remove proof"
                    >
                      ×
                    </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noData}>No proof submitted</p>
                      );
                    })()}
                    <button
                      onClick={() => {
                        // Find KRA index - use array index as fallback
                        let kraIndex = member.kras?.findIndex((k) => k._id === kra._id) ?? -1;
                        if (kraIndex === -1) {
                          // Fallback to array index
                          kraIndex = member.kras?.findIndex((k) => k === kra) ?? -1;
                        }
                        if (kraIndex !== -1) {
                          setShowProofDialog({ kraIndex, isOpen: true });
                        }
                      }}
                      className={styles.addProofBtn}
                      type="button"
                    >
                      + Add Proof
                    </button>
                  </div>

                  {/* Pilot Period - editable only when current period is 1 */}
                  {(() => {
                    const pilotEditable = reviewCycle ? reviewCycle.currentReviewPeriod === 1 : true;
                    return (
                      <div className={styles.reviewPeriods}>
                        <h5>Pilot Period {!pilotEditable && <span className={styles.readOnlyBadge}>(read-only)</span>}</h5>
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
                                disabled={!pilotEditable}
                                readOnly={!pilotEditable}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Actual Perf/Comment</label>
                              <textarea
                                value={kra.pilotActualPerf || ''}
                                onChange={(e) => handleUpdateKRA(kra._id!, 'pilotActualPerf', e.target.value)}
                                className={styles.textarea}
                                rows={2}
                                disabled={!pilotEditable}
                                readOnly={!pilotEditable}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Review Periods - only current period editable */}
                  <div className={styles.reviewPeriods}>
                    <h5>Review Periods</h5>
                    {['R1', 'R2', 'R3', 'R4'].map((period) => {
                      const periodNum = parseInt(period.slice(1), 10);
                      const isCurrentPeriod = reviewCycle ? reviewCycle.currentReviewPeriod === periodNum : true;
                      const weightKey = `${period.toLowerCase()}Weight` as keyof KRA;
                      const scoreKey = `${period.toLowerCase()}Score` as keyof KRA;
                      const perfKey = `${period.toLowerCase()}ActualPerf` as keyof KRA;

                      return (
                        <div key={period} className={styles.reviewPeriod}>
                          <h6>{period} {!isCurrentPeriod && <span className={styles.readOnlyBadge}>(read-only)</span>}</h6>
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
                                disabled={!isCurrentPeriod}
                                readOnly={!isCurrentPeriod}
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
                                disabled={!isCurrentPeriod}
                                readOnly={!isCurrentPeriod}
                              />
                            </div>
                            <div className={styles.commentField}>
                              <label>Actual Perf/Comment</label>
                              <textarea
                                value={kra[perfKey] || ''}
                                onChange={(e) => handleUpdateKRA(kra._id!, perfKey, e.target.value)}
                                className={styles.textarea}
                                rows={2}
                                disabled={!isCurrentPeriod}
                                readOnly={!isCurrentPeriod}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lock KRA Button */}
                <div className={styles.kraActions}>
                  <button
                    className={styles.lockButton}
                    onClick={() => {
                      const kraIndex = member.kras?.findIndex((k) => k._id === kra._id) ?? -1;
                      if (kraIndex !== -1) {
                        handleLockKRA(kraIndex);
                      }
                    }}
                    title={`Lock score for R${reviewCycle?.currentReviewPeriod || 1}`}
                  >
                    🔒 Lock R{reviewCycle?.currentReviewPeriod || 1} Score
                  </button>
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
                      <h4>{dimension.coreValues ?? dimension.coreValue}</h4>
                      <div className={styles.averageScore}>
                        Avg: {dimension.averageScore?.toFixed(2) || 'N/A'}
                      </div>
                    </div>

                    <div className={styles.kraFields}>
                      {/* Pilot Period - editable only when current period is 1 */}
                      {(() => {
                        const pilotEditable = reviewCycle ? reviewCycle.currentReviewPeriod === 1 : true;
                        return (
                          <div className={styles.reviewPeriods}>
                            <h5>Pilot Period {!pilotEditable && <span className={styles.readOnlyBadge}>(read-only)</span>}</h5>
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Review Periods - only current period editable */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', periodNum: 1, scoreKey: 'r1Score' as const, incidentKey: 'r1CriticalIncident' as const },
                          { period: 'R2', periodNum: 2, scoreKey: 'r2Score' as const, incidentKey: 'r2CriticalIncident' as const },
                          { period: 'R3', periodNum: 3, scoreKey: 'r3Score' as const, incidentKey: 'r3CriticalIncident' as const },
                          { period: 'R4', periodNum: 4, scoreKey: 'r4Score' as const, incidentKey: 'r4CriticalIncident' as const },
                        ].map(({ period, periodNum, scoreKey, incidentKey }) => {
                          const isCurrentPeriod = reviewCycle ? reviewCycle.currentReviewPeriod === periodNum : true;
                          return (
                            <div key={period} className={styles.reviewPeriod}>
                              <h6>{period} {!isCurrentPeriod && <span className={styles.readOnlyBadge}>(read-only)</span>}</h6>
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lock Organizational Button */}
                    <div className={styles.kraActions}>
                      <button
                        className={styles.lockButton}
                        onClick={() => {
                          const dimensionIndex = member.organizationalDimensions?.findIndex((d) => d._id === dimension._id) ?? -1;
                          if (dimensionIndex !== -1) {
                            handleLockOrganizational(dimensionIndex);
                          }
                        }}
                        title={`Lock score for R${reviewCycle?.currentReviewPeriod || 1}`}
                      >
                        🔒 Lock R{reviewCycle?.currentReviewPeriod || 1} Score
                      </button>
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

                      {/* Pilot Period - editable only when current period is 1 */}
                      {(() => {
                        const pilotEditable = reviewCycle ? reviewCycle.currentReviewPeriod === 1 : true;
                        return (
                          <div className={styles.reviewPeriods}>
                            <h5>Pilot Period {!pilotEditable && <span className={styles.readOnlyBadge}>(read-only)</span>}</h5>
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Review Periods - only current period editable */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', periodNum: 1, scoreKey: 'r1Score' as const, reasonKey: 'r1Reason' as const },
                          { period: 'R2', periodNum: 2, scoreKey: 'r2Score' as const, reasonKey: 'r2Reason' as const },
                          { period: 'R3', periodNum: 3, scoreKey: 'r3Score' as const, reasonKey: 'r3Reason' as const },
                          { period: 'R4', periodNum: 4, scoreKey: 'r4Score' as const, reasonKey: 'r4Reason' as const },
                        ].map(({ period, periodNum, scoreKey, reasonKey }) => {
                          const isCurrentPeriod = reviewCycle ? reviewCycle.currentReviewPeriod === periodNum : true;
                          return (
                            <div key={period} className={styles.reviewPeriod}>
                              <h6>{period} {!isCurrentPeriod && <span className={styles.readOnlyBadge}>(read-only)</span>}</h6>
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lock Self Development Button */}
                    <div className={styles.kraActions}>
                      <button
                        className={styles.lockButton}
                        onClick={() => {
                          const developmentIndex = member.selfDevelopments?.findIndex((d) => d._id === development._id) ?? -1;
                          if (developmentIndex !== -1) {
                            handleLockSelfDevelopment(developmentIndex);
                          }
                        }}
                        title={`Lock score for R${reviewCycle?.currentReviewPeriod || 1}`}
                      >
                        🔒 Lock R{reviewCycle?.currentReviewPeriod || 1} Score
                      </button>
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

                      {/* Pilot Period - editable only when current period is 1 */}
                      {(() => {
                        const pilotEditable = reviewCycle ? reviewCycle.currentReviewPeriod === 1 : true;
                        return (
                          <div className={styles.reviewPeriods}>
                            <h5>Pilot Period {!pilotEditable && <span className={styles.readOnlyBadge}>(read-only)</span>}</h5>
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
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
                                    disabled={!pilotEditable}
                                    readOnly={!pilotEditable}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Review Periods - only current period editable */}
                      <div className={styles.reviewPeriods}>
                        <h5>Review Periods</h5>
                        {[
                          { period: 'R1', periodNum: 1, scoreKey: 'r1Score' as const, reasonKey: 'r1Reason' as const },
                          { period: 'R2', periodNum: 2, scoreKey: 'r2Score' as const, reasonKey: 'r2Reason' as const },
                          { period: 'R3', periodNum: 3, scoreKey: 'r3Score' as const, reasonKey: 'r3Reason' as const },
                          { period: 'R4', periodNum: 4, scoreKey: 'r4Score' as const, reasonKey: 'r4Reason' as const },
                        ].map(({ period, periodNum, scoreKey, reasonKey }) => {
                          const isCurrentPeriod = reviewCycle ? reviewCycle.currentReviewPeriod === periodNum : true;
                          return (
                            <div key={period} className={styles.reviewPeriod}>
                              <h6>{period} {!isCurrentPeriod && <span className={styles.readOnlyBadge}>(read-only)</span>}</h6>
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
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
                                    disabled={!isCurrentPeriod}
                                    readOnly={!isCurrentPeriod}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lock Developing Others Button */}
                    <div className={styles.kraActions}>
                      <button
                        className={styles.lockButton}
                        onClick={() => {
                          const developingIndex = member.developingOthers?.findIndex((d) => d._id === developing._id) ?? -1;
                          if (developingIndex !== -1) {
                            handleLockDevelopingOthers(developingIndex);
                          }
                        }}
                        title={`Lock score for R${reviewCycle?.currentReviewPeriod || 1}`}
                      >
                        🔒 Lock R{reviewCycle?.currentReviewPeriod || 1} Score
                      </button>
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

      {/* Proof Dialog */}
      {showProofDialog.isOpen && showProofDialog.kraIndex !== -1 && (
        <div className={styles.proofDialogOverlay} onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}>
          <div className={styles.proofDialog} onClick={(e) => e.stopPropagation()}>
            <h3>Add Proof of Work</h3>
            <div className={styles.proofTypeSelector}>
              <button
                type="button"
                className={proofInput.type === 'drive_link' ? styles.active : ''}
                onClick={() => setProofInput({ ...proofInput, type: 'drive_link' })}
              >
                Drive Link
              </button>
              <button
                type="button"
                className={proofInput.type === 'file_upload' ? styles.active : ''}
                onClick={() => setProofInput({ ...proofInput, type: 'file_upload' })}
              >
                File Upload
              </button>
            </div>
            {proofInput.type === 'drive_link' ? (
              <div className={styles.proofInput}>
                <label>Google Drive Link</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={proofInput.value}
                  onChange={(e) => setProofInput({ ...proofInput, value: e.target.value })}
                />
                <p className={styles.fileHint}>Enter a Google Drive or Google Docs link</p>
                <button
                  type="button"
                  onClick={() => handleAddDriveLink(showProofDialog.kraIndex)}
                  className={styles.addBtn}
                >
                  Add Link
                </button>
              </div>
            ) : (
              <div className={styles.proofInput}>
                <label>Upload File (JPG, PNG, or PDF - Max 10MB)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, showProofDialog.kraIndex)}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamMemberKRAs;

