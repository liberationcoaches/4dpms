import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Scoring.module.css';

interface Employee {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

interface KRAs {
  functionalKRAs: any[];
  organizationalKRAs: any[];
  selfDevelopmentKRAs: any[];
  developingOthersKRAs: any[];
}

function Scoring() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [kras, setKras] = useState<KRAs | null>(null);
  const [reviewPeriod, setReviewPeriod] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || !employeeId) {
      navigate('/auth/login');
      return;
    }

    fetchEmployeeData();
  }, [employeeId, navigate]);

  const fetchEmployeeData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/employees/${employeeId}?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setEmployee(data.data.employee);
        setKras(data.data.kras);
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!kras || !employeeId) return;

    setIsSubmitting(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/employees/${employeeId}/scores?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewPeriod,
          scores: kras,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Scores submitted successfully!');
        navigate('/reviewer/dashboard');
      } else {
        alert(data.message || 'Failed to submit scores');
      }
    } catch (error) {
      console.error('Failed to submit scores:', error);
      alert('Network error. Please check if the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!confirm('Are you sure you want to lock this review? It cannot be edited after locking.')) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/employees/${employeeId}/lock?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewPeriod }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Review locked successfully!');
        navigate('/reviewer/dashboard');
      } else {
        alert(data.message || 'Failed to lock review');
      }
    } catch (error) {
      console.error('Failed to lock review:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!employee || !kras) {
    return <div className={styles.error}>Employee data not found</div>;
  }

  return (
    <div className={styles.scoring}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/reviewer/dashboard')}>
          ← Back
        </button>
        <h1>Enter Scores for {employee.name}</h1>
      </div>

      <div className={styles.controls}>
        <label>
          Review Period:
          <select
            value={reviewPeriod}
            onChange={(e) => setReviewPeriod(Number(e.target.value))}
            className={styles.periodSelect}
          >
            <option value={1}>Period 1</option>
            <option value={2}>Period 2</option>
            <option value={3}>Period 3</option>
            <option value={4}>Period 4</option>
          </select>
        </label>
      </div>

      <div className={styles.scoresSection}>
        <h2>Functional Dimension KRAs</h2>
        <div className={styles.kraList}>
          {kras.functionalKRAs && kras.functionalKRAs.length > 0 ? (
            kras.functionalKRAs.map((kra, index) => (
              <div key={index} className={styles.kraCard}>
                <h3>{kra.kra || `KRA ${index + 1}`}</h3>
                <div className={styles.scoreInputs}>
                  <div>
                    <label>Weight</label>
                    <input type="number" min="0" max="100" defaultValue={kra[`r${reviewPeriod}Weight`] || 0} />
                  </div>
                  <div>
                    <label>Score</label>
                    <input type="number" min="0" max="100" defaultValue={kra[`r${reviewPeriod}Score`] || 0} />
                  </div>
                  <div>
                    <label>Actual Performance</label>
                    <textarea defaultValue={kra[`r${reviewPeriod}ActualPerf`] || ''} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.noKras}>No functional KRAs defined yet</p>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Scores'}
        </button>
        <button
          className={styles.lockButton}
          onClick={handleLock}
        >
          Lock Review
        </button>
      </div>
    </div>
  );
}

export default Scoring;

