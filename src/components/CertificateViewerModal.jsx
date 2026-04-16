import React from 'react';
import { Download, X } from 'lucide-react';

export default function CertificateViewerModal({ isOpen, onClose, certificate }) {
    if (!isOpen || !certificate) return null;

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const fullUrl = certificate?.file ? (certificate.file.startsWith('http') ? certificate.file : `${API_BASE}${certificate.file}`) : '';

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600 }}>{certificate.title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Document Viewer Body */}
                <div style={{ padding: '24px', backgroundColor: 'var(--bg-body)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', maxHeight: '60vh', overflowY: 'auto' }}>
                    {/* If it's an image, render an img tag. If PDF, use an iframe or embed. Assuming Google Docs Viewer or direct iframe for simplicity based on URL */}
                    {certificate.file ? (
                        certificate.file.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                            <img src={fullUrl} alt={certificate.title} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        ) : (
                            <iframe src={fullUrl} title={certificate.title} width="100%" height="500px" style={{ border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                        )
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>No document attached.</div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-card)' }}>
                    <button onClick={onClose} className="btn btn--secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>
                        Close
                    </button>
                    {certificate.file && (
                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary" style={{ padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                            <Download size={16} /> Download
                        </a>
                    )}
                </div>

            </div>
        </div>
    );
}
