import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.css';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'review_period_start';
  isRead: boolean;
  metadata?: {
    reviewPeriod?: number;
    organizationId?: string;
  };
  createdAt: string;
}

function Notifications() {
  const navigate = useNavigate();
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications/${notificationId}/read?userId=${userId}`, {
        method: 'PUT',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
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
              onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
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
