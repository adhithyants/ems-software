import React, { useState } from 'react';
import { X } from 'lucide-react';
import { authAPI } from '../api/api';
import CustomDatePicker from './CustomDatePicker';

export default function AddCertificationModal({ isOpen, onClose, onUpdate }) {
    const [certForm, setCertForm] = useState({ title: '', issue_date: '', file: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAddCert = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const formData = new FormData();
            formData.append('title', certForm.title);
            formData.append('issue_date', certForm.issue_date);
            if (certForm.file) {
                formData.append('file', certForm.file);
            }

            await authAPI.addCertification(formData);
            setCertForm({ title: '', issue_date: '', file: null });

            // Reset file input physically
            const fileInput = document.getElementById('cert-single-file-upload');
            if (fileInput) fileInput.value = '';

            onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add certification.');
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
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Add Certification</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleAddCert} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.9rem' }}>{error}</div>}

                    <div>
                        <label style={labelStyle}>Certificate Title</label>
                        <input type="text" value={certForm.title} onChange={e => setCertForm({ ...certForm, title: e.target.value })} required style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Issue Date</label>
                        <CustomDatePicker
                            selected={certForm.issue_date ? new Date(certForm.issue_date) : null}
                            onChange={date => setCertForm({ ...certForm, issue_date: date ? date.toISOString().split('T')[0] : '' })}
                            placeholderText="Issue Date"
                            preferredPlacement="right"
                            required
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Upload Document (PDF / Image)</label>
                        <input
                            id="cert-single-file-upload"
                            type="file"
                            accept=".pdf,image/*"
                            onChange={e => setCertForm({ ...certForm, file: e.target.files[0] })}
                            style={inputStyle}
                        />
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
