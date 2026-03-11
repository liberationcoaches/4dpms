import { useState, useRef } from 'react';
import styles from './Onboarding.module.css';

interface OrgSetupProps {
  orgName: string;
  orgSize: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OrgSetup({ orgName, orgSize, onComplete, onSkip }: OrgSetupProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.teamStep}>
      <h2 className={styles.teamTitle}>Organization Setup</h2>
      <p className={styles.teamSubtitle}>
        Confirm your organization details. You can add a logo later from settings.
      </p>

      <div className={styles.manualForm}>
        <div className={styles.formField}>
          <label>Organization Name</label>
          <input type="text" value={orgName} readOnly className={styles.readOnlyInput} />
        </div>
        <div className={styles.formField}>
          <label>Organization Size</label>
          <input type="text" value={orgSize} readOnly className={styles.readOnlyInput} />
        </div>
        <div className={styles.formField}>
          <label>Logo (optional)</label>
          <div className={styles.logoUploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.visuallyHidden}
              onChange={handleFileChange}
            />
            {logoPreview ? (
              <div className={styles.logoPreview}>
                <img src={logoPreview} alt="Logo preview" />
                <button type="button" className={styles.removeLogoBtn} onClick={handleRemoveLogo}>
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadLogoBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.orgSetupActions}>
        {onSkip && (
          <button type="button" className={styles.btnSkip} onClick={onSkip}>
            Skip for now
          </button>
        )}
        <button type="button" className={styles.btnPrimary} onClick={onComplete}>
          Continue
        </button>
      </div>
    </div>
  );
}
