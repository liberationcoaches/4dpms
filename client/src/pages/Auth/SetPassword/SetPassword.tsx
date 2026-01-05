import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './SetPassword.module.css';

const SetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [confirmAccessCode, setConfirmAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [step, setStep] = useState(1); // 1: Info, 2: OTP & Password

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/resend-otp/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep(2);
        if (data.data?.otp) {
          console.log('DEV ONLY OTP:', data.data.otp);
          alert(`DEV ONLY OTP: ${data.data.otp}`);
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send OTP' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode !== confirmAccessCode) {
      setMessage({ type: 'error', text: 'Access codes do not match' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, accessCode, otp, name }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password set successfully! Redirecting to login...' });
        setTimeout(() => navigate('/auth/login'), 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to set password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Set Your Password</h1>
        <p className={styles.subtitle}>Welcome to the Performance Management System</p>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your 10-digit mobile number"
                maxLength={10}
                required
              />
            </div>
            {email && (
              <div className={styles.formGroup}>
                <label>Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                />
              </div>
            )}
            <button type="submit" disabled={isLoading} className={styles.button}>
              {isLoading ? 'Sending...' : 'Request OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetPassword} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Enter OTP (Sent to mobile)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Set Access Code (Password)</label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Minimum 4 characters"
                minLength={4}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Confirm Access Code</label>
              <input
                type="password"
                value={confirmAccessCode}
                onChange={(e) => setConfirmAccessCode(e.target.value)}
                placeholder="Repeat your access code"
                minLength={4}
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className={styles.button}>
              {isLoading ? 'Setting password...' : 'Complete Registration'}
            </button>
            <button type="button" onClick={() => setStep(1)} className={styles.linkButton}>
              Back to info
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetPassword;

