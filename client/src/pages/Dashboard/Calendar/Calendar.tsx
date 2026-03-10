import { useState, useEffect } from 'react';
import { apiUrl } from '@/utils/api';
import styles from './Calendar.module.css';

interface ReviewCycle {
  _id: string;
  frequency: string;
  startDate: string;
  nextReviewDate: string;
  currentReviewPeriod: number;
  isActive: boolean;
  r1Date?: string;
  r2Date?: string;
  r3Date?: string;
  r4Date?: string;
}

function Calendar() {
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReviewCycle();
  }, []);

  const fetchReviewCycle = async () => {
    try {
      const userId = localStorage.getItem('userId');
      // Try to get review cycle via boss/organization endpoint
      const orgRes = await fetch(apiUrl(`/api/boss/organization?userId=${userId}`));
      const orgData = await orgRes.json();
      
      if (orgData.status === 'success' && orgData.data?._id) {
        const cycleRes = await fetch(apiUrl(`/api/review-cycles?organizationId=${orgData.data._id}&userId=${userId}`));
        const cycleData = await cycleRes.json();
        if (cycleData.status === 'success' && cycleData.data) {
          setReviewCycle(Array.isArray(cycleData.data) ? cycleData.data[0] : cycleData.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch review cycle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (dateString: string | undefined): number | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPeriodStatus = (periodNum: number): 'completed' | 'current' | 'upcoming' => {
    if (!reviewCycle) return 'upcoming';
    if (periodNum < reviewCycle.currentReviewPeriod) return 'completed';
    if (periodNum === reviewCycle.currentReviewPeriod) return 'current';
    return 'upcoming';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Review Calendar</h2>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Review Calendar</h2>
      
      {reviewCycle ? (
        <>
          {/* Next Review Highlight */}
          {reviewCycle.nextReviewDate && (
            <div className={styles.nextReviewSection}>
              <div className={styles.nextReviewTitle}>Next Review Date</div>
              <div className={styles.nextReviewDate}>
                {formatDate(reviewCycle.nextReviewDate)}
              </div>
              {getDaysRemaining(reviewCycle.nextReviewDate) !== null && (
                <div className={styles.daysRemaining}>
                  {getDaysRemaining(reviewCycle.nextReviewDate)! > 0
                    ? `${getDaysRemaining(reviewCycle.nextReviewDate)} days remaining`
                    : getDaysRemaining(reviewCycle.nextReviewDate)! === 0
                    ? 'Today!'
                    : `${Math.abs(getDaysRemaining(reviewCycle.nextReviewDate)!)} days overdue`}
                </div>
              )}
            </div>
          )}

          {/* Review Cycle Card */}
          <div className={styles.reviewCycleCard}>
            <div className={styles.cycleHeader}>
              <h3 className={styles.cycleName}>
                {reviewCycle.frequency.charAt(0).toUpperCase() + reviewCycle.frequency.slice(1)} Review Cycle
              </h3>
              <span className={styles.currentPeriodBadge}>
                Current: R{reviewCycle.currentReviewPeriod}
              </span>
            </div>
            
            <p className={styles.description}>
              Started: {formatDate(reviewCycle.startDate)}
            </p>

            {/* Review Periods Grid */}
            <div className={styles.periodsGrid}>
              {[
                { name: 'Review 1 (R1)', date: reviewCycle.r1Date, num: 1 },
                { name: 'Review 2 (R2)', date: reviewCycle.r2Date, num: 2 },
                { name: 'Review 3 (R3)', date: reviewCycle.r3Date, num: 3 },
                { name: 'Review 4 (R4)', date: reviewCycle.r4Date, num: 4 },
              ].map((period) => {
                const status = getPeriodStatus(period.num);
                return (
                  <div 
                    key={period.num} 
                    className={`${styles.periodCard} ${styles[status]}`}
                  >
                    <div className={styles.periodName}>{period.name}</div>
                    <div className={styles.periodDate}>{formatDate(period.date)}</div>
                    <div className={`${styles.periodStatus} ${styles[status]}`}>
                      {status === 'completed' && '✓ Completed'}
                      {status === 'current' && '● In Progress'}
                      {status === 'upcoming' && '○ Upcoming'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.noData}>
          <p>No review cycle has been configured yet.</p>
          <p className={styles.description}>
            Contact your administrator to set up a review cycle for your organization.
          </p>
        </div>
      )}
    </div>
  );
}

export default Calendar;

