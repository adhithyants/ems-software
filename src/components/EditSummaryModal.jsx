import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { authAPI } from '../api/api';

export default function EditSummaryModal({ isOpen, onClose, currentProfile, onUpdate }) {
    const [bio, setBio] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && currentProfile) {
            setBio(currentProfile.bio || '');
            setError('');
        }
    }, [isOpen, currentProfile]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authAPI.updateProfile({ bio });
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update professional summary');
        } finally {
            setLoading(false);
        }
    };

    const textareaStyle = {
        width: '100%',
        minHeight: '150px',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        fontSize: '0.95rem',
        resize: 'vertical',
        lineHeight: '1.6'
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '600px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Edit Professional Summary</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '8px' }}>{error}</div>}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Bio / Mission Statement
                        </label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            style={textareaStyle}
                            placeholder="Write a brief summary of your professional background, goals, and expertise..."
                        />
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <button type="button" onClick={onClose} className="btn btn--secondary" style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 600 }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn btn--primary" style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 600 }}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
