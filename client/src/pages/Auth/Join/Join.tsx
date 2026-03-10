import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiUrl } from '@/utils/api';
import styles from './Join.module.css';
import logo from '@/assets/logo.png';

interface ResolvedInvite {
  valid: boolean;
  role?: string;
  organizationName?: string;
  teamName?: string;
  managerName?: string;
  token?: string;
  codeType?: 'invite' | 'org';
  organizationId?: string;
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
    role: '', // For org code signup
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
      
      // First, try as invite code/token
      const inviteUrl = isLikelyToken
        ? apiUrl(`/api/invites/resolve?token=${encodeURIComponent(tokenOrCode)}`)
        : apiUrl(`/api/invites/resolve?code=${encodeURIComponent(tokenOrCode.toUpperCase())}`);
      const inviteRes = await fetch(inviteUrl);
      const inviteData = await inviteRes.json();
      
      if (inviteRes.ok && inviteData.status === 'success' && inviteData.data?.valid) {
        setResolved({
          valid: true,
          role: inviteData.data.role,
          organizationName: inviteData.data.organizationName,
          teamName: inviteData.data.teamName,
          managerName: inviteData.data.managerName,
          token: inviteData.data.token,
          codeType: 'invite',
        });
        if (inviteData.data.token) setInviteToken(inviteData.data.token);
        return;
      }
      
      // If not an invite code, try as organization code
      const orgUrl = apiUrl(`/api/organizations/resolve?code=${encodeURIComponent(tokenOrCode.toUpperCase())}`);
      const orgRes = await fetch(orgUrl);
      const orgData = await orgRes.json();
      
      if (orgRes.ok && orgData.status === 'success' && orgData.data) {
        setResolved({
          valid: true,
          organizationName: orgData.data.organizationName,
          organizationId: orgData.data.organizationId,
          codeType: 'org',
        });
        setInviteCode(tokenOrCode.toUpperCase());
        return;
      }
      
      // Neither worked
      setResolved(null);
      setResolveError('Invalid code. Please check and try again.');
    } catch {
      setResolved(null);
      setResolveError('Could not verify code. Please try again.');
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
    resolveInvite(code);
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof typeof formData, string>> = {};
    if (!formData.name.trim()) next.name = 'Name is required';
    if (!formData.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = 'Invalid email';
    if (!formData.mobile.trim()) next.mobile = 'Mobile is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) next.mobile = 'Invalid mobile (10 digits)';
    // For org code signup, role is required
    if (resolved?.codeType === 'org' && !formData.role) next.role = 'Please select a role';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      // Handle org code signup differently
      if (resolved?.codeType === 'org') {
        const body = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          mobile: formData.mobile.replace(/\D/g, ''),
          role: formData.role,
          organizationId: resolved.organizationId,
        };
        if (formData.designation.trim()) {
          (body as Record<string, string>).designation = formData.designation.trim();
        }

        const res = await fetch(apiUrl('/api/auth/signup-with-org'), {
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
        return;
      }
      
      // Handle invite code signup
      const token = inviteToken;
      const code = inviteCode;
      if (!token && !code) {
        setErrors({ email: 'Invite link or code is required' });
        return;
      }
      
      const body: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.replace(/\D/g, ''),
      };
      if (formData.designation.trim()) body.designation = formData.designation.trim();
      if (token) body.inviteToken = token;
      if (code) body.inviteCode = code;

      const res = await fetch(apiUrl('/api/auth/signup-with-invite'), {
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
  const selectedRoleLabel = formData.role === 'boss' ? 'Client Admin' : formData.role === 'manager' ? 'Supervisor' : formData.role === 'employee' ? 'Member' : '';

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
              <h2 className={styles.greeting}>Join your organization</h2>
              <p className={styles.subGreeting}>
                Enter your organization code or invite code to join.
              </p>
              {resolveError && (
                <div className={styles.errorText} style={{ marginBottom: '1rem' }}>
                  {resolveError}
                </div>
              )}
              <form onSubmit={handleContinueWithCode}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="code">
                    Organization / Invite Code
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
          ) : resolved.codeType === 'org' ? (
            <>
              <h2 className={styles.greeting}>Join {resolved.organizationName}</h2>
              <p className={styles.subGreeting}>
                Select your role and fill in your details to join this organization.
              </p>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="role">Select Role *</label>
                  <select
                    id="role"
                    className={`${styles.input} ${errors.role ? styles.inputError : ''}`}
                    value={formData.role}
                    onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                    required
                  >
                    <option value="">-- Select your role --</option>
                    <option value="boss">Client Admin (CSA)</option>
                    <option value="manager">Supervisor</option>
                    <option value="employee">Member</option>
                  </select>
                  {errors.role && <span className={styles.errorText}>{errors.role}</span>}
                </div>
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
                  {isSubmitting ? 'Signing up...' : `Join as ${selectedRoleLabel || 'Member'}`}
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
                  <span> - Team: {resolved.teamName}</span>
                )}
              </p>
              <div className={styles.inviteInfo}>
                You're joining as <strong>{roleLabel}</strong>. Fill in your details below. No role selection needed.
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
