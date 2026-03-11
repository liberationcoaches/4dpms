import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import { apiUrl } from '@/utils/api';
import styles from './Login.module.css';
import logo from '@/assets/logo.png';

type Step = 'identifier' | 'setPassword' | 'enterPassword';

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrors({ identifier: 'Email or mobile is required' });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(apiUrl(`/api/auth/check-user?identifier=${encodeURIComponent(trimmed)}`));
      const data = await res.json();
      if (!res.ok) {
        setErrors({ identifier: data.message || 'Something went wrong' });
        return;
      }
      if (!data.data?.exists) {
        setErrors({ identifier: 'No account found with this email or mobile. Please sign up first.' });
        return;
      }
      if (data.data?.needsPassword) {
        setUserId(data.data.userId);
        setStep('setPassword');
        setPassword('');
        setConfirmPassword('');
      } else {
        setUserId(null);
        setStep('enterPassword');
        setPassword('');
      }
    } catch {
      setErrors({ identifier: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (!userId) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(apiUrl('/api/auth/set-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ password: data.message || 'Failed to set password' });
        return;
      }
      localStorage.setItem('userId', data.data.userId);
      localStorage.setItem('userRole', data.data.role || 'employee');
      await redirectAfterAuth(data.data.role, data.data.userId);
    } catch {
      setErrors({ password: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ password: data.message || 'Login failed' });
        return;
      }
      localStorage.setItem('userId', data.data.userId);
      localStorage.setItem('userRole', data.data.role || 'employee');
      await redirectAfterAuth(data.data.role, data.data.userId);
    } catch {
      setErrors({ password: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectAfterAuth = async (role: string, uid: string) => {
    const roleOrDefault = (role || 'employee') as UserRole;
    const validRoles: UserRole[] = ['platform_admin', 'client_admin', 'org_admin', 'reviewer', 'boss', 'manager', 'employee'];
    const resolvedRole = validRoles.includes(roleOrDefault) ? roleOrDefault : 'employee';

    if (['org_admin', 'boss', 'manager', 'employee'].includes(resolvedRole)) {
      try {
        const onboardingRes = await fetch(apiUrl(`/api/onboarding/status?userId=${uid}`));
        const onboardingData = await onboardingRes.json();
        if (onboardingData.status === 'success' && !onboardingData.data.onboardingCompleted) {
          navigate('/onboarding');
          return;
        }
      } catch {
        // continue to dashboard
      }
    }

    navigate(getDashboardPath(resolvedRole));
  };

  const handleBack = () => {
    setStep('identifier');
    setPassword('');
    setConfirmPassword('');
    setUserId(null);
    setErrors({});
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.accentOne} />
      <div className={styles.accentTwo} />
      <div className={styles.accentGrid} />
      <div className={styles.content}>
        <div className={styles.formCard}>
          <button
            type="button"
            className={styles.backButton}
            onClick={step === 'identifier' ? () => navigate(-1) : handleBack}
            aria-label="Go back"
          >
            ←
          </button>
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          <h2 className={styles.greeting}>Welcome back!</h2>
          <p className={styles.subGreeting}>
            {step === 'identifier' && 'Enter your email or mobile number to continue.'}
            {step === 'setPassword' && 'Set your password to complete your account setup.'}
            {step === 'enterPassword' && 'Enter your password to log in.'}
          </p>

          {step === 'identifier' && (
            <form className={styles.form} onSubmit={handleContinue} noValidate>
              <div className={styles.inputGroup}>
                <input
                  id="identifier"
                  type="text"
                  className={`${styles.input} ${errors.identifier ? styles.inputError : ''}`}
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setErrors(prev => ({ ...prev, identifier: '' })); }}
                  placeholder=" "
                  aria-invalid={!!errors.identifier}
                />
                <label htmlFor="identifier" className={styles.label}>Email or Mobile</label>
                {errors.identifier && (
                  <span className={styles.errorText} role="alert">{errors.identifier}</span>
                )}
              </div>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Checking...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'setPassword' && (
            <form className={styles.form} onSubmit={handleSetPassword} noValidate>
              <div className={styles.inputGroup}>
                <input
                  id="password"
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                  placeholder=" "
                  aria-invalid={!!errors.password}
                />
                <label htmlFor="password" className={styles.label}>Password</label>
                {errors.password && <span className={styles.errorText} role="alert">{errors.password}</span>}
              </div>
              <div className={styles.inputGroup}>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                  placeholder=" "
                  aria-invalid={!!errors.confirmPassword}
                />
                <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                {errors.confirmPassword && <span className={styles.errorText} role="alert">{errors.confirmPassword}</span>}
              </div>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Setting password...' : 'Set Password'}
              </button>
            </form>
          )}

          {step === 'enterPassword' && (
            <form className={styles.form} onSubmit={handleLogin} noValidate>
              <div className={styles.inputGroup}>
                <input
                  id="identifierDisplay"
                  type="text"
                  className={styles.input}
                  value={identifier}
                  readOnly
                  style={{ opacity: 0.8 }}
                />
                <label className={styles.label}>Email or Mobile</label>
              </div>
              <div className={styles.inputGroup}>
                <input
                  id="password"
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                  placeholder=" "
                  aria-invalid={!!errors.password}
                />
                <label htmlFor="password" className={styles.label}>Password</label>
                {errors.password && <span className={styles.errorText} role="alert">{errors.password}</span>}
              </div>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          <div className={styles.linkContainer}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => navigate('/auth/join')}
            >
              Have an invite? Join here
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => navigate('/auth/signup')}
            >
              Don't have an account? Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
