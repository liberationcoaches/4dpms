import { useState, useEffect } from 'react';
import styles from './UnifiedDashboard.module.css';

interface TeamViewProps {
    userId: string;
    role: string;
}

interface TeamMember {
    _id: string;
    name: string;
    email: string;
    role: string;
    status: 'draft' | 'submitted' | 'finalized' | 'locked';
}

export default function TeamView({ userId, role }: TeamViewProps) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await fetch(`/api/team/members?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    setMembers(
                        data.data.map((m: any) => ({
                            _id: m._id,
                            name: m.name || 'Unknown',
                            email: m.email || '',
                            role: m.role || 'employee',
                            status: m.dataStatus || 'draft',
                        }))
                    );
                }
            } catch (err) {
                console.error('Failed to fetch team:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, [userId]);

    const handleFinalize = async (memberId: string) => {
        if (!confirm('Are you sure you want to finalize this member\'s data? This action cannot be undone.')) return;

        try {
            // Mark member's data as finalized
            await fetch(`/api/manager/finalize`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, managerId: userId }),
            });

            // Create notification for the member
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: memberId,
                    type: 'data_finalized',
                    message: 'Your 4D data has been finalized by your supervisor',
                }),
            });

            // Update local state
            setMembers((prev) =>
                prev.map((m) => (m._id === memberId ? { ...m, status: 'finalized' as const } : m))
            );
        } catch (err) {
            console.error('Failed to finalize:', err);
        }
    };

    const handleLock = async (memberId: string) => {
        if (!confirm('Lock this member\'s data permanently? No further edits will be allowed.')) return;

        try {
            await fetch(`/api/manager/lock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, managerId: userId }),
            });

            setMembers((prev) =>
                prev.map((m) => (m._id === memberId ? { ...m, status: 'locked' as const } : m))
            );
        } catch (err) {
            console.error('Failed to lock:', err);
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'draft': return styles.statusDraft;
            case 'submitted': return styles.statusSubmitted;
            case 'finalized': return styles.statusFinalized;
            case 'locked': return styles.statusLocked;
            default: return styles.statusDraft;
        }
    };

    if (!['manager', 'boss', 'client_admin'].includes(role)) {
        return (
            <div className={styles.sectionCard}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🔒</div>
                    <div className={styles.emptyTitle}>Access Restricted</div>
                    <div className={styles.emptyText}>
                        Team management is available for Supervisors and above.
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.sectionCard}>
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-main-grey-60)' }}>
                    Loading team...
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}>Team Members</h3>
                        <p className={styles.sectionSubtitle}>
                            Review, finalize, and lock your team members' 4D performance data.
                        </p>
                    </div>
                </div>

                {members.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>👥</div>
                        <div className={styles.emptyTitle}>No team members yet</div>
                        <div className={styles.emptyText}>
                            Team members will appear here once they're added to your team.
                        </div>
                    </div>
                ) : (
                    <div className={styles.teamList}>
                        {members.map((member) => (
                            <div key={member._id} className={styles.teamMemberRow}>
                                <div className={styles.memberLeft}>
                                    <div className={styles.memberAvatar}>{getInitials(member.name)}</div>
                                    <div>
                                        <div className={styles.memberName}>{member.name}</div>
                                        <div className={styles.memberRole}>{member.email}</div>
                                    </div>
                                </div>
                                <div className={styles.memberRight}>
                                    <span className={`${styles.statusBadge} ${getStatusClass(member.status)}`}>
                                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                                    </span>

                                    {member.status === 'submitted' && (
                                        <button className={styles.btnFinalize} onClick={() => handleFinalize(member._id)}>
                                            Finalize
                                        </button>
                                    )}

                                    {member.status === 'finalized' && (
                                        <button className={styles.btnSave} onClick={() => handleLock(member._id)}>
                                            🔒 Lock
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
