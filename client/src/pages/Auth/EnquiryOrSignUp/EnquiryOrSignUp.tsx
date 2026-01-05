import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EnquiryOrSignUp.module.css';
import logo from '@/assets/logo.png';

function EnquiryOrSignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEnquiry = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // TODO: Send enquiry to backend
      // For now, just show thank you message
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      setShowThankYou(true);
    } catch (error) {
      console.error('Error submitting enquiry:', error);
      setError('Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }

    setError('');
    // Navigate to signup page
    navigate('/auth/signup');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (showThankYou) {
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
            <div className={styles.thankYouMessage}>
              <div className={styles.thankYouIcon}>✓</div>
              <h2 className={styles.thankYouTitle}>Thank You!</h2>
              <p className={styles.thankYouText}>We'll get back to you soon.</p>
            </div>
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
          <div className={styles.logo}>
            <img src={logo} alt="Company logo" className={styles.logoImage} />
          </div>
          <h2 className={styles.greeting}>Get Started</h2>
          <p className={styles.subGreeting}>Enter your email to continue</p>

          <form onSubmit={handleEnquiry} className={styles.form} noValidate>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                aria-invalid={!!error}
                aria-describedby={error ? 'email-error' : undefined}
              />
              {error && (
                <span id="email-error" className={styles.errorText} role="alert">
                  {error}
                </span>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="submit"
                className={styles.enquiryButton}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Enquiry'}
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className={styles.signUpButton}
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EnquiryOrSignUp;

