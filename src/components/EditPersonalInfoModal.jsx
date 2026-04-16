import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone } from 'lucide-react';
import { authAPI } from '../api/api';

export default function EditPersonalInfoModal({ isOpen, onClose, currentProfile, onUpdate }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && currentProfile) {
            setFormData({
                name: currentProfile.name || '',
                email: currentProfile.email || '',
                phone_number: currentProfile.phone_number || ''
            });
            setError('');
        }
    }, [isOpen, currentProfile]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // we only patch the mutable fields
            const dataToUpdate = {
                name: formData.name,
                phone_number: formData.phone_number || null
            };
            await authAPI.updateProfile(dataToUpdate);
            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update personal information');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.95rem'
    };

    const labelStyle = {
        display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'
    };

    const iconStyle = {
        position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)'
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Edit Personal Information</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '8px' }}>{error}</div>}

                    {/* Name */}
                    <div>
                        <label style={labelStyle}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={iconStyle} />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                        <label style={labelStyle}>Email Address (Cannot be changed)</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={iconStyle} />
                            <input
                                type="email"
                                value={formData.email}
                                style={{ ...inputStyle, backgroundColor: 'var(--bg-body)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                                disabled
                            />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label style={labelStyle}>Phone Number</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={iconStyle} />
                            <input
                                type="tel"
                                value={formData.phone_number}
                                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                placeholder="+1 (555) 000-0000"
                                style={inputStyle}
                            />
                        </div>
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
