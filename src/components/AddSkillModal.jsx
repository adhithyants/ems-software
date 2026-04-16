import React, { useState } from 'react';
import { X } from 'lucide-react';
import { authAPI } from '../api/api';

export default function AddSkillModal({ isOpen, onClose, onUpdate }) {
    const [skillForm, setSkillForm] = useState({ name: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAddSkill = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await authAPI.addSkill(skillForm);
            setSkillForm({ name: '' });
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add skill.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input)' };
    const labelStyle = { display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Add Skill</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleAddSkill} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem' }}>{error}</div>}

                    <div>
                        <label style={labelStyle}>Skill Name (e.g. React, Docker)</label>
                        <input type="text" value={skillForm.name} onChange={e => setSkillForm({ ...skillForm, name: e.target.value })} required style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} className="btn btn--secondary" style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn--primary" style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 600 }}>{loading ? 'Adding...' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
