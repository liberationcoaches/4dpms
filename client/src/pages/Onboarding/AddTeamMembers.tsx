import { useState, useRef } from 'react';
import { apiUrl } from '@/utils/api';
import styles from './Onboarding.module.css';

const ROLE_OPTIONS = [
  { value: 'boss', label: 'Executive' },
  { value: 'manager', label: 'Supervisor' },
  { value: 'employee', label: 'Member' },
] as const;

export interface TeamMember {
  _id?: string;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  department?: string;
  role: 'boss' | 'manager' | 'employee';
  reportsTo?: string;
  inviteCode?: string;
  inviteLink?: string;
}

interface AddTeamMembersProps {
  members: TeamMember[];
  onMembersChange: (members: TeamMember[]) => void;
  userId?: string | null;
  /** When 'employee_only', role dropdown shows Member only (for boss/manager onboarding) */
  roleRestriction?: 'employee_only';
  /** Include current user in Reports To dropdown (for boss/manager adding their reports) */
  selfAsReportsTo?: { id: string; name: string };
}

type AddMethod = 'manual' | 'csv' | 'invite' | null;

function getRoleLabel(role: string): string {
  return ROLE_OPTIONS.find(r => r.value === role)?.label ?? role;
}

export default function AddTeamMembers({ members, onMembersChange, userId, roleRestriction, selfAsReportsTo }: AddTeamMembersProps) {
  const [method, setMethod] = useState<AddMethod>(null);
  const [manualForm, setManualForm] = useState<Omit<TeamMember, 'inviteCode' | 'inviteLink'>>({
    name: '',
    email: '',
    mobile: '',
    designation: '',
    department: '',
    role: 'employee',
    reportsTo: '',
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/auth/join`;

  const handleManualAdd = async () => {
    if (!manualForm.name.trim() || !manualForm.email.trim() || !manualForm.mobile.trim() || !manualForm.designation.trim()) {
      setAddError('Name, email, mobile, and designation are required');
      return;
    }
    const mobileNorm = manualForm.mobile.replace(/\D/g, '');
    if (mobileNorm.length !== 10) {
      setAddError('Mobile must be 10 digits');
      return;
    }
    if (!userId) {
      setAddError('Session expired. Please refresh.');
      return;
    }

    setAdding(true);
    setAddError('');
    try {
      const res = await fetch(apiUrl(`/api/org-admin/members/invite?userId=${userId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualForm.name.trim(),
          email: manualForm.email.trim().toLowerCase(),
          mobile: mobileNorm,
          designation: manualForm.designation.trim(),
          department: manualForm.department?.trim() || undefined,
          role: manualForm.role,
          reportsTo: manualForm.reportsTo || undefined,
          userId,
        }),
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        const newMember: TeamMember = {
          ...manualForm,
          mobile: mobileNorm,
          _id: data.data?._id,
          inviteCode: data.data?.inviteCode,
          inviteLink: data.data?.inviteLink,
        };
        onMembersChange([...members, newMember]);
        setManualForm({
          name: '',
          email: '',
          mobile: '',
          designation: '',
          department: '',
          role: 'employee',
          reportsTo: '',
        });
      } else {
        setAddError(data.message || 'Failed to add member');
      }
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      const newMembers: TeamMember[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length >= 4) {
          const roleVal = (cols[4] || 'employee').toLowerCase();
          const role = roleVal === 'boss' || roleVal === 'executive' ? 'boss' : roleVal === 'manager' || roleVal === 'supervisor' ? 'manager' : 'employee';
          newMembers.push({
            name: cols[0],
            email: cols[1],
            mobile: cols[2].replace(/\D/g, '').slice(0, 10),
            designation: cols[3],
            department: cols[5] || undefined,
            role,
            reportsTo: cols[6] || undefined,
          });
        }
      }
      onMembersChange([...members, ...newMembers]);
    };
    reader.readAsText(file);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRemoveMember = (index: number) => {
    onMembersChange(members.filter((_, i) => i !== index));
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={styles.teamStep}>
      <h2 className={styles.teamTitle}>Add Team Members</h2>
      <p className={styles.teamSubtitle}>
        Add people to your team. Send email invites or share invite codes.
      </p>

      <div className={styles.teamOptions}>
        <div
          className={`${styles.teamOptionCard} ${method === 'manual' ? styles.teamOptionCardActive : ''}`}
          onClick={() => setMethod('manual')}
        >
          <div className={styles.teamOptionIcon}>👤</div>
          <div className={styles.teamOptionTitle}>Add Manually</div>
          <div className={styles.teamOptionDesc}>Enter member details and send invite</div>
        </div>

        <div
          className={`${styles.teamOptionCard} ${method === 'csv' ? styles.teamOptionCardActive : ''}`}
          onClick={() => setMethod('csv')}
        >
          <div className={styles.teamOptionIcon}>📊</div>
          <div className={styles.teamOptionTitle}>Upload CSV</div>
          <div className={styles.teamOptionDesc}>Bulk add from a spreadsheet</div>
        </div>

        <div
          className={`${styles.teamOptionCard} ${method === 'invite' ? styles.teamOptionCardActive : ''}`}
          onClick={() => setMethod('invite')}
        >
          <div className={styles.teamOptionIcon}>✉️</div>
          <div className={styles.teamOptionTitle}>Invite Link</div>
          <div className={styles.teamOptionDesc}>Share a link for people to join</div>
        </div>
      </div>

      {method === 'manual' && (
        <div className={styles.manualForm}>
          <div className={styles.manualFormGrid}>
            <div className={styles.formField}>
              <label>Name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Email *</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Mobile *</label>
              <input
                type="tel"
                placeholder="10-digit number"
                value={manualForm.mobile}
                onChange={(e) => setManualForm({ ...manualForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              />
            </div>
            <div className={styles.formField}>
              <label>Designation *</label>
              <input
                type="text"
                placeholder="Job title"
                value={manualForm.designation}
                onChange={(e) => setManualForm({ ...manualForm, designation: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Department</label>
              <input
                type="text"
                placeholder="Optional"
                value={manualForm.department || ''}
                onChange={(e) => setManualForm({ ...manualForm, department: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Role</label>
              <select
                value={manualForm.role}
                onChange={(e) => setManualForm({ ...manualForm, role: e.target.value as 'boss' | 'manager' | 'employee' })}
              >
                {(roleRestriction === 'employee_only'
                  ? ROLE_OPTIONS.filter((o) => o.value === 'employee')
                  : ROLE_OPTIONS
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
              <label>Reports To</label>
              <select
                value={manualForm.reportsTo}
                onChange={(e) => setManualForm({ ...manualForm, reportsTo: e.target.value })}
              >
                <option value="">— None —</option>
                {selfAsReportsTo && (
                  <option key={selfAsReportsTo.id} value={selfAsReportsTo.id}>
                    {selfAsReportsTo.name} (Me)
                  </option>
                )}
                {members.filter(m => m._id).map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.designation})</option>
                ))}
              </select>
            </div>
          </div>
          {addError && <p className={styles.errorText} style={{ marginBottom: 8 }}>{addError}</p>}
          <button
            className={styles.btnPrimary}
            onClick={handleManualAdd}
            disabled={adding || !manualForm.name.trim() || !manualForm.email.trim() || !manualForm.mobile.trim() || !manualForm.designation.trim()}
          >
            {adding ? 'Adding...' : 'Add Member & Send Invite'}
          </button>
        </div>
      )}

      {method === 'csv' && (
        <div>
          <div className={styles.csvUpload} onClick={() => fileInputRef.current?.click()}>
            <div className={styles.csvIcon}>📁</div>
            <div className={styles.csvText}>Click to upload CSV file</div>
            <div className={styles.csvHint}>Format: Name, Email, Mobile, Designation, Role, Department (one per row)</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCSVUpload}
          />
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-main-grey-60)' }}>
            CSV members will be added to the list. Use manual add to send invites.
          </p>
        </div>
      )}

      {method === 'invite' && (
        <div className={styles.inviteSection}>
          <p style={{ marginBottom: 12, fontFamily: 'var(--font-inter)', fontSize: 14, color: 'var(--color-main-black-80)' }}>
            Share this invite link with your team members:
          </p>
          <div className={styles.inviteLinkContainer}>
            <input className={styles.inviteLinkInput} value={inviteLink} readOnly />
            <button
              className={styles.copyBtn}
              onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied('link'); setTimeout(() => setCopied(null), 2000); }}
            >
              {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div className={styles.addedMembers}>
          <h3 className={styles.addedMembersTitle}>Added Members ({members.length})</h3>
          <div className={styles.membersList}>
            {members.map((member, index) => (
              <div key={index} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>{getInitials(member.name)}</div>
                  <div>
                    <div className={styles.memberName}>{member.name}</div>
                    <div className={styles.memberRole}>
                      {getRoleLabel(member.role)} • {member.designation} • {member.mobile}
                    </div>
                    {member.inviteCode && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--color-main-grey-60)' }}>Invite link sent to {member.email}. </span>
                        <span>Code: </span>
                        <code style={{ background: 'var(--color-main-grey-20)', padding: '2px 6px', borderRadius: 4 }}>{member.inviteCode}</code>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11 }}
                          onClick={() => handleCopyCode(member.inviteCode!)}
                        >
                          {copied === member.inviteCode ? '✓' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button className={styles.removeMemberBtn} onClick={() => handleRemoveMember(index)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
