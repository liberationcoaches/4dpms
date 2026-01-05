import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './OrganizationProfile.module.css';
import Logo from '@/components/Logo/Logo';

interface OrganizationProfileData {
  organizationName: string;
  organizationType: string;
  employeeSize: string;
}

function OrganizationProfile() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OrganizationProfileData>({
    organizationName: '',
    organizationType: '',
    employeeSize: '',
  });
  const [errors, setErrors] = useState<Partial<OrganizationProfileData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const organizationTypes = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Consulting',
    'Other',
  ];

  const employeeSizes = ['Upto 50', 'Upto 100', 'Upto 150', 'Upto 200', 'Upto 500', 'More'];

  const validate = (): boolean => {
    const newErrors: Partial<OrganizationProfileData> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    if (!formData.organizationType.trim()) {
      newErrors.organizationType = 'Organization type is required';
    }

    if (!formData.employeeSize.trim()) {
      newErrors.employeeSize = 'Employee size is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // TODO: Save organization profile to backend
    // For now, just navigate to signup with the data
    try {
      // Store in localStorage temporarily
      localStorage.setItem('organizationProfile', JSON.stringify(formData));
      
      // Navigate to enquiry or signup page
      navigate('/auth/enquiry-or-signup', { state: formData });
    } catch (error) {
      console.error('Error saving organization profile:', error);
      setErrors({ organizationName: 'Failed to save. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoSection}>
        <Logo />
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Organization Name Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label htmlFor="organizationName" className={styles.sectionTitle}>
                Organization Name
              </label>
            </div>
            <div className={styles.sectionContent}>
              <input
                id="organizationName"
                type="text"
                className={`${styles.input} ${errors.organizationName ? styles.inputError : ''}`}
                placeholder="Enter your company name"
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                aria-invalid={!!errors.organizationName}
                aria-describedby={errors.organizationName ? 'org-name-error' : undefined}
              />
              {errors.organizationName && (
                <span id="org-name-error" className={styles.errorText} role="alert">
                  {errors.organizationName}
                </span>
              )}
            </div>
          </div>

          {/* Organization Type Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label htmlFor="organizationType" className={styles.sectionTitle}>
                Organization type
              </label>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.selectWrapper}>
                <select
                  id="organizationType"
                  className={`${styles.select} ${errors.organizationType ? styles.inputError : ''}`}
                  value={formData.organizationType}
                  onChange={(e) => handleInputChange('organizationType', e.target.value)}
                  aria-invalid={!!errors.organizationType}
                  aria-describedby={errors.organizationType ? 'org-type-error' : undefined}
                >
                  <option value="">Select your company type</option>
                  {organizationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className={styles.selectArrow}>▼</span>
              </div>
              {errors.organizationType && (
                <span id="org-type-error" className={styles.errorText} role="alert">
                  {errors.organizationType}
                </span>
              )}
            </div>
          </div>

          {/* Organization Employee Size Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <label className={styles.sectionTitle}>Organization employee Size</label>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.employeeSizeGrid}>
                {employeeSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`${styles.sizeButton} ${
                      formData.employeeSize === size ? styles.sizeButtonSelected : ''
                    }`}
                    onClick={() => handleInputChange('employeeSize', size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errors.employeeSize && (
                <span className={styles.errorText} role="alert">
                  {errors.employeeSize}
                </span>
              )}
            </div>
          </div>

          {/* Save & Proceed Button */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save & Proceed'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default OrganizationProfile;
