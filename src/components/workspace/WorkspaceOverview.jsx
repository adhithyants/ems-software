import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/api';
import Modal from '../Modal';
import { 
    Book, 
    Users, 
    Trash2, 
    ExternalLink, 
    FileText, 
    Code, 
    ShieldCheck,
    User,
    Edit3
} from 'lucide-react';

export default function WorkspaceOverview({ project }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [githubStats, setGithubStats] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [newDocuments, setNewDocuments] = useState([]);
    const [editData, setEditData] = useState({
        name: project.name,
        description: project.description,
        status: project.status,
        program_stack: project.program_stack || ''
    });

    const removeNewDoc = (index) => {
        setNewDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setNewDocuments(prev => [...prev, ...files]);
        // Reset input so same file can be selected again if removed
        e.target.value = null;
    };

    useEffect(() => {
        setEditData({
            name: project.name,
            description: project.description,
            status: project.status,
            program_stack: project.program_stack || ''
        });
        setNewDocuments([]);
    }, [project]);

    useEffect(() => {
        projectsAPI.getGithubData(project.id)
            .then(res => {
                const repositories = res.data.repositories || [];
                setGithubStats({
                    commits: repositories.reduce((sum, repo) => sum + (repo.commits?.length || 0), 0),
                    prs: repositories.reduce((sum, repo) => sum + (repo.pull_requests?.length || 0), 0),
                });
            })
            .catch(() => setGithubStats(null));
    }, [project.id]);

    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);

    const handleDeleteProject = async () => {
        try {
            await projectsAPI.delete(project.id);
            navigate('/projects');
        } catch (err) {
            console.error('Failed to delete project', err);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('name', editData.name);
            formData.append('description', editData.description);
            formData.append('status', editData.status);
            formData.append('program_stack', editData.program_stack);
            
            if (newDocuments.length > 0) {
                newDocuments.forEach(file => {
                    formData.append('documents', file);
                });
            }

            // Using multipart/form-data for potential file uploads
            await projectsAPI.update(project.id, formData);
            setShowEditModal(false);
            setNewDocuments([]);
            window.location.reload();
        } catch (err) {
            console.error('Failed to update project', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteDoc = (docId) => {
        setConfirmDeleteDoc(docId);
    };

    const finalDeleteDoc = async () => {
        if (!confirmDeleteDoc) return;
        setIsDeletingDoc(true);
        try {
            await projectsAPI.deleteDocument(project.id, confirmDeleteDoc);
            setConfirmDeleteDoc(null);
            window.location.reload();
        } catch (err) {
            console.error('Failed to delete document', err);
        } finally {
            setIsDeletingDoc(false);
        }
    };

    const getFileViewUrl = (fileUrl, fileName) => {
        if (!fileUrl) return '#';
        
        // Google Docs Viewer cannot access localhost files.
        const isLocal = fileUrl.includes('localhost') || fileUrl.includes('127.0.0.1');
        
        const docExtensions = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
        const isOfficeDoc = docExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
        
        if (isOfficeDoc && !isLocal) {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        }
        return fileUrl;
    };

    // Phase 6: Contextual Role Resolution
    const effectiveRole = user?.role === 'SU' ? 'SU' : project?.my_role;

    return (
        <div className="workspace-overview-container" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', color: 'var(--text-primary)' }}>
            <style>
                {`
                    .tech-stack-chip {
                        padding: 6px 14px;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        color: var(--text-secondary);
                        transition: all 0.2s ease;
                        cursor: default;
                    }
                    .tech-stack-chip:hover {
                        background: var(--color-primary-bg);
                        border-color: var(--color-primary);
                        color: var(--color-primary);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(255, 122, 0, 0.1);
                    }

                    .workspace-top-grid {
                        display: grid;
                        grid-template-columns: 1fr 340px;
                        gap: 1.5rem;
                        align-items: stretch;
                    }

                    .workspace-bottom-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1.5rem;
                    }

                    @media (max-width: 1024px) {
                        .workspace-top-grid {
                            grid-template-columns: 1fr;
                        }
                        .workspace-bottom-grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    @media (max-width: 768px) {
                        .workspace-overview-container {
                            padding: 1.25rem !important;
                            gap: 1.5rem !important;
                        }
                        .workspace-header-row {
                            flex-direction: column;
                            align-items: flex-start !important;
                            gap: 1rem;
                        }
                        .workspace-title {
                            font-size: 2rem !important;
                        }
                    }

                    /* Custom Scrollbars for Workspace & Modals */
                    .brief-content::-webkit-scrollbar, 
                    .custom-scrollbar::-webkit-scrollbar,
                    textarea::-webkit-scrollbar {
                        width: 6px;
                    }
                    .brief-content::-webkit-scrollbar-track, 
                    .custom-scrollbar::-webkit-scrollbar-track,
                    textarea::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.02);
                        border-radius: 10px;
                    }
                    .brief-content::-webkit-scrollbar-thumb, 
                    .custom-scrollbar::-webkit-scrollbar-thumb,
                    textarea::-webkit-scrollbar-thumb {
                        background: rgba(255, 122, 0, 0.3);
                        border-radius: 10px;
                        transition: all 0.2s ease;
                    }
                    .brief-content::-webkit-scrollbar-thumb:hover, 
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover,
                    textarea::-webkit-scrollbar-thumb:hover {
                        background: var(--color-primary);
                    }
                `}
            </style>
            
            {/* ── HEADER: Title & Actions ── */}
            <div className="workspace-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                        Project Dashboard
                    </div>
                    <h1 className="workspace-title" style={{ fontSize: '3rem', fontWeight: 800, margin: 0, letterSpacing: '-1px', lineHeight: 1.1 }}>
                        {project.name}
                    </h1>
                </div>
                {['PM', 'TL', 'SU'].includes(effectiveRole) && (
                    <button 
                        className="btn btn--primary" 
                        onClick={() => setShowEditModal(true)}
                        style={{ padding: '10px 24px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Edit3 size={18} /> Edit Project
                    </button>
                )}
            </div>

            {/* ── TOP GRID: Brief & Meta ── */}
            <div className="workspace-top-grid">
                
                {/* 1. Project Brief Card */}
                <div style={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '16px', 
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    position: 'relative'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '16px 0 0 16px', opacity: 0.6 }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem', fontWeight: 700 }}>
                        <Book size={20} className="text-muted" /> Project Brief
                    </div>
                    <div className="brief-content" style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '400px', // Prevent the card from becoming too tall
                        overflowY: 'auto',   // Add internal scrolling
                        paddingRight: '10px' // Space for scrollbar
                    }}>
                        {project.description || 'No project description has been provided yet.'}
                    </div>
                </div>

                {/* 2. Sidebar Stats Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Status Section */}
                    <div style={{ 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '16px', 
                        padding: '1.5rem' 
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                            Status
                        </div>
                        <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '6px 16px', 
                            backgroundColor: 'var(--color-primary)', 
                            color: '#fff', 
                            borderRadius: '20px', 
                            fontSize: '0.85rem', 
                            fontWeight: 700 
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#fff' }} />
                            {project.status || 'Active'}
                        </div>
                    </div>

                    {/* Core Team Section */}
                    <div style={{ 
                        flex: 1,
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '16px', 
                        padding: '1.5rem' 
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
                            Core Team
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Project Manager */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,122,0,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,122,0,0.1)' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.created_by?.name || 'Admin'}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created By</div>
                                </div>
                            </div>
                            
                            {/* Tech Lead */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,122,0,0.1)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,122,0,0.1)' }}>
                                    <Code size={18} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.team?.tech_lead?.name || 'N/A'}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tech Lead</div>
                                </div>
                            </div>

                            {/* Assigned Team */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(255,122,0,0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                                    <Users size={18} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.team?.name || 'General Team'}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Team</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── LOWER GRID: Tech Stack & Resources ── */}
            <div className="workspace-bottom-grid">
                
                {/* Tech Stack Card */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
                        Tech Stack
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {project.program_stack ? project.program_stack.split(',').map((t, idx) => (
                            <div key={idx} className="tech-stack-chip">
                                {t.trim()}
                            </div>
                        )) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No technologies listed.</div>
                        )}
                    </div>
                </div>

                {/* Resources Card */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
                        Resources
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {project.documents && project.documents.length > 0 ? project.documents.map(doc => (
                            <div 
                                key={doc.id}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    padding: '12px 14px', 
                                    background: 'rgba(0,0,0,0.2)', 
                                    borderRadius: '10px', 
                                    border: '1px solid var(--border-color)',
                                    gap: '12px'
                                }}
                            >
                                <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={16} className="text-muted" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Document File</div>
                                </div>
                                <a 
                                    href={getFileViewUrl(doc.file_url, doc.file_name)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
                                >
                                    View
                                </a>
                            </div>
                        )) : (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '12px 14px', 
                                background: 'rgba(0,0,0,0.1)', 
                                borderRadius: '10px', 
                                border: '1px dashed var(--border-color)',
                                gap: '12px',
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem'
                            }}>
                                <FileText size={16} /> No documents uploaded.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── FOOTER: Destructive Actions ── */}
            {['PM', 'SU'].includes(effectiveRole) && (
                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    {confirmDelete ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(239, 68, 68, 0.05)', padding: '12px 20px', borderRadius: '10px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>Permanently delete this project?</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                <button className="btn btn--outline btn--sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                                <button className="btn btn--danger btn--sm" onClick={handleDeleteProject}>Confirm Delete</button>
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setConfirmDelete(true)}
                            className="btn btn--danger btn--outline btn--sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Trash2 size={16} /> Delete Project
                        </button>
                    )}
                </div>
            )}

            {/* ── EDIT PROJECT MODAL ── */}
            <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="" wide>
                <form onSubmit={handleEditSubmit} style={{ color: 'var(--text-primary)' }}>
                    {/* Modal Header */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                            Project Management
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                            Edit Project Details
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Project Name */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Project Name</label>
                            <input 
                                type="text" 
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', width: '100%', fontSize: '0.95rem' }}
                                value={editData.name} 
                                onChange={e => setEditData({...editData, name: e.target.value})} 
                                required 
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Description</label>
                            <textarea 
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', width: '100%', fontSize: '0.95rem', minHeight: '120px', resize: 'vertical' }}
                                value={editData.description} 
                                onChange={e => setEditData({...editData, description: e.target.value})} 
                            />
                        </div>

                        {/* Meta Grid (Status & Stack) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Status</label>
                                <select 
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', width: '100%', fontSize: '0.95rem' }}
                                    value={editData.status} 
                                    onChange={e => setEditData({...editData, status: e.target.value})}
                                >
                                    <option style={{ background: 'var(--bg-card)' }} value="NOT_STARTED">Not Started</option>
                                    <option style={{ background: 'var(--bg-card)' }} value="IN_PROGRESS">In Progress</option>
                                    <option style={{ background: 'var(--bg-card)' }} value="ON_HOLD">On Hold</option>
                                    <option style={{ background: 'var(--bg-card)' }} value="DONE">Done</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Tech Stack</label>
                                <input 
                                    type="text" 
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', color: 'var(--text-primary)', width: '100%', fontSize: '0.95rem' }}
                                    value={editData.program_stack} 
                                    onChange={e => setEditData({...editData, program_stack: e.target.value})}
                                    placeholder="React, Python, AWS..."
                                />
                            </div>
                        </div>
                        
                        {/* Manage Existing Documents */}
                        {project.documents && project.documents.length > 0 && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Manage Existing Documents</label>
                                <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                                    {project.documents.map(doc => (
                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>
                                                    <FileText size={18} className="text-muted" />
                                                </div>
                                                <span style={{ fontWeight: 500, color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleDeleteDoc(doc.id)} 
                                                style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New Document Upload */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', display: 'block' }}>Upload New Resources</label>
                            
                            {/* Styled Upload Button */}
                            <label style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px',
                                border: '2px dashed var(--border-color)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.01)',
                                transition: 'all 0.2s ease',
                                marginBottom: newDocuments.length > 0 ? '16px' : 0
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.background = 'rgba(255,122,0,0.03)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                            }}
                            >
                                <input 
                                    type="file" 
                                    multiple
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                                <div style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(255,122,0,0.1)', 
                                    color: 'var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '12px'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Click to add files</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Support multiple files</div>
                            </label>

                            {/* Staged Files List */}
                            {newDocuments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                        Staged for upload ({newDocuments.length})
                                    </div>
                                    {newDocuments.map((file, idx) => (
                                        <div key={idx} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '10px 14px', 
                                            background: 'rgba(255,122,0,0.04)', 
                                            border: '1px solid rgba(255,122,0,0.2)', 
                                            borderRadius: '10px' 
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                                                <FileText size={16} color="var(--color-primary)" />
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => removeNewDoc(idx)} 
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '2rem', marginTop: '3rem' }}>
                        <button type="button" className="btn btn--ghost" onClick={() => setShowEditModal(false)} style={{ fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn--primary" 
                            disabled={isUpdating}
                            style={{ padding: '12px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── DELETE DOCUMENT CONFIRMATION MODAL ── */}
            <Modal open={!!confirmDeleteDoc} onClose={() => setConfirmDeleteDoc(null)} title="">
                <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                    <div style={{ 
                        width: '60px', 
                        height: '60px', 
                        borderRadius: '50%', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto 1.5rem' 
                    }}>
                        <Trash2 size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Remove Document?</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                        This action cannot be undone. The file will be permanently removed from the project resources.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn btn--outline" onClick={() => setConfirmDeleteDoc(null)} style={{ flex: 1 }}>
                            Cancel
                        </button>
                        <button 
                            className="btn btn--danger" 
                            onClick={finalDeleteDoc} 
                            style={{ flex: 1 }}
                            disabled={isDeletingDoc}
                        >
                            {isDeletingDoc ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
