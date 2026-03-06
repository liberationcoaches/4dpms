import { useState, useEffect } from 'react';

interface KPI {
    kpi: string;
    target: string;
}

interface FunctionalKRA {
    [key: string]: any;
    kra: string;
    kpis: KPI[];
    weight: number;      // Maps to r1Weight...r4Weight
    pilotScore: number;  // Maps to pilotScore (0-5)
    fdCommentPilot?: string;
    fdCommentQ1?: string;
    fdCommentQ2?: string;
    fdCommentQ3?: string;
    fdCommentQ4?: string;
}

interface OrgKRA {
    [key: string]: any;
    coreValues: string;
}

interface SelfDevKRA {
    [key: string]: any;
    areaOfConcern: string;
    actionPlanInitiative: string;
}

interface DevOthersKRA {
    [key: string]: any;
    person: string;
    areaOfDevelopment: string;
}

interface KRAEditorProps {
    userId: string;
    activeDimension?: 'functional' | 'organizational' | 'selfDevelopment' | 'developingOthers';
}

interface RemarksFields {
    remarksPilot: string;
    remarksQ1: string;
    remarksQ2: string;
    remarksQ3: string;
    remarksQ4: string;
}

export default function KRAEditor({ userId, activeDimension }: KRAEditorProps) {
    const [functionalKRAs, setFunctionalKRAs] = useState<FunctionalKRA[]>([]);
    const [orgKRAs, setOrgKRAs] = useState<OrgKRA[]>([]);
    const [selfDevKRAs, setSelfDevKRAs] = useState<SelfDevKRA[]>([]);
    const [devOthersKRAs, setDevOthersKRAs] = useState<DevOthersKRA[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);
    const [openDimension, setOpenDimension] = useState<string | null>(null);
    const [remarks, setRemarks] = useState<RemarksFields>({
        remarksPilot: '',
        remarksQ1: '',
        remarksQ2: '',
        remarksQ3: '',
        remarksQ4: '',
    });
    const [selectedDetailIndex, setSelectedDetailIndex] = useState<{
        functional: number | null;
        organizational: number | null;
        selfDevelopment: number | null;
        developingOthers: number | null;
    }>({
        functional: null,
        organizational: null,
        selfDevelopment: null,
        developingOthers: null,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/employee/kras?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    setFunctionalKRAs(
                        (data.data.functionalKRAs || []).map((k: any) => ({
                            ...k,
                            kra: k.kra || '',
                            kpis: Array.isArray(k.kpis) ? k.kpis.map((kp: any) => ({ kpi: kp.kpi || '', target: kp.target || '' })) : [],
                            weight: k.r1Weight || 0, // Assume R1 weight represents the standard weight
                            pilotScore: k.pilotScore || 0,
                            fdCommentPilot: k.fdCommentPilot || '',
                            fdCommentQ1: k.fdCommentQ1 || '',
                            fdCommentQ2: k.fdCommentQ2 || '',
                            fdCommentQ3: k.fdCommentQ3 || '',
                            fdCommentQ4: k.fdCommentQ4 || '',
                        }))
                    );
                    setOrgKRAs(
                        (data.data.organizationalKRAs || []).map((k: any) => ({ ...k, coreValues: k.coreValues || '' }))
                    );
                    setSelfDevKRAs(
                        (data.data.selfDevelopmentKRAs || []).map((k: any) => ({
                            ...k,
                            areaOfConcern: k.areaOfConcern || '',
                            actionPlanInitiative: k.actionPlanInitiative || '',
                        }))
                    );
                    setDevOthersKRAs(
                        (data.data.developingOthersKRAs || []).map((k: any) => ({
                            ...k,
                            person: k.person || '',
                            areaOfDevelopment: k.areaOfDevelopment || '',
                        }))
                    );
                    setRemarks({
                        remarksPilot: data.data.remarksPilot || '',
                        remarksQ1: data.data.remarksQ1 || '',
                        remarksQ2: data.data.remarksQ2 || '',
                        remarksQ3: data.data.remarksQ3 || '',
                        remarksQ4: data.data.remarksQ4 || '',
                    });
                }
            } catch (err) {
                console.error('Failed to load KRAs:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    useEffect(() => {
        if (activeDimension) {
            setOpenDimension(activeDimension);
        }
        setSelectedDetailIndex({
            functional: null,
            organizational: null,
            selfDevelopment: null,
            developingOthers: null,
        });
    }, [activeDimension]);

    const calculateTotalWeight = () => {
        return functionalKRAs.reduce((sum, kra) => sum + (Number(kra.weight) || 0), 0);
    };

    const handleSave = async () => {
        const totalWeight = calculateTotalWeight();
        if (functionalKRAs.length > 0 && Math.abs(totalWeight - 100) > 0.1) {
            setMessage({ text: `Total Functional Weight must be 100%. Current: ${totalWeight}%`, type: 'error' });
            return;
        }

        // Validate Weight Multiples of 5
        const invalidWeight = functionalKRAs.find(k => k.weight % 5 !== 0);
        if (invalidWeight) {
            setMessage({ text: `Weight regarding "${invalidWeight.kra}" must be a multiple of 5.`, type: 'error' });
            return;
        }

        // Validate Pilot Score range
        const invalidPilot = functionalKRAs.find(k => k.pilotScore < 0 || k.pilotScore > 5);
        if (invalidPilot) {
            setMessage({ text: `Pilot score regarding "${invalidPilot.kra}" must be between 0 and 5.`, type: 'error' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            // Map the frontend 'weight' to all 4 quarters for consistency
            // Map 'pilotScore' to pilotScore
            const functionalKRAsPayload = functionalKRAs.map(k => ({
                ...k,
                r1Weight: Number(k.weight),
                r2Weight: Number(k.weight),
                r3Weight: Number(k.weight),
                r4Weight: Number(k.weight),
                pilotScore: Number(k.pilotScore)
            }));

            const res = await fetch(`/api/employee/kras?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    functionalKRAs: functionalKRAsPayload,
                    organizationalKRAs: orgKRAs,
                    selfDevelopmentKRAs: selfDevKRAs,
                    developingOthersKRAs: devOthersKRAs,
                    remarksPilot: remarks.remarksPilot,
                    remarksQ1: remarks.remarksQ1,
                    remarksQ2: remarks.remarksQ2,
                    remarksQ3: remarks.remarksQ3,
                    remarksQ4: remarks.remarksQ4,
                }),
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setMessage({ text: data.message || 'KRAs saved! Your supervisor has been notified.', type: 'success' });
            } else {
                setMessage({ text: data.message || 'Failed to save KRAs', type: 'error' });
            }
        } catch {
            setMessage({ text: 'Network error. Please check your connection.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Functional helpers
    const addFunctionalKRA = () => {
        setFunctionalKRAs((prev) => {
            const next = [...prev, {
                kra: '',
                kpis: [{ kpi: '', target: '' }],
                weight: 0,
                pilotScore: 0,
                fdCommentPilot: '',
                fdCommentQ1: '',
                fdCommentQ2: '',
                fdCommentQ3: '',
                fdCommentQ4: '',
            }];
            if (activeDimension === 'functional') {
                setSelectedDetailIndex((curr) => ({ ...curr, functional: next.length - 1 }));
            }
            return next;
        });
    };
    const removeFunctionalKRA = (i: number) => {
        setFunctionalKRAs((prev) => prev.filter((_, idx) => idx !== i));
        setSelectedDetailIndex((curr) => {
            const current = curr.functional;
            if (current === null) return curr;
            if (current === i) return { ...curr, functional: null };
            if (current > i) return { ...curr, functional: current - 1 };
            return curr;
        });
    };
    const updateFunctionalKRA = (i: number, field: string, value: string | number) => {
        const copy = [...functionalKRAs];
        (copy[i] as any)[field] = value;
        setFunctionalKRAs(copy);
    };
    const addKPI = (kraIdx: number) => {
        const copy = [...functionalKRAs];
        copy[kraIdx].kpis.push({ kpi: '', target: '' });
        setFunctionalKRAs(copy);
    };
    const removeKPI = (kraIdx: number, kpiIdx: number) => {
        const copy = [...functionalKRAs];
        copy[kraIdx].kpis = copy[kraIdx].kpis.filter((_, i) => i !== kpiIdx);
        setFunctionalKRAs(copy);
    };
    const updateKPI = (kraIdx: number, kpiIdx: number, field: string, value: string) => {
        const copy = [...functionalKRAs];
        (copy[kraIdx].kpis[kpiIdx] as any)[field] = value;
        setFunctionalKRAs(copy);
    };

    // Org helpers
    const addOrgKRA = () => {
        setOrgKRAs((prev) => {
            const next = [...prev, { coreValues: '' }];
            if (activeDimension === 'organizational') {
                setSelectedDetailIndex((curr) => ({ ...curr, organizational: next.length - 1 }));
            }
            return next;
        });
    };
    const removeOrgKRA = (i: number) => {
        setOrgKRAs((prev) => prev.filter((_, idx) => idx !== i));
        setSelectedDetailIndex((curr) => {
            const current = curr.organizational;
            if (current === null) return curr;
            if (current === i) return { ...curr, organizational: null };
            if (current > i) return { ...curr, organizational: current - 1 };
            return curr;
        });
    };

    // Self dev helpers
    const addSelfDevKRA = () => {
        setSelfDevKRAs((prev) => {
            const next = [...prev, { areaOfConcern: '', actionPlanInitiative: '' }];
            if (activeDimension === 'selfDevelopment') {
                setSelectedDetailIndex((curr) => ({ ...curr, selfDevelopment: next.length - 1 }));
            }
            return next;
        });
    };
    const removeSelfDevKRA = (i: number) => {
        setSelfDevKRAs((prev) => prev.filter((_, idx) => idx !== i));
        setSelectedDetailIndex((curr) => {
            const current = curr.selfDevelopment;
            if (current === null) return curr;
            if (current === i) return { ...curr, selfDevelopment: null };
            if (current > i) return { ...curr, selfDevelopment: current - 1 };
            return curr;
        });
    };

    // Dev others helpers
    const addDevOthersKRA = () => {
        setDevOthersKRAs((prev) => {
            const next = [...prev, { person: '', areaOfDevelopment: '' }];
            if (activeDimension === 'developingOthers') {
                setSelectedDetailIndex((curr) => ({ ...curr, developingOthers: next.length - 1 }));
            }
            return next;
        });
    };
    const removeDevOthersKRA = (i: number) => {
        setDevOthersKRAs((prev) => prev.filter((_, idx) => idx !== i));
        setSelectedDetailIndex((curr) => {
            const current = curr.developingOthers;
            if (current === null) return curr;
            if (current === i) return { ...curr, developingOthers: null };
            if (current > i) return { ...curr, developingOthers: current - 1 };
            return curr;
        });
    };

    if (loading) return <div style={{ padding: '2rem', color: '#999' }}>Loading your 4D data...</div>;

    const toggleDimension = (key: string) => {
        setOpenDimension(openDimension === key ? null : key);
    };

    const shouldShowDimension = (key: string) => !activeDimension || activeDimension === key;
    const isDimensionOpen = (key: string) => (activeDimension ? activeDimension === key : openDimension === key);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    };

    const weightInputStyle: React.CSSProperties = {
        ...inputStyle,
        width: '100px',
        textAlign: 'center'
    };

    const addBtnStyle: React.CSSProperties = {
        padding: '8px 16px',
        backgroundColor: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 600,
    };

    const saveDimensionBtnStyle: React.CSSProperties = {
        ...addBtnStyle,
        backgroundColor: '#4CAF50',
    };

    const removeBtnStyle: React.CSSProperties = {
        padding: '4px 10px',
        backgroundColor: '#ff5252',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
    };

    const kraCardStyle: React.CSSProperties = {
        padding: '1rem',
        backgroundColor: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        marginBottom: '0.75rem',
    };

    const dimensionCards = [
        {
            key: 'functional',
            label: 'Functional',
            emoji: '🔵',
            color: '#2196F3',
            count: functionalKRAs.length,
            description: 'Task-based KRAs with KPIs and targets',
        },
        {
            key: 'organizational',
            label: 'Organizational',
            emoji: '🟢',
            color: '#4CAF50',
            count: orgKRAs.length,
            description: 'Core values and organizational alignment',
        },
        {
            key: 'selfDevelopment',
            label: 'Self Development',
            emoji: '🟠',
            color: '#FF9800',
            count: selfDevKRAs.length,
            description: 'Areas of concern and action plans',
        },
        {
            key: 'developingOthers',
            label: 'Developing Others',
            emoji: '🟣',
            color: '#9C27B0',
            count: devOthersKRAs.length,
            description: 'Mentoring and coaching others',
        },
    ];

    const totalFunctionalWeight = calculateTotalWeight();
    const activeDetailIndex = activeDimension ? selectedDetailIndex[activeDimension] : null;
    const isListView = !!activeDimension && activeDetailIndex === null;
    const isDetailView = !!activeDimension && activeDetailIndex !== null;

    const getLatestScoreSnapshot = (kra: any) => {
        const scoreFields = [
            { key: 'r4Score', label: 'R4' },
            { key: 'r3Score', label: 'R3' },
            { key: 'r2Score', label: 'R2' },
            { key: 'r1Score', label: 'R1' },
            { key: 'pilotScore', label: 'Pilot' },
        ];
        for (const field of scoreFields) {
            const value = kra?.[field.key];
            if (value !== undefined && value !== null && value !== '') {
                const numeric = Number(value);
                if (!Number.isNaN(numeric)) {
                    return `${field.label}: ${numeric.toFixed(1)}`;
                }
            }
        }
        return 'No score snapshot yet';
    };

    const getFunctionalSummaryScore = (kra: FunctionalKRA) => {
        const values = [kra.pilotScore, kra.r1Score, kra.r2Score, kra.r3Score, kra.r4Score]
            .filter((v) => v !== undefined && v !== null && v !== '')
            .map((v) => Number(v))
            .filter((v) => !Number.isNaN(v));
        if (values.length === 0) return 'No score snapshot yet';
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        return `Avg: ${avg.toFixed(1)}`;
    };

    const listCardStyle: React.CSSProperties = {
        ...kraCardStyle,
        cursor: 'pointer',
        border: '1px solid #dce7f3',
        transition: 'all 0.2s ease',
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>My 4 Dimensions</h2>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                        {activeDimension
                            ? 'Add or edit entries for this dimension. Save when done — your supervisor will be notified.'
                            : 'Tap a dimension card to add or edit your KRAs. Save when done — your supervisor will be notified.'}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: saving ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                        minWidth: '120px',
                    }}
                >
                    {saving ? 'Saving...' : '💾 Save All'}
                </button>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                    color: message.type === 'success' ? '#2E7D32' : '#C62828',
                    fontSize: '14px',
                    fontWeight: 500,
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '12px', background: '#fff', marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Comments</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                    <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Comments - Pilot" value={remarks.remarksPilot} onChange={(e) => setRemarks((p) => ({ ...p, remarksPilot: e.target.value }))} />
                    <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Comments - Q1" value={remarks.remarksQ1} onChange={(e) => setRemarks((p) => ({ ...p, remarksQ1: e.target.value }))} />
                    <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Comments - Q2" value={remarks.remarksQ2} onChange={(e) => setRemarks((p) => ({ ...p, remarksQ2: e.target.value }))} />
                    <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Comments - Q3" value={remarks.remarksQ3} onChange={(e) => setRemarks((p) => ({ ...p, remarksQ3: e.target.value }))} />
                    <textarea style={{ ...inputStyle, minHeight: '64px' }} placeholder="Comments - Q4" value={remarks.remarksQ4} onChange={(e) => setRemarks((p) => ({ ...p, remarksQ4: e.target.value }))} />
                </div>
            </div>

            {!activeDimension && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {dimensionCards.map((dim) => (
                        <div
                            key={dim.key}
                            onClick={() => toggleDimension(dim.key)}
                            style={{
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: openDimension === dim.key ? `2px solid ${dim.color}` : '1px solid #e0e0e0',
                                backgroundColor: openDimension === dim.key ? `${dim.color}08` : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: openDimension === dim.key ? `0 4px 12px ${dim.color}20` : '0 1px 3px rgba(0,0,0,0.08)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '28px' }}>{dim.emoji}</span>
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    backgroundColor: dim.color,
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                }}>
                                    {dim.count} {dim.count === 1 ? 'item' : 'items'}
                                </span>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: '#222' }}>{dim.label}</div>
                            <div style={{ fontSize: '13px', color: '#888' }}>{dim.description}</div>
                            <div style={{ marginTop: '8px', textAlign: 'right', color: dim.color, fontSize: '13px', fontWeight: 600 }}>
                                {openDimension === dim.key ? '▲ Close' : '▼ Open'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expanded Dimension Content */}
            {shouldShowDimension('functional') && isDimensionOpen('functional') && (
                <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '12px', borderLeft: '4px solid #2196F3', backgroundColor: '#fafafa', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>🔵 Functional KRAs</h3>
                            <div style={{ fontSize: '13px', color: totalFunctionalWeight === 100 ? '#4CAF50' : '#FF5252', marginTop: '4px', fontWeight: 600 }}>
                                Total Weight: {totalFunctionalWeight}% / 100%
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activeDimension === 'functional' && isDetailView && (
                                <button
                                    style={{ ...addBtnStyle, backgroundColor: '#607D8B' }}
                                    onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, functional: null }))}
                                >
                                    ← Back to List
                                </button>
                            )}
                            <button style={saveDimensionBtnStyle} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Functional'}
                            </button>
                            <button style={addBtnStyle} onClick={addFunctionalKRA}>+ Add KRA</button>
                        </div>
                    </div>
                    {functionalKRAs.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>No functional KRAs yet. Click "+ Add KRA" to get started.</p>}
                    {activeDimension === 'functional' && isListView && functionalKRAs.map((kra, i) => (
                        <div
                            key={`functional-list-${i}`}
                            style={listCardStyle}
                            onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, functional: i }))}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{kra.kra || `Functional KRA ${i + 1}`}</div>
                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                        KPIs: {kra.kpis?.length || 0} | {getFunctionalSummaryScore(kra)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', color: '#2196F3', fontWeight: 700 }}>›</div>
                            </div>
                        </div>
                    ))}
                    {(activeDimension !== 'functional' || isDetailView) && functionalKRAs
                        .map((_, idx) => idx)
                        .filter((idx) => activeDimension !== 'functional' || idx === selectedDetailIndex.functional)
                        .map((i) => {
                            const kra = functionalKRAs[i];
                            return (
                        <div key={i} style={kraCardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>KRA Name</label>
                                    <input
                                        style={{ ...inputStyle, fontWeight: 600 }}
                                        placeholder="KRA name (e.g., Increase sales revenue)"
                                        value={kra.kra}
                                        onChange={(e) => updateFunctionalKRA(i, 'kra', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Weight (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="5"
                                        style={weightInputStyle}
                                        placeholder="0"
                                        value={kra.weight}
                                        onChange={(e) => updateFunctionalKRA(i, 'weight', Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px' }}>Pilot (0-5)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        style={weightInputStyle}
                                        placeholder="0.0"
                                        value={kra.pilotScore}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            // Allow empty or valid number with max 1 decimal
                                            if (val === '' || /^\d+(\.\d{0,1})?$/.test(val)) {
                                                updateFunctionalKRA(i, 'pilotScore', val === '' ? 0 : val);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            let val = parseFloat(e.target.value);
                                            if (isNaN(val)) val = 0;
                                            if (val < 0) val = 0;
                                            if (val > 5) val = 5;
                                            updateFunctionalKRA(i, 'pilotScore', Number(val.toFixed(1)));
                                        }}
                                    />
                                </div>
                                <div style={{ paddingTop: '22px' }}>
                                    <button style={removeBtnStyle} onClick={() => removeFunctionalKRA(i)}>✕</button>
                                </div>
                            </div>
                            <div style={{ paddingLeft: '12px', borderLeft: '2px solid #e0e0e0' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#555' }}>KPIs:</div>
                                {kra.kpis.map((kpi, j) => (
                                    <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                                        <input
                                            style={{ ...inputStyle, flex: 2 }}
                                            placeholder="KPI description"
                                            value={kpi.kpi}
                                            onChange={(e) => updateKPI(i, j, 'kpi', e.target.value)}
                                        />
                                        <input
                                            style={{ ...inputStyle, flex: 1 }}
                                            placeholder="Target"
                                            value={kpi.target}
                                            onChange={(e) => updateKPI(i, j, 'target', e.target.value)}
                                        />
                                        <button style={{ ...removeBtnStyle, fontSize: '11px', padding: '3px 8px' }} onClick={() => removeKPI(i, j)}>✕</button>
                                    </div>
                                ))}
                                <button
                                    style={{ ...addBtnStyle, backgroundColor: '#E3F2FD', color: '#1976D2', fontSize: '12px', padding: '4px 10px' }}
                                    onClick={() => addKPI(i)}
                                >
                                    + KPI
                                </button>
                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                                    <textarea style={{ ...inputStyle, minHeight: '56px' }} placeholder="Functional comment - Pilot" value={kra.fdCommentPilot || ''} onChange={(e) => updateFunctionalKRA(i, 'fdCommentPilot', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '56px' }} placeholder="Functional comment - Q1" value={kra.fdCommentQ1 || ''} onChange={(e) => updateFunctionalKRA(i, 'fdCommentQ1', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '56px' }} placeholder="Functional comment - Q2" value={kra.fdCommentQ2 || ''} onChange={(e) => updateFunctionalKRA(i, 'fdCommentQ2', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '56px' }} placeholder="Functional comment - Q3" value={kra.fdCommentQ3 || ''} onChange={(e) => updateFunctionalKRA(i, 'fdCommentQ3', e.target.value)} />
                                    <textarea style={{ ...inputStyle, minHeight: '56px' }} placeholder="Functional comment - Q4" value={kra.fdCommentQ4 || ''} onChange={(e) => updateFunctionalKRA(i, 'fdCommentQ4', e.target.value)} />
                                </div>
                            </div>
                        </div>
                            );
                        })}
                </div>
            )}

            {shouldShowDimension('organizational') && isDimensionOpen('organizational') && (
                <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '12px', borderLeft: '4px solid #4CAF50', backgroundColor: '#fafafa', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>🟢 Organizational — Core Values</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activeDimension === 'organizational' && isDetailView && (
                                <button
                                    style={{ ...addBtnStyle, backgroundColor: '#607D8B' }}
                                    onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, organizational: null }))}
                                >
                                    ← Back to List
                                </button>
                            )}
                            <button style={saveDimensionBtnStyle} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Organizational'}
                            </button>
                            <button style={{ ...addBtnStyle, backgroundColor: '#4CAF50' }} onClick={addOrgKRA}>+ Add Core Value</button>
                        </div>
                    </div>
                    {orgKRAs.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>No core values yet.</p>}
                    {activeDimension === 'organizational' && isListView && orgKRAs.map((kra, i) => (
                        <div
                            key={`org-list-${i}`}
                            style={listCardStyle}
                            onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, organizational: i }))}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{kra.coreValues || `Core Value ${i + 1}`}</div>
                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                        {getLatestScoreSnapshot(kra)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', color: '#4CAF50', fontWeight: 700 }}>›</div>
                            </div>
                        </div>
                    ))}
                    {(activeDimension !== 'organizational' || isDetailView) && orgKRAs
                        .map((_, idx) => idx)
                        .filter((idx) => activeDimension !== 'organizational' || idx === selectedDetailIndex.organizational)
                        .map((i) => {
                            const kra = orgKRAs[i];
                            return (
                        <div key={i} style={kraCardStyle}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    style={inputStyle}
                                    placeholder="Core value (e.g., Integrity, Innovation, Teamwork)"
                                    value={kra.coreValues}
                                    onChange={(e) => {
                                        const copy = [...orgKRAs];
                                        copy[i].coreValues = e.target.value;
                                        setOrgKRAs(copy);
                                    }}
                                />
                                <button style={removeBtnStyle} onClick={() => removeOrgKRA(i)}>✕</button>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', display: 'grid', gap: '4px' }}>
                                <span>Pilot Score: {kra.pilotScore ?? '-'}</span>
                                <span>R1: {kra.r1Score ?? '-'} | R2: {kra.r2Score ?? '-'} | R3: {kra.r3Score ?? '-'} | R4: {kra.r4Score ?? '-'}</span>
                                <span>Incidents: {kra.r1CriticalIncident || kra.r2CriticalIncident || kra.r3CriticalIncident || kra.r4CriticalIncident || kra.pilotCriticalIncident || 'No incident notes yet'}</span>
                            </div>
                        </div>
                            );
                        })}
                </div>
            )}

            {shouldShowDimension('selfDevelopment') && isDimensionOpen('selfDevelopment') && (
                <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '12px', borderLeft: '4px solid #FF9800', backgroundColor: '#fafafa', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>🟠 Self Development</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activeDimension === 'selfDevelopment' && isDetailView && (
                                <button
                                    style={{ ...addBtnStyle, backgroundColor: '#607D8B' }}
                                    onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, selfDevelopment: null }))}
                                >
                                    ← Back to List
                                </button>
                            )}
                            <button style={saveDimensionBtnStyle} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Self-Development'}
                            </button>
                            <button style={{ ...addBtnStyle, backgroundColor: '#FF9800' }} onClick={addSelfDevKRA}>+ Add Area</button>
                        </div>
                    </div>
                    {selfDevKRAs.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>No self-development areas yet.</p>}
                    {activeDimension === 'selfDevelopment' && isListView && selfDevKRAs.map((kra, i) => (
                        <div
                            key={`self-list-${i}`}
                            style={listCardStyle}
                            onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, selfDevelopment: i }))}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{kra.areaOfConcern || `Area ${i + 1}`}</div>
                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                        {getLatestScoreSnapshot(kra)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', color: '#FF9800', fontWeight: 700 }}>›</div>
                            </div>
                        </div>
                    ))}
                    {(activeDimension !== 'selfDevelopment' || isDetailView) && selfDevKRAs
                        .map((_, idx) => idx)
                        .filter((idx) => activeDimension !== 'selfDevelopment' || idx === selectedDetailIndex.selfDevelopment)
                        .map((i) => {
                            const kra = selfDevKRAs[i];
                            return (
                        <div key={i} style={kraCardStyle}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        style={{ ...inputStyle, marginBottom: '8px' }}
                                        placeholder="Area of concern (e.g., Time management)"
                                        value={kra.areaOfConcern}
                                        onChange={(e) => {
                                            const copy = [...selfDevKRAs];
                                            copy[i].areaOfConcern = e.target.value;
                                            setSelfDevKRAs(copy);
                                        }}
                                    />
                                    <input
                                        style={inputStyle}
                                        placeholder="Action plan / initiative (optional)"
                                        value={kra.actionPlanInitiative}
                                        onChange={(e) => {
                                            const copy = [...selfDevKRAs];
                                            copy[i].actionPlanInitiative = e.target.value;
                                            setSelfDevKRAs(copy);
                                        }}
                                    />
                                </div>
                                <button style={removeBtnStyle} onClick={() => removeSelfDevKRA(i)}>✕</button>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', display: 'grid', gap: '4px' }}>
                                <span>Pilot: {kra.pilotScore ?? '-'} | Reason: {kra.pilotReason || '-'}</span>
                                <span>R1: {kra.r1Score ?? '-'} | R2: {kra.r2Score ?? '-'} | R3: {kra.r3Score ?? '-'} | R4: {kra.r4Score ?? '-'}</span>
                                <span>Latest notes: {kra.r4Reason || kra.r3Reason || kra.r2Reason || kra.r1Reason || 'No review notes yet'}</span>
                            </div>
                        </div>
                            );
                        })}
                </div>
            )}

            {shouldShowDimension('developingOthers') && isDimensionOpen('developingOthers') && (
                <div style={{ padding: '1.5rem', border: '1px solid #e0e0e0', borderRadius: '12px', borderLeft: '4px solid #9C27B0', backgroundColor: '#fafafa', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>🟣 Developing Others</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {activeDimension === 'developingOthers' && isDetailView && (
                                <button
                                    style={{ ...addBtnStyle, backgroundColor: '#607D8B' }}
                                    onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, developingOthers: null }))}
                                >
                                    ← Back to List
                                </button>
                            )}
                            <button style={saveDimensionBtnStyle} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Developing Others'}
                            </button>
                            <button style={{ ...addBtnStyle, backgroundColor: '#9C27B0' }} onClick={addDevOthersKRA}>+ Add Person</button>
                        </div>
                    </div>
                    {devOthersKRAs.length === 0 && <p style={{ color: '#999', fontSize: '14px' }}>No developing others entries yet.</p>}
                    {activeDimension === 'developingOthers' && isListView && devOthersKRAs.map((kra, i) => (
                        <div
                            key={`dev-list-${i}`}
                            style={listCardStyle}
                            onClick={() => setSelectedDetailIndex((curr) => ({ ...curr, developingOthers: i }))}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#1f2937' }}>{kra.person || `Person ${i + 1}`}</div>
                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#6b7280' }}>
                                        {(kra.areaOfDevelopment || 'No development area')} | {getLatestScoreSnapshot(kra)}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', color: '#9C27B0', fontWeight: 700 }}>›</div>
                            </div>
                        </div>
                    ))}
                    {(activeDimension !== 'developingOthers' || isDetailView) && devOthersKRAs
                        .map((_, idx) => idx)
                        .filter((idx) => activeDimension !== 'developingOthers' || idx === selectedDetailIndex.developingOthers)
                        .map((i) => {
                            const kra = devOthersKRAs[i];
                            return (
                        <div key={i} style={kraCardStyle}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        style={{ ...inputStyle, marginBottom: '8px' }}
                                        placeholder="Person name"
                                        value={kra.person}
                                        onChange={(e) => {
                                            const copy = [...devOthersKRAs];
                                            copy[i].person = e.target.value;
                                            setDevOthersKRAs(copy);
                                        }}
                                    />
                                    <input
                                        style={inputStyle}
                                        placeholder="Area of development (optional)"
                                        value={kra.areaOfDevelopment}
                                        onChange={(e) => {
                                            const copy = [...devOthersKRAs];
                                            copy[i].areaOfDevelopment = e.target.value;
                                            setDevOthersKRAs(copy);
                                        }}
                                    />
                                </div>
                                <button style={removeBtnStyle} onClick={() => removeDevOthersKRA(i)}>✕</button>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', display: 'grid', gap: '4px' }}>
                                <span>Pilot: {kra.pilotScore ?? '-'} | Reason: {kra.pilotReason || '-'}</span>
                                <span>R1: {kra.r1Score ?? '-'} | R2: {kra.r2Score ?? '-'} | R3: {kra.r3Score ?? '-'} | R4: {kra.r4Score ?? '-'}</span>
                                <span>Latest notes: {kra.r4Reason || kra.r3Reason || kra.r2Reason || kra.r1Reason || 'No review notes yet'}</span>
                            </div>
                        </div>
                            );
                        })}
                </div>
            )}

            {/* Bottom Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '12px 32px',
                        backgroundColor: saving ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '15px',
                        fontWeight: 700,
                    }}
                >
                    {saving ? 'Saving...' : '💾 Save All'}
                </button>
            </div>
        </div>
    );
}
