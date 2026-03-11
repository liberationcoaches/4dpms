import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './Join.module.css';
import logo from '@/assets/logo.png';

interface InviteInfo {
  type: 'personal' | 'org';
  name?: string;
  email?: string;
  mobile?: string;
  orgName?: string;
  role?: string;
  token?: string;
  organizationId?: string;
  code?: string;
  invitedUserId?: string;
  invitedUserEmail?: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  boss: 'Executive',
  manager: 'Supervisor',
  employee: 'Member',
  org_admin: 'Org Admin',
};

export default function Join() {
  const navigate = useNavigate();
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || searchParams.get('invite') || undefined;
  const codeFromQuery = searchParams.get('code') || undefined;

  const [codeInput, setCodeInput] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    department: '',
    mobile: '',
    password: '',
    confirmPassword: '',
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
      fetchInviteInfo({ token });
    } else if (code) {
      setInviteCode(code.trim().toUpperCase());
      setInviteToken(null);
      fetchInviteInfo({ code: code.trim().toUpperCase() });
    }
  }, [tokenFromPath, tokenFromQuery, codeFromQuery]);

  const fetchInviteInfo = async (params: { token?: string; code?: string }) => {
    setIsResolving(true);
    setResolveError(null);
    try {
      const q = params.token
        ? `token=${encodeURIComponent(params.token)}`
        : `code=${encodeURIComponent(params.code || '')}`;
      const res = await fetch(apiUrl(`/api/auth/invite-info?${q}`));
      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setInviteInfo(null);
        setResolveError('Invalid code or link. Please check and try again.');
        return;
      }

      const d = data.data;
      if (d.type === 'org') {
        setInviteInfo({
          type: 'org',
          orgName: d.orgName,
          organizationId: d.organizationId,
          code: d.code || params.code,
        });
        setInviteCode(d.code || params.code?.trim().toUpperCase() || null);
        setInviteToken(null);
        return;
      }

      if (d.type === 'personal') {
        setInviteInfo({
          type: 'personal',
          name: d.name,
          email: d.email || d.invitedUserEmail,
          mobile: d.mobile,
          orgName: d.orgName,
          role: d.role,
          token: d.token || params.token,
          invitedUserId: d.invitedUserId,
          invitedUserEmail: d.invitedUserEmail,
        });
        if (d.token || params.token) setInviteToken(d.token || params.token);
        else setInviteCode(params.code?.trim().toUpperCase() || null);
        setFormData((prev) => ({
          ...prev,
          name: d.name || '',
          email: d.email || d.invitedUserEmail || '',
        }));
        return;
      }

      setInviteInfo(null);
      setResolveError('Invalid code or link. Please check and try again.');
    } catch {
      setInviteInfo(null);
      setResolveError('Could not verify. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleContinueWithCode = (e: FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setResolveError('Enter your code');
      return;
    }
    setInviteCode(code);
    setInviteToken(null);
    fetchInviteInfo({ code });
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof typeof formData, string>> = {};
    if (inviteInfo?.type === 'personal' && inviteInfo.invitedUserId) {
      if (!formData.password || formData.password.length < 6) next.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Passwords do not match';
    } else if (inviteInfo?.type === 'org') {
      if (!formData.name.trim()) next.name = 'Name is required';
      if (!formData.email.trim()) next.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Invalid email';
      if (!formData.mobile.trim()) next.mobile = 'Mobile is required';
      else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) next.mobile = 'Invalid mobile (10 digits)';
      if (!formData.password || formData.password.length < 6) next.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Passwords do not match';
    } else if (inviteInfo?.type === 'personal' && !inviteInfo.invitedUserId) {
      if (!formData.name.trim()) next.name = 'Name is required';
      if (!formData.email.trim()) next.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Invalid email';
      if (!formData.mobile.trim()) next.mobile = 'Mobile is required';
      else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) next.mobile = 'Invalid mobile (10 digits)';
      if (!formData.password || formData.password.length < 6) next.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Handle org invite code join (join-with-code)
      if (inviteInfo?.type === 'org') {
        const body = {
          code: inviteCode || codeInput.trim().toUpperCase(),
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.mobile.replace(/\D/g, ''),
          designation: formData.designation.trim() || undefined,
          department: formData.department.trim() || undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        const res = await fetch(apiUrl('/api/auth/join-with-code'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok && data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
          localStorage.setItem('userRole', data.data.role || 'employee');
          navigate('/onboarding');
        } else {
          setErrors({
            email: data.message || 'Sign up failed',
          });
        }
        return;
      }

      // Handle personal invite (accept-invite) — pre-created user sets password
      if (inviteInfo?.type === 'personal' && inviteInfo.invitedUserId) {
        const body: Record<string, string> = {
          password: formData.password,
        };
        if (inviteToken) body.token = inviteToken;
        else if (inviteCode) body.code = inviteCode;

        const res = await fetch(apiUrl('/api/auth/accept-invite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok && data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
          localStorage.setItem('userRole', data.data.role || 'employee');
          navigate('/onboarding');
        } else {
          setErrors({
            password: data.message || 'Failed to activate account',
          });
        }
        return;
      }

      // Handle personal invite (signup-with-invite) — new user with full form
      if (inviteInfo?.type === 'personal' && !inviteInfo.invitedUserId) {
        const body: Record<string, string> = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.mobile.replace(/\D/g, ''),
          password: formData.password,
        };
        if (inviteToken) body.inviteToken = inviteToken;
        else if (inviteCode) body.inviteCode = inviteCode;
        if (formData.designation.trim()) body.designation = formData.designation.trim();

        const res = await fetch(apiUrl('/api/auth/signup-with-invite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok && data.data?.userId) {
          localStorage.setItem('userId', data.data.userId);
          localStorage.setItem('userRole', data.data.role || 'employee');
          navigate('/onboarding');
        } else {
          setErrors({
            email: data.message || data.errors?.[0]?.message || 'Sign up failed',
          });
        }
        return;
      }

      setErrors({ email: 'Invalid invite or missing data.' });
    } catch {
      setErrors({ email: 'Network error. Try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabel = inviteInfo?.role ? ROLE_DISPLAY[inviteInfo.role] || inviteInfo.role : '';

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

          {!inviteInfo ? (
            <>
              <h2 className={styles.greeting}>Join your organization</h2>
              <p className={styles.subGreeting}>
                Enter your invite code to join.
              </p>
              {resolveError && (
                <div className={styles.errorText} style={{ marginBottom: '1rem' }}>
                  {resolveError}
                </div>
              )}
              <form onSubmit={handleContinueWithCode}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="code">
                    Enter your invite code
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
          ) : inviteInfo.type === 'org' ? (
            <>
              <h2 className={styles.greeting}>Join {inviteInfo.orgName}</h2>
              <p className={styles.subGreeting}>
                Fill in your details to join this organization.
              </p>
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
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="designation">Designation *</label>
                  <input
                    id="designation"
                    type="text"
                    className={`${styles.input} ${errors.designation ? styles.inputError : ''}`}
                    value={formData.designation}
                    onChange={(e) => setFormData((p) => ({ ...p, designation: e.target.value }))}
                  />
                  {errors.designation && <span className={styles.errorText}>{errors.designation}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="department">Department</label>
                  <input
                    id="department"
                    type="text"
                    className={styles.input}
                    value={formData.department}
                    onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                  {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
                </div>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Joining...' : 'Join'}
                </button>
              </form>
            </>
          ) : inviteInfo.type === 'personal' && inviteInfo.invitedUserId ? (
            <>
              <h2 className={styles.greeting}>Set your password</h2>
              <p className={styles.subGreeting}>
                You've been invited to join {inviteInfo.orgName} as {roleLabel}.
                {inviteInfo.email && (
                  <span> Your email: <strong>{inviteInfo.email}</strong></span>
                )}
              </p>
              <form onSubmit={handleSubmit}>
                {inviteInfo.name && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={inviteInfo.name}
                      readOnly
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>
                )}
                {inviteInfo.email && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={inviteInfo.email}
                      readOnly
                      style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                  {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
                </div>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Activating...' : 'Set Password & Join'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className={styles.greeting}>Join as {roleLabel}</h2>
              <p className={styles.subGreeting}>
                {inviteInfo.orgName && <span>{inviteInfo.orgName}</span>}
              </p>
              <div className={styles.inviteInfo}>
                You're joining as <strong>{roleLabel}</strong>. Fill in your details below.
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
                  <label className={styles.label} htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    placeholder="At least 6 characters"
                    minLength={6}
                  />
                  {errors.password && <span className={styles.errorText}>{errors.password}</span>}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="confirmPassword">Confirm Password *</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
                </div>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Joining...' : 'Join'}
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
