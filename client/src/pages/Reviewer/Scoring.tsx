import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Scoring.module.css';

interface Employee {
  _id: string;
  name: string;
  email: string;
  mobile: string;
}

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

interface FunctionalKRA {
  _id?: string;
  kra: string;
  kpis?: KPI[];
  reportsGenerated?: Proof[];
  pilotWeight?: number;
  pilotScore?: number;
  r1Weight?: number;
  r1Score?: number;
  r1ActualPerf?: string;
  r2Weight?: number;
  r2Score?: number;
  r2ActualPerf?: string;
  r3Weight?: number;
  r3Score?: number;
  r3ActualPerf?: string;
  r4Weight?: number;
  r4Score?: number;
  r4ActualPerf?: string;
}

interface KRAs {
  functionalKRAs?: FunctionalKRA[];
  organizationalKRAs?: any[];
  selfDevelopmentKRAs?: any[];
  developingOthersKRAs?: any[];
}

interface ReviewCycleInfo {
  currentReviewPeriod: number;
  r1Date?: string;
  r2Date?: string;
  r3Date?: string;
  r4Date?: string;
  r1Facilitator?: string;
  r2Facilitator?: string;
  r3Facilitator?: string;
  r4Facilitator?: string;
}

function Scoring() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [kras, setKras] = useState<KRAs>({ functionalKRAs: [] });
  const [reviewPeriod, setReviewPeriod] = useState<number>(1);
  const [reviewCycle, setReviewCycle] = useState<ReviewCycleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weightError, setWeightError] = useState<string>('');
  const [scoreError, setScoreError] = useState<{ kraIndex: number; message: string } | null>(null);
  const [showProofDialog, setShowProofDialog] = useState<{ kraIndex: number; isOpen: boolean }>({
    kraIndex: -1,
    isOpen: false,
  });
  const [proofInput, setProofInput] = useState<{ type: 'drive_link' | 'file_upload'; value: string }>({
    type: 'drive_link',
    value: '',
  });

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || !employeeId) {
      navigate('/auth/login');
      return;
    }

    fetchEmployeeData();
  }, [employeeId, navigate]);

  useEffect(() => {
    // Validate weights whenever KRAs or review period changes
    validateWeights();
  }, [kras, reviewPeriod]);

  const fetchEmployeeData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/employees/${employeeId}?userId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setEmployee(data.data.employee);
        if (data.data.reviewCycle) {
          setReviewCycle(data.data.reviewCycle);
          setReviewPeriod(data.data.reviewCycle.currentReviewPeriod ?? 1);
        }
        // Initialize KRAs with empty array if not present
        const krasData = data.data.kras || { functionalKRAs: [] };
        // Ensure functionalKRAs is an array
        if (!krasData.functionalKRAs || !Array.isArray(krasData.functionalKRAs)) {
          krasData.functionalKRAs = [];
        }
        // Ensure each KRA has kpis array
        krasData.functionalKRAs = krasData.functionalKRAs.map((kra: FunctionalKRA) => ({
          ...kra,
          kpis: kra.kpis || [],
          reportsGenerated: kra.reportsGenerated || [],
        }));
        setKras(krasData);
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateWeights = () => {
    if (!kras.functionalKRAs || kras.functionalKRAs.length === 0) {
      setWeightError('');
      return;
    }

    const totalWeight = kras.functionalKRAs.reduce((sum, kra) => {
      const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
      const weight = (kra as any)[weightKey] || 10;
      return sum + weight;
    }, 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      setWeightError(`Total weights must equal 100%. Current total: ${totalWeight.toFixed(2)}%`);
    } else {
      setWeightError('');
    }
  };

  const updateKRA = (index: number, field: string, value: any) => {
    setKras((prev) => {
      if (!prev.functionalKRAs) return prev;
      const updated = [...prev.functionalKRAs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, functionalKRAs: updated };
    });
  };

  const handleWeightChange = (index: number, value: number) => {
    // Weight must be in increments of 10, range 10-100
    // Round to nearest multiple of 10
    const rounded = Math.round(value / 10) * 10;
    const weight = Math.max(10, Math.min(100, rounded));
    const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
    updateKRA(index, weightKey, weight);
  };

  const handleWeightIncrement = (index: number) => {
    const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
    const currentWeight = (kras.functionalKRAs?.[index] as any)?.[weightKey] || 10;
    if (currentWeight < 100) {
      handleWeightChange(index, currentWeight + 10);
    }
  };

  const handleWeightDecrement = (index: number) => {
    const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
    const currentWeight = (kras.functionalKRAs?.[index] as any)?.[weightKey] || 10;
    if (currentWeight > 10) {
      handleWeightChange(index, currentWeight - 10);
    }
  };

  const handleScoreChange = (index: number, value: number) => {
    // Clear any previous error
    if (scoreError?.kraIndex === index) {
      setScoreError(null);
    }

    if (value < 0) {
      setScoreError({ kraIndex: index, message: 'Score cannot be below 0' });
      return;
    }
    if (value > 5) {
      setScoreError({ kraIndex: index, message: 'Score cannot be above 5' });
      return;
    }

    const score = Math.max(0, Math.min(5, value));
    const scoreKey = reviewPeriod === 0 ? 'pilotScore' : `r${reviewPeriod}Score`;
    updateKRA(index, scoreKey, score);
  };

  const handlePilotScoreIncrement = (index: number) => {
    const currentScore = kras.functionalKRAs?.[index]?.pilotScore || 0;
    const newScore = currentScore + 1;
    
    if (newScore > 5) {
      setScoreError({ kraIndex: index, message: 'Score cannot be above 5' });
      setTimeout(() => setScoreError(null), 3000);
      return;
    }
    
    // Clear any previous error
    if (scoreError?.kraIndex === index) {
      setScoreError(null);
    }
    
    const scoreKey = 'pilotScore';
    updateKRA(index, scoreKey, newScore);
  };

  const handlePilotScoreDecrement = (index: number) => {
    const currentScore = kras.functionalKRAs?.[index]?.pilotScore || 0;
    const newScore = currentScore - 1;
    
    if (newScore < 0) {
      setScoreError({ kraIndex: index, message: 'Score cannot be below 0' });
      setTimeout(() => setScoreError(null), 3000);
      return;
    }
    
    // Clear any previous error
    if (scoreError?.kraIndex === index) {
      setScoreError(null);
    }
    
    const scoreKey = 'pilotScore';
    updateKRA(index, scoreKey, newScore);
  };

  const handleActualPerfChange = (index: number, value: string) => {
    const perfKey = `r${reviewPeriod}ActualPerf`;
    updateKRA(index, perfKey, value);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, kraIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i) && file.type !== 'application/pdf') {
      alert('Only JPG, PNG, or PDF files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      // For now, convert to base64 for storage
      // In production, upload to server and get URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        addProof(kraIndex, {
          type: 'file_upload',
          value: base64String,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const addProof = (kraIndex: number, proof: Proof) => {
    setKras((prev) => {
      if (!prev.functionalKRAs) return prev;
      const updated = [...prev.functionalKRAs];
      const kra = { ...updated[kraIndex] };
      kra.reportsGenerated = [...(kra.reportsGenerated || []), proof];
      updated[kraIndex] = kra;
      return { ...prev, functionalKRAs: updated };
    });
    setShowProofDialog({ kraIndex: -1, isOpen: false });
    setProofInput({ type: 'drive_link', value: '' });
  };

  const removeProof = (kraIndex: number, proofIndex: number) => {
    setKras((prev) => {
      if (!prev.functionalKRAs) return prev;
      const updated = [...prev.functionalKRAs];
      const kra = { ...updated[kraIndex] };
      kra.reportsGenerated = kra.reportsGenerated?.filter((_, i) => i !== proofIndex) || [];
      updated[kraIndex] = kra;
      return { ...prev, functionalKRAs: updated };
    });
  };

  const handleAddDriveLink = () => {
    if (!proofInput.value.trim()) {
      alert('Please enter a drive link');
      return;
    }

    // Basic validation for Google Drive links
    if (!proofInput.value.includes('drive.google.com') && !proofInput.value.includes('docs.google.com')) {
      if (!confirm('This doesn\'t look like a Google Drive link. Continue anyway?')) {
        return;
      }
    }

    addProof(showProofDialog.kraIndex, {
      type: 'drive_link',
      value: proofInput.value.trim(),
      uploadedAt: new Date().toISOString(),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!kras || !employeeId) return;

    // Validate weights
    if (weightError) {
      alert(weightError);
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Prepare scores with new structure
      const scoresToSubmit = {
        functionalKRAs: kras.functionalKRAs?.map((kra) => {
          const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
          const scoreKey = reviewPeriod === 0 ? 'pilotScore' : `r${reviewPeriod}Score`;
          const perfKey = `r${reviewPeriod}ActualPerf`;

          return {
            kra: kra.kra,
            kpis: kra.kpis || [],
            reportsGenerated: kra.reportsGenerated || [],
            [weightKey]: (kra as any)[weightKey] || 0,
            [scoreKey]: (kra as any)[scoreKey] || 0,
            [perfKey]: (kra as any)[perfKey] || '',
            // Also include weight/score for the API
            weight: (kra as any)[weightKey] || 10,
            score: (kra as any)[scoreKey] || 0,
            actualPerf: (kra as any)[perfKey] || '',
          };
        }) || [],
      };

      const res = await fetch(`/api/reviewer/employees/${employeeId}/scores?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewPeriod,
          scores: scoresToSubmit,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Scores submitted.');
        navigate('/reviewer/dashboard');
      } else {
        alert(data.message || 'Failed to submit scores');
      }
    } catch (error) {
      console.error('Failed to submit scores:', error);
      alert('Network error. Please check if the server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!confirm('Are you sure you want to lock this review? It cannot be edited after locking.')) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/reviewer/employees/${employeeId}/lock?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewPeriod }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Review locked.');
        navigate('/reviewer/dashboard');
      } else {
        alert(data.message || 'Failed to lock review');
      }
    } catch (error) {
      console.error('Failed to lock review:', error);
      alert('Network error. Please check if the server is running.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!employee) {
    return <div className={styles.error}>Member data not found</div>;
  }

  const functionalKRAs = kras.functionalKRAs || [];

  return (
    <div className={styles.scoring}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/reviewer/dashboard')}>
          ← Back
        </button>
        <h1>Enter Scores for Member: {employee.name}</h1>
      </div>

      <form onSubmit={handleSubmit}>
      {/* Current period & quarterly dates - only current period is editable */}
      {reviewCycle && (
        <div className={styles.reviewCycleBanner}>
          <strong>Current period: R{reviewCycle.currentReviewPeriod}</strong>
          <span className={styles.reviewCycleHint}>Only R{reviewCycle.currentReviewPeriod} can be scored.</span>
          <div className={styles.quarterDatesRow}>
            {([1, 2, 3, 4] as const).map((n) => (
              <span key={n} className={n === reviewCycle.currentReviewPeriod ? styles.quarterDateCurrent : styles.quarterDate}>
                R{n}: {reviewCycle[`r${n}Date`] ? new Date(reviewCycle[`r${n}Date`]).toLocaleDateString() : '—'}
                {reviewCycle[`r${n}Facilitator`] && ` · ${reviewCycle[`r${n}Facilitator`]}`}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className={styles.controls}>
        <label>
          Review Period:
          <select
            value={reviewPeriod}
            onChange={(e) => setReviewPeriod(Number(e.target.value))}
            className={styles.periodSelect}
            disabled={!!reviewCycle}
            title={reviewCycle ? 'Only the current review period can be edited' : undefined}
          >
              <option value={0}>Pilot</option>
              <option value={1}>Period 1 (R1)</option>
              <option value={2}>Period 2 (R2)</option>
              <option value={3}>Period 3 (R3)</option>
              <option value={4}>Period 4 (R4)</option>
          </select>
        </label>
      </div>

      <div className={styles.scoresSection}>
          <h2>Functional Dimension KRAs (D1)</h2>
          {weightError && (
            <div className={styles.weightError}>{weightError}</div>
          )}
        <div className={styles.kraList}>
            {functionalKRAs.length > 0 ? (
              functionalKRAs.map((kra, index) => {
                const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
                const scoreKey = reviewPeriod === 0 ? 'pilotScore' : `r${reviewPeriod}Score`;
                const perfKey = `r${reviewPeriod}ActualPerf`;
                const weight = (kra as any)[weightKey] || 10;
                const score = (kra as any)[scoreKey] || 0;
                const actualPerf = (kra as any)[perfKey] || '';

                return (
              <div key={index} className={styles.kraCard}>
                    <h3>KRA {index + 1}: {kra.kra}</h3>
                    
                    {/* KPIs Section */}
                    <div className={styles.kpisSection}>
                      <h4>KPIs (How to achieve this KRA):</h4>
                      {kra.kpis && kra.kpis.length > 0 ? (
                        <ul className={styles.kpiList}>
                          {kra.kpis.map((kpi, kpiIndex) => (
                            <li key={kpiIndex}>
                              <strong>{kpi.kpi}</strong>
                              {kpi.target && <span className={styles.kpiTarget}> - Target: {kpi.target}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.noData}>No KPIs defined</p>
                      )}
                    </div>

                    {/* Reports/Proof Section - Optional */}
                    <div className={styles.proofSection}>
                      <h4>Reports/Proof of Work <span className={styles.optionalLabel}>(Optional)</span>:</h4>
                      <div className={styles.proofList}>
                        {kra.reportsGenerated && kra.reportsGenerated.length > 0 ? (
                          kra.reportsGenerated.map((proof, proofIndex) => (
                            <div key={proofIndex} className={styles.proofItem}>
                              {proof.type === 'drive_link' ? (
                                <a href={proof.value} target="_blank" rel="noopener noreferrer" className={styles.driveLink}>
                                  📎 Drive Link
                                </a>
                              ) : (
                                <span className={styles.fileItem}>
                                  📄 {proof.fileName || 'Uploaded File'}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeProof(index, proofIndex)}
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
                          onClick={() => setShowProofDialog({ kraIndex: index, isOpen: true })}
                          className={styles.addProofBtn}
                        >
                          + Add Proof
                        </button>
                      </div>
                    </div>

                    {/* Scoring Inputs */}
                <div className={styles.scoreInputs}>
                      <div className={styles.inputGroup}>
                        <label>
                          Weightage
                          <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.weightControls}>
                          <button
                            type="button"
                            className={styles.scoreButton}
                            onClick={() => handleWeightDecrement(index)}
                            disabled={weight <= 10}
                            aria-label="Decrease weight"
                          >
                            −
                          </button>
                          <div className={styles.weightDisplay}>
                            <span className={styles.weightValue}>{weight.toString().padStart(3, '0')}</span>
                            <span className={styles.weightUnit}> %</span>
                          </div>
                          <button
                            type="button"
                            className={styles.scoreButton}
                            onClick={() => handleWeightIncrement(index)}
                            disabled={weight >= 100}
                            aria-label="Increase weight"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {reviewPeriod === 0 ? (
                        // Pilot Period: Use +/- buttons for score
                        <div className={styles.inputGroup}>
                          <label>
                            Pilot Score
                            <span className={styles.required}>*</span>
                          </label>
                          <div className={styles.pilotScoreControls}>
                            <button
                              type="button"
                              className={styles.scoreButton}
                              onClick={() => handlePilotScoreDecrement(index)}
                              disabled={score <= 0}
                              aria-label="Decrease score"
                            >
                              −
                            </button>
                            <div className={styles.pilotScoreDisplay}>
                              <span className={styles.scoreValue}>{score.toString().padStart(2, '0')}</span>
                            </div>
                            <button
                              type="button"
                              className={styles.scoreButton}
                              onClick={() => handlePilotScoreIncrement(index)}
                              disabled={score >= 5}
                              aria-label="Increase score"
                            >
                              +
                            </button>
                          </div>
                          {scoreError?.kraIndex === index && (
                            <span className={styles.scoreError}>{scoreError.message}</span>
                          )}
                        </div>
                      ) : (
                        // Review Periods: Use number input for score
                        <div className={styles.inputGroup}>
                          <label>
                            Score (0-5)
                            <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={score}
                            onChange={(e) => handleScoreChange(index, parseFloat(e.target.value) || 0)}
                            required
                          />
                          <span className={styles.scoreHint}>0 = Worst, 5 = Best</span>
                          {scoreError?.kraIndex === index && (
                            <span className={styles.scoreError}>{scoreError.message}</span>
                          )}
                        </div>
                      )}
                  </div>

                    {reviewPeriod !== 0 && (
                      <div className={styles.inputGroup}>
                        <label>Actual Performance Notes</label>
                        <textarea
                          value={actualPerf}
                          onChange={(e) => handleActualPerfChange(index, e.target.value)}
                          rows={3}
                          placeholder="Describe actual performance for this review period..."
                        />
                  </div>
                    )}
                  </div>
                );
              })
          ) : (
            <p className={styles.noKras}>No functional KRAs defined yet</p>
            )}
          </div>

          {/* Total Weight Display */}
          {functionalKRAs.length > 0 && (
            <div className={styles.totalWeight}>
              <strong>
                Total Weightage: {functionalKRAs.reduce((sum, kra) => {
                  const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
                  return sum + ((kra as any)[weightKey] || 10);
                }, 0)}%
                {(() => {
                  const total = functionalKRAs.reduce((sum, kra) => {
                    const weightKey = reviewPeriod === 0 ? 'pilotWeight' : `r${reviewPeriod}Weight`;
                    return sum + ((kra as any)[weightKey] || 10);
                  }, 0);
                  if (total !== 100) {
                    return ` (Target: 100%)`;
                  }
                  return '';
                })()}
              </strong>
            </div>
          )}
      </div>

      <div className={styles.actions}>
        <button
            type="submit"
          className={styles.submitButton}
            disabled={isSubmitting || !!weightError}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Scores'}
        </button>
        <button
            type="button"
          className={styles.lockButton}
          onClick={handleLock}
        >
          Lock Review
        </button>
      </div>
      </form>

      {/* Proof Dialog */}
      {showProofDialog.isOpen && (
        <div className={styles.proofDialogOverlay} onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}>
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
                  onChange={(e) => handleFileUpload(e, showProofDialog.kraIndex)}
                />
                <p className={styles.fileHint}>Maximum file size: 10MB</p>
              </div>
            )}

            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setShowProofDialog({ kraIndex: -1, isOpen: false })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scoring;
