import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FeedbackHistory.module.css';

interface Feedback {
  _id: string;
  type: 'positive' | 'constructive' | 'mid_cycle_note' | 'general';
  content: string;
  reviewPeriod: number;
  isPrivate: boolean;
  createdAt: string;
  addedBy: {
    _id: string;
    name: string;
  };
}

function FeedbackHistory() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchFeedback();
  }, [navigate]);

  const fetchFeedback = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/feedback/employee/${userId}?userId=${userId}`);
      const data = await res.json();
      
      if (data.status === 'success' && data.data) {
        // API returns { feedback: [...], notes: [...] } - combine both arrays
        const feedbackItems = data.data.feedback || [];
        const noteItems = (data.data.notes || []).map((note: any) => ({
          ...note,
          type: 'mid_cycle_note', // Ensure notes are typed correctly
        }));
        const allFeedback = [...feedbackItems, ...noteItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setFeedback(allFeedback);
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'positive':
        return 'Positive';
      case 'constructive':
        return 'Constructive';
      case 'mid_cycle_note':
        return 'Mid-Cycle Note';
      case 'general':
        return 'General';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'positive':
        return '#4CAF50';
      case 'constructive':
        return '#FF9800';
      case 'mid_cycle_note':
        return '#2196F3';
      case 'general':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredFeedback = feedback.filter((item) => {
    if (selectedPeriod !== 'all' && item.reviewPeriod !== selectedPeriod) {
      return false;
    }
    if (selectedType !== 'all' && item.type !== selectedType) {
      return false;
    }
    return true;
  });

  // Group feedback by review period
  const groupedFeedback = filteredFeedback.reduce((acc, item) => {
    const period = `R${item.reviewPeriod}`;
    if (!acc[period]) {
      acc[period] = [];
    }
    acc[period].push(item);
    return acc;
  }, {} as Record<string, Feedback[]>);

  // Get unique types for filter
  const uniqueTypes = [...new Set(feedback.map((f) => f.type))];

  // Get statistics
  const stats = {
    total: feedback.length,
    positive: feedback.filter((f) => f.type === 'positive').length,
    constructive: feedback.filter((f) => f.type === 'constructive').length,
    midCycle: feedback.filter((f) => f.type === 'mid_cycle_note').length,
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/dashboard/employee')}>
          ← Back
        </button>
        <h1>Feedback History</h1>
        <p className={styles.subtitle}>View all feedback and notes from your supervisors</p>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total Feedback</div>
        </div>
        <div className={`${styles.statCard} ${styles.positive}`}>
          <div className={styles.statValue}>{stats.positive}</div>
          <div className={styles.statLabel}>Positive</div>
        </div>
        <div className={`${styles.statCard} ${styles.constructive}`}>
          <div className={styles.statValue}>{stats.constructive}</div>
          <div className={styles.statLabel}>Constructive</div>
        </div>
        <div className={`${styles.statCard} ${styles.midCycle}`}>
          <div className={styles.statValue}>{stats.midCycle}</div>
          <div className={styles.statLabel}>Mid-Cycle Notes</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Review Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className={styles.select}
          >
            <option value="all">All Periods</option>
            <option value={1}>R1</option>
            <option value={2}>R2</option>
            <option value={3}>R3</option>
            <option value={4}>R4</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={styles.select}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {getTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No Feedback Yet</h3>
          <p>
            {feedback.length === 0
              ? "You haven't received any feedback yet. Check back after your supervisor adds notes or feedback."
              : 'No feedback matches your current filters. Try adjusting the filters above.'}
          </p>
        </div>
      ) : (
        <div className={styles.feedbackSections}>
          {Object.entries(groupedFeedback)
            .sort(([a], [b]) => b.localeCompare(a)) // Sort by period descending
            .map(([period, items]) => (
              <div key={period} className={styles.periodSection}>
                <h2 className={styles.periodTitle}>{period} Review Period</h2>
                <div className={styles.feedbackList}>
                  {items
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => (
                      <div key={item._id} className={styles.feedbackCard}>
                        <div className={styles.feedbackHeader}>
                          <span
                            className={styles.feedbackType}
                            style={{ backgroundColor: getTypeColor(item.type) }}
                          >
                            {getTypeLabel(item.type)}
                          </span>
                          <span className={styles.feedbackDate}>{formatDate(item.createdAt)}</span>
                        </div>
                        <div className={styles.feedbackContent}>{item.content}</div>
                        <div className={styles.feedbackFooter}>
                          <span className={styles.addedBy}>
                            From: {item.addedBy?.name || 'Supervisor'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default FeedbackHistory;
