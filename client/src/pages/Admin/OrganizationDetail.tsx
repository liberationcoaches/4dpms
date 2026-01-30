import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './OrganizationDetail.module.css';
import logo from '@/assets/logo.png';
import { fetchUserProfile as fetchUserProfileApi } from '@/utils/userProfile';

interface Organization {
  _id: string;
  name: string;
  code: string;
  type: string;
  employeeSize: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  reviewerId?: { _id: string; name: string; email: string; mobile: string };
  bossId?: { _id: string; name: string; email: string };
  clientAdminId?: { _id: string; name: string; email: string; mobile: string };
  managers?: Array<{ _id: string; name: string; email: string }>;
  createdAt: string;
}

interface Reviewer {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

function OrganizationDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }
    fetchUserProfile();
    fetchNotificationCount();
    fetchOrganization();
    fetchReviewers();
  }, [id, navigate]);

  const fetchUserProfile = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    try {
      const data = await fetchUserProfileApi(userId);
      if (data?.status === 'success' && data.data) {
        setUser({ name: data.data.name as string, email: data.data.email as string });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/notifications/count?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setNotificationCount(data.data?.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const fetchOrganization = async () => {
    try {
      const res = await fetch(`/api/organizations/${id}`);
      const data = await res.json();
      if (data.status === 'success') {
        setOrganization(data.data);
      } else {
        alert('Failed to load organization');
        navigate('/admin');
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      alert('Network error');
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewers = async () => {
    try {
      const res = await fetch('/api/user/list?role=reviewer');
      const data = await res.json();
      if (data.status === 'success' && data.data.reviewers) {
        setReviewers(data.data.reviewers);
      }
    } catch (error) {
      console.error('Failed to fetch reviewers:', error);
    }
  };

  const handleAssignReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewerId) {
      alert('Please select a reviewer');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch(`/api/organizations/${id}/assign-reviewer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: selectedReviewerId }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
          alert('Reviewer assigned. They\'ll be notified.');
        setShowAssignForm(false);
        setSelectedReviewerId('');
        fetchOrganization();
      } else {
        alert(data.message || 'Failed to assign reviewer');
      }
    } catch (error) {
      console.error('Failed to assign reviewer:', error);
      alert('Network error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveReviewer = async () => {
    if (!confirm('Are you sure you want to remove the reviewer from this organization?')) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: null }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Reviewer removed.');
        fetchOrganization();
      } else {
        alert(data.message || 'Failed to remove reviewer');
      }
    } catch (error) {
      console.error('Failed to remove reviewer:', error);
      alert('Network error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleNotificationClick = () => {
    navigate('/dashboard/notifications');
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!organization) {
    return <div className={styles.error}>Organization not found</div>;
  }

  const availableReviewers = reviewers.filter(
    (r) => r._id !== organization.reviewerId?._id
  );

  return (
    <div className={styles.organizationDetail}>
      {/* Header */}
      <header className={styles.header}>
        <button
          className={styles.menuButton}
          onClick={() => setShowSidebar(!showSidebar)}
          aria-label="Toggle menu"
        >
          <span className={styles.hamburger}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <span className={styles.logoText}>4DPMS</span>
        </div>

        <div className={styles.notificationContainer}>
          <button
            className={styles.notificationButton}
            onClick={handleNotificationClick}
            aria-label="Notifications"
          >
            <svg
              className={styles.bellIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.21 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notificationCount > 0 && (
              <span className={styles.notificationBadge}>{notificationCount}</span>
            )}
          </button>
        </div>
      </header>

      <div className={styles.mainContainer}>
        {/* Sidebar */}
        {showSidebar && (
          <div className={styles.sidebarOverlay} onClick={() => setShowSidebar(false)}>
            <nav className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.closeButton}
                onClick={() => setShowSidebar(false)}
                aria-label="Close menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className={styles.userProfileSection}>
                <div className={styles.userAvatar}>
                  <svg className={styles.avatarIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user?.name || 'Platform Admin'}</span>
                  <span className={styles.userRole}>Platform Admin</span>
                </div>
              </div>

              <div className={styles.navItems}>
                <button
                  className={styles.navItem}
                  onClick={() => { navigate('/admin'); setShowSidebar(false); }}
                >
                  <svg className={styles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <span>Back to Dashboard</span>
                </button>
                <button className={styles.navItem} onClick={handleLogout}>
                  <svg className={styles.navIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <button className={styles.backButton} onClick={() => navigate('/admin')}>
              ← Back to Organizations
            </button>
            <h1>{organization.name}</h1>
          </div>

          <div className={styles.orgInfo}>
            <div className={styles.infoCard}>
              <h2>Organization Details</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <strong>Organization Code:</strong>
                  <span>{organization.code}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Industry:</strong>
                  <span>{organization.type}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Member Size:</strong>
                  <span>{organization.employeeSize || 'Not specified'}</span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Subscription Status:</strong>
                  <span className={`${styles.statusBadge} ${styles[organization.subscriptionStatus]}`}>
                    {organization.subscriptionStatus}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <strong>Created:</strong>
                  <span>{new Date(organization.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.cardHeader}>
                <h2>Assigned Reviewer</h2>
                {!organization.reviewerId ? (
                  <button
                    className={styles.assignButton}
                    onClick={() => setShowAssignForm(true)}
                  >
                    + Assign Reviewer
                  </button>
                ) : (
                  <button
                    className={styles.removeButton}
                    onClick={handleRemoveReviewer}
                  >
                    Remove Reviewer
                  </button>
                )}
              </div>

              {organization.reviewerId ? (
                <div className={styles.reviewerInfo}>
                  <p><strong>Name:</strong> {organization.reviewerId.name}</p>
                  <p><strong>Email:</strong> {organization.reviewerId.email}</p>
                  <p><strong>Mobile:</strong> {organization.reviewerId.mobile}</p>
                </div>
              ) : (
                <p className={styles.emptyState}>No reviewer assigned</p>
              )}

              {showAssignForm && (
                <div className={styles.assignForm}>
                  <h3>Assign Reviewer</h3>
                  <form onSubmit={handleAssignReviewer}>
                    <div className={styles.formGroup}>
                      <label>Select Reviewer *</label>
                      <select
                        value={selectedReviewerId}
                        onChange={(e) => setSelectedReviewerId(e.target.value)}
                        required
                        className={styles.select}
                      >
                        <option value="">Choose a reviewer...</option>
                        {availableReviewers.map((reviewer) => (
                          <option key={reviewer._id} value={reviewer._id}>
                            {reviewer.name} ({reviewer.email})
                          </option>
                        ))}
                      </select>
                      {availableReviewers.length === 0 && (
                        <p className={styles.hint}>No available reviewers. Create reviewers first.</p>
                      )}
                    </div>
                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => {
                          setShowAssignForm(false);
                          setSelectedReviewerId('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isAssigning || !selectedReviewerId}
                      >
                        {isAssigning ? 'Assigning...' : 'Assign Reviewer'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {organization.clientAdminId && (
              <div className={styles.infoCard}>
                <h2>Client Admin</h2>
                <div className={styles.bossInfo}>
                  <p><strong>Name:</strong> {organization.clientAdminId.name}</p>
                  <p><strong>Email:</strong> {organization.clientAdminId.email}</p>
                  <p><strong>Mobile:</strong> {organization.clientAdminId.mobile}</p>
                </div>
              </div>
            )}

            {organization.bossId && (
              <div className={styles.infoCard}>
                <h2>Admin</h2>
                <div className={styles.bossInfo}>
                  <p><strong>Name:</strong> {organization.bossId.name}</p>
                  <p><strong>Email:</strong> {organization.bossId.email}</p>
                </div>
              </div>
            )}

            {organization.managers && organization.managers.length > 0 && (
              <div className={styles.infoCard}>
                <h2>Supervisors ({organization.managers.length})</h2>
                <div className={styles.managersList}>
                  {organization.managers.map((manager) => (
                    <div key={manager._id} className={styles.managerItem}>
                      <p><strong>{manager.name}</strong></p>
                      <p>{manager.email}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrganizationDetail;
