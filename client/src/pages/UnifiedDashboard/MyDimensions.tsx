import { useState, useEffect } from 'react';
import styles from './UnifiedDashboard.module.css';

interface MyDimensionsProps {
    userId: string;
    role: string;
}

interface KRA {
    _id?: string;
    name: string;
    score: number;
}

interface DimensionData {
    functional: { weight: number; kras: KRA[]; score: number };
    organizational: { weight: number; kras: KRA[]; score: number };
    selfDevelopment: { weight: number; kras: KRA[]; score: number };
    developingOthers: { weight: number; kras: KRA[]; score: number };
}

const DIMENSION_LABELS: Record<string, { label: string; cssClass: string }> = {
    functional: { label: 'Functional', cssClass: 'dimensionFunctional' },
    organizational: { label: 'Organizational', cssClass: 'dimensionOrganizational' },
    selfDevelopment: { label: 'Self Development', cssClass: 'dimensionSelfDev' },
    developingOthers: { label: 'Developing Others', cssClass: 'dimensionDevOthers' },
};

export default function MyDimensions({ userId }: MyDimensionsProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [dimensions, setDimensions] = useState<DimensionData>({
        functional: { weight: 40, kras: [], score: 0 },
        organizational: { weight: 25, kras: [], score: 0 },
        selfDevelopment: { weight: 20, kras: [], score: 0 },
        developingOthers: { weight: 15, kras: [], score: 0 },
    });

    useEffect(() => {
        const fetchDimensions = async () => {
            try {
                // Fetch user's KRA data
                const res = await fetch(`/api/employee/kras?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    // Map data to our dimension structure
                    const kras = data.data;
                    const funcKRAs = kras
                        .filter((k: any) => k.dimension === 'functional')
                        .map((k: any) => ({ _id: k._id, name: k.name, score: k.selfScore || 0 }));
                    const orgKRAs = kras
                        .filter((k: any) => k.dimension === 'organizational')
                        .map((k: any) => ({ _id: k._id, name: k.name, score: k.selfScore || 0 }));
                    const selfDevKRAs = kras
                        .filter((k: any) => k.dimension === 'selfDevelopment')
                        .map((k: any) => ({ _id: k._id, name: k.name, score: k.selfScore || 0 }));
                    const devOthersKRAs = kras
                        .filter((k: any) => k.dimension === 'developingOthers')
                        .map((k: any) => ({ _id: k._id, name: k.name, score: k.selfScore || 0 }));

                    setDimensions({
                        functional: { ...dimensions.functional, kras: funcKRAs, score: avg(funcKRAs) },
                        organizational: { ...dimensions.organizational, kras: orgKRAs, score: avg(orgKRAs) },
                        selfDevelopment: { ...dimensions.selfDevelopment, kras: selfDevKRAs, score: avg(selfDevKRAs) },
                        developingOthers: { ...dimensions.developingOthers, kras: devOthersKRAs, score: avg(devOthersKRAs) },
                    });
                }
            } catch (err) {
                console.error('Failed to fetch dimensions:', err);
            }
        };
        fetchDimensions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const avg = (kras: KRA[]) => {
        if (kras.length === 0) return 0;
        return Math.round(kras.reduce((sum, k) => sum + k.score, 0) / kras.length);
    };

    const handleWeightChange = (dim: keyof DimensionData, value: number) => {
        setDimensions((prev) => ({
            ...prev,
            [dim]: { ...prev[dim], weight: value },
        }));
    };

    const handleKRAScoreChange = (dim: keyof DimensionData, kraIdx: number, value: number) => {
        setDimensions((prev) => {
            const updated = { ...prev };
            const kras = [...updated[dim].kras];
            kras[kraIdx] = { ...kras[kraIdx], score: value };
            updated[dim] = { ...updated[dim], kras, score: avg(kras) };
            return updated;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save self-scores for each KRA
            for (const dimKey of Object.keys(dimensions) as (keyof DimensionData)[]) {
                for (const kra of dimensions[dimKey].kras) {
                    if (kra._id) {
                        await fetch(`/api/employee/kras/${kra._id}/self-score`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ selfScore: kra.score, userId }),
                        });
                    }
                }
            }

            // Notify manager that data was submitted
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    type: 'data_submitted',
                    message: 'has submitted their 4D data for review',
                }),
            });

            setSaveSuccess(true);
            setEditing(false);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setSaving(false);
        }
    };

    const totalWeight = Object.values(dimensions).reduce((sum, d) => sum + d.weight, 0);

    return (
        <div>
            <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h3 className={styles.sectionTitle}>My 4D Performance Data</h3>
                        <p className={styles.sectionSubtitle}>
                            View and edit your scores across all 4 dimensions.
                            {!editing && ' Click "Edit" to update your self-assessment.'}
                        </p>
                    </div>
                    {!editing ? (
                        <button className={styles.btnOutline} onClick={() => setEditing(true)}>
                            ✏️ Edit
                        </button>
                    ) : (
                        <span style={{
                            fontFamily: 'var(--font-inter)',
                            fontSize: '12px',
                            color: totalWeight === 100 ? '#4caf50' : '#ff9800',
                        }}>
                            Total weight: {totalWeight}% {totalWeight !== 100 && '(must be 100%)'}
                        </span>
                    )}
                </div>

                {saveSuccess && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        color: '#4caf50',
                        borderRadius: '8px',
                        fontFamily: 'var(--font-inter)',
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '16px',
                    }}>
                        ✓ Data saved! Your manager has been notified for review.
                    </div>
                )}

                <div className={styles.dimensionsGrid}>
                    {(Object.keys(dimensions) as (keyof DimensionData)[]).map((dimKey) => {
                        const dim = dimensions[dimKey];
                        const meta = DIMENSION_LABELS[dimKey];
                        return (
                            <div key={dimKey} className={styles.dimensionCard}>
                                <div className={`${styles.dimensionHeader} ${styles[meta.cssClass]}`}>
                                    {meta.label}
                                </div>
                                <div className={styles.dimensionScore}>{dim.score || '—'}</div>

                                <div className={styles.dimensionWeight}>
                                    Weight:{' '}
                                    {editing ? (
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            className={styles.weightInput}
                                            value={dim.weight}
                                            onChange={(e) => handleWeightChange(dimKey, Number(e.target.value))}
                                        />
                                    ) : (
                                        <strong>{dim.weight}%</strong>
                                    )}
                                </div>

                                {dim.kras.length > 0 && (
                                    <div className={styles.kraList}>
                                        {dim.kras.map((kra, i) => (
                                            <div key={i} className={styles.kraItem}>
                                                <span className={styles.kraName}>{kra.name}</span>
                                                {editing ? (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={10}
                                                        className={styles.kraInput}
                                                        value={kra.score}
                                                        onChange={(e) =>
                                                            handleKRAScoreChange(dimKey, i, Number(e.target.value))
                                                        }
                                                    />
                                                ) : (
                                                    <span className={styles.kraScore}>{kra.score}/10</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {dim.kras.length === 0 && (
                                    <div style={{
                                        fontFamily: 'var(--font-inter)',
                                        fontSize: '12px',
                                        color: 'var(--color-main-grey-60)',
                                        marginTop: '12px',
                                    }}>
                                        No KRAs assigned yet
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {editing && (
                    <div className={styles.actionRow}>
                        <button className={styles.btnOutline} onClick={() => setEditing(false)}>
                            Cancel
                        </button>
                        <button
                            className={styles.btnSave}
                            onClick={handleSave}
                            disabled={saving || totalWeight !== 100}
                        >
                            {saving ? 'Saving...' : 'Save & Submit for Review'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
