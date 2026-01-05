import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReviewCycles.module.css';

interface ReviewCycle {
  _id: string;
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  startDate: string;
  nextReviewDate: string;
  currentReviewPeriod: number;
  isActive: boolean;
}

function ReviewCycles() {
  const navigate = useNavigate();
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [config, setConfig] = useState({
    frequency: 'quarterly' as 'monthly' | 'quarterly' | 'biannual' | 'annual',
    startDate: '',
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchReviewCycle();
  }, [navigate]);

  const fetchReviewCycle = async () => {
    try {
      const userId = localStorage.getItem('userId');
      // Get organization ID from boss
      const orgRes = await fetch(`/api/boss/organization?userId=${userId}`);
      const orgData = await orgRes.json();
      
      if (orgData.status === 'success' && orgData.data?._id) {
        const res = await fetch(`/api/review-cycles/organization/${orgData.data._id}?userId=${userId}`);
        const data = await res.json();
        if (data.status === 'success') {
          setReviewCycle(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch review cycle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/review-cycles?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowConfigForm(false);
        setConfig({ frequency: 'quarterly', startDate: '' });
        fetchReviewCycle();
        alert('Review cycle configured successfully!');
      } else {
        alert(data.message || 'Failed to configure review cycle');
      }
    } catch (error) {
      console.error('Failed to configure review cycle:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  const handleTrigger = async () => {
    if (!reviewCycle) return;
    
    if (!confirm('Are you sure you want to trigger the next review period?')) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/review-cycles/${reviewCycle._id}/trigger?userId=${userId}`, {
        method: 'POST',
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        fetchReviewCycle();
        alert('Review period triggered successfully!');
      } else {
        alert(data.message || 'Failed to trigger review period');
      }
    } catch (error) {
      console.error('Failed to trigger review period:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.reviewCycles}>
      <div className={styles.header}>
        <h1>Review Cycle Configuration</h1>
        {!reviewCycle && (
          <button
            className={styles.createButton}
            onClick={() => setShowConfigForm(!showConfigForm)}
          >
            {showConfigForm ? 'Cancel' : '+ Configure Review Cycle'}
          </button>
        )}
      </div>

      {showConfigForm && !reviewCycle && (
        <div className={styles.configForm}>
          <h2>Configure Review Cycle</h2>
          <form onSubmit={handleConfigure}>
            <div className={styles.formGroup}>
              <label>Frequency *</label>
              <select
                value={config.frequency}
                onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
                required
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannual">Biannual (Every 6 months)</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Start Date *</label>
              <input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                required
              />
            </div>
            <button type="submit" className={styles.submitButton}>
              Configure Review Cycle
            </button>
          </form>
        </div>
      )}

      {reviewCycle && (
        <div className={styles.cycleInfo}>
          <div className={styles.infoCard}>
            <h2>Current Review Cycle</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Frequency:</span>
                <span className={styles.value}>{reviewCycle.frequency.charAt(0).toUpperCase() + reviewCycle.frequency.slice(1)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Start Date:</span>
                <span className={styles.value}>{new Date(reviewCycle.startDate).toLocaleDateString()}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Current Period:</span>
                <span className={styles.value}>Period {reviewCycle.currentReviewPeriod}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Next Review Date:</span>
                <span className={styles.value}>{new Date(reviewCycle.nextReviewDate).toLocaleDateString()}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Status:</span>
                <span className={`${styles.statusBadge} ${reviewCycle.isActive ? styles.active : styles.inactive}`}>
                  {reviewCycle.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <button
              className={styles.triggerButton}
              onClick={handleTrigger}
            >
              Trigger Next Review Period
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewCycles;

