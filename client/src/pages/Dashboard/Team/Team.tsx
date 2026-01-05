import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Team.module.css';

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  email: string;
  mobile: string;
}

function Team() {
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<'platform_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'>('employee');
  const [editingMember, setEditingMember] = useState<{ index: number; member: TeamMember } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', mobile: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchTeamMembers = () => {
    const userId = localStorage.getItem('userId') || '';
    if (!userId) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/team/members?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.data) {
          setTeamMembers(data.data);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch team members:', error);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    const userId = localStorage.getItem('userId') || '';
    if (userId) {
      // Fetch user role
      fetch(`/api/user/profile?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success' && data.data) {
            const role = data.data.role || localStorage.getItem('userRole') || 'employee';
            setUserRole(role);
            localStorage.setItem('userRole', role);
          }
        })
        .catch(console.error);
    }
    fetchTeamMembers();
  }, []);

  const handleMemberClick = (memberId: string, e?: React.MouseEvent) => {
    // Prevent navigation if clicking on edit/delete buttons
    if (e && (e.target as HTMLElement).closest('.editButton, .deleteButton')) {
      return;
    }
    // Redirect managers to manager dashboard team route
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'manager') {
      navigate(`/dashboard/manager/team/${memberId}`, { state: { memberId } });
    } else {
      navigate(`/dashboard/team/${memberId}`, { state: { memberId } });
    }
  };

  const handleEditClick = (member: TeamMember, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if user is manager or boss
    if (userRole !== 'manager' && userRole !== 'boss' && userRole !== 'platform_admin') {
      showNotification('Only managers, bosses, or platform admins can edit team members', 'error');
      return;
    }
    setEditingMember({ index, member });
    setEditForm({ name: member.name, role: member.role, mobile: member.mobile });
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditForm({ name: '', role: '', mobile: '' });
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const userId = localStorage.getItem('userId') || '';
    const parts = editingMember.member._id.split('-');
    const memberIndex = parseInt(parts[parts.length - 1]);

    try {
      const response = await fetch(`/api/team/members/${memberIndex}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Team member updated successfully!');
        setEditingMember(null);
        setEditForm({ name: '', role: '', mobile: '' });
        fetchTeamMembers();
      } else {
        showNotification(data.message || 'Failed to update team member', 'error');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  const handleDeleteClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if user is manager or boss
    if (userRole !== 'manager' && userRole !== 'boss' && userRole !== 'platform_admin') {
      showNotification('Only managers, bosses, or platform admins can delete team members', 'error');
      return;
    }
    setShowDeleteConfirm(index);
  };

  const handleConfirmDelete = async (member: TeamMember) => {
    const userId = localStorage.getItem('userId') || '';
    const parts = member._id.split('-');
    const memberIndex = parseInt(parts[parts.length - 1]);

    try {
      const response = await fetch(`/api/team/members/${memberIndex}?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Team member deleted successfully!');
        setShowDeleteConfirm(null);
        fetchTeamMembers();
      } else {
        showNotification(data.message || 'Failed to delete team member', 'error');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      showNotification('Network error. Please try again.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading team members...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Notification Toast */}
      {notification && (
        <div className={`${styles.notification} ${styles[`notification${notification.type === 'success' ? 'Success' : 'Error'}`]}`}>
          <div className={styles.notificationContent}>
            <span className={styles.notificationIcon}>
              {notification.type === 'success' ? '✓' : '✕'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className={styles.header}>
        <h2 className={styles.title}>Your Team</h2>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.teamList}>
        {teamMembers.length === 0 ? (
          <div className={styles.emptyState}>No team members found</div>
        ) : (
          teamMembers.map((member, index) => (
            <div key={member._id} className={styles.memberCard}>
              {editingMember?.index === index && (userRole === 'manager' || userRole === 'boss' || userRole === 'platform_admin') ? (
                <form onSubmit={handleSaveEdit} className={styles.editForm}>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Name"
                    required
                    className={styles.editInput}
                  />
                  <input
                    type="text"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    placeholder="Designation"
                    required
                    className={styles.editInput}
                  />
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="Mobile"
                    maxLength={10}
                    required
                    className={styles.editInput}
                  />
                  <div className={styles.editActions}>
                    <button type="submit" className={styles.saveButton}>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div
                    className={styles.memberInfo}
                    onClick={(e) => handleMemberClick(member._id, e)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <h3 className={styles.memberName}>{member.name}</h3>
                    <p className={styles.memberRole}>{member.role}</p>
                    <p className={styles.memberMobile}>{member.mobile}</p>
                  </div>
                  {(userRole === 'manager' || userRole === 'boss' || userRole === 'platform_admin') && (
                    <>
                      <div className={styles.memberActions}>
                        <button
                          className={`${styles.actionButton} ${styles.editButton}`}
                          onClick={(e) => handleEditClick(member, index, e)}
                          aria-label="Edit member"
                          title="Edit"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={(e) => handleDeleteClick(index, e)}
                          aria-label="Delete member"
                          title="Delete"
                        >
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      {showDeleteConfirm === index && (
                        <div className={styles.deleteConfirm}>
                          <p>Are you sure you want to delete {member.name}?</p>
                          <div className={styles.deleteActions}>
                            <button
                              onClick={() => handleConfirmDelete(member)}
                              className={styles.confirmDeleteButton}
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className={styles.cancelDeleteButton}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Team;

