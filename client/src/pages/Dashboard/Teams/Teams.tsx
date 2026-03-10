import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './Teams.module.css';

interface TeamMember {
  name: string;
  role: string;
  mobile: string;
  email?: string;
  designation?: string;
  functionalKRAs?: any[];
  organizationalKRAs?: any[];
  selfDevelopmentKRAs?: any[];
  developingOthersKRAs?: any[];
}

interface Team {
  _id: string;
  name: string;
  code: string;
  members: string[];
  membersDetails: TeamMember[];
}

interface EditForm {
  name: string;
  email: string;
  mobile: string;
  designation: string;
}

function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMemberIndex, setEditingMemberIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    email: '',
    mobile: '',
    designation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMemberIndex, setDeletingMemberIndex] = useState<number | null>(null);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    setUserRole(role);
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(apiUrl(`/api/team/members?userId=${userId}`));
      const data = await res.json();
      
      if (data.status === 'success') {
        // If we get member details, wrap in a team object
        const teamData: Team = {
          _id: 'current',
          name: 'My Team',
          code: data.teamCode || 'N/A',
          members: [],
          membersDetails: Array.isArray(data.data) ? data.data : [],
        };
        setTeams([teamData]);
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateMemberScore = (member: TeamMember): number => {
    // Simple average calculation based on functional KRAs
    if (!member.functionalKRAs || member.functionalKRAs.length === 0) return 0;
    
    const scores = member.functionalKRAs
      .map(kra => kra.averageScore || 0)
      .filter(score => score > 0);
    
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  };

  const handleMemberClick = (memberIndex: number) => {
    // Navigate to member KRA detail view if user has permission
    if (['boss', 'manager', 'client_admin'].includes(userRole)) {
      navigate(`/dashboard/manager/team/${memberIndex}`);
    }
  };

  const openEditModal = (memberIndex: number, member: TeamMember) => {
    setEditingMemberIndex(memberIndex);
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      mobile: member.mobile || '',
      designation: member.designation || member.role || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingMemberIndex(null);
    setEditForm({ name: '', email: '', mobile: '', designation: '' });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMemberIndex === null) return;

    setIsSubmitting(true);
    const userId = localStorage.getItem('userId');

    try {
      const response = await fetch(apiUrl(`/api/team/members/${editingMemberIndex}?userId=${userId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Team member updated successfully');
        closeEditModal();
        fetchTeams(); // Refresh the list
      } else {
        showNotification(data.message || 'Failed to update team member', 'error');
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      showNotification('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (memberIndex: number) => {
    setDeletingMemberIndex(memberIndex);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingMemberIndex(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingMemberIndex === null) return;

    setIsSubmitting(true);
    const userId = localStorage.getItem('userId');

    try {
      const response = await fetch(apiUrl(`/api/team/members/${deletingMemberIndex}?userId=${userId}`), {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        showNotification('Team member removed successfully');
        closeDeleteConfirm();
        fetchTeams(); // Refresh the list
      } else {
        showNotification(data.message || 'Failed to remove team member', 'error');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      showNotification('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>My Teams</h2>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Notification Toast */}
      {notification && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          <span className={styles.notificationIcon}>
            {notification.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{notification.message}</span>
        </div>
      )}

      <h2 className={styles.title}>My Teams</h2>
      
      {teams.length === 0 ? (
        <div className={styles.noData}>
          <p>You are not part of any team yet.</p>
          <p className={styles.description}>
            Ask your supervisor to add you to a team or join using a team code.
          </p>
        </div>
      ) : (
        teams.map((team) => (
          <div key={team._id} className={styles.teamCard}>
            {/* Team Header */}
            <div className={styles.teamHeader}>
              <h3 className={styles.teamName}>{team.name}</h3>
              {team.code !== 'N/A' && (
                <span className={styles.teamCode}>{team.code}</span>
              )}
            </div>

            {/* Team Stats */}
            <div className={styles.teamStats}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>{team.membersDetails.length}</div>
                <div className={styles.statLabel}>Members</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {team.membersDetails.reduce((sum, m) => 
                    sum + (m.functionalKRAs?.length || 0), 0
                  )}
                </div>
                <div className={styles.statLabel}>Total KRAs</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {(team.membersDetails.reduce((sum, m) => 
                    sum + calculateMemberScore(m), 0
                  ) / (team.membersDetails.length || 1)).toFixed(1)}
                </div>
                <div className={styles.statLabel}>Avg Score</div>
              </div>
            </div>

            {/* Team Members */}
            <div className={styles.membersSection}>
              <h4 className={styles.sectionTitle}>Team Members</h4>
              {team.membersDetails.length > 0 ? (
                <div className={styles.membersGrid}>
                  {team.membersDetails.map((member, index) => {
                    const score = calculateMemberScore(member);
                    return (
                      <div key={index} className={styles.memberCard}>
                        <div 
                          className={styles.memberClickArea}
                          onClick={() => handleMemberClick(index)}
                        >
                          <div className={styles.memberAvatar}>
                            {getInitials(member.name)}
                          </div>
                          <div className={styles.memberInfo}>
                            <div className={styles.memberName}>{member.name}</div>
                            <div className={styles.memberRole}>{member.role}</div>
                          </div>
                          {score > 0 && (
                            <div className={styles.memberScore}>{score.toFixed(1)}</div>
                          )}
                        </div>
                        {/* Edit/Delete buttons for supervisors */}
                        {['boss', 'manager'].includes(userRole) && (
                          <div className={styles.memberActions}>
                            <button
                              className={styles.editButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(index, member);
                              }}
                              title="Edit member"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirm(index);
                              }}
                              title="Remove member"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyMembers}>
                  No team members yet.
                </div>
              )}
            </div>

            {/* Invite Section for supervisors */}
            {['boss', 'manager'].includes(userRole) && team.code !== 'N/A' && (
              <div className={styles.inviteSection}>
                <div className={styles.inviteInfo}>
                  <h3>Invite Team Members</h3>
                  <p>Share this code with people you want to join your team</p>
                </div>
                <div className={styles.inviteCode}>{team.code}</div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Team Member</h3>
              <button className={styles.closeButton} onClick={closeEditModal}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="mobile">Mobile</label>
                <input
                  id="mobile"
                  type="tel"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  placeholder="10 digits"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="designation">Designation/Role</label>
                <input
                  id="designation"
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className={styles.input}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeEditModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingMemberIndex !== null && (
        <div className={styles.modalOverlay} onClick={closeDeleteConfirm}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>⚠️</div>
            <h3>Remove Team Member?</h3>
            <p>
              Are you sure you want to remove{' '}
              <strong>{teams[0]?.membersDetails[deletingMemberIndex]?.name}</strong> from the team?
              This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={closeDeleteConfirm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teams;

