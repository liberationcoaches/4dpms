import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import styles from './UnifiedDashboard.module.css';

interface DashboardHomeProps {
    userId: string;
    role: string;
}

interface Stats {
    totalKRAs: number;
    teamMembers: number;
    pendingReviews: number;
    overallScore: number;
}

export default function DashboardHome({ userId, role }: DashboardHomeProps) {
    const [stats, setStats] = useState<Stats>({
        totalKRAs: 0,
        teamMembers: 0,
        pendingReviews: 0,
        overallScore: 0,
    });

    useEffect(() => {
        // Fetch dashboard stats
        const fetchStats = async () => {
            try {
                const res = await fetch(apiUrl(`/api/user/profile?userId=${userId}`));
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    setStats((prev) => ({
                        ...prev,
                        overallScore: data.data.overallScore || 0,
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            }

            // Get team count for managers/bosses
            if (['manager', 'boss', 'client_admin'].includes(role)) {
                try {
                    const res = await fetch(apiUrl(`/api/team/members?userId=${userId}`));
                    const data = await res.json();
                    if (data.status === 'success') {
                        setStats((prev) => ({
                            ...prev,
                            teamMembers: data.data?.length || 0,
                        }));
                    }
                } catch (err) {
                    console.error('Failed to fetch team:', err);
                }
            }
        };
        fetchStats();
    }, [userId, role]);

    return (
        <div>
            {/* Summary Cards */}
            <div className={styles.homeGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconBlue}`}>📊</div>
                    <div className={styles.statValue}>{stats.overallScore || '—'}</div>
                    <div className={styles.statLabel}>Overall Score</div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconGreen}`}>🎯</div>
                    <div className={styles.statValue}>{stats.totalKRAs || '—'}</div>
                    <div className={styles.statLabel}>Total KRAs</div>
                </div>

                {['manager', 'boss', 'client_admin'].includes(role) && (
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconPurple}`}>👥</div>
                        <div className={styles.statValue}>{stats.teamMembers}</div>
                        <div className={styles.statLabel}>Team Members</div>
                    </div>
                )}

                {['manager', 'boss', 'client_admin'].includes(role) && (
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.statIconOrange}`}>📝</div>
                        <div className={styles.statValue}>{stats.pendingReviews}</div>
                        <div className={styles.statLabel}>Pending Reviews</div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}>Quick Actions</h3>
                        <p className={styles.sectionSubtitle}>Common tasks at a glance</p>
                    </div>
                </div>
                <div className={styles.homeGrid}>
                    <button className={styles.btnOutline} style={{ padding: '16px', textAlign: 'center' }}>
                        📊 View My 4D Data
                    </button>
                    {['manager', 'boss', 'client_admin'].includes(role) && (
                        <button className={styles.btnOutline} style={{ padding: '16px', textAlign: 'center' }}>
                            👥 Review Team Submissions
                        </button>
                    )}
                    <button className={styles.btnOutline} style={{ padding: '16px', textAlign: 'center' }}>
                        🎯 View Goals
                    </button>
                </div>
            </div>
        </div>
    );
}
