import { useState, useRef } from 'react';
import styles from './Onboarding.module.css';

export interface TeamMember {
    name: string;
    email: string;
    mobile: string;
    role: 'manager' | 'employee';
}

interface AddTeamMembersProps {
    members: TeamMember[];
    onMembersChange: (members: TeamMember[]) => void;
    orgCode?: string;
}

type AddMethod = 'manual' | 'csv' | 'invite' | null;

export default function AddTeamMembers({ members, onMembersChange, orgCode }: AddTeamMembersProps) {
    const [method, setMethod] = useState<AddMethod>(null);
    const [manualForm, setManualForm] = useState<TeamMember>({
        name: '',
        email: '',
        mobile: '',
        role: 'employee',
    });
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const inviteLink = orgCode
        ? `${window.location.origin}/auth/join?code=${orgCode}`
        : `${window.location.origin}/auth/join`;

    const inviteMessage = `You've been invited to join 4DPMS. Click here to join: ${inviteLink}`;

    const handleManualAdd = () => {
        if (!manualForm.name.trim() || !manualForm.mobile.trim()) return;
        onMembersChange([...members, { ...manualForm }]);
        setManualForm({ name: '', email: '', mobile: '', role: 'employee' });
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter((line) => line.trim());

            // Skip header row
            const newMembers: TeamMember[] = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map((c) => c.trim());
                if (cols.length >= 3) {
                    newMembers.push({
                        name: cols[0],
                        email: cols[1],
                        mobile: cols[2],
                        role: (cols[3] as 'manager' | 'employee') || 'employee',
                    });
                }
            }
            onMembersChange([...members, ...newMembers]);
        };
        reader.readAsText(file);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRemoveMember = (index: number) => {
        onMembersChange(members.filter((_, i) => i !== index));
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={styles.teamStep}>
            <h2 className={styles.teamTitle}>Add Team Members</h2>
            <p className={styles.teamSubtitle}>
                Add people to your team. You can add them manually, upload a CSV, or send an invite link.
            </p>

            <div className={styles.teamOptions}>
                <div
                    className={`${styles.teamOptionCard} ${method === 'manual' ? styles.teamOptionCardActive : ''}`}
                    onClick={() => setMethod('manual')}
                >
                    <div className={styles.teamOptionIcon}>👤</div>
                    <div className={styles.teamOptionTitle}>Add Manually</div>
                    <div className={styles.teamOptionDesc}>Enter member details one by one</div>
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
                    <div className={styles.teamOptionTitle}>Send Invite</div>
                    <div className={styles.teamOptionDesc}>Share a link for people to join</div>
                </div>
            </div>

            {/* Manual Add Form */}
            {method === 'manual' && (
                <div className={styles.manualForm}>
                    <div className={styles.manualFormGrid}>
                        <div className={styles.formField}>
                            <label>Name</label>
                            <input
                                type="text"
                                placeholder="Full name"
                                value={manualForm.name}
                                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="email@example.com"
                                value={manualForm.email}
                                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>Mobile</label>
                            <input
                                type="tel"
                                placeholder="10-digit number"
                                value={manualForm.mobile}
                                onChange={(e) => setManualForm({ ...manualForm, mobile: e.target.value })}
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>Role</label>
                            <select
                                value={manualForm.role}
                                onChange={(e) =>
                                    setManualForm({ ...manualForm, role: e.target.value as 'manager' | 'employee' })
                                }
                            >
                                <option value="employee">Member</option>
                                <option value="manager">Supervisor</option>
                            </select>
                        </div>
                    </div>
                    <button
                        className={styles.btnPrimary}
                        onClick={handleManualAdd}
                        disabled={!manualForm.name.trim() || !manualForm.mobile.trim()}
                    >
                        Add Member
                    </button>
                </div>
            )}

            {/* CSV Upload */}
            {method === 'csv' && (
                <div>
                    <div className={styles.csvUpload} onClick={() => fileInputRef.current?.click()}>
                        <div className={styles.csvIcon}>📁</div>
                        <div className={styles.csvText}>Click to upload CSV file</div>
                        <div className={styles.csvHint}>Format: Name, Email, Mobile, Role (one per row)</div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleCSVUpload}
                    />
                </div>
            )}

            {/* Invite Link */}
            {method === 'invite' && (
                <div className={styles.inviteSection}>
                    <p style={{ marginBottom: '12px', fontFamily: 'var(--font-inter)', fontSize: '14px', color: 'var(--color-main-black-80)' }}>
                        Share this invite link with your team members:
                    </p>
                    <div className={styles.inviteLinkContainer}>
                        <input
                            className={styles.inviteLinkInput}
                            value={inviteLink}
                            readOnly
                        />
                        <button className={styles.copyBtn} onClick={handleCopyLink}>
                            {copied ? '✓ Copied!' : 'Copy Link'}
                        </button>
                    </div>
                    <p style={{ fontFamily: 'var(--font-inter)', fontSize: '12px', color: 'var(--color-main-grey-60)' }}>
                        Message: "{inviteMessage}"
                    </p>
                </div>
            )}

            {/* Added Members List */}
            {members.length > 0 && (
                <div className={styles.addedMembers}>
                    <h3 className={styles.addedMembersTitle}>
                        Added Members ({members.length})
                    </h3>
                    <div className={styles.membersList}>
                        {members.map((member, index) => (
                            <div key={index} className={styles.memberItem}>
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberAvatar}>{getInitials(member.name)}</div>
                                    <div>
                                        <div className={styles.memberName}>{member.name}</div>
                                        <div className={styles.memberRole}>
                                            {member.role === 'manager' ? 'Supervisor' : 'Member'} • {member.mobile}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className={styles.removeMemberBtn}
                                    onClick={() => handleRemoveMember(index)}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
