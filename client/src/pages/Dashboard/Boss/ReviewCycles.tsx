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
  r1Date?: string;
  r2Date?: string;
  r3Date?: string;
  r4Date?: string;
  r1Facilitator?: string;
  r2Facilitator?: string;
  r3Facilitator?: string;
  r4Facilitator?: string;
}

const emptyQuarterConfig = {
  r1Date: '', r2Date: '', r3Date: '', r4Date: '',
  r1Facilitator: '', r2Facilitator: '', r3Facilitator: '', r4Facilitator: '',
};

function ReviewCycles() {
  const navigate = useNavigate();
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showEditQuarters, setShowEditQuarters] = useState(false);
  const [config, setConfig] = useState({
    frequency: 'quarterly' as 'monthly' | 'quarterly' | 'biannual' | 'annual',
    startDate: '',
    ...emptyQuarterConfig,
  });
  const [quarterEdit, setQuarterEdit] = useState(emptyQuarterConfig);
  const [savingQuarters, setSavingQuarters] = useState(false);

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
        body: JSON.stringify({
          frequency: config.frequency,
          startDate: config.startDate,
          r1Date: config.r1Date || undefined,
          r2Date: config.r2Date || undefined,
          r3Date: config.r3Date || undefined,
          r4Date: config.r4Date || undefined,
          r1Facilitator: config.r1Facilitator?.trim() || undefined,
          r2Facilitator: config.r2Facilitator?.trim() || undefined,
          r3Facilitator: config.r3Facilitator?.trim() || undefined,
          r4Facilitator: config.r4Facilitator?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setShowConfigForm(false);
        setConfig({ frequency: 'quarterly', startDate: '', ...emptyQuarterConfig });
        fetchReviewCycle();
        alert('Review cycle set.');
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

  const openEditQuarters = () => {
    setQuarterEdit({
      r1Date: reviewCycle?.r1Date ? reviewCycle.r1Date.slice(0, 10) : '',
      r2Date: reviewCycle?.r2Date ? reviewCycle.r2Date.slice(0, 10) : '',
      r3Date: reviewCycle?.r3Date ? reviewCycle.r3Date.slice(0, 10) : '',
      r4Date: reviewCycle?.r4Date ? reviewCycle.r4Date.slice(0, 10) : '',
      r1Facilitator: reviewCycle?.r1Facilitator ?? '',
      r2Facilitator: reviewCycle?.r2Facilitator ?? '',
      r3Facilitator: reviewCycle?.r3Facilitator ?? '',
      r4Facilitator: reviewCycle?.r4Facilitator ?? '',
    });
    setShowEditQuarters(true);
  };

  const handleSaveQuarters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewCycle) return;
    setSavingQuarters(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/review-cycles/${reviewCycle._id}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          r1Date: quarterEdit.r1Date || undefined,
          r2Date: quarterEdit.r2Date || undefined,
          r3Date: quarterEdit.r3Date || undefined,
          r4Date: quarterEdit.r4Date || undefined,
          r1Facilitator: quarterEdit.r1Facilitator.trim() || undefined,
          r2Facilitator: quarterEdit.r2Facilitator.trim() || undefined,
          r3Facilitator: quarterEdit.r3Facilitator.trim() || undefined,
          r4Facilitator: quarterEdit.r4Facilitator.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setReviewCycle(data.data);
        setShowEditQuarters(false);
        alert('Dates & facilitators updated.');
      } else {
        alert(data.message || 'Failed to update');
      }
    } catch (err) {
      console.error(err);
      alert('Network error.');
    } finally {
      setSavingQuarters(false);
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
            <h3 className={styles.quarterSectionTitle}>Quarterly dates &amp; facilitators (optional)</h3>
            {([1, 2, 3, 4] as const).map((n) => (
              <div key={n} className={styles.quarterRow}>
                <div className={styles.formGroup}>
                  <label>R{n} Date</label>
                  <input
                    type="date"
                    value={config[`r${n}Date` as keyof typeof config] as string}
                    onChange={(e) => setConfig({ ...config, [`r${n}Date`]: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>R{n} Facilitator</label>
                  <input
                    type="text"
                    placeholder="LCPL Facilitator name"
                    value={config[`r${n}Facilitator` as keyof typeof config] as string}
                    onChange={(e) => setConfig({ ...config, [`r${n}Facilitator`]: e.target.value })}
                  />
                </div>
              </div>
            ))}
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
                <span className={styles.value}>R{reviewCycle.currentReviewPeriod}</span>
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
            <div className={styles.quarterDatesSection}>
              <h3>Quarterly dates &amp; facilitators</h3>
              <div className={styles.quarterGrid}>
                {([1, 2, 3, 4] as const).map((n) => (
                  <div key={n} className={styles.quarterItem}>
                    <span className={styles.quarterLabel}>R{n}</span>
                    <span className={styles.quarterValue}>
                      {reviewCycle[`r${n}Date` as keyof ReviewCycle] ? new Date(reviewCycle[`r${n}Date` as keyof ReviewCycle] as string).toLocaleDateString() : '—'}
                    </span>
                    <span className={styles.quarterFacilitator}>
                      {reviewCycle[`r${n}Facilitator` as keyof ReviewCycle] || '—'}
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" className={styles.editQuartersButton} onClick={openEditQuarters}>
                Edit quarterly dates &amp; facilitators
              </button>
            </div>
            {showEditQuarters && (
              <div className={styles.configForm}>
                <h3>Edit quarterly dates &amp; facilitators</h3>
                <form onSubmit={handleSaveQuarters}>
                  {([1, 2, 3, 4] as const).map((n) => (
                    <div key={n} className={styles.quarterRow}>
                      <div className={styles.formGroup}>
                        <label>R{n} Date</label>
                        <input
                          type="date"
                          value={quarterEdit[`r${n}Date`]}
                          onChange={(e) => setQuarterEdit({ ...quarterEdit, [`r${n}Date`]: e.target.value })}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>R{n} Facilitator</label>
                        <input
                          type="text"
                          placeholder="LCPL Facilitator"
                          value={quarterEdit[`r${n}Facilitator`]}
                          onChange={(e) => setQuarterEdit({ ...quarterEdit, [`r${n}Facilitator`]: e.target.value })}
                        />
                      </div>
                    </div>
                  ))}
                  <div className={styles.formActions}>
                    <button type="button" className={styles.cancelButton} onClick={() => setShowEditQuarters(false)}>Cancel</button>
                    <button type="submit" className={styles.submitButton} disabled={savingQuarters}>
                      {savingQuarters ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            )}
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

