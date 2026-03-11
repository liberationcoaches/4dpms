import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './SignUp.module.css';
import logo from '@/assets/logo.png';
import { Link } from 'react-router-dom';

export interface SignUpFormData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  orgName: string;
  orgSize: string;
}

const ORG_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '200+'] as const;

function SignUp() {
  const navigate = useNavigate();
  const handleBack = () => navigate(-1);

  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    orgSize: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) newErrors.mobile = 'Invalid mobile number (10 digits required)';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.orgName.trim()) newErrors.orgName = 'Organization name is required';
    if (!formData.orgSize) newErrors.orgSize = 'Please select organization size';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const normalizedMobile = formData.mobile.replace(/\D/g, '');

      const response = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: normalizedMobile,
          password: formData.password,
          orgName: formData.orgName.trim(),
          orgSize: formData.orgSize,
        }),
      });

      interface SignupResponse {
        data?: { userId?: string; orgCode?: string; role?: string };
        message?: string;
        errors?: Array<{ field: string; message: string }>;
        issues?: Array<{ path?: string[]; message: string }>;
      }
      let data: SignupResponse;
      try {
        const text = await response.text();
        data = (text ? JSON.parse(text) : {}) as SignupResponse;
      } catch {
        throw new Error(
          response.ok
            ? 'Invalid response from server'
            : `Server error (${response.status}). Please ensure the backend is running and try again.`
        );
      }

      if (response.ok) {
        if (data.data?.userId) localStorage.setItem('userId', data.data.userId);
        if (data.data?.role) localStorage.setItem('userRole', data.data.role);
        navigate('/onboarding');
      } else {
        const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};
        if (data.issues && Array.isArray(data.issues)) {
          data.issues.forEach((issue: { path?: string[]; message: string }) => {
            const field = issue.path?.[0] as keyof SignUpFormData;
            if (field && field in formData) newErrors[field] = issue.message;
          });
        }
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: { field: string; message: string }) => {
            const field = err.field as keyof SignUpFormData;
            if (field in formData) newErrors[field] = err.message;
          });
        }
        if (Object.keys(newErrors).length === 0) newErrors.email = data.message || 'Sign up failed. Please try again.';
        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({
        email: `Network error: ${error instanceof Error ? error.message : 'Please try again.'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.accentOne} />
      <div className={styles.accentTwo} />
      <div className={styles.accentGrid} />
      <div className={styles.content}>
        <div className={styles.formCard}>
          <button type="button" className={styles.backButton} onClick={handleBack} aria-label="Go back">
            ←
          </button>
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          <h2 className={styles.greeting}>Create your workspace</h2>
          <p className={styles.subGreeting}>Sign up to start managing performance with your team.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.inputGroup}>
              <input
                id="name"
                type="text"
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder=" "
                aria-invalid={!!errors.name}
              />
              <label htmlFor="name" className={styles.label}>Your name</label>
              {errors.name && <span className={styles.errorText} role="alert">{errors.name}</span>}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder=" "
                aria-invalid={!!errors.email}
              />
              <label htmlFor="email" className={styles.label}>Email</label>
              {errors.email && <span className={styles.errorText} role="alert">{errors.email}</span>}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="mobile"
                type="tel"
                className={`${styles.input} ${errors.mobile ? styles.inputError : ''}`}
                value={formData.mobile}
                onChange={e => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                placeholder=" "
                aria-invalid={!!errors.mobile}
              />
              <label htmlFor="mobile" className={styles.label}>Mobile</label>
              {errors.mobile && <span className={styles.errorText} role="alert">{errors.mobile}</span>}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="password"
                type="password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
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
                value={formData.confirmPassword}
                onChange={e => handleInputChange('confirmPassword', e.target.value)}
                placeholder=" "
                aria-invalid={!!errors.confirmPassword}
              />
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              {errors.confirmPassword && <span className={styles.errorText} role="alert">{errors.confirmPassword}</span>}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="orgName"
                type="text"
                className={`${styles.input} ${errors.orgName ? styles.inputError : ''}`}
                value={formData.orgName}
                onChange={e => handleInputChange('orgName', e.target.value)}
                placeholder=" "
                aria-invalid={!!errors.orgName}
              />
              <label htmlFor="orgName" className={styles.label}>Organization Name</label>
              {errors.orgName && <span className={styles.errorText} role="alert">{errors.orgName}</span>}
            </div>

            <div className={styles.selectGroup}>
              <label htmlFor="orgSize" className={styles.selectLabel}>Organization Size</label>
              <select
                id="orgSize"
                className={`${styles.select} ${errors.orgSize ? styles.inputError : ''}`}
                value={formData.orgSize}
                onChange={e => handleInputChange('orgSize', e.target.value)}
                aria-invalid={!!errors.orgSize}
              >
                <option value="">-- Select organization size --</option>
                {ORG_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size} employees</option>
                ))}
              </select>
              {errors.orgSize && <span className={styles.errorText} role="alert">{errors.orgSize}</span>}
            </div>

            <button type="submit" className={styles.primaryButton} disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? 'Signing up...' : 'Sign up'}
            </button>

            <p className={styles.linkRow}>
              Have an invite? <Link to="/auth/join" className={styles.link}>Join with invite</Link>
            </p>
            <Link to="/auth/login" className={styles.link}>Already have an account? Log in</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
