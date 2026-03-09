import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './OrgAdminDashboard.module.css';
import logo from '@/assets/logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = 'dashboard' | 'people' | 'orgtree' | 'corevalues' | 'reviewcycles' | 'settings';

interface Member {
    _id: string;
    name: string;
    email: string;
    mobile?: string;
    designation?: string;
    reportsTo?: string | { _id: string; name: string };
    status?: 'active' | 'invited' | 'pending';
}

interface ActivityItem {
    _id: string;
    action: string;
    description?: string;
    createdAt: string;
    type?: string;
}

interface Stats {
    totalMembers: number;
    pendingInvites: number;
    activeReviewPeriod?: string;
    activeReviewPeriodEnd?: string;
    coreValuesCount: number;
}

interface TreeNode {
    id: string;
    name: string;
    designation?: string;
    children?: TreeNode[];
}

interface CoreValue {
    _id: string;
    title: string;
    description: string;
}

interface ReviewCycle {
    _id: string;
    period: string;
    startDate?: string;
    endDate?: string;
    status: 'upcoming' | 'active' | 'completed';
}

interface OrgDetails {
    _id: string;
    name: string;
    industry?: string;
    size?: number;
    subscriptionStatus?: 'active' | 'trial' | 'expired';
    trialExpiry?: string;
}

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (d?: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const relativeTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const resolveReportsTo = (m: Member): string => {
    if (!m.reportsTo) return '—';
    if (typeof m.reportsTo === 'object') return m.reportsTo.name;
    return m.reportsTo;
};

// ─── Shared Sub-components ────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
    const cls =
        status === 'active' || status === 'Active' ? styles.badgeActive :
            status === 'invited' || status === 'Invited' ? styles.badgeInvited :
                status === 'completed' || status === 'Completed' ? styles.badgeCompleted :
                    status === 'upcoming' || status === 'Upcoming' ? styles.badgeUpcoming :
                        styles.badgePending;
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
    return (
        <div className={styles.toastContainer}>
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`${styles.toast} ${t.type === 'success' ? styles.toastSuccess : styles.toastError}`}
                    onClick={() => onDismiss(t.id)}
                >
                    <span>{t.type === 'success' ? '✓' : '✕'}</span>
                    <span>{t.message}</span>
                </div>
            ))}
        </div>
    );
}

function ConfirmDialog({
    title,
    body,
    onConfirm,
    onCancel,
}: {
    title: string;
    body: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className={styles.dialogBackdrop} onClick={onCancel}>
            <div className={styles.dialog} onClick={e => e.stopPropagation()}>
                <p className={styles.dialogTitle}>{title}</p>
                <p className={styles.dialogBody}>{body}</p>
                <div className={styles.dialogActions}>
                    <button className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
                    <button className={styles.btnPrimary} style={{ background: '#dc2626' }} onClick={onConfirm}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Nav Icons (inline SVG) ────────────────────────────────────────────────────

const icons = {
    dashboard: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    people: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    tree: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v6M4 8h16M4 8v4M20 8v4M4 12v4h4M20 12v4h-4M8 16h8M8 16v4M16 16v4" />
        </svg>
    ),
    values: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    ),
    cycles: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
    ),
    settings: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    logout: (
        <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
    edit: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    ),
    trash: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    plus: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    ),
    search: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    close: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OrgAdminDashboard() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId') ?? '';

    if (!userId) {
        navigate('/auth/login');
    }

    const [page, setPage] = useState<Page>('dashboard');
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirm, setConfirm] = useState<{ title: string; body: string; onConfirm: () => void } | null>(null);

    // ── Toast helpers ──────────────────────────────────────────────────────────
    const toastId = useRef(0);
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = ++toastId.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    // ── Paywall check ──────────────────────────────────────────────────────────
    const checkPaywall = useCallback(async (res: Response) => {
        if (res.status === 403) {
            const data = await res.clone().json().catch(() => ({}));
            if (data.code === 'SUBSCRIPTION_EXPIRED') {
                navigate('/paywall');
                return true;
            }
        }
        return false;
    }, [navigate]);

    // ── Org info (for sidebar) ─────────────────────────────────────────────────
    const [orgName, setOrgName] = useState('');
    const [adminName, setAdminName] = useState('Org Admin');

    useEffect(() => {
        const fetchBase = async () => {
            try {
                const [profRes, orgRes] = await Promise.all([
                    fetch(apiUrl(`/api/user/profile?userId=${userId}`)),
                    fetch(apiUrl(`/api/organizations/me?userId=${userId}`)),
                ]);
                if (!await checkPaywall(profRes)) {
                    const pd = await profRes.json();
                    if (pd.status === 'success' && pd.data) setAdminName(pd.data.name ?? 'Org Admin');
                }
                if (!await checkPaywall(orgRes)) {
                    const od = await orgRes.json();
                    if (od.status === 'success' && od.data) setOrgName(od.data.name ?? '');
                }
            } catch { /* silent */ }
        };
        if (userId) fetchBase();
    }, [userId, checkPaywall]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
        { id: 'people', label: 'People', icon: icons.people },
        { id: 'orgtree', label: 'Org Tree', icon: icons.tree },
        { id: 'corevalues', label: 'Core Values', icon: icons.values },
        { id: 'reviewcycles', label: 'Review Cycles', icon: icons.cycles },
        { id: 'settings', label: 'Settings', icon: icons.settings },
    ];

    const pageTitles: Record<Page, string> = {
        dashboard: 'Dashboard',
        people: 'People',
        orgtree: 'Org Tree',
        corevalues: 'Core Values',
        reviewcycles: 'Review Cycles',
        settings: 'Settings',
    };

    return (
        <div className={styles.root}>
            {/* ── Sidebar ── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTop}>
                    <div className={styles.logoRow}>
                        <div className={styles.logoIcon}>
                            <img src={logo} alt="LCPL" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div>
                            <div className={styles.logoText}>LCPL</div>
                            <div className={styles.logoSub}>Org Admin</div>
                        </div>
                    </div>
                    <nav className={styles.nav}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                className={`${styles.navItem} ${page === item.id ? styles.navItemActive : ''}`}
                                onClick={() => setPage(item.id)}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                        <div className={styles.navDivider} />
                        <button className={`${styles.navItem} ${styles.navLogout}`} onClick={handleLogout}>
                            {icons.logout}
                            Logout
                        </button>
                    </nav>
                </div>
                {orgName && (
                    <div className={styles.sidebarFooter}>
                        <div className={styles.orgChip}>
                            <span className={styles.orgChipIcon}>🏢</span>
                            <span className={styles.orgChipName}>{orgName}</span>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main ── */}
            <main className={styles.main}>
                <header className={styles.topBar}>
                    <h2 className={styles.topBarTitle}>{pageTitles[page]}</h2>
                    <div className={styles.topBarRight}>
                        <span style={{ fontSize: 13, color: '#64748b' }}>{adminName}</span>
                        <div className={styles.avatar}>{initials(adminName)}</div>
                    </div>
                </header>

                <div className={styles.pageArea}>
                    {page === 'dashboard' && (
                        <DashboardPage userId={userId} showToast={showToast} checkPaywall={checkPaywall} />
                    )}
                    {page === 'people' && (
                        <PeoplePage userId={userId} showToast={showToast} checkPaywall={checkPaywall} setConfirm={setConfirm} />
                    )}
                    {page === 'orgtree' && (
                        <OrgTreePage userId={userId} checkPaywall={checkPaywall} />
                    )}
                    {page === 'corevalues' && (
                        <CoreValuesPage userId={userId} showToast={showToast} checkPaywall={checkPaywall} setConfirm={setConfirm} />
                    )}
                    {page === 'reviewcycles' && (
                        <ReviewCyclesPage userId={userId} showToast={showToast} checkPaywall={checkPaywall} />
                    )}
                    {page === 'settings' && (
                        <SettingsPage userId={userId} showToast={showToast} checkPaywall={checkPaywall} />
                    )}
                </div>
            </main>

            {/* ── Toasts ── */}
            <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

            {/* ── Confirm dialog ── */}
            {confirm && (
                <ConfirmDialog
                    title={confirm.title}
                    body={confirm.body}
                    onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardPage({
    userId, showToast, checkPaywall,
}: {
    userId: string;
    showToast: (m: string, t?: 'success' | 'error') => void;
    checkPaywall: (r: Response) => Promise<boolean>;
}) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, aRes] = await Promise.all([
                    fetch(apiUrl(`/api/org-admin/stats?userId=${userId}`)),
                    fetch(apiUrl(`/api/org-admin/activity?userId=${userId}`)),
                ]);
                if (await checkPaywall(sRes)) return;
                const sd = await sRes.json();
                const ad = await aRes.json();
                if (sd.status === 'success') setStats(sd.data);
                if (ad.status === 'success') setActivity(ad.data?.slice(0, 5) ?? []);
            } catch {
                setError('Failed to load dashboard data');
                showToast('Failed to load dashboard', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall, showToast]);

    if (loading) return <div className={styles.loadingState}>Loading dashboard…</div>;
    if (error) return <div className={styles.errorState}>{error}</div>;

    const activityIconClass = (type?: string) => {
        if (type === 'member_added') return styles.activityIconGreen;
        if (type === 'core_value') return styles.activityIconBlue;
        if (type === 'review_cycle') return styles.activityIconAmber;
        return styles.activityIconSlate;
    };

    return (
        <>
            <div className={styles.statGrid}>
                <div className={styles.statCard}>
                    <p className={styles.statLabel}>Total Members</p>
                    <h3 className={styles.statValue}>{stats?.totalMembers ?? 0}</h3>
                    <p className={`${styles.statSub} ${styles.statSubGreen}`}>Organization members</p>
                </div>
                <div className={styles.statCard}>
                    <p className={styles.statLabel}>Pending Invites</p>
                    <h3 className={styles.statValue}>{stats?.pendingInvites ?? 0}</h3>
                    <p className={`${styles.statSub} ${styles.statSubAmber}`}>Awaiting response</p>
                </div>
                <div className={styles.statCard}>
                    <p className={styles.statLabel}>Active Review Period</p>
                    <h3 className={styles.statValue} style={{ fontSize: 22 }}>
                        {stats?.activeReviewPeriod ?? 'None'}
                    </h3>
                    {stats?.activeReviewPeriodEnd && (
                        <p className={styles.statSub}>Ends {formatDate(stats.activeReviewPeriodEnd)}</p>
                    )}
                </div>
                <div className={styles.statCard}>
                    <p className={styles.statLabel}>Core Values Set</p>
                    <h3 className={styles.statValue}>{stats?.coreValuesCount ?? 0}/6</h3>
                    <div className={styles.statProgress}>
                        <div
                            className={styles.statProgressBar}
                            style={{ width: `${((stats?.coreValuesCount ?? 0) / 6) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Recent Activity</h3>
                </div>
                <ul className={styles.activityList}>
                    {activity.length === 0 ? (
                        <li style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                            No recent activity
                        </li>
                    ) : activity.map(item => (
                        <li key={item._id} className={styles.activityItem}>
                            <div className={styles.activityLeft}>
                                <div className={`${styles.activityIcon} ${activityIconClass(item.type)}`}>
                                    {item.type === 'member_added' ? '👤' :
                                        item.type === 'core_value' ? '⭐' :
                                            item.type === 'review_cycle' ? '🔄' : '📋'}
                                </div>
                                <div>
                                    <p className={styles.activityAction}>{item.action}</p>
                                    {item.description && <p className={styles.activityDesc}>{item.description}</p>}
                                </div>
                            </div>
                            <span className={styles.activityTime}>{relativeTime(item.createdAt)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — People
// ═══════════════════════════════════════════════════════════════════════════════

function PeoplePage({
    userId, showToast, checkPaywall, setConfirm,
}: {
    userId: string;
    showToast: (m: string, t?: 'success' | 'error') => void;
    checkPaywall: (r: Response) => Promise<boolean>;
    setConfirm: (c: { title: string; body: string; onConfirm: () => void } | null) => void;
}) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showPanel, setShowPanel] = useState(false);
    const [editMember, setEditMember] = useState<Member | null>(null);

    const [form, setForm] = useState({ name: '', email: '', mobile: '', designation: '', reportsTo: '' });
    const [reportsSearch, setReportsSearch] = useState('');
    const [reportsDropOpen, setReportsDropOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch(apiUrl(`/api/org-admin/members?userId=${userId}`));
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (data.status === 'success') setMembers(data.data ?? []);
        } catch {
            showToast('Failed to load members', 'error');
        } finally {
            setLoading(false);
        }
    }, [userId, checkPaywall, showToast]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const openAdd = () => {
        setEditMember(null);
        setForm({ name: '', email: '', mobile: '', designation: '', reportsTo: '' });
        setReportsSearch('');
        setShowPanel(true);
    };

    const openEdit = (m: Member) => {
        setEditMember(m);
        setForm({
            name: m.name,
            email: m.email,
            mobile: m.mobile ?? '',
            designation: m.designation ?? '',
            reportsTo: typeof m.reportsTo === 'object' ? m.reportsTo._id : (m.reportsTo ?? ''),
        });
        setReportsSearch(resolveReportsTo(m) === '—' ? '' : resolveReportsTo(m));
        setShowPanel(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            showToast('Name and email are required', 'error');
            return;
        }
        setSaving(true);
        try {
            const url = editMember
                ? `/api/org-admin/members/${editMember._id}?userId=${userId}`
                : `/api/org-admin/members?userId=${userId}`;
            const method = editMember ? 'PUT' : 'POST';
            const res = await fetch(apiUrl(url), {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                showToast(editMember ? 'Person updated' : 'Person added');
                setShowPanel(false);
                fetchMembers();
            } else {
                showToast(data.message ?? 'Save failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (m: Member) => {
        setConfirm({
            title: 'Remove Member',
            body: `Remove ${m.name} from the organization?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(apiUrl(`/api/org-admin/members/${m._id}?userId=${userId}`), { method: 'DELETE' });
                    if (await checkPaywall(res)) return;
                    showToast('Member removed');
                    fetchMembers();
                } catch {
                    showToast('Failed to remove member', 'error');
                }
            },
        });
    };

    const filtered = members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.designation ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const reportsSuggestions = members.filter(m =>
        m.name.toLowerCase().includes(reportsSearch.toLowerCase()) && m._id !== editMember?._id
    ).slice(0, 8);

    return (
        <>
            <div className={styles.pageControls}>
                <div className={styles.searchBar}>
                    {icons.search}
                    <input
                        className={styles.searchInput}
                        placeholder="Search people…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button className={styles.btnPrimary} onClick={openAdd}>
                    {icons.plus} Add Person
                </button>
            </div>

            {loading ? (
                <div className={styles.loadingState}>Loading members…</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Reports To</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                                        {search ? 'No matches found' : 'No members yet — add your first person'}
                                    </td>
                                </tr>
                            ) : filtered.map(m => (
                                <tr key={m._id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <div className={styles.avatar}>{initials(m.name)}</div>
                                            <span className={styles.nameText}>{m.name}</span>
                                        </div>
                                    </td>
                                    <td>{m.designation ?? '—'}</td>
                                    <td>{resolveReportsTo(m)}</td>
                                    <td><Badge status={m.status ?? 'pending'} /></td>
                                    <td>
                                        <div className={styles.actionsCell}>
                                            <button className={styles.btnIconAction} title="Edit" onClick={() => openEdit(m)}>
                                                {icons.edit}
                                            </button>
                                            <button className={`${styles.btnIconAction} ${styles.btnIconDanger}`} title="Remove" onClick={() => handleDelete(m)}>
                                                {icons.trash}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Slide Panel */}
            {showPanel && (
                <>
                    <div className={styles.overlay} onClick={() => setShowPanel(false)} />
                    <div className={styles.slidePanel}>
                        <div className={styles.slidePanelHeader}>
                            <h3 className={styles.slidePanelTitle}>{editMember ? 'Edit Person' : 'Add New Person'}</h3>
                            <button className={styles.btnIconAction} onClick={() => setShowPanel(false)}>{icons.close}</button>
                        </div>
                        <div className={styles.slidePanelBody}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Full Name *</label>
                                <input className={styles.formInput} placeholder="e.g. Michael Scott" value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Email Address *</label>
                                <input className={styles.formInput} type="email" placeholder="m.scott@company.com" value={form.email}
                                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Mobile Number</label>
                                <input className={styles.formInput} type="tel" placeholder="+91 9876543210" value={form.mobile}
                                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Designation</label>
                                <input className={styles.formInput} placeholder="e.g. Regional Manager" value={form.designation}
                                    onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Reports To</label>
                                <div className={styles.dropdownWrapper}>
                                    <input
                                        className={styles.formInput}
                                        placeholder="Search members…"
                                        value={reportsSearch}
                                        onChange={e => { setReportsSearch(e.target.value); setReportsDropOpen(true); }}
                                        onFocus={() => setReportsDropOpen(true)}
                                    />
                                    {reportsDropOpen && reportsSuggestions.length > 0 && (
                                        <div className={styles.dropdownList}>
                                            <div
                                                className={styles.dropdownItem}
                                                onClick={() => { setForm(p => ({ ...p, reportsTo: '' })); setReportsSearch(''); setReportsDropOpen(false); }}
                                            >
                                                <span style={{ color: '#94a3b8', fontSize: 12 }}>— None —</span>
                                            </div>
                                            {reportsSuggestions.map(s => (
                                                <div key={s._id} className={styles.dropdownItem}
                                                    onClick={() => {
                                                        setForm(p => ({ ...p, reportsTo: s._id }));
                                                        setReportsSearch(s.name);
                                                        setReportsDropOpen(false);
                                                    }}>
                                                    <div className={styles.avatar} style={{ width: 24, height: 24, fontSize: 10 }}>{initials(s.name)}</div>
                                                    <span>{s.name}</span>
                                                    {s.designation && <span style={{ color: '#94a3b8', fontSize: 12 }}>({s.designation})</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.slidePanelFooter}>
                            <button className={styles.btnSecondary} onClick={() => setShowPanel(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Person'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — Org Tree
// ═══════════════════════════════════════════════════════════════════════════════

function OrgTreePage({
    userId, checkPaywall,
}: {
    userId: string;
    checkPaywall: (r: Response) => Promise<boolean>;
}) {
    const [tree, setTree] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(apiUrl(`/api/org-admin/tree?userId=${userId}`));
                if (await checkPaywall(res)) return;
                const data = await res.json();
                if (data.status === 'success') setTree(data.data);
                else setError('Failed to load org tree');
            } catch {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall]);

    if (loading) return <div className={styles.loadingState}>Loading org tree…</div>;
    if (error) return <div className={styles.errorState}>{error}</div>;
    if (!tree) return (
        <div className={styles.treeContainer}>
            <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🌲</div>
                <p className={styles.emptyStateTitle}>No org tree yet</p>
                <p className={styles.emptyStateDesc}>Add members with reporting relationships to build the tree.</p>
            </div>
        </div>
    );

    return (
        <div className={styles.treeContainer}>
            <TreeNodeComponent node={tree} />
        </div>
    );
}

function TreeNodeComponent({ node }: { node: TreeNode }) {
    return (
        <div className={styles.treeNode}>
            <div className={styles.treeNodeCard}>
                <div className={styles.treeNodeName}>{node.name}</div>
                {node.designation && <div className={styles.treeNodeDesig}>{node.designation}</div>}
            </div>
            {node.children && node.children.length > 0 && (
                <>
                    <div className={styles.treeConnector} />
                    <div className={styles.treeChildren}>
                        {node.children.map(child => (
                            <div key={child.id} className={styles.treeChildWrapper}>
                                <TreeNodeComponent node={child} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — Core Values
// ═══════════════════════════════════════════════════════════════════════════════

function CoreValuesPage({
    userId, showToast, checkPaywall, setConfirm,
}: {
    userId: string;
    showToast: (m: string, t?: 'success' | 'error') => void;
    checkPaywall: (r: Response) => Promise<boolean>;
    setConfirm: (c: { title: string; body: string; onConfirm: () => void } | null) => void;
}) {
    const [values, setValues] = useState<CoreValue[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CoreValue | null>(null);
    const [form, setForm] = useState({ title: '', description: '' });
    const [saving, setSaving] = useState(false);

    const fetchValues = useCallback(async () => {
        try {
            const res = await fetch(apiUrl(`/api/org-admin/core-values?userId=${userId}`));
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (data.status === 'success') setValues(data.data ?? []);
        } catch {
            showToast('Failed to load core values', 'error');
        } finally {
            setLoading(false);
        }
    }, [userId, checkPaywall, showToast]);

    useEffect(() => { fetchValues(); }, [fetchValues]);

    const openAdd = () => {
        setEditing(null);
        setForm({ title: '', description: '' });
        setModalOpen(true);
    };

    const openEdit = (v: CoreValue) => {
        setEditing(v);
        setForm({ title: v.title, description: v.description });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
        setSaving(true);
        try {
            const url = editing
                ? `/api/org-admin/core-values/${editing._id}?userId=${userId}`
                : `/api/org-admin/core-values?userId=${userId}`;
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(apiUrl(url), {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                showToast(editing ? 'Core value updated' : 'Core value added');
                setModalOpen(false);
                fetchValues();
            } else {
                showToast(data.message ?? 'Save failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (v: CoreValue) => {
        setConfirm({
            title: 'Delete Core Value',
            body: `Delete "${v.title}"?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(apiUrl(`/api/org-admin/core-values/${v._id}?userId=${userId}`), { method: 'DELETE' });
                    if (await checkPaywall(res)) return;
                    showToast('Core value deleted');
                    fetchValues();
                } catch {
                    showToast('Failed to delete', 'error');
                }
            },
        });
    };

    if (loading) return <div className={styles.loadingState}>Loading core values…</div>;

    return (
        <>
            <div className={styles.pageControls}>
                <span style={{ fontSize: 14, color: '#64748b' }}>{values.length}/6 values added</span>
                <button className={styles.btnPrimary} onClick={openAdd} disabled={values.length >= 6}>
                    {icons.plus} Add Core Value
                </button>
            </div>

            {values.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>⭐</div>
                    <p className={styles.emptyStateTitle}>No core values added yet</p>
                    <p className={styles.emptyStateDesc}>Add up to 6 core values that define your organization.</p>
                </div>
            ) : (
                <div className={styles.coreValuesGrid}>
                    {values.map(v => (
                        <div key={v._id} className={styles.coreValueCard}>
                            <div className={styles.coreValueHeader}>
                                <h4 className={styles.coreValueTitle}>{v.title}</h4>
                                <div className={styles.coreValueActions}>
                                    <button className={styles.btnIconAction} onClick={() => openEdit(v)}>{icons.edit}</button>
                                    <button className={`${styles.btnIconAction} ${styles.btnIconDanger}`} onClick={() => handleDelete(v)}>{icons.trash}</button>
                                </div>
                            </div>
                            <p className={styles.coreValueDesc}>{v.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div className={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{editing ? 'Edit Core Value' : 'Add Core Value'}</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Title *</label>
                            <input className={styles.formInput} placeholder="e.g. Innovation" value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Description</label>
                            <textarea className={styles.formTextarea} placeholder="Describe this value…"
                                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        </div>
                        <div className={styles.dialogActions}>
                            <button className={styles.btnSecondary} onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — Review Cycles
// ═══════════════════════════════════════════════════════════════════════════════

function ReviewCyclesPage({
    userId, showToast, checkPaywall,
}: {
    userId: string;
    showToast: (m: string, t?: 'success' | 'error') => void;
    checkPaywall: (r: Response) => Promise<boolean>;
}) {
    const [cycles, setCycles] = useState<ReviewCycle[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDates, setEditDates] = useState({ startDate: '', endDate: '' });
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const orgRes = await fetch(apiUrl(`/api/organizations/me?userId=${userId}`));
                if (await checkPaywall(orgRes)) return;
                const od = await orgRes.json();
                const oid = od.data?._id ?? '';
                if (oid) {
                    const res = await fetch(apiUrl(`/api/review-cycles/organization/${oid}?userId=${userId}`));
                    if (await checkPaywall(res)) return;
                    const data = await res.json();
                    if (data.status === 'success') setCycles(data.data ?? []);
                }
            } catch {
                showToast('Failed to load review cycles', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall, showToast]);

    const startEdit = (c: ReviewCycle) => {
        setEditingId(c._id);
        setEditDates({
            startDate: c.startDate ? c.startDate.slice(0, 10) : '',
            endDate: c.endDate ? c.endDate.slice(0, 10) : '',
        });
    };

    const saveEdit = async (c: ReviewCycle) => {
        setSavingId(c._id);
        try {
            const res = await fetch(apiUrl(`/api/review-cycles/${c._id}?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editDates),
            });
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                showToast('Dates updated');
                setCycles(prev => prev.map(rc => rc._id === c._id ? { ...rc, ...editDates } : rc));
                setEditingId(null);
            } else {
                showToast(data.message ?? 'Update failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) return <div className={styles.loadingState}>Loading review cycles…</div>;

    const defaultCycles: ReviewCycle[] = cycles.length > 0 ? cycles : [
        { _id: 'pilot', period: 'Pilot', status: 'upcoming' },
        { _id: 'r1', period: 'R1', status: 'upcoming' },
        { _id: 'r2', period: 'R2', status: 'upcoming' },
        { _id: 'r3', period: 'R3', status: 'upcoming' },
        { _id: 'r4', period: 'R4', status: 'upcoming' },
    ];

    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {defaultCycles.map(c => (
                        <tr key={c._id} className={c.status === 'active' ? styles.activeRow : ''}>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.period}</td>
                            <td>
                                {editingId === c._id ? (
                                    <input type="date" className={styles.dateInput} value={editDates.startDate}
                                        onChange={e => setEditDates(p => ({ ...p, startDate: e.target.value }))} />
                                ) : formatDate(c.startDate)}
                            </td>
                            <td>
                                {editingId === c._id ? (
                                    <input type="date" className={styles.dateInput} value={editDates.endDate}
                                        onChange={e => setEditDates(p => ({ ...p, endDate: e.target.value }))} />
                                ) : formatDate(c.endDate)}
                            </td>
                            <td><Badge status={c.status} /></td>
                            <td>
                                {editingId === c._id ? (
                                    <>
                                        <button className={styles.btnSaveDate} onClick={() => saveEdit(c)}
                                            disabled={savingId === c._id}>
                                            {savingId === c._id ? '…' : 'Save'}
                                        </button>
                                        <button className={styles.btnSecondary} style={{ marginLeft: 6, padding: '5px 10px', fontSize: 12 }}
                                            onClick={() => setEditingId(null)}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button className={styles.btnIconAction} onClick={() => startEdit(c)} title="Edit dates">
                                        {icons.edit}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — Settings
// ═══════════════════════════════════════════════════════════════════════════════

function SettingsPage({
    userId, showToast, checkPaywall,
}: {
    userId: string;
    showToast: (m: string, t?: 'success' | 'error') => void;
    checkPaywall: (r: Response) => Promise<boolean>;
}) {
    const [org, setOrg] = useState<OrgDetails | null>(null);
    const [orgForm, setOrgForm] = useState({ name: '', industry: '', size: '' });
    const [profForm, setProfForm] = useState({ name: '', email: '', mobile: '' });
    const [loading, setLoading] = useState(true);
    const [savingOrg, setSavingOrg] = useState(false);
    const [savingProf, setSavingProf] = useState(false);
    const [orgMsg, setOrgMsg] = useState('');
    const [profMsg, setProfMsg] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [pRes, oRes] = await Promise.all([
                    fetch(apiUrl(`/api/user/profile?userId=${userId}`)),
                    fetch(apiUrl(`/api/organizations/me?userId=${userId}`)),
                ]);
                if (!await checkPaywall(pRes)) {
                    const pd = await pRes.json();
                    if (pd.status === 'success' && pd.data) {
                        const p = { name: pd.data.name ?? '', email: pd.data.email ?? '', mobile: pd.data.mobile ?? '' };
                        setProfForm(p);
                    }
                }
                if (!await checkPaywall(oRes)) {
                    const od = await oRes.json();
                    if (od.status === 'success' && od.data) {
                        setOrg(od.data);
                        setOrgForm({ name: od.data.name ?? '', industry: od.data.industry ?? '', size: String(od.data.size ?? '') });
                    }
                }
            } catch {
                showToast('Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId, checkPaywall, showToast]);

    const saveOrg = async () => {
        if (!org?._id) return;
        setSavingOrg(true);
        try {
            const res = await fetch(apiUrl(`/api/organizations/${org._id}?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...orgForm, size: Number(orgForm.size) || undefined }),
            });
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setOrgMsg('Saved'); setTimeout(() => setOrgMsg(''), 3000);
                showToast('Org details updated');
            } else {
                showToast(data.message ?? 'Failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setSavingOrg(false);
        }
    };

    const saveProfile = async () => {
        setSavingProf(true);
        try {
            const res = await fetch(apiUrl(`/api/user/profile?userId=${userId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profForm),
            });
            if (await checkPaywall(res)) return;
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setProfMsg('Saved'); setTimeout(() => setProfMsg(''), 3000);
                showToast('Profile updated');
            } else {
                showToast(data.message ?? 'Failed', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        } finally {
            setSavingProf(false);
        }
    };

    if (loading) return <div className={styles.loadingState}>Loading settings…</div>;

    const subStatus = org?.subscriptionStatus ?? 'active';

    return (
        <>
            <div className={styles.settingsGrid}>
                {/* Org Details */}
                <div className={styles.settingsCard}>
                    <h3 className={styles.settingsCardTitle}>🏢 Org Details</h3>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Organization Name</label>
                        <input className={styles.formInput} value={orgForm.name}
                            onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Industry</label>
                        <input className={styles.formInput} placeholder="e.g. Technology" value={orgForm.industry}
                            onChange={e => setOrgForm(p => ({ ...p, industry: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Organization Size</label>
                        <input className={styles.formInput} type="number" placeholder="e.g. 150" value={orgForm.size}
                            onChange={e => setOrgForm(p => ({ ...p, size: e.target.value }))} />
                    </div>
                    <div className={styles.saveRow}>
                        <button className={styles.btnPrimary} onClick={saveOrg} disabled={savingOrg}>
                            {savingOrg ? 'Saving…' : 'Save Changes'}
                        </button>
                        {orgMsg && <span className={styles.successMsg}>✓ {orgMsg}</span>}
                    </div>
                </div>

                {/* Admin Profile */}
                <div className={styles.settingsCard}>
                    <h3 className={styles.settingsCardTitle}>👤 Admin Profile</h3>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name</label>
                        <input className={styles.formInput} value={profForm.name}
                            onChange={e => setProfForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input className={styles.formInput} type="email" value={profForm.email}
                            onChange={e => setProfForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Mobile</label>
                        <input className={styles.formInput} type="tel" value={profForm.mobile ?? ''}
                            onChange={e => setProfForm(p => ({ ...p, mobile: e.target.value }))} />
                    </div>
                    <div className={styles.saveRow}>
                        <button className={styles.btnPrimary} onClick={saveProfile} disabled={savingProf}>
                            {savingProf ? 'Saving…' : 'Save Changes'}
                        </button>
                        {profMsg && <span className={styles.successMsg}>✓ {profMsg}</span>}
                    </div>
                </div>
            </div>

            {/* Subscription */}
            <div className={styles.subscriptionCard}>
                <h3 className={styles.settingsCardTitle}>💳 Subscription Status</h3>
                <div className={styles.subscriptionRow}>
                    <span className={styles.subLabel}>Status</span>
                    <Badge status={subStatus} />
                </div>
                {subStatus === 'trial' && org?.trialExpiry && (
                    <div className={styles.subscriptionRow}>
                        <span className={styles.subLabel}>Trial Expires</span>
                        <span className={styles.subValue}>{formatDate(org.trialExpiry)}</span>
                    </div>
                )}
                {subStatus === 'expired' && (
                    <button className={styles.contactSupport}
                        onClick={() => window.open('mailto:support@lcpl.in', '_blank')}>
                        Contact LCPL Support →
                    </button>
                )}
            </div>
        </>
    );
}
