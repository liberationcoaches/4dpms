import { useState, FormEvent, ChangeEvent } from 'react';
import styles from './KRAForm.module.css';

interface KPI {
  kpi: string;
  target?: string;
}

interface Proof {
  type: 'drive_link' | 'file_upload';
  value: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface FunctionalKRAFormData {
  kra: string;
  kpis: KPI[];
  reportsGenerated?: Proof[];
  pilotWeight?: number;
  pilotScore?: number;
  pilotActualPerf?: string;
}

interface KRAFormProps {
  initialData?: Partial<FunctionalKRAFormData>;
  onSubmit: (data: FunctionalKRAFormData) => void;
  onCancel: () => void;
  mode?: 'add' | 'edit';
}

function KRAForm({ initialData, onSubmit, onCancel, mode = 'add' }: KRAFormProps) {
  const [formData, setFormData] = useState<FunctionalKRAFormData>({
    kra: initialData?.kra || '',
    kpis: initialData?.kpis || [{ kpi: '', target: '' }],
    reportsGenerated: initialData?.reportsGenerated || [],
    pilotWeight: initialData?.pilotWeight || 10,
    pilotScore: initialData?.pilotScore || 0,
    pilotActualPerf: initialData?.pilotActualPerf || '',
  });

  const [showProofDialog, setShowProofDialog] = useState(false);
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });

  const handleKPIChange = (index: number, field: 'kpi' | 'target', value: string) => {
    const updatedKPIs = [...formData.kpis];
    updatedKPIs[index] = { ...updatedKPIs[index], [field]: value };
    setFormData({ ...formData, kpis: updatedKPIs });
  };

  const addKPI = () => {
    setFormData({
      ...formData,
      kpis: [...formData.kpis, { kpi: '', target: '' }],
    });
  };

  const removeKPI = (index: number) => {
    if (formData.kpis.length > 1) {
      const updatedKPIs = formData.kpis.filter((_, i) => i !== index);
      setFormData({ ...formData, kpis: updatedKPIs });
    }
  };

  const handleWeightIncrement = () => {
    const currentWeight = formData.pilotWeight || 10;
    if (currentWeight < 100) {
      setFormData({ ...formData, pilotWeight: currentWeight + 10 });
    }
  };

  const handleWeightDecrement = () => {
    const currentWeight = formData.pilotWeight || 10;
    if (currentWeight > 10) {
      setFormData({ ...formData, pilotWeight: currentWeight - 10 });
    }
  };

  const handlePilotScoreIncrement = () => {
    if ((formData.pilotScore || 0) < 5) {
      setFormData({ ...formData, pilotScore: (formData.pilotScore || 0) + 1 });
    }
  };

  const handlePilotScoreDecrement = () => {
    if ((formData.pilotScore || 0) > 0) {
      setFormData({ ...formData, pilotScore: (formData.pilotScore || 0) - 1 });
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i) && file.type !== 'application/pdf') {
      alert('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newProof: Proof = {
          type: 'file_upload',
          value: base64String,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        };
        setFormData({
          ...formData,
          reportsGenerated: [...(formData.reportsGenerated || []), newProof],
        });
        setShowProofDialog(false);
        setProofInput({ type: 'drive_link', value: '' });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleAddDriveLink = () => {
    if (!proofInput.value.trim()) {
      alert('Please enter a drive link');
      return;
    }

    const newProof: Proof = {
      type: 'drive_link',
      value: proofInput.value.trim(),
      uploadedAt: new Date().toISOString(),
    };
    setFormData({
      ...formData,
      reportsGenerated: [...(formData.reportsGenerated || []), newProof],
    });
    setShowProofDialog(false);
    setProofInput({ type: 'drive_link', value: '' });
  };

  const removeProof = (index: number) => {
    const updatedProofs = formData.reportsGenerated?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, reportsGenerated: updatedProofs });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.kra.trim()) {
      alert('KRA name is required');
      return;
    }
    // Filter out empty KPIs
    const validKPIs = formData.kpis.filter((kpi) => kpi.kpi.trim());
    if (validKPIs.length === 0) {
      alert('At least one KPI is required');
      return;
    }
    onSubmit({ ...formData, kpis: validKPIs });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.kraForm}>
      <div className={styles.formHeader}>
        <h3>{mode === 'add' ? 'Add New KRA' : 'Edit KRA'}</h3>
      </div>

      {/* KRA Name */}
      <div className={styles.formGroup}>
        <label>
          KRA (Key Result Area) <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          value={formData.kra}
          onChange={(e) => setFormData({ ...formData, kra: e.target.value })}
          placeholder="Enter KRA name"
          required
          className={styles.input}
        />
      </div>

      {/* KPIs Section */}
      <div className={styles.formGroup}>
        <label>
          KPIs (Key Performance Indicators) <span className={styles.required}>*</span>
        </label>
        {formData.kpis.map((kpi, index) => (
          <div key={index} className={styles.kpiRow}>
            <input
              type="text"
              value={kpi.kpi}
              onChange={(e) => handleKPIChange(index, 'kpi', e.target.value)}
              placeholder="KPI description"
              className={styles.input}
              required
            />
            <input
              type="text"
              value={kpi.target || ''}
              onChange={(e) => handleKPIChange(index, 'target', e.target.value)}
              placeholder="Target (optional)"
              className={styles.input}
            />
            {formData.kpis.length > 1 && (
              <button
                type="button"
                onClick={() => removeKPI(index)}
                className={styles.removeButton}
                aria-label="Remove KPI"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addKPI} className={styles.addKPIButton}>
          + Add KPI
        </button>
      </div>

      {/* Reports/Proof Section - Optional */}
      <div className={styles.formGroup}>
        <label>
          Reports/Proof of Work <span className={styles.optionalLabel}>(Optional)</span>
        </label>
        <div className={styles.proofList}>
          {formData.reportsGenerated && formData.reportsGenerated.length > 0 ? (
            formData.reportsGenerated.map((proof, index) => (
              <div key={index} className={styles.proofItem}>
                {proof.type === 'drive_link' ? (
                  <a href={proof.value} target="_blank" rel="noopener noreferrer" className={styles.driveLink}>
                    📎 Drive Link
                  </a>
                ) : (
                  <span className={styles.fileItem}>📄 {proof.fileName || 'Uploaded File'}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeProof(index)}
                  className={styles.removeProof}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <p className={styles.noData}>No proof submitted</p>
          )}
          <button
            type="button"
            onClick={() => setShowProofDialog(true)}
            className={styles.addProofBtn}
          >
            + Add Proof
          </button>
        </div>
      </div>

      {/* Weightage */}
      <div className={styles.formGroup}>
        <label>
          Weightage <span className={styles.required}>*</span>
        </label>
        <div className={styles.weightControls}>
          <button
            type="button"
            className={styles.scoreButton}
            onClick={handleWeightDecrement}
            disabled={(formData.pilotWeight || 10) <= 10}
            aria-label="Decrease weight"
          >
            −
          </button>
          <div className={styles.weightDisplay}>
            <span className={styles.weightValue}>{Number(formData.pilotWeight) || 10}</span>
            <span className={styles.weightUnit}>%</span>
          </div>
          <button
            type="button"
            className={styles.scoreButton}
            onClick={handleWeightIncrement}
            disabled={(formData.pilotWeight || 10) >= 100}
            aria-label="Increase weight"
          >
            +
          </button>
        </div>
      </div>

      {/* Pilot Score */}
      <div className={styles.formGroup}>
        <label>
          Pilot Score <span className={styles.required}>*</span>
        </label>
        <div className={styles.pilotScoreControls}>
          <button
            type="button"
            className={styles.scoreButton}
            onClick={handlePilotScoreDecrement}
            disabled={(formData.pilotScore || 0) <= 0}
            aria-label="Decrease score"
          >
            −
          </button>
          <div className={styles.pilotScoreDisplay}>
            <span className={styles.scoreValue}>{Number(formData.pilotScore) || 0}</span>
          </div>
          <button
            type="button"
            className={styles.scoreButton}
            onClick={handlePilotScoreIncrement}
            disabled={(formData.pilotScore || 0) >= 5}
            aria-label="Increase score"
          >
            +
          </button>
        </div>
      </div>

      {/* Pilot Actual Performance */}
      <div className={styles.formGroup}>
        <label>
          Pilot Actual Performance <span className={styles.optionalLabel}>(Optional)</span>
        </label>
        <textarea
          value={formData.pilotActualPerf || ''}
          onChange={(e) => setFormData({ ...formData, pilotActualPerf: e.target.value })}
          placeholder="Describe the actual performance or comments for the pilot period"
          className={styles.textarea}
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className={styles.formActions}>
        <button type="submit" className={styles.saveButton}>
          {mode === 'add' ? 'Save' : 'Update'}
        </button>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Discard
        </button>
      </div>

      {/* Proof Dialog */}
      {showProofDialog && (
        <div className={styles.proofDialogOverlay} onClick={() => setShowProofDialog(false)}>
          <div className={styles.proofDialog} onClick={(e) => e.stopPropagation()}>
            <h3>Add Proof of Work</h3>
            <div className={styles.proofTypeSelector}>
              <button
                type="button"
                className={proofInput.type === 'drive_link' ? styles.active : ''}
                onClick={() => setProofInput({ ...proofInput, type: 'drive_link' })}
              >
                Google Drive Link
              </button>
              <button
                type="button"
                className={proofInput.type === 'file_upload' ? styles.active : ''}
                onClick={() => setProofInput({ ...proofInput, type: 'file_upload' })}
              >
                Upload File (JPG/PNG/PDF)
              </button>
            </div>

            {proofInput.type === 'drive_link' ? (
              <div className={styles.proofInput}>
                <label>Drive Link URL:</label>
                <input
                  type="url"
                  value={proofInput.value}
                  onChange={(e) => setProofInput({ ...proofInput, value: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
                <button type="button" onClick={handleAddDriveLink} className={styles.addBtn}>
                  Add Link
                </button>
              </div>
            ) : (
              <div className={styles.proofInput}>
                <label>Upload File:</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                />
                <p className={styles.fileHint}>Maximum file size: 10MB</p>
              </div>
            )}

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowProofDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default KRAForm;
