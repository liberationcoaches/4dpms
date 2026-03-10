import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardPath, type UserRole } from '@/utils/dashboardRoutes';
import { apiUrl } from '@/utils/api';
import styles from './AccessCode.module.css';
import logo from '@/assets/logo.png';

interface AccessCodeForm {
  accessCode: string;
  confirmCode: string;
  useFingerprint: boolean;
}

function AccessCode() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AccessCodeForm>({
    accessCode: '',
    confirmCode: '',
    useFingerprint: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AccessCodeForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const next: Partial<Record<keyof AccessCodeForm, string>> = {};
    if (!formData.accessCode.trim()) {
      next.accessCode = 'Access code is required';
    } else if (formData.accessCode.trim().length < 4) {
      next.accessCode = 'Use at least 4 characters';
    }
    if (formData.confirmCode.trim() !== formData.accessCode.trim()) {
      next.confirmCode = 'Codes do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setErrors({ accessCode: 'User session expired. Please sign up again.' });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(apiUrl(`/api/auth/access-code?userId=${userId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        // Save fresh values from response, fall back to localStorage
        const userRole = data.data?.role || localStorage.getItem('userRole');
        const userId = data.data?.userId || localStorage.getItem('userId');
        
        // Always overwrite localStorage with latest values
        if (userId) localStorage.setItem('userId', userId);
        if (userRole) localStorage.setItem('userRole', userRole);

        // Admin/reviewer/CSA go to their specific dashboards
        if (userRole === 'platform_admin') {
          navigate('/admin/dashboard');
          return;
        }
        if (userRole === 'reviewer') {
          navigate('/reviewer/dashboard');
          return;
        }
        if (userRole === 'client_admin') {
          navigate('/client-admin/dashboard');
          return;
        }

        // All other roles: check onboarding status first
        if (userId) {
          try {
            const onboardingRes = await fetch(apiUrl(`/api/onboarding/status?userId=${userId}`));
            const onboardingData = await onboardingRes.json();
            if (onboardingData.status === 'success' && !onboardingData.data.onboardingCompleted) {
              navigate('/onboarding');
              return;
            }
          } catch {
            // If check fails, go to dashboard
          }
        }

        // Route to role-specific dashboard
        navigate(getDashboardPath((userRole || 'employee') as UserRole));
      } else {
        setErrors({ accessCode: data.message || 'Failed to set access code' });
      }
    } catch (error) {
      setErrors({ accessCode: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AccessCodeForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value } as AccessCodeForm));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ←
          </button>
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          <h2 className={styles.greeting}>Great! Your account is almost set up!</h2>
          <p className={styles.subGreeting}>Set up your Access Code</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="accessCode" className={styles.label}>
                New Access Code
              </label>
              <input
                id="accessCode"
                type="password"
                className={`${styles.input} ${errors.accessCode ? styles.inputError : ''}`}
                value={formData.accessCode}
                onChange={(e) => handleChange('accessCode', e.target.value)}
                placeholder="Enter access code"
                aria-invalid={!!errors.accessCode}
                aria-describedby={errors.accessCode ? 'accessCode-error' : undefined}
              />
              {errors.accessCode && (
                <span id="accessCode-error" className={styles.errorText} role="alert">
                  {errors.accessCode}
                </span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmCode" className={styles.label}>
                Confirm Access Code
              </label>
              <input
                id="confirmCode"
                type="password"
                className={`${styles.input} ${errors.confirmCode ? styles.inputError : ''}`}
                value={formData.confirmCode}
                onChange={(e) => handleChange('confirmCode', e.target.value)}
                placeholder="Re-enter access code"
                aria-invalid={!!errors.confirmCode}
                aria-describedby={errors.confirmCode ? 'confirmCode-error' : undefined}
              />
              {errors.confirmCode && (
                <span id="confirmCode-error" className={styles.errorText} role="alert">
                  {errors.confirmCode}
                </span>
              )}
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={formData.useFingerprint}
                onChange={(e) => handleChange('useFingerprint', e.target.checked)}
              />
              <div className={styles.checkboxCopy}>
                <span className={styles.checkboxMain}>Use fingerprint verification to sign in.</span>
                <span className={styles.checkboxSub}>
                  You can change this in settings at any time.
                </span>
              </div>
            </label>

            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AccessCode;

