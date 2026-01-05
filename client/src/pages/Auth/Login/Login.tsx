import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import logo from '@/assets/logo.png';

interface LoginForm {
  mobile: string;
  accessCode: string;
}

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginForm>({ mobile: '', accessCode: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const next: Partial<Record<keyof LoginForm, string>> = {};
    if (!formData.mobile.trim()) {
      next.mobile = 'Mobile is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      next.mobile = 'Enter a valid 10-digit mobile';
    }
    // Access code is optional - will be checked on backend for platform_admin
    if (formData.accessCode.trim() && formData.accessCode.trim().length < 4) {
      next.accessCode = 'Access code must be at least 4 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile.replace(/\D/g, ''),
          accessCode: formData.accessCode || undefined, // Optional for platform_admin
        }),
      });
      const data = await response.json();
      if (response.ok) {
        // Save userId and role
        if (data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
        }
        if (data.data?.role) {
          localStorage.setItem('userRole', data.data.role);
        }

        // Check if user needs to set up access code
        if (data.data?.needsAccessCode) {
          // Redirect to access code setup page
          navigate('/auth/access-code');
          return;
        }
        
        // Role-based redirection for successful login
        if (data.data?.role) {
          switch (data.data.role) {
            case 'platform_admin':
              navigate('/admin/dashboard');
              break;
            case 'reviewer':
              navigate('/reviewer/dashboard');
              break;
            case 'boss':
              navigate('/dashboard/boss');
              break;
            case 'manager':
              navigate('/dashboard/manager');
              break;
            case 'employee':
              navigate('/dashboard/employee');
              break;
            default:
              navigate('/dashboard');
          }
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors({ accessCode: data.message || 'Login failed' });
      }
    } catch (error) {
      setErrors({ accessCode: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof LoginForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
          <h2 className={styles.greeting}>Welcome back!</h2>
          <p className={styles.subGreeting}>Enter your mobile number to login. Access code required for non-admin users.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="mobile" className={styles.label}>
                Mobile
              </label>
              <input
                id="mobile"
                type="tel"
                className={`${styles.input} ${errors.mobile ? styles.inputError : ''}`}
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                placeholder="Enter mobile number"
                aria-invalid={!!errors.mobile}
                aria-describedby={errors.mobile ? 'mobile-error' : undefined}
              />
              {errors.mobile && (
                <span id="mobile-error" className={styles.errorText} role="alert">
                  {errors.mobile}
                </span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="accessCode" className={styles.label}>
                Access Code
              </label>
              <input
                id="accessCode"
                type="password"
                className={`${styles.input} ${errors.accessCode ? styles.inputError : ''}`}
                value={formData.accessCode}
                onChange={(e) => handleChange('accessCode', e.target.value)}
                placeholder="Enter your access code"
                aria-invalid={!!errors.accessCode}
                aria-describedby={errors.accessCode ? 'accessCode-error' : undefined}
              />
              {errors.accessCode && (
                <span id="accessCode-error" className={styles.errorText} role="alert">
                  {errors.accessCode}
                </span>
              )}
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <div className={styles.linkContainer}>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => navigate('/auth/signup')}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;

