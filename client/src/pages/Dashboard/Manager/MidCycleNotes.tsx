import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MidCycleNotes.module.css';

interface Employee {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

function MidCycleNotes() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [note, setNote] = useState('');
  const [reviewPeriod, setReviewPeriod] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/auth/login');
      return;
    }

    fetchEmployees();
  }, [navigate]);

  const fetchEmployees = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/manager/employees?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !note.trim()) {
      alert('Please select an employee and enter a note');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/feedback/mid-cycle-note?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          note: note.trim(),
          reviewPeriod,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Note added.');
        setNote('');
        setSelectedEmployee('');
      } else {
        alert(data.message || 'Failed to add mid-cycle note');
      }
    } catch (error) {
      console.error('Failed to add mid-cycle note:', error);
      alert('Network error. Please check if the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.midCycleNotes}>
      <div className={styles.header}>
        <h1>Mid-Cycle Notes</h1>
        <p className={styles.subtitle}>Add notes and feedback for your team members</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Select Member *</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            required
            className={styles.select}
          >
            <option value="">Choose an employee...</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} ({emp.email})
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Review Period</label>
          <select
            value={reviewPeriod}
            onChange={(e) => setReviewPeriod(Number(e.target.value))}
            className={styles.select}
          >
            <option value={1}>Period 1</option>
            <option value={2}>Period 2</option>
            <option value={3}>Period 3</option>
            <option value={4}>Period 4</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Note *</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter your mid-cycle note or feedback..."
            required
            className={styles.textarea}
            rows={6}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding Note...' : 'Add Mid-Cycle Note'}
        </button>
      </form>
    </div>
  );
}

export default MidCycleNotes;

