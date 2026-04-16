import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { authAPI } from '../api/api';
import CustomDatePicker from './CustomDatePicker';

export default function AddExperienceModal({ isOpen, onClose, onUpdate }) {
    const [expForm, setExpForm] = useState({ title: '', company: '', start_date: '', end_date: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAddExp = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const payload = {
                title: expForm.title,
                company: expForm.company,
                start_date: expForm.start_date,
                end_date: expForm.end_date || null,
                description: expForm.description || null
            };
            await authAPI.addExperience(payload);
            setExpForm({ title: '', company: '', start_date: '', end_date: '', description: '' });
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add experience.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.95rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-input)' };
    const labelStyle = { display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Add Experience</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleAddExp} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem' }}>{error}</div>}

                    <div>
                        <label style={labelStyle}>Job Title</label>
                        <input type="text" value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Company</label>
                        <input type="text" value={expForm.company} onChange={e => setExpForm({ ...expForm, company: e.target.value })} required style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Start Date</label>
                            <CustomDatePicker
                                selected={expForm.start_date ? new Date(expForm.start_date) : null}
                                onChange={date => setExpForm({ ...expForm, start_date: date ? date.toISOString().split('T')[0] : '' })}
                                placeholderText="Start Date"
                                preferredPlacement="right"
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>End Date (Optional)</label>
                            <CustomDatePicker
                                selected={expForm.end_date ? new Date(expForm.end_date) : null}
                                onChange={date => setExpForm({ ...expForm, end_date: date ? date.toISOString().split('T')[0] : '' })}
                                placeholderText="Current"
                                preferredPlacement="left"
                            />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Description / Responsibilities (Optional)</label>
                        <textarea rows={4} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
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
