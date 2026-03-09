import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './MemberDashboard.module.css';

/* ─────────────────────────── Types ─────────────────────────── */

type PageId = 'dashboard' | 'dimensions' | 'team' | 'feedback' | 'notifications' | 'settings';
type KraStatus = 'draft' | 'pending_approval' | 'active' | 'locked';
type DimTab = 'functional' | 'organizational' | 'selfDevelopment' | 'developingOthers';

interface UserProfile {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
    designation?: string;
    teamName?: string;
    aboutMe?: string;
    role?: string;
}

interface ReviewPeriod {
    _id: string;
    name: string; // 'pilot' | 'r1' | 'r2' | 'r3' | 'r4'
    label: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
}

interface KPIScore {
    period: string;
    score: number | null;
    weight?: number;
}

interface KPI {
    _id?: string;
    name: string;
    scores?: KPIScore[];
}

interface KRA {
    _id?: string;
    title: string;
    kpis?: KPI[];
    status?: KraStatus;
    scores?: KPIScore[]; // period scores
    weight?: number;
    proofLink?: string;
    pilotScore?: number;
}

interface OrgValue {
    _id?: string;
    name: string;
    scores?: KPIScore[];
    criticalIncidents?: { period: string; text: string }[];
}

interface SelfDevItem {
    _id?: string;
    areaOfConcern: string;
    actionPlan?: string;
    scores?: KPIScore[];
}

interface DevOthersItem {
    _id?: string;
    personName: string;
    areaOfDevelopment?: string;
    scores?: KPIScore[];
}

interface DashboardData {
    fourDIndex?: number;
    fourDIndexDelta?: number;
    currentPeriod?: string;
    kras?: KRA[];
    kraStatus?: KraStatus;
    reviewPeriods?: ReviewPeriod[];
    selfDevelopment?: SelfDevItem[];
}

interface FeedbackItem {
    _id?: string;
    fromName?: string;
    from?: { name?: string };
    createdAt?: string;
    content?: string;
    type?: string;
}

interface Notification {
    _id?: string;
    message?: string;
    createdAt?: string;
    isRead?: boolean;
}

interface TeamMember {
    _id: string;
    name: string;
    designation?: string;
    fourDIndex?: number;
    kraStatus?: KraStatus;
    functionalKRAs?: Array<{ kra: string; kpis?: Array<{ kpi: string; target?: string }>; pilotScore?: number; r1Score?: number; r2Score?: number; r3Score?: number; r4Score?: number }>;
    organizationalKRAs?: OrgValue[];
    selfDevelopmentKRAs?: SelfDevItem[];
    developingOthersKRAs?: DevOthersItem[];
}

interface KraData {
    functional: KRA[];
    organizational: OrgValue[];
    selfDevelopment: SelfDevItem[];
    developingOthers: DevOthersItem[];
    kraStatus: KraStatus;
}

/** Raw API response from /api/member/kras */
interface KraDataRaw {
    functionalKRAs?: Array<{ kra: string; kpis?: Array<{ kpi: string; target?: string }>; pilotWeight?: number }>;
    organizationalKRAs?: OrgValue[];
    selfDevelopmentKRAs?: Array<{ areaOfConcern: string; actionPlanInitiative?: string }>;
    developingOthersKRAs?: Array<{ person?: string; areaOfDevelopment?: string }>;
    kraStatus?: KraStatus;
}

function normalizeKraData(raw: KraDataRaw): KraData {
    const functional = (raw.functionalKRAs ?? []).map((f) => ({
        title: f.kra,
        kpis: (f.kpis ?? []).map((p) => ({ name: p.kpi })),
        weight: f.pilotWeight ?? 0,
    }));
    const selfDevelopment = (raw.selfDevelopmentKRAs ?? []).map((s) => ({
        areaOfConcern: s.areaOfConcern,
        actionPlan: s.actionPlanInitiative,
    }));
    const developingOthers = (raw.developingOthersKRAs ?? []).map((d) => ({
        personName: d.person ?? '',
        areaOfDevelopment: d.areaOfDevelopment,
    }));
    return {
        functional,
        organizational: raw.organizationalKRAs ?? [],
        selfDevelopment,
        developingOthers,
        kraStatus: raw.kraStatus ?? 'draft',
    };
}

/* ─────────────────────────── Helpers ─────────────────────────── */

const getInitials = (name: string): string =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const PERIOD_LABELS: Record<string, string> = {
    pilot: 'Pilot', r1: 'R1', r2: 'R2', r3: 'R3', r4: 'R4',
};

const KRA_STATUS_LABELS: Record<KraStatus, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    active: 'Active',
    locked: 'Locked',
};

function StatusBadge({ status }: { status?: KraStatus }) {
    if (!status) return null;
    return (
        <span className={`${styles.badge} ${styles[`badge_${status}`]}`}>
            {KRA_STATUS_LABELS[status] || status}
        </span>
    );
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
    const pct = Math.min(100, Math.round((score / max) * 100));
    return (
        <div className={styles.scoreBar}>
            <div className={styles.scoreBarFill} style={{ width: `${pct}%` }} />
        </div>
    );
}

/* ─────────────────────────── Main Component ─────────────────────────── */

export default function MemberDashboard() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId');

    /* ── Global state ── */
    const [activePage, setActivePage] = useState<PageId>('dashboard');
    const [user, setUser] = useState<UserProfile | null>(null);
    const [notifCount, setNotifCount] = useState(0);
    const [hasDirectReports, setHasDirectReports] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [globalLoading, setGlobalLoading] = useState(true);
    const [globalError, setGlobalError] = useState('');

    /* ── Paywall guard ── */
    const checkPaywall = useCallback(
        async (res: Response) => {
            if (res.status === 403) {
                const d = await res.json().catch(() => ({}));
                if (d.code === 'SUBSCRIPTION_EXPIRED') navigate('/paywall');
            }
        },
        [navigate],
    );

    /* ── Bootstrap: profile + notif count + direct reports ── */
    useEffect(() => {
        if (!userId) { navigate('/auth/login'); return; }

        const init = async () => {
            try {
                const [profileRes, countRes, drRes] = await Promise.all([
                    fetch(apiUrl(`/api/user/profile?userId=${userId}`)),
                    fetch(apiUrl(`/api/notifications/count?userId=${userId}`)),
                    fetch(apiUrl(`/api/member/direct-reports?userId=${userId}`)),
                ]);

                await checkPaywall(profileRes);

                const profileData = await profileRes.json().catch(() => ({}));
                if (profileData.status === 'success' && profileData.data) {
                    const p = profileData.data as UserProfile;
                    setUser(p);
                    if (p.role) localStorage.setItem('userRole', p.role);
                }

                const countData = await countRes.json().catch(() => ({}));
                if (countData.status === 'success') {
                    setNotifCount(countData.data?.count || 0);
                }

                const drData = await drRes.json().catch(() => ({}));
                if (drData.status === 'success') {
                    setHasDirectReports(Array.isArray(drData.data) && drData.data.length > 0);
                }
            } catch (err) {
                console.error(err);
                setGlobalError('Failed to load dashboard. Please refresh.');
            } finally {
                setGlobalLoading(false);
            }
        };

        init();
    }, [userId, navigate, checkPaywall]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    /* ── Nav items ── */
    const navItems: { id: PageId; label: string; icon: string }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '▦' },
        { id: 'dimensions', label: 'My 4 Dimensions', icon: '◈' },
        ...(hasDirectReports ? [{ id: 'team' as PageId, label: 'My Team', icon: '⊞' }] : []),
        { id: 'feedback', label: 'Feedback', icon: '◎' },
        { id: 'notifications', label: 'Notifications', icon: '◒' },
        { id: 'settings', label: 'Settings', icon: '⚙' },
    ];

    const PAGE_TITLES: Record<PageId, string> = {
        dashboard: 'Dashboard',
        dimensions: 'My 4 Dimensions',
        team: 'My Team',
        feedback: 'Feedback',
        notifications: 'Notifications',
        settings: 'Settings',
    };

    if (globalLoading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>Loading your dashboard…</p>
            </div>
        );
    }

    if (globalError) {
        return (
            <div className={styles.errorScreen}>
                <p>{globalError}</p>
                <button onClick={() => window.location.reload()} className={styles.btnPrimary}>
                    Retry
                </button>
            </div>
        );
    }

    if (!userId) {
        return null;
    }

    return (
        <div className={styles.shell}>
            {/* ── Sidebar ── */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                {/* Logo */}
                <div className={styles.sidebarLogo}>
                    <div className={styles.logoMark}>4D</div>
                    <span className={styles.logoText}>LCPL PMS</span>
                </div>

                {/* Nav */}
                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
                            onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span>{item.label}</span>
                            {item.id === 'notifications' && notifCount > 0 && (
                                <span className={styles.navBadge}>{notifCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Bottom: user + logout */}
                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUser}>
                        <div className={styles.avatarSm}>{user?.name ? getInitials(user.name) : 'U'}</div>
                        <div className={styles.sidebarUserInfo}>
                            <span className={styles.sidebarUserName}>{user?.name || 'User'}</span>
                            <span className={styles.sidebarUserDesg}>{user?.designation || user?.role || '—'}</span>
                        </div>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <span className={styles.navIcon}>⏻</span> Logout
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Main ── */}
            <div className={styles.main}>
                {/* Top bar */}
                <header className={styles.topbar}>
                    <div className={styles.topbarLeft}>
                        <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
                            <span /><span /><span />
                        </button>
                        <h1 className={styles.pageTitle}>{PAGE_TITLES[activePage]}</h1>
                    </div>
                    <div className={styles.topbarRight}>
                        <span className={styles.periodBadge}>Q3 ACTIVE</span>
                        <button
                            className={styles.bellBtn}
                            onClick={() => setActivePage('notifications')}
                            aria-label="Notifications"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {notifCount > 0 && <span className={styles.bellBadge}>{notifCount}</span>}
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className={styles.content}>
                    {activePage === 'dashboard' && (
                        <DashboardPage
                            userId={userId}
                            user={user}
                            checkPaywall={checkPaywall}
                            onNavigate={setActivePage}
                        />
                    )}
                    {activePage === 'dimensions' && (
                        <DimensionsPage userId={userId} checkPaywall={checkPaywall} />
                    )}
                    {activePage === 'team' && hasDirectReports && (
                        <TeamPage userId={userId} checkPaywall={checkPaywall} />
                    )}
                    {activePage === 'feedback' && (
                        <FeedbackPage userId={userId} checkPaywall={checkPaywall} />
                    )}
                    {activePage === 'notifications' && (
                        <NotificationsPage
                            userId={userId}
                            checkPaywall={checkPaywall}
                            onRead={() => setNotifCount((n) => Math.max(0, n - 1))}
                        />
                    )}
                    {activePage === 'settings' && (
                        <SettingsPage userId={userId} user={user} setUser={setUser} checkPaywall={checkPaywall} />
                    )}
                </main>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 1 — DASHBOARD
═══════════════════════════════════════════ */

function DashboardPage({
    userId,
    user,
    checkPaywall,
    onNavigate,
}: {
    userId: string;
    user: UserProfile | null;
    checkPaywall: (r: Response) => Promise<void>;
    onNavigate: (p: PageId) => void;
}) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [dashRes, fbRes] = await Promise.all([
                    fetch(apiUrl(`/api/member/dashboard?userId=${userId}`)),
                    fetch(apiUrl(`/api/feedback/employee/${userId}?userId=${userId}`)),
                ]);
                await checkPaywall(dashRes);

                const dashData = await dashRes.json().catch(() => ({}));
                if (dashData.status === 'success') setData(dashData.data as DashboardData);

                const fbData = await fbRes.json().catch(() => ({}));
                if (fbData.status === 'success') {
                    const d = fbData.data as { feedback?: FeedbackItem[] } | FeedbackItem[] | undefined;
                    const list = Array.isArray(d) ? d : Array.isArray(d?.feedback) ? d.feedback : [];
                    setFeedback(list);
                }
            } catch {
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} />;

    const kras = (data?.kras || []).slice(0, 4);
    const selfDev = (data?.selfDevelopment || []).slice(0, 3);
    const periods: ReviewPeriod[] = data?.reviewPeriods || [
        { _id: 'pilot', name: 'pilot', label: 'Pilot', isActive: false },
        { _id: 'r1', name: 'r1', label: 'R1', isActive: true },
        { _id: 'r2', name: 'r2', label: 'R2', isActive: false },
        { _id: 'r3', name: 'r3', label: 'R3', isActive: false },
        { _id: 'r4', name: 'r4', label: 'R4', isActive: false },
    ];

    const idx = data?.fourDIndex ?? 0;
    const delta = data?.fourDIndexDelta ?? 0;

    return (
        <div className={styles.dashboardGrid}>
            {/* LEFT column */}
            <div className={styles.leftCol}>
                {/* Welcome card */}
                <div className={styles.card}>
                    <div className={styles.welcomeRow}>
                        <div className={styles.avatarLg}>{user?.name ? getInitials(user.name) : 'U'}</div>
                        <div className={styles.welcomeInfo}>
                            <h2 className={styles.welcomeName}>{user?.name || '—'}</h2>
                            <p className={styles.welcomeDesg}>{user?.designation || '—'}</p>
                            {user?.teamName && <p className={styles.welcomeTeam}>{user.teamName}</p>}
                        </div>
                        <div className={styles.indexBox}>
                            <span className={styles.indexScore}>{idx > 0 ? idx.toFixed(1) : '—'}</span>
                            <span className={styles.indexMax}>&nbsp;/ 5.0</span>
                            <p className={styles.indexLabel}>4D Index</p>
                            {delta !== 0 && (
                                <p className={`${styles.indexDelta} ${delta > 0 ? styles.deltaUp : styles.deltaDown}`}>
                                    {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} from last cycle
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* My KRAs summary */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>My KRAs</h3>
                        <button className={styles.linkBtn} onClick={() => onNavigate('dimensions')}>
                            View All →
                        </button>
                    </div>
                    {kras.length === 0 ? (
                        <EmptyState message="No KRAs assigned yet." />
                    ) : (
                        <div className={styles.kraList}>
                            {kras.map((kra, i) => {
                                const score = kra.pilotScore ?? 0;
                                return (
                                    <div key={kra._id || i} className={styles.kraRow}>
                                        <div className={styles.kraRowTop}>
                                            <span className={styles.kraTitle}>{kra.title}</span>
                                            <StatusBadge status={kra.status} />
                                        </div>
                                        <div className={styles.kraRowBottom}>
                                            <ScoreBar score={score} max={5} />
                                            <span className={styles.kraScore}>{score > 0 ? `${score}/5` : '—'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent feedback */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Recent Feedback</h3>
                        <button className={styles.linkBtn} onClick={() => onNavigate('feedback')}>
                            See All →
                        </button>
                    </div>
                    {feedback.length === 0 ? (
                        <EmptyState message="No feedback received yet." />
                    ) : (
                        <div className={styles.feedbackList}>
                            {feedback.slice(0, 2).map((fb, i) => (
                                <div key={fb._id || i} className={styles.feedbackItem}>
                                    <div className={styles.feedbackMeta}>
                                        <span className={styles.feedbackFrom}>
                                            {fb.fromName ?? fb.from?.name ?? 'Someone'}
                                        </span>
                                        <span className={styles.feedbackDate}>
                                            {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <p className={styles.feedbackContent}>{fb.content || '—'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT column */}
            <div className={styles.rightCol}>
                {/* Timeline */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>Review Timeline</h3>
                    <div className={styles.timeline}>
                        {periods.map((p) => (
                            <div
                                key={p._id}
                                className={`${styles.timelineItem} ${p.isActive ? styles.timelineActive : ''}`}
                            >
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineBody}>
                                    <span className={styles.timelinePeriod}>{p.label}</span>
                                    {p.startDate && (
                                        <span className={styles.timelineDate}>
                                            {new Date(p.startDate).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Self development summary */}
                <div className={styles.card}>
                    <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>Self Development</h3>
                    {selfDev.length === 0 ? (
                        <EmptyState message="No areas of concern defined." />
                    ) : (
                        <div className={styles.selfDevList}>
                            {selfDev.map((item, i) => {
                                const latestScore =
                                    item.scores && item.scores.length > 0
                                        ? item.scores[item.scores.length - 1].score ?? 0
                                        : 0;
                                return (
                                    <div key={item._id || i} className={styles.selfDevItem}>
                                        <span className={styles.selfDevArea}>{item.areaOfConcern}</span>
                                        {item.actionPlan && (
                                            <p className={styles.selfDevPlan}>{item.actionPlan}</p>
                                        )}
                                        {latestScore > 0 && (
                                            <ScoreBar score={latestScore} max={5} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 2 — MY 4 DIMENSIONS
═══════════════════════════════════════════ */

const ALL_PERIODS = ['pilot', 'r1', 'r2', 'r3', 'r4'];
const ORG_PERIODS = ['r1', 'r2', 'r3', 'r4'];

function DimensionsPage({
    userId,
    checkPaywall,
}: {
    userId: string;
    checkPaywall: (r: Response) => Promise<void>;
}) {
    const [activeTab, setActiveTab] = useState<DimTab>('functional');
    const [kraData, setKraData] = useState<KraData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [proofInputs, setProofInputs] = useState<Record<string, string>>({});
    const [successMsg, setSuccessMsg] = useState('');
    const [kraAddPanelOpen, setKraAddPanelOpen] = useState(false);
    const [selfDevAddPanelOpen, setSelfDevAddPanelOpen] = useState(false);
    const [devOthersAddPanelOpen, setDevOthersAddPanelOpen] = useState(false);
    const [kraForm, setKraForm] = useState({
        kra: '',
        kpis: [{ kpi: '', target: '' }],
        pilotWeight: '',
    });
    const [selfDevForm, setSelfDevForm] = useState({
        areaOfConcern: '',
        actionPlanInitiative: '',
    });
    const [devOthersForm, setDevOthersForm] = useState({
        personName: '',
        areaOfDevelopment: '',
    });
    const [kraFormError, setKraFormError] = useState('');
    const [selfDevFormError, setSelfDevFormError] = useState('');
    const [devOthersFormError, setDevOthersFormError] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kras?userId=${userId}`));
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') setKraData(normalizeKraData(d.data as KraDataRaw));
            else setError('Failed to load KRA data.');
        } catch {
            setError('Failed to load KRA data.');
        } finally {
            setLoading(false);
        }
    }, [userId, checkPaywall]);

    useEffect(() => { reload(); }, [reload]);

    const handleSubmitForApproval = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kra-status?userId=${userId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'pending_approval' }),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setSuccessMsg('KRAs submitted for approval!');
                setTimeout(() => setSuccessMsg(''), 3000);
                reload();
            }
        } catch {
            setError('Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnsubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kra-status?userId=${userId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'draft' }),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setSuccessMsg('KRAs returned to draft. You can continue editing.');
                setTimeout(() => setSuccessMsg(''), 3000);
                reload();
            }
        } catch {
            setError('Failed to un-submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const totalKraWeight = (kraData?.functional ?? []).reduce((s, k) => s + (k.weight ?? 0), 0);
    const remainingWeight = 100 - totalKraWeight;

    const handleAddKraSubmit = async () => {
        setKraFormError('');
        const kra = kraForm.kra.trim();
        const kpis = kraForm.kpis
            .map((p) => ({ kpi: p.kpi.trim(), target: p.target.trim() || undefined }))
            .filter((p) => p.kpi.length > 0);
        const pilotWeight = Number(kraForm.pilotWeight);

        if (!kra) {
            setKraFormError('KRA title is required');
            return;
        }
        if (kpis.length === 0) {
            setKraFormError('At least 1 KPI with description is required');
            return;
        }
        if (Number.isNaN(pilotWeight) || pilotWeight < 1 || pilotWeight > 100) {
            setKraFormError('Pilot weight must be a number between 1 and 100');
            return;
        }
        if (totalKraWeight + pilotWeight > 100) {
            setKraFormError(`Total KRA weights cannot exceed 100%. ${remainingWeight}% remaining.`);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kras/functional?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kra, kpis, pilotWeight }),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setKraAddPanelOpen(false);
                setKraForm({ kra: '', kpis: [{ kpi: '', target: '' }], pilotWeight: '' });
                setSuccessMsg('KRA added successfully');
                setTimeout(() => setSuccessMsg(''), 3000);
                reload();
            } else {
                setKraFormError(d.message || 'Failed to add KRA');
            }
        } catch {
            setKraFormError('Failed to add KRA. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddSelfDevSubmit = async () => {
        setSelfDevFormError('');
        const areaOfConcern = selfDevForm.areaOfConcern.trim();
        if (!areaOfConcern) {
            setSelfDevFormError('Area of concern is required');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kras/self-development?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    areaOfConcern,
                    actionPlanInitiative: selfDevForm.actionPlanInitiative.trim() || undefined,
                }),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setSelfDevAddPanelOpen(false);
                setSelfDevForm({ areaOfConcern: '', actionPlanInitiative: '' });
                setSuccessMsg('Self development area added successfully');
                setTimeout(() => setSuccessMsg(''), 3000);
                reload();
            } else {
                setSelfDevFormError(d.message || 'Failed to add area');
            }
        } catch {
            setSelfDevFormError('Failed to add area. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddDevOthersSubmit = async () => {
        setDevOthersFormError('');
        const personName = devOthersForm.personName.trim();
        if (!personName) {
            setDevOthersFormError('Person name is required');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(apiUrl(`/api/member/kras/developing-others?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personName,
                    areaOfDevelopment: devOthersForm.areaOfDevelopment.trim() || undefined,
                }),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setDevOthersAddPanelOpen(false);
                setDevOthersForm({ personName: '', areaOfDevelopment: '' });
                setSuccessMsg('Person added successfully');
                setTimeout(() => setSuccessMsg(''), 3000);
                reload();
            } else {
                setDevOthersFormError(d.message || 'Failed to add person');
            }
        } catch {
            setDevOthersFormError('Failed to add person. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={reload} />;

    const kraStatus = kraData?.kraStatus ?? 'draft';
    const isLocked = ['active', 'locked'].includes(kraStatus);

    const dimTabs: { id: DimTab; label: string }[] = [
        { id: 'functional', label: 'Functional' },
        { id: 'organizational', label: 'Organisational' },
        { id: 'selfDevelopment', label: 'Self Development' },
        { id: 'developingOthers', label: 'Developing Others' },
    ];

    return (
        <div className={styles.dimensionsWrap}>
            {/* Tabs */}
            <div className={styles.dimTabs}>
                {dimTabs.map((t) => (
                    <button
                        key={t.id}
                        className={`${styles.dimTab} ${activeTab === t.id ? styles.dimTabActive : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {successMsg && <div className={styles.successBanner}>{successMsg}</div>}

            {/* ── Functional ── */}
            {activeTab === 'functional' && (
                <div>
                    <div className={styles.dimActions}>
                        <div className={styles.dimStatusRow}>
                            <span className={styles.dimStatusLabel}>KRA Status:</span>
                            <StatusBadge status={kraStatus} />
                        </div>
                        <div className={styles.dimBtnGroup}>
                            {isLocked && (
                                <p className={styles.dimNote}>
                                    KRAs are locked for editing. Contact your supervisor to make changes.
                                </p>
                            )}
                            <button
                                className={styles.btnOutline}
                                onClick={() => setKraAddPanelOpen(true)}
                            >
                                + Add New KRA
                            </button>
                            {!isLocked && (
                                <>
                                    {kraStatus === 'draft' && (
                                        <button
                                            className={styles.btnPrimary}
                                            onClick={handleSubmitForApproval}
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Submitting…' : 'Submit for Approval'}
                                        </button>
                                    )}
                                    {kraStatus === 'pending_approval' && (
                                        <button
                                            className={styles.btnOutline}
                                            onClick={handleUnsubmit}
                                            disabled={submitting}
                                        >
                                            {submitting ? 'Un-submitting…' : 'Back to Draft'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {(kraData?.functional ?? []).length === 0 ? (
                        <EmptyState message="No KRAs defined yet. Add your first KRA." />
                    ) : (
                        <div className={styles.kraCards}>
                            {(kraData?.functional ?? []).map((kra, ki) => (
                                <div key={kra._id || ki} className={styles.kraCard}>
                                    <div className={styles.kraCardHeader}>
                                        <h4 className={styles.kraCardTitle}>{kra.title}</h4>
                                        <StatusBadge status={kra.status ?? kraStatus} />
                                    </div>

                                    {/* KPIs */}
                                    {(kra.kpis ?? []).length > 0 && (
                                        <div className={styles.kpiList}>
                                            {(kra.kpis ?? []).map((kpi, kpii) => (
                                                <div key={kpi._id || kpii} className={styles.kpiItem}>
                                                    <span className={styles.kpiDot} />
                                                    <span className={styles.kpiName}>{kpi.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Period scores table */}
                                    <div className={styles.periodTable}>
                                        <div className={styles.periodRow + ' ' + styles.periodHeader}>
                                            {ALL_PERIODS.map((p) => (
                                                <span key={p} className={styles.periodCell}>
                                                    {PERIOD_LABELS[p]}
                                                </span>
                                            ))}
                                        </div>
                                        <div className={styles.periodRow}>
                                            {ALL_PERIODS.map((p) => {
                                                const s = kra.scores?.find((sc) => sc.period === p);
                                                return (
                                                    <span key={p} className={styles.periodCell}>
                                                        {s?.score != null ? s.score : '—'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Proof upload */}
                                    <div className={styles.proofSection}>
                                        <span className={styles.proofLabel}>Proof:</span>
                                        {kra.proofLink ? (
                                            <a
                                                href={kra.proofLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.proofLink}
                                            >
                                                View Drive Link
                                            </a>
                                        ) : (
                                            <span className={styles.proofNone}>No proof uploaded</span>
                                        )}
                                        <input
                                            className={styles.proofInput}
                                            placeholder="Paste Drive link…"
                                            value={proofInputs[kra._id || ki] || ''}
                                            onChange={(e) =>
                                                setProofInputs((prev) => ({
                                                    ...prev,
                                                    [kra._id || ki]: e.target.value,
                                                }))
                                            }
                                        />
                                        <button
                                            className={styles.btnSmOutline}
                                            onClick={async () => {
                                                const link = proofInputs[kra._id || ki];
                                                if (!link || !kra._id) return;
                                                await fetch(apiUrl(`/api/member/kras/${kra._id}/proof?userId=${userId}`), {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ proofLink: link }),
                                                });
                                                reload();
                                            }}
                                        >
                                            Add Proof
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Organisational ── */}
            {activeTab === 'organizational' && (
                <div>
                    <p className={styles.dimNote}>
                        Core values are filled by your supervisor. This is read-only.
                    </p>
                    {(kraData?.organizational ?? []).length === 0 ? (
                        <EmptyState message="No core values configured by your organisation." />
                    ) : (
                        <div className={styles.kraCards}>
                            {(kraData?.organizational ?? []).map((val, vi) => (
                                <div key={val._id || vi} className={styles.kraCard}>
                                    <h4 className={styles.kraCardTitle}>{val.name}</h4>
                                    <div className={styles.periodTable}>
                                        <div className={styles.periodRow + ' ' + styles.periodHeader}>
                                            {ORG_PERIODS.map((p) => (
                                                <span key={p} className={styles.periodCell}>{PERIOD_LABELS[p]}</span>
                                            ))}
                                        </div>
                                        <div className={styles.periodRow}>
                                            {ORG_PERIODS.map((p) => {
                                                const s = val.scores?.find((sc) => sc.period === p);
                                                return (
                                                    <span key={p} className={styles.periodCell}>
                                                        {s?.score != null ? s.score : '—'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Critical incidents */}
                                    {(val.criticalIncidents ?? []).length > 0 && (
                                        <div className={styles.incidentList}>
                                            {(val.criticalIncidents ?? []).map((ci, cii) => (
                                                <div key={cii} className={styles.incidentItem}>
                                                    <span className={styles.incidentPeriod}>{PERIOD_LABELS[ci.period] || ci.period}:</span>
                                                    <span className={styles.incidentText}>{ci.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Self Development ── */}
            {activeTab === 'selfDevelopment' && (
                <div>
                    <div className={styles.dimActions}>
                        <div>
                            {isLocked && (
                                <p className={styles.dimNote}>
                                    KRAs are locked for editing. Contact your supervisor to make changes.
                                </p>
                            )}
                        </div>
                        <button
                            className={styles.btnOutline}
                            onClick={() => setSelfDevAddPanelOpen(true)}
                        >
                            + Add Area
                        </button>
                    </div>
                    {(kraData?.selfDevelopment ?? []).length === 0 ? (
                        <EmptyState message="No areas of concern defined yet." />
                    ) : (
                        <div className={styles.kraCards}>
                            {(kraData?.selfDevelopment ?? []).map((item, i) => (
                                <div key={item._id || i} className={styles.kraCard}>
                                    <h4 className={styles.kraCardTitle}>{item.areaOfConcern}</h4>
                                    {item.actionPlan && (
                                        <p className={styles.actionPlan}>{item.actionPlan}</p>
                                    )}
                                    <div className={styles.periodTable}>
                                        <div className={styles.periodRow + ' ' + styles.periodHeader}>
                                            {ALL_PERIODS.map((p) => (
                                                <span key={p} className={styles.periodCell}>{PERIOD_LABELS[p]}</span>
                                            ))}
                                        </div>
                                        <div className={styles.periodRow}>
                                            {ALL_PERIODS.map((p) => {
                                                const s = item.scores?.find((sc) => sc.period === p);
                                                return (
                                                    <span key={p} className={styles.periodCell}>
                                                        {s?.score != null ? s.score : '—'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Developing Others ── */}
            {activeTab === 'developingOthers' && (
                <div>
                    <div className={styles.dimActions}>
                        <div>
                            {isLocked && (
                                <p className={styles.dimNote}>
                                    KRAs are locked for editing. Contact your supervisor to make changes.
                                </p>
                            )}
                        </div>
                        <button
                            className={styles.btnOutline}
                            onClick={() => setDevOthersAddPanelOpen(true)}
                        >
                            + Add Person
                        </button>
                    </div>
                    <div className={styles.dimNote}>
                        Auto-populated from your direct reports' low Self Development scores. You may also add entries manually.
                    </div>
                    {(kraData?.developingOthers ?? []).length === 0 ? (
                        <EmptyState message="No developing others entries yet." />
                    ) : (
                        <div className={styles.kraCards}>
                            {(kraData?.developingOthers ?? []).map((item, i) => (
                                <div key={item._id || i} className={styles.kraCard}>
                                    <h4 className={styles.kraCardTitle}>{item.personName}</h4>
                                    {item.areaOfDevelopment && (
                                        <p className={styles.actionPlan}>{item.areaOfDevelopment}</p>
                                    )}
                                    <div className={styles.periodTable}>
                                        <div className={styles.periodRow + ' ' + styles.periodHeader}>
                                            {ALL_PERIODS.map((p) => (
                                                <span key={p} className={styles.periodCell}>{PERIOD_LABELS[p]}</span>
                                            ))}
                                        </div>
                                        <div className={styles.periodRow}>
                                            {ALL_PERIODS.map((p) => {
                                                const s = item.scores?.find((sc) => sc.period === p);
                                                return (
                                                    <span key={p} className={styles.periodCell}>
                                                        {s?.score != null ? s.score : '—'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Add KRA Slide Panel ── */}
            {kraAddPanelOpen && (
                <>
                    <div className={styles.panelOverlay} onClick={() => setKraAddPanelOpen(false)} />
                    <aside className={styles.slidePanel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Add New KRA</h3>
                            <button className={styles.panelClose} onClick={() => setKraAddPanelOpen(false)}>✕</button>
                        </div>
                        <div className={styles.panelBody}>
                            {kraFormError && <div className={styles.errorBanner}>{kraFormError}</div>}
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>KRA Title *</label>
                                <input
                                    className={styles.formInput}
                                    type="text"
                                    placeholder="Enter KRA title"
                                    value={kraForm.kra}
                                    onChange={(e) => setKraForm((prev) => ({ ...prev, kra: e.target.value }))}
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>KPIs *</label>
                                <p className={styles.formHint}>Minimum 1, maximum 5 KPIs. Each has Description + Target.</p>
                                {(kraForm.kpis).map((kpi, idx) => (
                                    <div key={idx} className={styles.kpiFormRow}>
                                        <input
                                            className={styles.formInput}
                                            placeholder="Description"
                                            value={kpi.kpi}
                                            onChange={(e) =>
                                                setKraForm((prev) => ({
                                                    ...prev,
                                                    kpis: prev.kpis.map((p, i) =>
                                                        i === idx ? { ...p, kpi: e.target.value } : p
                                                    ),
                                                }))
                                            }
                                        />
                                        <input
                                            className={styles.formInput}
                                            placeholder="Target"
                                            value={kpi.target}
                                            onChange={(e) =>
                                                setKraForm((prev) => ({
                                                    ...prev,
                                                    kpis: prev.kpis.map((p, i) =>
                                                        i === idx ? { ...p, target: e.target.value } : p
                                                    ),
                                                }))
                                            }
                                        />
                                        {kraForm.kpis.length > 1 && (
                                            <button
                                                type="button"
                                                className={styles.btnSmOutline}
                                                onClick={() =>
                                                    setKraForm((prev) => ({
                                                        ...prev,
                                                        kpis: prev.kpis.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                aria-label="Remove KPI"
                                            >
                                                −
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {kraForm.kpis.length < 5 && (
                                    <button
                                        type="button"
                                        className={styles.btnSmOutline}
                                        onClick={() =>
                                            setKraForm((prev) => ({
                                                ...prev,
                                                kpis: [...prev.kpis, { kpi: '', target: '' }],
                                            }))
                                        }
                                    >
                                        + Add KPI
                                    </button>
                                )}
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Pilot Weight (1–100) *</label>
                                <p className={styles.formHint}>
                                    Weight shows how critical this KRA is. All KRA weights must add up to 100%. {remainingWeight}% remaining.
                                </p>
                                <input
                                    className={styles.formInput}
                                    type="number"
                                    min={1}
                                    max={100}
                                    placeholder="e.g. 25"
                                    value={kraForm.pilotWeight}
                                    onChange={(e) => setKraForm((prev) => ({ ...prev, pilotWeight: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className={styles.panelFooter}>
                            <button
                                className={styles.btnPrimary}
                                onClick={handleAddKraSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Adding…' : 'Add KRA'}
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* ── Add Self Development Area Slide Panel ── */}
            {selfDevAddPanelOpen && (
                <>
                    <div className={styles.panelOverlay} onClick={() => setSelfDevAddPanelOpen(false)} />
                    <aside className={styles.slidePanel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Add Self Development Area</h3>
                            <button className={styles.panelClose} onClick={() => setSelfDevAddPanelOpen(false)}>✕</button>
                        </div>
                        <div className={styles.panelBody}>
                            {selfDevFormError && <div className={styles.errorBanner}>{selfDevFormError}</div>}
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Area of Concern *</label>
                                <input
                                    className={styles.formInput}
                                    type="text"
                                    placeholder="Enter area of concern"
                                    value={selfDevForm.areaOfConcern}
                                    onChange={(e) =>
                                        setSelfDevForm((prev) => ({ ...prev, areaOfConcern: e.target.value }))
                                    }
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Action Plan / Initiative</label>
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder="Describe your action plan or initiative"
                                    rows={4}
                                    value={selfDevForm.actionPlanInitiative}
                                    onChange={(e) =>
                                        setSelfDevForm((prev) => ({ ...prev, actionPlanInitiative: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className={styles.panelFooter}>
                            <button
                                className={styles.btnPrimary}
                                onClick={handleAddSelfDevSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Adding…' : 'Add Area'}
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* ── Add Person (Developing Others) Slide Panel ── */}
            {devOthersAddPanelOpen && (
                <>
                    <div className={styles.panelOverlay} onClick={() => setDevOthersAddPanelOpen(false)} />
                    <aside className={styles.slidePanel}>
                        <div className={styles.panelHeader}>
                            <h3 className={styles.panelTitle}>Add Person (Developing Others)</h3>
                            <button className={styles.panelClose} onClick={() => setDevOthersAddPanelOpen(false)}>✕</button>
                        </div>
                        <div className={styles.panelBody}>
                            {devOthersFormError && <div className={styles.errorBanner}>{devOthersFormError}</div>}
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Person Name *</label>
                                <input
                                    className={styles.formInput}
                                    type="text"
                                    placeholder="Enter person name"
                                    value={devOthersForm.personName}
                                    onChange={(e) =>
                                        setDevOthersForm((prev) => ({ ...prev, personName: e.target.value }))
                                    }
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Area of Development</label>
                                <textarea
                                    className={styles.formTextarea}
                                    placeholder="Describe area of development"
                                    rows={4}
                                    value={devOthersForm.areaOfDevelopment}
                                    onChange={(e) =>
                                        setDevOthersForm((prev) => ({ ...prev, areaOfDevelopment: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                        <div className={styles.panelFooter}>
                            <button
                                className={styles.btnPrimary}
                                onClick={handleAddDevOthersSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Adding…' : 'Add Person'}
                            </button>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 3 — MY TEAM (stub — full in Part 2)
═══════════════════════════════════════════ */

function TeamPage({
    userId,
    checkPaywall,
}: {
    userId: string;
    checkPaywall: (r: Response) => Promise<void>;
}) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [treeMode, setTreeMode] = useState<'direct' | 'full'>('direct');
    const [fullTree, setFullTree] = useState<TeamMember[]>([]);
    const [rejectNote, setRejectNote] = useState('');
    const [actionMsg, setActionMsg] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl(`/api/member/team?userId=${userId}`));
                await checkPaywall(res);
                const d = await res.json().catch(() => ({}));
                if (d.status === 'success') {
                    const raw = (d.data ?? []) as Array<{
                        _id: string;
                        name: string;
                        designation?: string;
                        role?: string;
                        kraStatus?: KraStatus;
                        functionalKRAs?: TeamMember['functionalKRAs'];
                        organizationalKRAs?: OrgValue[];
                        selfDevelopmentKRAs?: SelfDevItem[];
                        developingOthersKRAs?: DevOthersItem[];
                        scores?: { fourDIndex?: number };
                    }>;
                    setMembers(raw.map((m) => ({
                        _id: m._id,
                        name: m.name,
                        designation: m.designation,
                        fourDIndex: m.scores?.fourDIndex,
                        kraStatus: m.kraStatus,
                        functionalKRAs: m.functionalKRAs ?? [],
                        organizationalKRAs: m.organizationalKRAs ?? [],
                        selfDevelopmentKRAs: m.selfDevelopmentKRAs ?? [],
                        developingOthersKRAs: m.developingOthersKRAs ?? [],
                    })));
                } else setError('Failed to load team data.');
            } catch {
                setError('Failed to load team data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall]);

    const loadFullTree = async () => {
        try {
            const res = await fetch(apiUrl(`/api/member/subtree?userId=${userId}`));
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') setFullTree(d.data as TeamMember[]);
        } catch { /* ignore */ }
    };

    const handleApproveKRAs = async (memberId: string) => {
        try {
            const res = await fetch(apiUrl(`/api/member/team/${memberId}/approve?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            await checkPaywall(res);
            setActionMsg('KRAs approved!');
            setTimeout(() => setActionMsg(''), 3000);
        } catch { /* ignore */ }
    };

    const handleRejectKRAs = async (memberId: string) => {
        try {
            const res = await fetch(apiUrl(`/api/member/team/${memberId}/reject?userId=${userId}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: rejectNote }),
            });
            await checkPaywall(res);
            setActionMsg('KRAs sent back for revision.');
            setRejectNote('');
            setTimeout(() => setActionMsg(''), 3000);
        } catch { /* ignore */ }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} />;

    const displayMembers = treeMode === 'full' && fullTree.length > 0 ? fullTree : members;

    return (
        <div className={styles.teamWrap}>
            {/* Executive toggle */}
            <div className={styles.teamControls}>
                <div className={styles.treeToggle}>
                    <button
                        className={`${styles.toggleBtn} ${treeMode === 'direct' ? styles.toggleActive : ''}`}
                        onClick={() => setTreeMode('direct')}
                    >
                        Direct Reports
                    </button>
                    <button
                        className={`${styles.toggleBtn} ${treeMode === 'full' ? styles.toggleActive : ''}`}
                        onClick={() => { setTreeMode('full'); loadFullTree(); }}
                    >
                        Full Tree
                    </button>
                </div>
            </div>

            {displayMembers.length === 0 ? (
                <EmptyState message="No team members found." />
            ) : (
                <div className={styles.teamGrid}>
                    {displayMembers.map((m) => (
                        <div key={m._id} className={styles.teamCard}>
                            <div className={styles.teamCardAvatar}>{getInitials(m.name)}</div>
                            <div className={styles.teamCardInfo}>
                                <span className={styles.teamCardName}>{m.name}</span>
                                <span className={styles.teamCardDesg}>{m.designation || '—'}</span>
                            </div>
                            <div className={styles.teamCardMeta}>
                                {m.fourDIndex != null && (
                                    <span className={styles.teamCardScore}>{m.fourDIndex.toFixed(1)} / 5.0</span>
                                )}
                                <StatusBadge status={m.kraStatus} />
                            </div>
                            <button
                                className={styles.btnSmPrimary}
                                onClick={() => { setSelectedMember(m); setPanelOpen(true); }}
                            >
                                View KRAs
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Slide panel */}
            {panelOpen && selectedMember && (
                <>
                    <div className={styles.panelOverlay} onClick={() => setPanelOpen(false)} />
                    <aside className={styles.slidePanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <h3 className={styles.panelTitle}>{selectedMember.name}'s KRAs</h3>
                                <StatusBadge status={selectedMember.kraStatus} />
                            </div>
                            <button className={styles.panelClose} onClick={() => setPanelOpen(false)}>✕</button>
                        </div>

                        {actionMsg && <div className={styles.successBanner}>{actionMsg}</div>}

                        <div className={styles.panelBody}>
                            {(selectedMember.functionalKRAs ?? []).length === 0 ? (
                                <EmptyState message="No KRAs found for this member." />
                            ) : (
                                (selectedMember.functionalKRAs ?? []).map((kra, ki) => {
                                    const getScore = (period: string) => {
                                        if (period === 'pilot') return kra.pilotScore;
                                        if (period === 'r1') return kra.r1Score;
                                        if (period === 'r2') return kra.r2Score;
                                        if (period === 'r3') return kra.r3Score;
                                        if (period === 'r4') return kra.r4Score;
                                        return undefined;
                                    };
                                    return (
                                        <div key={ki} className={styles.kraCard}>
                                            <h4 className={styles.kraCardTitle}>{kra.kra}</h4>
                                            {(kra.kpis ?? []).length > 0 && (
                                                <div className={styles.kpiList}>
                                                    {(kra.kpis ?? []).map((kpi, kpii) => (
                                                        <div key={kpii} className={styles.kpiItem}>
                                                            <span className={styles.kpiDot} />
                                                            <span className={styles.kpiName}>{kpi.kpi}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={styles.periodTable}>
                                                <div className={styles.periodRow + ' ' + styles.periodHeader}>
                                                    {ALL_PERIODS.map((p) => (
                                                        <span key={p} className={styles.periodCell}>{PERIOD_LABELS[p]}</span>
                                                    ))}
                                                </div>
                                                <div className={styles.periodRow}>
                                                    {ALL_PERIODS.map((p) => {
                                                        const score = getScore(p);
                                                        return (
                                                            <span key={p} className={styles.periodCell}>
                                                                {score != null ? score : '—'}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {selectedMember.kraStatus === 'pending_approval' && (
                            <div className={styles.panelFooter}>
                                <button
                                    className={styles.btnPrimary}
                                    onClick={() => handleApproveKRAs(selectedMember._id)}
                                >
                                    ✓ Approve KRAs
                                </button>
                                <div className={styles.rejectRow}>
                                    <input
                                        className={styles.proofInput}
                                        placeholder="Rejection note…"
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                    />
                                    <button
                                        className={styles.btnDanger}
                                        onClick={() => handleRejectKRAs(selectedMember._id)}
                                        disabled={!rejectNote.trim()}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 4 — FEEDBACK
═══════════════════════════════════════════ */

function FeedbackPage({
    userId,
    checkPaywall,
}: {
    userId: string;
    checkPaywall: (r: Response) => Promise<void>;
}) {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl(`/api/feedback/employee/${userId}?userId=${userId}`));
                await checkPaywall(res);
                const d = await res.json().catch(() => ({}));
                if (d.status === 'success') {
                    const raw = d.data as { feedback?: FeedbackItem[] } | FeedbackItem[] | undefined;
                    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.feedback) ? raw.feedback : [];
                    setFeedback(list);
                } else setError('Failed to load feedback.');
            } catch {
                setError('Failed to load feedback.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} />;
    if (feedback.length === 0) return <EmptyState message="No feedback received yet." icon="💬" />;

    return (
        <div className={styles.feedbackPage}>
            {feedback.map((fb, i) => (
                <div key={fb._id || i} className={styles.feedbackCard}>
                    <div className={styles.feedbackCardMeta}>
                        <div className={styles.feedbackAvatar}>
                            {getInitials(fb.fromName ?? fb.from?.name ?? 'AN')}
                        </div>
                        <div>
                            <span className={styles.feedbackFrom}>{fb.fromName ?? fb.from?.name ?? 'Anonymous'}</span>
                            {fb.createdAt && (
                                <span className={styles.feedbackDate}>
                                    {new Date(fb.createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {fb.type && <span className={styles.feedbackType}>{fb.type}</span>}
                    </div>
                    <p className={styles.feedbackContent}>{fb.content || '—'}</p>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 5 — NOTIFICATIONS
═══════════════════════════════════════════ */

function NotificationsPage({
    userId,
    checkPaywall,
    onRead,
}: {
    userId: string;
    checkPaywall: (r: Response) => Promise<void>;
    onRead: () => void;
}) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl(`/api/notifications?userId=${userId}`));
                await checkPaywall(res);
                const d = await res.json().catch(() => ({}));
                if (d.status === 'success')
                    setNotifications(d.data?.notifications || d.data || []);
                else setError('Failed to load notifications.');
            } catch {
                setError('Failed to load notifications.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall]);

    const markRead = async (id: string | undefined, idx: number) => {
        if (!id) return;
        setNotifications((prev) =>
            prev.map((n, i) => (i === idx ? { ...n, isRead: true } : n)),
        );
        onRead();
        try {
            await fetch(apiUrl(`/api/notifications/${id}/read?userId=${userId}`), { method: 'PUT' });
        } catch { /* ignore */ }
    };

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} />;
    if (notifications.length === 0) return <EmptyState message="No notifications yet." icon="🔔" />;

    return (
        <div className={styles.notifList}>
            {notifications.map((n, i) => (
                <div
                    key={n._id || i}
                    className={`${styles.notifItem} ${!n.isRead ? styles.notifUnread : ''}`}
                    onClick={() => markRead(n._id, i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && markRead(n._id, i)}
                >
                    <div className={styles.notifBody}>
                        <p className={`${styles.notifMessage} ${!n.isRead ? styles.notifBold : ''}`}>
                            {n.message}
                        </p>
                        {n.createdAt && (
                            <span className={styles.notifDate}>
                                {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    {!n.isRead && <span className={styles.unreadDot} />}
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════
   PAGE 6 — SETTINGS
═══════════════════════════════════════════ */

function SettingsPage({
    userId,
    user,
    setUser,
    checkPaywall,
}: {
    userId: string;
    user: UserProfile | null;
    setUser: (u: UserProfile) => void;
    checkPaywall: (r: Response) => Promise<void>;
}) {
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        mobile: user?.mobile || '',
        designation: user?.designation || '',
        aboutMe: user?.aboutMe || '',
    });
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl(`/api/user/profile?userId=${userId}`));
                await checkPaywall(res);
                const d = await res.json().catch(() => ({}));
                if (d.status === 'success' && d.data) {
                    const p = d.data as UserProfile;
                    setForm({
                        name: p.name || '',
                        email: p.email || '',
                        mobile: p.mobile || '',
                        designation: p.designation || '',
                        aboutMe: p.aboutMe || '',
                    });
                }
            } catch { /* ignore */ }
        };
        load();
    }, [userId, checkPaywall]);

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(apiUrl(`/api/user/profile?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            await checkPaywall(res);
            const d = await res.json().catch(() => ({}));
            if (d.status === 'success') {
                setSaveMsg('Profile updated!');
                setUser({ ...user!, ...form });
                setTimeout(() => setSaveMsg(''), 3000);
            } else {
                setError(d.message || 'Save failed.');
            }
        } catch {
            setError('Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.settingsWrap}>
            <div className={styles.card}>
                <h3 className={styles.cardTitle} style={{ marginBottom: 20 }}>Profile Settings</h3>

                {saveMsg && <div className={styles.successBanner}>{saveMsg}</div>}
                {error && <div className={styles.errorBanner}>{error}</div>}

                <div className={styles.settingsForm}>
                    {(
                        [
                            { label: 'Full Name', key: 'name', type: 'text' },
                            { label: 'Email', key: 'email', type: 'email' },
                            { label: 'Mobile', key: 'mobile', type: 'tel' },
                            { label: 'Designation', key: 'designation', type: 'text' },
                        ] as { label: string; key: keyof typeof form; type: string }[]
                    ).map(({ label, key, type }) => (
                        <div key={key} className={styles.formField}>
                            <label className={styles.formLabel}>{label}</label>
                            <input
                                className={styles.formInput}
                                type={type}
                                value={form[key]}
                                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                            />
                        </div>
                    ))}

                    <div className={styles.formField}>
                        <label className={styles.formLabel}>About Me</label>
                        <textarea
                            className={styles.formTextarea}
                            value={form.aboutMe}
                            rows={4}
                            onChange={(e) => setForm((prev) => ({ ...prev, aboutMe: e.target.value }))}
                        />
                    </div>

                    <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────── Shared UI ─────────────────────────── */

function PageLoader() {
    return (
        <div className={styles.pageLoader}>
            <div className={styles.spinner} />
        </div>
    );
}

function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className={styles.pageError}>
            <p>{message}</p>
            {onRetry && (
                <button className={styles.btnOutline} onClick={onRetry}>
                    Retry
                </button>
            )}
        </div>
    );
}

function EmptyState({ message, icon = '📭' }: { message: string; icon?: string }) {
    return (
        <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>{icon}</span>
            <p>{message}</p>
        </div>
    );
}
