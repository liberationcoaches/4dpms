import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Notifications.module.css';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, any> & {
    reviewPeriod?: number;
    organizationId?: string;
    type?: string;
  };
  createdAt: string;
}

type RoleContext = 'employee' | 'manager' | 'boss' | 'client_admin' | 'platform_admin' | 'reviewer' | 'generic';

interface NotificationsProps {
  roleContext?: RoleContext;
  embedded?: boolean;
  onNavigateToResolvedRoute?: (route: string) => boolean;
}

function Notifications({ roleContext = 'generic', embedded = false, onNavigateToResolvedRoute }: NotificationsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchNotifications = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleHomeRoute = (role: RoleContext): string => {
    switch (role) {
      case 'employee':
        return '/dashboard/employee';
      case 'manager':
        return '/dashboard/manager';
      case 'boss':
        return '/dashboard/boss';
      case 'client_admin':
        return '/client-admin/dashboard';
      case 'platform_admin':
        return '/admin/dashboard';
      case 'reviewer':
        return '/reviewer/dashboard';
      default:
        return '/dashboard';
    }
  };

  const resolveNotificationRoute = (notification: Notification): string | null => {
    const metadataType = String(notification.metadata?.type || '').toLowerCase();
    const topLevelType = String(notification.type || '').toLowerCase();
    const resolvedType = metadataType || topLevelType;
    const roleHome = getRoleHomeRoute(roleContext);

    switch (resolvedType) {
      case 'review_period_start':
        if (roleContext === 'manager') return '/dashboard/manager';
        if (roleContext === 'boss') return '/dashboard/boss';
        if (roleContext === 'employee') return '/dashboard/employee';
        return '/dashboard/performance';
      case 'kra_finalized':
        return roleHome;
      case 'mid_cycle_feedback':
        if (roleContext === 'employee') return '/dashboard/employee/feedback';
        if (roleContext === 'manager') return '/dashboard/manager/mid-cycle-notes';
        return roleHome;
      case 'action_plan':
        return roleHome;
      case 'organization_update':
        if (roleContext === 'platform_admin') return '/admin/dashboard';
        if (roleContext === 'client_admin') return '/client-admin/dashboard';
        return roleHome;
      case 'system_announcement':
        return null;
      case 'success':
      case 'warning':
      case 'error':
      case 'info':
        return roleHome;
      default:
        return roleHome;
    }
  };

  const handleMarkAsRead = async (notificationId: string, refresh = true) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications/${notificationId}/read?userId=${userId}`, {
        method: 'PUT',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        if (refresh) {
          fetchNotifications();
        } else {
          setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)));
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    return false;
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications/read-all?userId=${userId}`, {
        method: 'PUT',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id, false);
    }

    const destination = resolveNotificationRoute(notification);
    if (!destination) {
      return;
    }
    if (onNavigateToResolvedRoute?.(destination)) {
      return;
    }
    if (destination === location.pathname) {
      return;
    }
    navigate(destination);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review_period_start':
        return '📅';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'review_period_start':
        return styles.reviewPeriod;
      case 'success':
        return styles.success;
      case 'warning':
        return styles.warning;
      case 'error':
        return styles.error;
      default:
        return styles.info;
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading notifications...</div>;
  }

  return (
    <div className={styles.notifications}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <div className={styles.unreadBadge}>{unreadCount} unread</div>
        )}
        {unreadCount > 0 && (
          <button className={styles.markAllButton} onClick={handleMarkAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`${styles.notificationCard} ${getNotificationColor(notification.type)} ${
                !notification.isRead ? styles.unread : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className={styles.notificationContent}>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                {notification.metadata?.reviewPeriod && (
                  <span className={styles.metadata}>
                    Review Period {notification.metadata.reviewPeriod}
                  </span>
                )}
                <span className={styles.timestamp}>
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              {!notification.isRead && (
                <div className={styles.unreadIndicator} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
