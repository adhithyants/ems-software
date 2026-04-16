import React, { useState } from 'react';
import { FileText, Trash2, Plus, Upload, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI } from '../../api/api';
import Modal from '../Modal';

export default function WorkspaceDocs({ project }) {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!project) return null;

    const docs = project.documents || [];
    const effectiveRole = user?.role === 'SU' ? 'SU' : project?.my_role;
    const canManage = ['PM', 'TL', 'SU'].includes(effectiveRole);

    const getFileViewUrl = (fileUrl, fileName) => {
        if (!fileUrl) return '#';
        
        // Google Docs Viewer cannot access localhost files.
        // Only use the viewer if the URL looks like a public production URL.
        const isLocal = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1');
        
        const docExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        const isOfficeDoc = docExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
        
        if (isOfficeDoc && !isLocal) {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

    const handleFileChange = (e) => {
        const selected = Array.from(e.target.files);
        setUploadFiles(prev => [...prev, ...selected]);
        e.target.value = null;
    };

    const removeStagedFile = (index) => {
        setUploadFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (uploadFiles.length === 0) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            // We reuse the update endpoint since it handles document additions
            uploadFiles.forEach(file => {
                formData.append('documents', file);
            });
            await projectsAPI.update(project.id, formData);
            setShowUploadModal(false);
            setUploadFiles([]);
            window.location.reload();
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDoc = async () => {
        if (!confirmDeleteDoc) return;
        setIsDeleting(true);
        try {
            await projectsAPI.deleteDocument(project.id, confirmDeleteDoc);
            setConfirmDeleteDoc(null);
            window.location.reload();
        } catch (err) {
            console.error('Delete failed', err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Docs & Files</h3>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Share and organize docs, spreadsheets, and other files.</p>
                </div>
                {canManage && (
                    <button 
                        className="btn btn--primary" 
                        onClick={() => setShowUploadModal(true)}
                        style={{ padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> Add File
                    </button>
                )}
            </div>

            {docs.length === 0 ? (
                <div style={{ 
                    padding: '4rem 2rem', 
                    textAlign: 'center', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '16px' 
                }}>
                    <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No documents added yet</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Start by uploading your first project resource.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {docs.map(doc => (
                        <div
                            key={doc.id}
                            style={{
                                position: 'relative',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2.5rem 1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                borderRadius: '16px', transition: 'all 0.2s ease'
                            }}
                            className="doc-card"
                        >
                            <style>{`
                                .doc-card:hover { transform: translateY(-4px); border-color: var(--color-primary); box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1); }
                                .doc-delete-btn { opacity: 0; transition: all 0.2s ease; }
                                .doc-card:hover .doc-delete-btn { opacity: 1; }
                            `}</style>
                            
                            {canManage && (
                                <button 
                                    className="doc-delete-btn"
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteDoc(doc.id); }}
                                    style={{ 
                                        position: 'absolute', top: '12px', right: '12px', 
                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                                        border: 'none', borderRadius: '8px', padding: '8px', 
                                        cursor: 'pointer', display: 'flex', alignItems: 'center' 
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <a 
                                href={getFileViewUrl(doc.file_url, doc.file_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                            >
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '16px',
                                    background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem'
                                }}>
                                    <FileText size={32} />
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>{doc.file_name || 'Document'}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    View File <span style={{ fontSize: '1rem' }}>↗</span>
                                </span>
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* ── UPLOAD MODAL ── */}
            <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Resources">
                <form onSubmit={handleUploadSubmit}>
                    <label style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '32px', border: '2px dashed var(--border-color)', borderRadius: '16px',
                        cursor: 'pointer', background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s ease',
                        marginBottom: uploadFiles.length > 0 ? '1.5rem' : '1rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(255,122,0,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                    >
                        <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,122,0,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <Upload size={24} />
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Select project files</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Images, PDFs, and Office docs supported</div>
                    </label>

                    {uploadFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                            {uploadFiles.map((file, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,122,0,0.05)', border: '1px solid rgba(255,122,0,0.2)', borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', minWidth: 0 }}>
                                        <FileText size={16} color="var(--color-primary)" />
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeStagedFile(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" className="btn btn--outline" onClick={() => setShowUploadModal(false)} style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={isUploading || uploadFiles.length === 0} style={{ flex: 1 }}>
                            {isUploading ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── DELETE MODAL ── */}
            <Modal open={!!confirmDeleteDoc} onClose={() => setConfirmDeleteDoc(null)} title="">
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Trash2 size={28} />
                    </div>
                    <h3 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Delete Document?</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>This resource will be permanently removed.</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn--outline" onClick={() => setConfirmDeleteDoc(null)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn btn--danger" onClick={handleDeleteDoc} disabled={isDeleting} style={{ flex: 1 }}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
