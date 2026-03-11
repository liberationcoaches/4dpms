import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import styles from './VerifyEmail.module.css';
import logo from '@/assets/logo.png';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(apiUrl(`/api/auth/verify-email?token=${encodeURIComponent(token)}`));
        const data = await res.json();

        if (res.ok && data.status === 'success' && data.data?.success) {
          const userId = data.data.userId;
          const role = (data.data.role || 'org_admin') as UserRole;
          if (userId) localStorage.setItem('userId', userId);
          if (role) localStorage.setItem('userRole', role);
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.message || 'This verification link is invalid or has expired.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [token]);

  const handleGoToDashboard = () => {
    const role = (localStorage.getItem('userRole') || 'org_admin') as UserRole;
    navigate(getDashboardPath(role));
  };

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    const email = resendEmail.trim().toLowerCase();
    if (!email) {
      setResendError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResendError('Invalid email');
      return;
    }
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setResendSuccess(true);
      } else {
        setResendError(data.message || 'Failed to send verification email');
      }
    } catch {
      setResendError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.content}>
        <div className={styles.formCard}>
          <div className={styles.logo}>
            <img src={logo} alt="4DPMS" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          {status === 'verifying' && (
            <>
              <div className={styles.spinner} />
              <h2 className={styles.greeting}>Verifying your email...</h2>
              <p className={styles.subGreeting}>Please wait.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className={styles.iconSuccess} aria-hidden>✓</div>
              <h2 className={styles.greeting}>Email verified successfully!</h2>
              <p className={styles.subGreeting}>You can now access your dashboard.</p>
              <button type="button" className={styles.primaryButton} onClick={handleGoToDashboard}>
                Go to Dashboard
              </button>
            </>
          )}
          {status === 'error' && (
            <>
              <div className={styles.iconError} aria-hidden>✕</div>
              <h2 className={styles.greeting}>Verification failed</h2>
              <p className={styles.subGreeting}>{message}</p>
              <form onSubmit={handleResend}>
                <div className={styles.formGroup}>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Enter your email to resend verification"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resendSuccess}
                  />
                  {resendError && <span className={styles.errorText}>{resendError}</span>}
                  {resendSuccess && <span className={styles.subGreeting} style={{ color: '#22c55e', marginTop: '0.5rem', display: 'block' }}>Verification email sent. Check your inbox.</span>}
                </div>
                <button type="submit" className={styles.primaryButton} disabled={isResending || resendSuccess}>
                  {isResending ? 'Sending...' : 'Resend verification email'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
