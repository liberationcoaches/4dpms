import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TeamCode.module.css';
import logo from '@/assets/logo.png';

interface TeamCodeForm {
  name: string;
  mobile: string;
  teamCode: string;
  email?: string;
}

function TeamCode() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TeamCodeForm>({ name: '', mobile: '', teamCode: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof TeamCodeForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [memberName, setMemberName] = useState('');

  const validate = () => {
    const next: Partial<Record<keyof TeamCodeForm, string>> = {};
    
    if (showEmailField) {
      // Only validate email when email field is shown
      if (!formData.email?.trim()) {
        next.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        next.email = 'Invalid email format';
      }
    } else {
      // Validate initial fields (name, mobile, teamCode)
      if (!formData.name.trim()) {
        next.name = 'Name is required';
      }
      if (!formData.mobile.trim()) {
        next.mobile = 'Mobile is required';
      } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
        next.mobile = 'Enter a valid 10-digit mobile';
      }
      if (!formData.teamCode.trim()) {
        next.teamCode = 'Team code is required';
      } else if (formData.teamCode.trim().length < 4) {
        next.teamCode = 'Team code seems too short';
      }
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/team-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        // Check if member already exists
        if (data.data?.memberExists) {
          setShowWelcome(true);
          setMemberName(data.data.memberName || formData.name);
          // Save userId if provided
          if (data.data?.userId) {
            localStorage.setItem('userId', data.data.userId);
          }
        } else if (data.data?.needsEmail) {
          // Member doesn't exist, need email
          setShowEmailField(true);
        } else {
          // Member added successfully, proceed to OTP
          if (data.data?.userId) {
            localStorage.setItem('userId', data.data.userId);
          }
          navigate('/auth/otp-verify', { state: { mobile: formData.mobile } });
        }
      } else {
        setErrors({ teamCode: data.message || 'Invalid team code' });
      }
    } catch (err) {
      setErrors({ teamCode: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof TeamCodeForm, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleWelcomeContinue = () => {
    navigate('/dashboard');
  };

  if (showWelcome) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.accentOne} />
        <div className={styles.accentTwo} />
        <div className={styles.accentGrid} />
        <div className={styles.content}>
          <div className={styles.formCard}>
            <div className={styles.logo}>
              <img src={logo} alt="Company logo" className={styles.logoImage} />
              <span className={styles.logoText}>4DPMS</span>
            </div>
            <h2 className={styles.greeting}>Welcome back, {memberName}!</h2>
            <p className={styles.subGreeting}>You are already a member of this team.</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleWelcomeContinue}
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          </div>
          <h2 className={styles.greeting}>Join your team</h2>
          <p className={styles.subGreeting}>
            {showEmailField 
              ? 'Please provide your email to complete the sign up.'
              : 'Enter your details and the team code to join your team.'}
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {!showEmailField && (
              <div className={styles.inputGroup}>
                <label htmlFor="name" className={styles.label}>
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <span id="name-error" className={styles.errorText} role="alert">
                    {errors.name}
                  </span>
                )}
              </div>
            )}

            {!showEmailField && (
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
            )}

            {!showEmailField && (
              <div className={styles.inputGroup}>
                <label htmlFor="teamCode" className={styles.label}>
                  Enter the team code
                </label>
                <div className={styles.inlineInput}>
                  <input
                    id="teamCode"
                    type="text"
                    className={`${styles.input} ${errors.teamCode ? styles.inputError : ''}`}
                    value={formData.teamCode}
                    onChange={(e) => handleChange('teamCode', e.target.value.toUpperCase())}
                    placeholder="e.g. TEAM1234"
                    aria-invalid={!!errors.teamCode}
                    aria-describedby={errors.teamCode ? 'teamCode-error' : undefined}
                  />
                  <button
                    type="submit"
                    className={styles.iconButton}
                    aria-label="Submit team code"
                    disabled={isSubmitting}
                  >
                    ✓
                  </button>
                </div>
                {errors.teamCode && (
                  <span id="teamCode-error" className={styles.errorText} role="alert">
                    {errors.teamCode}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => window.alert('A team code is provided by your admin.')}
                >
                  What is a team code?
                </button>
              </div>
            )}

            {showEmailField && (
              <>
                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Enter your email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <span id="email-error" className={styles.errorText} role="alert">
                      {errors.email}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding to team...' : 'Complete Sign Up'}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default TeamCode;



