import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styles from './Join.module.css';
import logo from '@/assets/logo.png';

interface ResolvedInvite {
  valid: boolean;
  role?: string;
  organizationName?: string;
  teamName?: string;
  managerName?: string;
  token?: string;
}

export default function Join() {
  const navigate = useNavigate();
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || undefined;
  const codeFromQuery = searchParams.get('code') || undefined;

  const [codeInput, setCodeInput] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedInvite | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    mobile: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve invite from URL (path token or query token/code)
  useEffect(() => {
    const token = tokenFromPath || tokenFromQuery;
    const code = codeFromQuery;
    if (token) {
      setInviteToken(token);
      setInviteCode(null);
      resolveInvite(token);
    } else if (code) {
      setInviteCode(code);
      setInviteToken(null);
      resolveInvite(code);
    }
  }, [tokenFromPath, tokenFromQuery, codeFromQuery]);

  const resolveInvite = async (tokenOrCode: string) => {
    setIsResolving(true);
    setResolveError(null);
    try {
      const isLikelyToken = tokenOrCode.length > 10;
      const url = isLikelyToken
        ? `/api/invites/resolve?token=${encodeURIComponent(tokenOrCode)}`
        : `/api/invites/resolve?code=${encodeURIComponent(tokenOrCode.toUpperCase())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success' && data.data?.valid) {
        setResolved({
          valid: true,
          role: data.data.role,
          organizationName: data.data.organizationName,
          teamName: data.data.teamName,
          managerName: data.data.managerName,
          token: data.data.token,
        });
        if (data.data.token) setInviteToken(data.data.token);
      } else {
        setResolved(null);
        setResolveError(data.message || 'Invalid or expired invite');
      }
    } catch {
      setResolved(null);
      setResolveError('Could not load invite');
    } finally {
      setIsResolving(false);
    }
  };

  const handleContinueWithCode = (e: FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setResolveError('Enter invite code');
      return;
    }
    setInviteCode(code);
    setInviteToken(null);
    resolveInvite(code);
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof typeof formData, string>> = {};
    if (!formData.name.trim()) next.name = 'Name is required';
    if (!formData.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Invalid email';
    if (!formData.mobile.trim()) next.mobile = 'Mobile is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) next.mobile = 'Invalid mobile (10 digits)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const token = inviteToken;
    const code = inviteCode;
    if (!token && !code) {
      setErrors({ email: 'Invite link or code is required' });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const body: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.replace(/\D/g, ''),
      };
      if (formData.designation.trim()) body.designation = formData.designation.trim();
      if (token) body.inviteToken = token;
      if (code) body.inviteCode = code;

      const res = await fetch('/api/auth/signup-with-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.data?.userId) {
        localStorage.setItem('userId', data.data.userId);
        if (data.data.mobileOTP) localStorage.setItem('dev_mobileOTP', data.data.mobileOTP);
        navigate('/auth/otp-verify', {
          state: { email: formData.email, mobile: formData.mobile.replace(/\D/g, '') },
        });
      } else {
        setErrors({
          email: data.message || data.errors?.[0]?.message || 'Sign up failed',
        });
      }
    } catch {
      setErrors({ email: 'Network error. Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = resolved?.role === 'manager' ? 'Supervisor' : resolved?.role === 'employee' ? 'Member' : resolved?.role || '';

  return (
    <div className={styles.authContainer}>
      <div className={styles.accentOne} />
      <div className={styles.accentTwo} />
      <div className={styles.content}>
        <div className={styles.formCard}>
          <div className={styles.logo}>
            <img src={logo} alt="Logo" className={styles.logoImage} />
            <span className={styles.logoText}>4DPMS</span>
          </div>

          {!resolved?.valid ? (
            <>
              <h2 className={styles.greeting}>Join with invite</h2>
              <p className={styles.subGreeting}>
                Enter the invite code you received. You won’t choose a role — it’s set by the invite.
              </p>
              {resolveError && (
                <div className={styles.errorText} style={{ marginBottom: '1rem' }}>
                  {resolveError}
                </div>
              )}
              <form onSubmit={handleContinueWithCode}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="code">
                    Invite code
                  </label>
                  <input
                    id="code"
                    type="text"
                    className={styles.input}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    maxLength={8}
                    autoFocus
                  />
                </div>
                <button type="submit" className={styles.submitButton} disabled={isResolving}>
                  {isResolving ? 'Checking...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className={styles.greeting}>Join as {roleLabel}</h2>
              <p className={styles.subGreeting}>
                {resolved.organizationName && (
                  <span>{resolved.organizationName}</span>
                )}
                {resolved.teamName && (
                  <span> · Team: {resolved.teamName}</span>
                )}
              </p>
              <div className={styles.inviteInfo}>
                You’re joining as <strong>{roleLabel}</strong>. Fill in your details below. No role selection needed.
              </div>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="name">Name *</label>
                  <input
                    id="name"
                    type="text"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="designation">Designation</label>
                  <input
                    id="designation"
                    type="text"
                    className={styles.input}
                    value={formData.designation}
                    onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="mobile">Mobile *</label>
                  <input
                    id="mobile"
                    type="tel"
                    className={`${styles.input} ${errors.mobile ? styles.inputError : ''}`}
                    value={formData.mobile}
                    onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="10 digits"
                    maxLength={10}
                    required
                  />
                  {errors.mobile && <span className={styles.errorText}>{errors.mobile}</span>}
                </div>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Signing up...' : 'Join'}
                </button>
              </form>
            </>
          )}

          <p className={styles.linkToSignup}>
            Creating an organization? <a href="/auth/signup">Create your workspace</a>
          </p>
        </div>
      </div>
    </div>
  );
}
