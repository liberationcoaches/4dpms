import { useState, useEffect, FormEvent } from 'react';

interface ProfileData {
    name: string;
    email: string;
    mobile: string;
    designation: string;
    aboutMe: string;
    educationalQualification: string;
    skills: string[];
    clientele: string[];
    languages: string[];
}

interface ProfileEditorProps {
    userId: string;
    onProfileUpdate?: (profile: ProfileData) => void;
}

export default function ProfileEditor({ userId, onProfileUpdate }: ProfileEditorProps) {
    const [profile, setProfile] = useState<ProfileData>({
        name: '',
        email: '',
        mobile: '',
        designation: '',
        aboutMe: '',
        educationalQualification: '',
        skills: [],
        clientele: [],
        languages: [],
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});

    // Chip input states
    const [skillInput, setSkillInput] = useState('');
    const [clientInput, setClientInput] = useState('');
    const [langInput, setLangInput] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/user/profile?userId=${userId}`);
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    setProfile({
                        name: data.data.name || '',
                        email: data.data.email || '',
                        mobile: data.data.mobile || '',
                        designation: data.data.designation || '',
                        aboutMe: data.data.aboutMe || '',
                        educationalQualification: data.data.educationalQualification || '',
                        skills: data.data.skills || [],
                        clientele: data.data.clientele || [],
                        languages: data.data.languages || [],
                    });
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof ProfileData, string>> = {};
        if (!profile.name.trim()) newErrors.name = 'Name is required';
        if (!profile.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) newErrors.email = 'Invalid email';
        if (!profile.mobile.trim()) newErrors.mobile = 'Mobile is required';
        else if (!/^[0-9]{10}$/.test(profile.mobile)) newErrors.mobile = '10 digits required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/user/profile?userId=${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setMessage({ text: 'Profile saved!', type: 'success' });
                onProfileUpdate?.(profile);
            } else {
                setMessage({ text: data.message || 'Failed to save', type: 'error' });
            }
        } catch {
            setMessage({ text: 'Network error', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const addChip = (field: 'skills' | 'clientele' | 'languages', value: string, setter: (v: string) => void) => {
        const trimmed = value.trim();
        if (trimmed && !profile[field].includes(trimmed)) {
            setProfile(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
        }
        setter('');
    };

    const removeChip = (field: 'skills' | 'clientele' | 'languages', index: number) => {
        setProfile(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };

    const handleChipKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        field: 'skills' | 'clientele' | 'languages',
        value: string,
        setter: (v: string) => void,
    ) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip(field, value, setter);
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: '#999' }}>Loading profile...</div>;

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        fontSize: '14px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        outline: 'none',
    };

    const errorInputStyle: React.CSSProperties = {
        ...inputStyle,
        borderColor: '#ef5350',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#555',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: '1.5rem',
    };

    const chipContainerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
    };

    const chipStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#f0f4ff',
        border: '1px solid #d0daf0',
        borderRadius: '20px',
        fontSize: '13px',
        color: '#333',
    };

    const chipRemoveStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#999',
        padding: '0',
        lineHeight: 1,
    };

    const initials = profile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Profile Header Card */}
            <div style={{
                background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
                color: 'white',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        fontWeight: 700,
                        border: '3px solid rgba(255,255,255,0.5)',
                        flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 700 }}>
                            {profile.name || 'Your Name'}
                        </h2>
                        {profile.designation && (
                            <p style={{ margin: '0 0 8px', fontSize: '15px', opacity: 0.9 }}>
                                {profile.designation}
                            </p>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', opacity: 0.85 }}>
                            <span>📱 {profile.mobile || '—'}</span>
                            <span>✉️ {profile.email || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '1.5rem',
                    borderRadius: '10px',
                    backgroundColor: message.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                    color: message.type === 'success' ? '#2E7D32' : '#C62828',
                    fontSize: '14px',
                    fontWeight: 500,
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Basic Info */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>Basic Information</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Name *</label>
                            <input
                                style={errors.name ? errorInputStyle : inputStyle}
                                value={profile.name}
                                onChange={(e) => { setProfile(p => ({ ...p, name: e.target.value })); setErrors(e2 => ({ ...e2, name: undefined })); }}
                                placeholder="Full name"
                            />
                            {errors.name && <span style={{ fontSize: '12px', color: '#ef5350', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Designation</label>
                            <input
                                style={inputStyle}
                                value={profile.designation}
                                onChange={(e) => setProfile(p => ({ ...p, designation: e.target.value }))}
                                placeholder="e.g. Trainer | Project Architect"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Email *</label>
                            <input
                                type="email"
                                style={errors.email ? errorInputStyle : inputStyle}
                                value={profile.email}
                                onChange={(e) => { setProfile(p => ({ ...p, email: e.target.value })); setErrors(e2 => ({ ...e2, email: undefined })); }}
                                placeholder="you@example.com"
                            />
                            {errors.email && <span style={{ fontSize: '12px', color: '#ef5350', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>Mobile *</label>
                            <input
                                type="tel"
                                style={errors.mobile ? errorInputStyle : inputStyle}
                                value={profile.mobile}
                                onChange={(e) => { setProfile(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors(e2 => ({ ...e2, mobile: undefined })); }}
                                placeholder="10 digit number"
                                maxLength={10}
                            />
                            {errors.mobile && <span style={{ fontSize: '12px', color: '#ef5350', marginTop: '4px', display: 'block' }}>{errors.mobile}</span>}
                        </div>
                    </div>
                </div>

                {/* About Me */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>About Me</h3>
                    <textarea
                        style={{
                            ...inputStyle,
                            minHeight: '100px',
                            resize: 'vertical',
                        }}
                        value={profile.aboutMe}
                        onChange={(e) => setProfile(p => ({ ...p, aboutMe: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        maxLength={1000}
                    />
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        {profile.aboutMe.length}/1000
                    </div>
                </div>

                {/* Educational Qualification */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>Educational Qualification</h3>
                    <input
                        style={inputStyle}
                        value={profile.educationalQualification}
                        onChange={(e) => setProfile(p => ({ ...p, educationalQualification: e.target.value }))}
                        placeholder="e.g. MBA, B.Com"
                    />
                </div>

                {/* Skills */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>Skills</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={(e) => handleChipKeyDown(e, 'skills', skillInput, setSkillInput)}
                            placeholder="Type a skill and press Enter"
                        />
                        <button
                            type="button"
                            onClick={() => addChip('skills', skillInput, setSkillInput)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            + Add
                        </button>
                    </div>
                    {profile.skills.length > 0 && (
                        <div style={chipContainerStyle}>
                            {profile.skills.map((skill, i) => (
                                <span key={i} style={chipStyle}>
                                    {skill}
                                    <button type="button" style={chipRemoveStyle} onClick={() => removeChip('skills', i)}>✕</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clientele */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>Clientele</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={clientInput}
                            onChange={(e) => setClientInput(e.target.value)}
                            onKeyDown={(e) => handleChipKeyDown(e, 'clientele', clientInput, setClientInput)}
                            placeholder="Type a client name and press Enter"
                        />
                        <button
                            type="button"
                            onClick={() => addChip('clientele', clientInput, setClientInput)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            + Add
                        </button>
                    </div>
                    {profile.clientele.length > 0 && (
                        <div style={chipContainerStyle}>
                            {profile.clientele.map((client, i) => (
                                <span key={i} style={chipStyle}>
                                    {client}
                                    <button type="button" style={chipRemoveStyle} onClick={() => removeChip('clientele', i)}>✕</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Languages */}
                <div style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    backgroundColor: '#fafafa',
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '16px', color: '#333' }}>Languages</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            value={langInput}
                            onChange={(e) => setLangInput(e.target.value)}
                            onKeyDown={(e) => handleChipKeyDown(e, 'languages', langInput, setLangInput)}
                            placeholder="Type a language and press Enter"
                        />
                        <button
                            type="button"
                            onClick={() => addChip('languages', langInput, setLangInput)}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            + Add
                        </button>
                    </div>
                    {profile.languages.length > 0 && (
                        <div style={chipContainerStyle}>
                            {profile.languages.map((lang, i) => (
                                <span key={i} style={chipStyle}>
                                    {lang}
                                    <button type="button" style={chipRemoveStyle} onClick={() => removeChip('languages', i)}>✕</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: saving ? '#ccc' : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 700,
                        transition: 'opacity 0.2s',
                    }}
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
    );
}
