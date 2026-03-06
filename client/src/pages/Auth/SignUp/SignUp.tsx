import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SignUp.module.css';
import logo from '@/assets/logo.png';
import { Link } from 'react-router-dom';

export interface SignUpFormData {
  name: string;
  email: string;
  designation: string;
  mobile: string;
  signupType: 'boss' | 'manager' | 'employee';
  orgCode?: string;
  teamCode?: string;
}

interface SignUpProps {
  onSubmit?: (data: SignUpFormData) => void | Promise<void>;
}

function SignUp({ onSubmit }: SignUpProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    navigate(-1);
  };
  const [formData, setFormData] = useState<SignUpFormData>({
    name: '',
    email: '',
    designation: '',
    mobile: '',
    signupType: 'boss',
    orgCode: '',
    teamCode: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    orgCode?: string;
    teamCode?: string;
  } | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Designation is required for all users
    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Invalid mobile number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get organization profile data from localStorage if available
      const orgProfileStr = localStorage.getItem('organizationProfile');
      let orgProfile = null;
      if (orgProfileStr) {
        try {
          orgProfile = JSON.parse(orgProfileStr);
        } catch (e) {
          console.error('Failed to parse organization profile:', e);
        }
      }

      // Normalize mobile number (remove any non-digit characters)
      const normalizedMobile = formData.mobile.replace(/\D/g, '');

      // Clean up form data - remove empty strings for optional fields
      const cleanedFormData = {
        ...formData,
        mobile: normalizedMobile,
        signupType: 'boss' as const,
        orgCode: undefined,
        teamCode: undefined,
      };

      // Merge organization profile data with signup data
      const signupData = {
        ...cleanedFormData,
        ...(orgProfile && {
          companyName: orgProfile.organizationName || '',
          industry: orgProfile.organizationType || 'Other',
        }),
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save userId for dashboard access
        if (data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
        }
        // Store generated codes if any
        if (data.data?.orgCode || data.data?.teamCode) {
          setGeneratedCode({
            orgCode: data.data.orgCode,
            teamCode: data.data.teamCode,
          });
        }
        // Store OTP for easy testing (only available in development mode)
        if (data.data?.mobileOTP) {
          localStorage.setItem('dev_mobileOTP', data.data.mobileOTP);
        }
        if (onSubmit) {
          await onSubmit(formData);
        }
        navigate('/auth/otp-verify', {
          state: {
            email: formData.email,
            mobile: formData.mobile,
            orgCode: data.data?.orgCode,
            teamCode: data.data?.teamCode,
          },
        });
      } else {
        console.error('Signup failed:', data);
        // Handle validation errors from backend (Zod format)
        const newErrors: Partial<Record<keyof SignUpFormData, string>> = {};

        // Handle Zod validation errors
        if (data.issues && Array.isArray(data.issues)) {
          data.issues.forEach((issue: any) => {
            const field = issue.path?.[0] as keyof SignUpFormData;
            if (field && field in formData) {
              newErrors[field] = issue.message;
            }
          });
        }

        // Handle custom error format
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((error: { field: string; message: string }) => {
            const field = error.field as keyof SignUpFormData;
            if (field in formData) {
              newErrors[field] = error.message;
            }
          });
        }

        // If no specific field errors, show general message
        if (Object.keys(newErrors).length === 0) {
          newErrors.email = data.message || 'Sign up failed. Please try again.';
        }

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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
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
            onClick={handleBack}
            aria-label="Go back"
          >
            ←
          </button>
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          <h2 className={styles.greeting}>Create your workspace</h2>
          <p className={styles.subGreeting}>
            Sign up to start managing performance with your team.
          </p>

          {generatedCode && (
            <div className={styles.codeDisplay}>
              {generatedCode.orgCode && (
                <div className={styles.codeBox}>
                  <p className={styles.codeLabel}>Your Organization Code:</p>
                  <p className={styles.codeValue}>{generatedCode.orgCode}</p>
                  <p className={styles.codeHint}>Share this code with your Supervisors</p>
                </div>
              )}
              {generatedCode.teamCode && (
                <div className={styles.codeBox}>
                  <p className={styles.codeLabel}>Your Team Code:</p>
                  <p className={styles.codeValue}>{generatedCode.teamCode}</p>
                  <p className={styles.codeHint}>Share this code with your team members</p>
                </div>
              )}
            </div>
          )}

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
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              <label htmlFor="name" className={styles.label}>
                Your name
              </label>
              {errors.name && (
                <span id="name-error" className={styles.errorText} role="alert">
                  {errors.name}
                </span>
              )}
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
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              {errors.email && (
                <span id="email-error" className={styles.errorText} role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <input
                id="designation"
                type="text"
                className={`${styles.input} ${errors.designation ? styles.inputError : ''}`}
                value={formData.designation}
                onChange={e => handleInputChange('designation', e.target.value)}
                placeholder=" "
                aria-invalid={!!errors.designation}
                aria-describedby={errors.designation ? 'designation-error' : undefined}
              />
              <label htmlFor="designation" className={styles.label}>
                Designation
              </label>
              {errors.designation && (
                <span id="designation-error" className={styles.errorText} role="alert">
                  {errors.designation}
                </span>
              )}
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
                aria-describedby={errors.mobile ? 'mobile-error' : undefined}
              />
              <label htmlFor="mobile" className={styles.label}>
                Mobile
              </label>
              {errors.mobile && (
                <span id="mobile-error" className={styles.errorText} role="alert">
                  {errors.mobile}
                </span>
              )}
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Signing up...' : 'Sign up'}
            </button>

            <p className={styles.linkRow}>
              Have an invite?{' '}
              <Link to="/auth/join" className={styles.link}>
                Join with invite
              </Link>
            </p>
            <Link to="/auth/login" className={styles.link}>
              Already signed up? Enter access code
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
