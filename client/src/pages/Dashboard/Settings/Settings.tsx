import { useState, useEffect, FormEvent } from 'react';
import styles from './Settings.module.css';
import baseStyles from '@/styles/DashboardBase.module.css';
import { DIMENSION_COLORS } from '@/utils/dimensionColors';
import { fetchUserProfile } from '@/utils/userProfile';

interface UserProfile {
  name: string;
  email: string;
  mobile: string;
}

interface DimensionWeights {
  functional: number;
  organizational: number;
  selfDevelopment: number;
  developingOthers: number;
}

function Settings() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    mobile: '',
  });
  const [errors, setErrors] = useState<Partial<UserProfile>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [userRole, setUserRole] = useState<'platform_admin' | 'reviewer' | 'boss' | 'manager' | 'employee'>('employee');
  const [dimensionWeights, setDimensionWeights] = useState<DimensionWeights>({
    functional: 0,
    organizational: 0,
    selfDevelopment: 0,
    developingOthers: 0,
  });
  const [weightsErrors, setWeightsErrors] = useState<string>('');
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [weightsSuccessMessage, setWeightsSuccessMessage] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId') || '';
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Fetch user profile (clears storage and redirects to login on 404/stale user)
    fetchUserProfile(userId)
      .then((data) => {
        if (data?.status === 'success' && data.data) {
          setProfile({
            name: (data.data.name as string) || '',
            email: (data.data.email as string) || '',
            mobile: (data.data.mobile as string) || '',
          });
          const role = (data.data.role as string) || localStorage.getItem('userRole') || 'employee';
          setUserRole(role as typeof userRole);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch profile:', error);
        setIsLoading(false);
      });

    // Fetch dimension weights (for admins)
    fetch(`/api/team/dimension-weights?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.data) {
          setDimensionWeights(data.data);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch dimension weights:', error);
      });
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<UserProfile> = {};

    if (!profile.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!profile.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(profile.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Invalid mobile number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    const userId = localStorage.getItem('userId') || '';
    if (!userId) {
      setErrors({ email: 'User not authenticated' });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/profile?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ email: data.message || 'Failed to update profile' });
      }
    } catch (error) {
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setSuccessMessage('');
  };

  const handleWeightChange = (dimension: keyof DimensionWeights, value: number) => {
    const numValue = Math.round(Math.max(0, Math.min(100, value)));
    setDimensionWeights((prev) => ({ ...prev, [dimension]: numValue }));
    setWeightsErrors('');
    setWeightsSuccessMessage('');
  };

  const handleSaveWeights = async (e: FormEvent) => {
    e.preventDefault();
    setWeightsErrors('');
    setWeightsSuccessMessage('');

    // Calculate total
    const total = dimensionWeights.functional + dimensionWeights.organizational + 
                  dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;

    // Validate sum is 100%
    if (total !== 100) {
      setWeightsErrors(`Weights must sum to 100%. Current sum: ${total}%`);
      return;
    }

    // Validate first 3 dimensions are mandatory (> 0)
    if (dimensionWeights.functional <= 0 || dimensionWeights.organizational <= 0 || 
        dimensionWeights.selfDevelopment <= 0) {
      setWeightsErrors('Functional, Organizational, and Self Development dimensions must have weights greater than 0%');
      return;
    }

    setIsSavingWeights(true);
    const userId = localStorage.getItem('userId') || '';

    try {
      const response = await fetch(`/api/team/dimension-weights?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dimensionWeights),
      });

      const data = await response.json();

      if (response.ok) {
        setWeightsSuccessMessage('Dimension weights saved successfully!');
        setTimeout(() => setWeightsSuccessMessage(''), 3000);
      } else {
        setWeightsErrors(data.message || 'Failed to save dimension weights');
      }
    } catch (error) {
      setWeightsErrors('Network error. Please try again.');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const calculateTotal = () => {
    return dimensionWeights.functional + dimensionWeights.organizational + 
           dimensionWeights.selfDevelopment + dimensionWeights.developingOthers;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="name" className={styles.label}>
            Name
          </label>
          <input
            id="name"
            type="text"
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            value={profile.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <span id="name-error" className={styles.errorText} role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            value={profile.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className={styles.errorText} role="alert">
              {errors.email}
            </span>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="mobile" className={styles.label}>
            Mobile
          </label>
          <input
            id="mobile"
            type="tel"
            className={`${styles.input} ${errors.mobile ? styles.inputError : ''}`}
            value={profile.mobile}
            onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
            maxLength={10}
            aria-invalid={!!errors.mobile}
            aria-describedby={errors.mobile ? 'mobile-error' : undefined}
          />
          {errors.mobile && (
            <span id="mobile-error" className={styles.errorText} role="alert">
              {errors.mobile}
            </span>
          )}
        </div>

        {successMessage && (
          <div className={styles.successMessage} role="alert">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Dimension Weights Section - View for all, Edit for CSA only */}
      <div className={styles.dimensionWeightsSection}>
          <h2 className={styles.title}>Performance Dimension Weights</h2>
          {userRole === 'client_admin' ? (
            <p className={styles.description}>
              Configure the weight distribution for performance evaluation dimensions. 
              The first three dimensions are mandatory, while "Developing Others" is optional.
              Total must equal 100%.
            </p>
          ) : (
            <p className={styles.description}>
              View the configured weight distribution for performance evaluation dimensions.
              Only Client Side Admins can modify these weights.
            </p>
          )}

          <form onSubmit={handleSaveWeights} className={styles.weightsForm}>
            <div className={styles.weightsGrid}>
              <div 
                className={styles.weightInputGroup}
                style={{ 
                  borderLeft: `4px solid ${DIMENSION_COLORS.functional.primary}`,
                  backgroundColor: DIMENSION_COLORS.functional.light,
                }}
              >
                <label htmlFor="functional" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.functional.primary }}>
                  Functional Dimension <span className={styles.required}>*</span>
                </label>
                <div className={styles.weightInputWrapper}>
                  <input
                    id="functional"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={dimensionWeights.functional}
                    onChange={(e) => handleWeightChange('functional', parseInt(e.target.value) || 0)}
                    disabled={userRole !== 'client_admin'}
                    className={styles.weightInput}
                    style={{ borderColor: DIMENSION_COLORS.functional.border }}
                  />
                  <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.functional.primary }}>%</span>
                </div>
              </div>

              <div 
                className={styles.weightInputGroup}
                style={{ 
                  borderLeft: `4px solid ${DIMENSION_COLORS.organizational.primary}`,
                  backgroundColor: DIMENSION_COLORS.organizational.light,
                }}
              >
                <label htmlFor="organizational" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.organizational.primary }}>
                  Organizational Dimension <span className={styles.required}>*</span>
                </label>
                <div className={styles.weightInputWrapper}>
                  <input
                    id="organizational"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={dimensionWeights.organizational}
                    onChange={(e) => handleWeightChange('organizational', parseInt(e.target.value) || 0)}
                    disabled={userRole !== 'client_admin'}
                    className={styles.weightInput}
                    style={{ borderColor: DIMENSION_COLORS.organizational.border }}
                  />
                  <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.organizational.primary }}>%</span>
                </div>
              </div>

              <div 
                className={styles.weightInputGroup}
                style={{ 
                  borderLeft: `4px solid ${DIMENSION_COLORS.selfDevelopment.primary}`,
                  backgroundColor: DIMENSION_COLORS.selfDevelopment.light,
                }}
              >
                <label htmlFor="selfDevelopment" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.selfDevelopment.primary }}>
                  Self Development <span className={styles.required}>*</span>
                </label>
                <div className={styles.weightInputWrapper}>
                  <input
                    id="selfDevelopment"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={dimensionWeights.selfDevelopment}
                    onChange={(e) => handleWeightChange('selfDevelopment', parseInt(e.target.value) || 0)}
                    disabled={userRole !== 'client_admin'}
                    className={styles.weightInput}
                    style={{ borderColor: DIMENSION_COLORS.selfDevelopment.border }}
                  />
                  <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.selfDevelopment.primary }}>%</span>
                </div>
              </div>

              <div 
                className={styles.weightInputGroup}
                style={{ 
                  borderLeft: `4px solid ${DIMENSION_COLORS.developingOthers.primary}`,
                  backgroundColor: DIMENSION_COLORS.developingOthers.light,
                }}
              >
                <label htmlFor="developingOthers" className={styles.weightLabel} style={{ color: DIMENSION_COLORS.developingOthers.primary }}>
                  Developing Others <span className={styles.optional}>(Optional)</span>
                </label>
                <div className={styles.weightInputWrapper}>
                  <input
                    id="developingOthers"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={dimensionWeights.developingOthers}
                    onChange={(e) => handleWeightChange('developingOthers', parseInt(e.target.value) || 0)}
                    disabled={userRole !== 'client_admin'}
                    className={styles.weightInput}
                    style={{ borderColor: DIMENSION_COLORS.developingOthers.border }}
                  />
                  <span className={styles.percentSymbol} style={{ color: DIMENSION_COLORS.developingOthers.primary }}>%</span>
                </div>
              </div>
            </div>

            <div className={styles.totalDisplay}>
              <strong>Total: {calculateTotal()}%</strong>
              {calculateTotal() !== 100 && (
                <span className={styles.totalError}> (Must be 100%)</span>
              )}
            </div>

            {weightsErrors && (
              <div className={styles.errorMessage} role="alert" style={{ marginBottom: 'var(--spacing-md)' }}>
                {weightsErrors}
              </div>
            )}

            {weightsSuccessMessage && (
              <div className={styles.successMessage} role="alert">
                {weightsSuccessMessage}
              </div>
            )}

            {userRole === 'client_admin' ? (
              <button
                type="submit"
                className={baseStyles.submitButton}
                disabled={isSavingWeights || calculateTotal() !== 100}
              >
                {isSavingWeights ? 'Saving...' : 'Save Dimension Weights'}
              </button>
            ) : (
              <p className={styles.readOnlyNote}>Read-only: Only Client Side Admins can modify dimension weights.</p>
            )}
          </form>
        </div>
    </div>
  );
}

export default Settings;

