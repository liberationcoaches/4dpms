import { useState, useEffect } from 'react';

interface Weights {
    functional: number;
    organizational: number;
    selfDevelopment: number;
    developingOthers: number;
}

interface DimensionWeightsEditorProps {
    userId: string;
}

export default function DimensionWeightsEditor({ userId }: DimensionWeightsEditorProps) {
    const [weights, setWeights] = useState<Weights>({
        functional: 40,
        organizational: 25,
        selfDevelopment: 20,
        developingOthers: 15,
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/employee/dimension-weights?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    setWeights({
                        functional: data.data.functional ?? 40,
                        organizational: data.data.organizational ?? 25,
                        selfDevelopment: data.data.selfDevelopment ?? 20,
                        developingOthers: data.data.developingOthers ?? 15,
                    });
                }
            } catch (err) {
                console.error('Failed to load dimension weights:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const total = weights.functional + weights.organizational + weights.selfDevelopment + weights.developingOthers;
    const isValid = Math.abs(total - 100) < 0.01;

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/employee/dimension-weights?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(weights),
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setMessage({ text: 'Dimension weights saved!', type: 'success' });
            } else {
                setMessage({ text: data.message || 'Failed to save weights', type: 'error' });
            }
        } catch {
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const updateWeight = (key: keyof Weights, value: number) => {
        const snapped = Math.round(value / 5) * 5;
        setWeights(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, snapped)) }));
        setMessage(null);
    };

    if (loading) return <div style={{ padding: '1rem', color: '#999' }}>Loading weights...</div>;

    const dimensions = [
        { key: 'functional' as const, label: 'Functional', color: '#2196F3', emoji: '🔵' },
        { key: 'organizational' as const, label: 'Organizational', color: '#4CAF50', emoji: '🟢' },
        { key: 'selfDevelopment' as const, label: 'Self Development', color: '#FF9800', emoji: '🟠' },
        { key: 'developingOthers' as const, label: 'Developing Others', color: '#9C27B0', emoji: '🟣' },
    ];

    return (
        <div style={{
            padding: '1.5rem',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            backgroundColor: '#fafafa',
        }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '18px' }}>Dimension Weights</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#666', fontSize: '14px' }}>
                Set how much each dimension contributes to the overall 4D Performance Index. Must total 100%.
            </p>

            {message && (
                <div style={{
                    padding: '10px 14px',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                    color: message.type === 'success' ? '#2E7D32' : '#C62828',
                    fontSize: '14px',
                }}>
                    {message.text}
                </div>
            )}

            {dimensions.map((dim) => (
                <div key={dim.key} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontWeight: 600, fontSize: '14px' }}>
                            {dim.emoji} {dim.label}
                        </label>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: dim.color }}>
                            {weights[dim.key]}%
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={weights[dim.key]}
                            onChange={(e) => updateWeight(dim.key, Number(e.target.value))}
                            style={{
                                flex: 1,
                                height: '6px',
                                accentColor: dim.color,
                                cursor: 'pointer',
                            }}
                        />
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={weights[dim.key]}
                            onChange={(e) => updateWeight(dim.key, Number(e.target.value) || 0)}
                            style={{
                                width: '60px',
                                padding: '6px 8px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px',
                                textAlign: 'center',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>
                </div>
            ))}

            {/* Total indicator */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: isValid ? '#E8F5E9' : '#FFEBEE',
                marginBottom: '1rem',
            }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Total</span>
                <span style={{
                    fontWeight: 700,
                    fontSize: '16px',
                    color: isValid ? '#2E7D32' : '#C62828',
                }}>
                    {total}% {isValid ? '✓' : `(must be 100%)`}
                </span>
            </div>

            <button
                onClick={handleSave}
                disabled={saving || !isValid}
                style={{
                    padding: '10px 24px',
                    backgroundColor: (saving || !isValid) ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (saving || !isValid) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    width: '100%',
                }}
            >
                {saving ? 'Saving...' : 'Save Weights'}
            </button>
        </div>
    );
}
