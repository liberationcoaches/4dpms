import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './OTPVerify.module.css';
import logo from '@/assets/logo.png';

export interface OTPVerificationData {
  mobileOTP: string;
}

interface LocationState {
  mobile?: string;
}

interface OTPVerifyProps {
  onVerify?: (data: OTPVerificationData) => void | Promise<void>;
}

function OTPVerify({ onVerify }: OTPVerifyProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [otpData, setOtpData] = useState<OTPVerificationData>({
    mobileOTP: '',
  });

  const [mobileValidated, setMobileValidated] = useState(false);
  const [errors, setErrors] = useState<Partial<OTPVerificationData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileResendCooldown, setMobileResendCooldown] = useState(0);
  const [devOTP, setDevOTP] = useState<string>('');

  const mobile = state?.mobile || '';

  // Fetch OTP from localStorage (stored during signup in dev mode)
  useEffect(() => {
    if (mobile) {
      // Try to get OTP from localStorage (stored during signup)
      const storedOTP = localStorage.getItem('dev_mobileOTP');
      if (storedOTP) {
        setDevOTP(storedOTP);
      }
    }
  }, [mobile]);

  useEffect(() => {
    // Redirect to signup if no mobile in state
    if (!mobile) {
      navigate('/auth/signup');
    }
  }, [mobile, navigate]);

  useEffect(() => {
    // Mobile OTP cooldown timer
    if (mobileResendCooldown > 0) {
      const timer = setTimeout(() => setMobileResendCooldown(mobileResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [mobileResendCooldown]);

  const validateOTP = (otp: string): boolean => {
    return /^\d{6}$/.test(otp);
  };

  const handleMobileOTPChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setOtpData((prev) => ({ ...prev, mobileOTP: cleanValue }));

    if (errors.mobileOTP) {
      setErrors((prev) => ({ ...prev, mobileOTP: undefined }));
    }

    if (validateOTP(cleanValue)) {
      // Auto-validate when 6 digits entered (don't mark as used yet)
      try {
        const response = await fetch('/api/auth/verify-otp/mobile', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-auto-validate': 'true', // Signal this is auto-validation
          },
          body: JSON.stringify({ mobile, otp: cleanValue }),
        });

        if (response.ok) {
          setMobileValidated(true);
        }
      } catch (error) {
        // Silent fail for auto-validation
      }
    } else {
      setMobileValidated(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<OTPVerificationData> = {};

    if (!validateOTP(otpData.mobileOTP)) {
      newErrors.mobileOTP = 'Please enter a valid 6-digit OTP';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-otp/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp: otpData.mobileOTP }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save userId if not already saved
        if (data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
        }
        // Save role if provided
        if (data.data?.role) {
          localStorage.setItem('userRole', data.data.role);
        }
        if (onVerify) {
          await onVerify(otpData);
        }
        // Platform admin doesn't need access code - go directly to dashboard
        if (data.data?.role === 'platform_admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/auth/access-code');
        }
      } else {
        setErrors({
          mobileOTP: data.message || 'OTP verification failed',
        });
      }
    } catch (error) {
      setErrors({
        mobileOTP: 'Network error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch('/api/auth/resend-otp/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store OTP if available (only in development mode)
        if (data.data?.otp) {
          setDevOTP(data.data.otp);
          localStorage.setItem('dev_mobileOTP', data.data.otp);
        }
        setMobileResendCooldown(60);
        setMobileValidated(false);
        setOtpData((prev) => ({ ...prev, mobileOTP: '' }));
      }
    } catch (error) {
      console.error('Failed to resend mobile OTP:', error);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.sidebar}>
        <h1 className={styles.sidebarTitle}>OTP VERIFICATION</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.formCard}>
          <div className={styles.badge}>Step 2 of 2</div>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/auth/signup')}
            aria-label="Go back"
          >
            ←
          </button>

          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>
          <h2 className={styles.greeting}>Verify your mobile</h2>
          <p className={styles.subGreeting}>
            Enter the 6-digit code we sent to your mobile number.
          </p>

          {/* Development Mode OTP Display */}
          {devOTP && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: '#e3f2fd',
              border: '1px solid #2196f3',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <strong style={{ color: '#1976d2' }}>🔧 Development Mode - Your OTP</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#1565c0' }}>
                <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{devOTP}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setOtpData({ mobileOTP: devOTP });
                  handleMobileOTPChange(devOTP);
                }}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Click to Auto-Fill
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.otpSection}>
              <label htmlFor="mobileOTP" className={styles.label}>
                Enter OTP received on mobile
              </label>
              <div className={styles.otpInputWrapper}>
                <input
                  id="mobileOTP"
                  type="text"
                  inputMode="numeric"
                  className={`${styles.otpInput} ${errors.mobileOTP ? styles.inputError : ''} ${
                    mobileValidated ? styles.inputValid : ''
                  }`}
                  value={otpData.mobileOTP}
                  onChange={(e) => handleMobileOTPChange(e.target.value)}
                  maxLength={6}
                  aria-invalid={!!errors.mobileOTP}
                  aria-describedby={errors.mobileOTP ? 'mobileOTP-error' : undefined}
                />
                {mobileValidated && (
                  <span className={styles.checkmark} aria-label="Mobile OTP verified">
                    ✓
                  </span>
                )}
              </div>
              {errors.mobileOTP && (
                <span id="mobileOTP-error" className={styles.errorText} role="alert">
                  {errors.mobileOTP}
                </span>
              )}
              <div className={styles.resendLinks}>
                <button type="button" className={styles.link} onClick={() => handleResendOTP()}>
                  Haven't got OTP?
                </button>
                <button
                  type="button"
                  className={styles.resendButton}
                  onClick={() => handleResendOTP()}
                  disabled={mobileResendCooldown > 0}
                >
                  {mobileResendCooldown > 0
                    ? `Resend OTP (${mobileResendCooldown}s)`
                    : 'Resend OTP'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting || !mobileValidated}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default OTPVerify;

