import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import baseStyles from '@/styles/DashboardBase.module.css';
import styles from './UnifiedDashboard.module.css';
import logo from '@/assets/logo.png';
import { fetchUserProfile } from '@/utils/userProfile';
import DashboardHome from './DashboardHome';
import MyDimensions from './MyDimensions';
import TeamView from './TeamView';
import TutorialTab from './TutorialTab';

type TabId = 'home' | 'dimensions' | 'team' | 'settings' | 'notifications' | 'tutorial';

interface TabConfig {
    id: TabId;
    label: string;
    icon: string;
    roles: string[]; // empty = all roles
}

const TABS: TabConfig[] = [
    { id: 'home', label: 'Dashboard', icon: '📊', roles: [] },
    { id: 'dimensions', label: 'My 4D Data', icon: '🎯', roles: [] },
    { id: 'team', label: 'Team', icon: '👥', roles: ['manager', 'boss', 'client_admin'] },
    { id: 'notifications', label: 'Notifications', icon: '🔔', roles: [] },
    { id: 'settings', label: 'Settings', icon: '⚙️', roles: [] },
    { id: 'tutorial', label: 'Tutorial', icon: '🎬', roles: [] },
];

export default function UnifiedDashboard() {
    const navigate = useNavigate();
    const userId = localStorage.getItem('userId') || '';
    const [activeTab, setActiveTab] = useState<TabId>('home');
    const [user, setUser] = useState<{ name: string; email: string; mobile: string; role?: string } | null>(null);
    const [userRole, setUserRole] = useState<string>('employee');
    const [notificationCount, setNotificationCount] = useState(0);
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        if (!userId) {
            navigate('/auth/login');
            return;
        }

        fetchUserProfile(userId).then((data) => {
            if (data?.status === 'success' && data.data) {
                setUser(data.data as { name: string; email: string; mobile: string; role?: string });
                const role = (data.data.role as string) || localStorage.getItem('userRole') || 'employee';
                setUserRole(role);
                localStorage.setItem('userRole', role);
            }
        }).catch(console.error);

        // Fetch notification count
        fetch(apiUrl(`/api/notifications/count?userId=${userId}`))
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 'success') {
                    setNotificationCount(data.data?.count || 0);
                }
            })
            .catch(console.error);
    }, [userId, navigate]);

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const visibleTabs = TABS.filter(
        (tab) => tab.roles.length === 0 || tab.roles.includes(userRole)
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'home':
                return <DashboardHome userId={userId} role={userRole} />;
            case 'dimensions':
                return <MyDimensions userId={userId} role={userRole} />;
            case 'team':
                return <TeamView userId={userId} role={userRole} />;
            case 'tutorial':
                return <TutorialTab />;
            case 'settings':
                return (
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h3 className={styles.sectionTitle}>Settings</h3>
                                <p className={styles.sectionSubtitle}>Manage your profile and preferences</p>
                            </div>
                        </div>
                        <div style={{ padding: '20px 0' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Name:</strong> {user?.name || '—'}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Mobile:</strong> {user?.mobile || '—'}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Email:</strong> {user?.email || '—'}
                            </div>
                            <div>
                                <strong>Role:</strong> {userRole}
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h3 className={styles.sectionTitle}>Notifications</h3>
                                <p className={styles.sectionSubtitle}>Your recent alerts and updates</p>
                            </div>
                        </div>
                        <NotificationsList userId={userId} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            {/* Header — reuses base styles */}
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

                <div className={baseStyles.logoContainer} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
                    <img src={logo} alt="Logo" className={baseStyles.logo} />
                    <span className={baseStyles.logoText}>4DPMS</span>
                </div>

                <div className={baseStyles.headerRight}>
                    {/* Notification bell */}
                    <div className={baseStyles.notificationContainer}>
                        <button
                            className={baseStyles.notificationButton}
                            onClick={() => setActiveTab('notifications')}
                            aria-label="Notifications"
                        >
                            <svg className={baseStyles.bellIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {notificationCount > 0 && (
                                <span className={baseStyles.notificationBadge}>{notificationCount}</span>
                            )}
                        </button>
                    </div>

                    {/* Profile */}
                    <div className={baseStyles.profileSection} onClick={() => setActiveTab('settings')}>
                        <div className={baseStyles.profileAvatar}>
                            {user?.name ? getInitials(user.name) : 'U'}
                        </div>
                        <div className={baseStyles.profileInfo}>
                            <span className={baseStyles.profileName}>{user?.name || 'User'}</span>
                            <span className={baseStyles.profileEmail}>{user?.email || ''}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Bar */}
            <div className={styles.tabBar}>
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className={styles.tabIcon}>{tab.icon}</span>
                        {tab.label}
                        {tab.id === 'notifications' && notificationCount > 0 && (
                            <span style={{
                                background: '#ef5350',
                                color: '#fff',
                                borderRadius: '10px',
                                padding: '1px 6px',
                                fontSize: '10px',
                                fontWeight: 600,
                                marginLeft: '4px',
                            }}>
                                {notificationCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Side Menu Overlay */}
            {showMenu && (
                <div className={baseStyles.menuOverlay} onClick={() => setShowMenu(false)}>
                    <nav className={baseStyles.sideMenu} onClick={(e) => e.stopPropagation()}>
                        <button className={baseStyles.closeButton} onClick={() => setShowMenu(false)} aria-label="Close">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <div className={baseStyles.userProfileSection}>
                            <div className={baseStyles.userAvatar}>
                                {user?.name ? getInitials(user.name) : 'U'}
                            </div>
                            <div className={baseStyles.userInfo}>
                                <span className={baseStyles.userName}>{user?.name || 'User'}</span>
                                <span className={baseStyles.userRole}>{userRole}</span>
                            </div>
                        </div>

                        <div className={baseStyles.navItems}>
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`${baseStyles.menuItem} ${activeTab === tab.id ? baseStyles.menuItemActive : ''}`}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setShowMenu(false);
                                    }}
                                >
                                    <span className={baseStyles.navIcon}>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className={baseStyles.sidebarFooter}>
                            <div className={baseStyles.navDivider}></div>
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
            <div className={styles.mainContent}>
                {renderTabContent()}
            </div>
        </div>
    );
}

/* ========== Inline Notifications Component ========== */
function NotificationsList({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch(apiUrl(`/api/notifications?userId=${userId}`));
                const data = await res.json();
                if (data.status === 'success') {
                    setNotifications(data.data?.notifications || []);
                }
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [userId]);

    if (loading) {
        return <p style={{ textAlign: 'center', padding: '20px', color: 'var(--color-main-grey-60)' }}>Loading...</p>;
    }

    if (notifications.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-main-grey-60)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
                <p>No notifications yet</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map((n: any, i: number) => (
                <div
                    key={n._id || i}
                    style={{
                        padding: '12px 16px',
                        background: n.isRead ? 'transparent' : 'rgba(33, 150, 243, 0.04)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-main-grey-20)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '14px',
                            fontWeight: n.isRead ? 400 : 600,
                            color: 'var(--color-main-black-100)',
                        }}>
                            {n.message}
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '12px',
                            color: 'var(--color-main-grey-60)',
                            marginTop: '2px',
                        }}>
                            {new Date(n.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    {!n.isRead && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-main-blue)', flexShrink: 0 }} />
                    )}
                </div>
            ))}
        </div>
    );
}
