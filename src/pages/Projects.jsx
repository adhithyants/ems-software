import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, teamsAPI } from '../api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAllProjects, useAllUsers } from '../hooks/useSharedData';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, Filter, ArrowRight, FolderOpen, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const STATUS_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'DONE'];

export default function Projects() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const { data: projects = [], isLoading: projectsLoading } = useAllProjects();
    const { data: allUsers = [] } = useAllUsers();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showStatus, setShowStatus] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [newProject, setNewProject] = useState({ name: '', description: '', tech_lead_id: '', program_stack: '', documents: null });
    const [newStatus, setNewStatus] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [tlDropdownOpen, setTlDropdownOpen] = useState(false);
    const [tlSearch, setTlSearch] = useState('');
    const tlDropdownRef = useRef(null);

    // Close TL dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (tlDropdownRef.current && !tlDropdownRef.current.contains(e.target)) {
                setTlDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Silently refresh user.id from /me if the localStorage session is stale (pre-id era)

    // Silently refresh user.id from /me if the localStorage session is stale (pre-id era)
    useEffect(() => {
        if (!user?.id) refreshUser();
    }, []);


    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);
        try {
            const formData = new FormData();
            formData.append('name', newProject.name);
            formData.append('description', newProject.description);
            formData.append('tech_lead_id', newProject.tech_lead_id);
            if (newProject.program_stack) formData.append('program_stack', newProject.program_stack);
            if (newProject.documents) {
                Array.from(newProject.documents).forEach(file => formData.append('documents', file));
            }
            await projectsAPI.create(formData);
            queryClient.invalidateQueries(['projects']);
            setShowCreate(false);
            setNewProject({ name: '', description: '', tech_lead_id: '', program_stack: '', documents: null });
            setSuccess('Project created successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create project.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setIsUpdating(true);
        try {
            await projectsAPI.updateStatus(showStatus.id, { status: newStatus });
            queryClient.invalidateQueries(['projects']);
            setShowStatus(null);
            setNewStatus('');
            setSuccess('Status updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update status.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        try {
            await projectsAPI.delete(selectedProject.id);
            queryClient.invalidateQueries(['projects']);
            setConfirmDelete(false);
            setSelectedProject(null);
            setSuccess('Project deleted successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete project.');
            setConfirmDelete(false);
        }
    };

    const filtered = projects.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    if (projectsLoading) {
        return (
            <div className="page" style={{ paddingTop: '2rem' }}>
                <div className="cards-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page__header">
                <h2>Projects</h2>
                {user?.role === 'PM' && (
                    <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} /> Create Project
                    </button>
                )}
            </div>

            {success && <div className="alert alert--success">{success}</div>}

            <div className="filters-row">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            <div className="cards-grid">
                {filtered.map((project) => (
                    <div
                        key={project.id}
                        className="project-card"
                        onClick={(e) => {
                            // Prevent triggering if clicked internally on a button
                            if (e.target.closest('.action-btns') || e.target.tagName.toLowerCase() === 'button') return;
                            navigate(`/projects/${project.id}`);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="project-card__header">
                            <FolderKanban size={20} />
                            <h3>{project.name}</h3>
                            {project.my_role && (
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: project.my_role === 'TL' ? 'var(--color-primary-bg)' : 'var(--bg-body)',
                                    color: project.my_role === 'TL' ? 'var(--color-primary)' : 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {project.my_role}
                                </span>
                            )}
                        </div>
                        <p className="project-card__desc">{project.description}</p>



                        <div className="project-card__meta">
                            <div>
                                <span className="text-muted">Team</span>
                                <span className="fw-500">{project.team?.name || 'None'}</span>
                            </div>
                            <div>
                                <span className="text-muted">Status</span>
                                <StatusBadge value={project.status} />
                            </div>
                        </div>
                        {user?.role === 'PM' && (
                            <div className="project-card__actions">
                                <button
                                    className="btn btn--outline btn--sm"
                                    onClick={() => { setShowStatus(project.id); setNewStatus(project.status); }}
                                >
                                    Update Status
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="empty-state">
                        <FolderKanban size={48} />
                        {user?.role === 'PM' ? (
                            <>
                                <p style={{ fontWeight: 600, marginBottom: '4px' }}>No projects yet</p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    You haven't created any projects for <strong>{user.organization_name || 'your organization'}</strong> yet.
                                </p>
                            </>
                        ) : (
                            <p>No projects have been assigned to you yet.</p>
                        )}
                    </div>
                )}
            </div>





            {/* Create Project Modal */}
            <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); setNewProject({ name: '', description: '', tech_lead_id: '', program_stack: '', documents: null }); }} title="Create Project" wide>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    {error && <div className="alert alert--danger">{error}</div>}

                    {/* Project Name */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="proj-name">Project Name *</label>
                        <input
                            id="proj-name"
                            type="text"
                            placeholder="e.g. Mobile App Redesign"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="proj-desc">Project Description *</label>
                        <textarea
                            id="proj-desc"
                            placeholder="Describe the project goals, scope, and key deliverables..."
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                            required
                            rows={3}
                        />
                    </div>

                    {/* Program Stack */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="proj-stack">Tech Stack</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="proj-stack"
                                type="text"
                                placeholder="e.g. React, Django, PostgreSQL, Docker"
                                value={newProject.program_stack}
                                onChange={(e) => setNewProject({ ...newProject, program_stack: e.target.value })}
                                style={{ paddingLeft: '2.2rem' }}
                            />
                            <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.95rem' }}>⚙</span>
                        </div>
                        {newProject.program_stack && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                                {newProject.program_stack.split(',').map((tech, i) => tech.trim() && (
                                    <span key={i} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                                        padding: '0.2rem 0.6rem', borderRadius: '999px',
                                        fontSize: '0.78rem', fontWeight: 600
                                    }}>
                                        {tech.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Document Drop Zone */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Project Documents</label>
                        <label
                            htmlFor="proj-docs"
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '0.5rem', padding: '1.5rem 1rem',
                                border: '2px dashed var(--border-color)',
                                borderRadius: 'var(--border-radius-sm)',
                                background: newProject.documents && newProject.documents.length > 0
                                    ? 'var(--color-primary-bg)' : 'var(--bg-input)',
                                cursor: 'pointer', transition: 'all var(--transition)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = newProject.documents && newProject.documents.length > 0 ? 'var(--color-primary)' : 'var(--border-color)'}
                        >
                            <span style={{ fontSize: '1.75rem' }}>☁</span>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    {newProject.documents && newProject.documents.length > 0
                                        ? `${newProject.documents.length} file(s) selected`
                                        : 'Click to upload or drag & drop'}
                                </p>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                    PDF, DOCX, images, videos supported
                                </p>
                            </div>
                            <input
                                id="proj-docs"
                                type="file"
                                multiple
                                onChange={(e) => setNewProject({ ...newProject, documents: e.target.files })}
                                style={{ display: 'none' }}
                            />
                        </label>
                        {newProject.documents && newProject.documents.length > 0 && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {Array.from(newProject.documents).map((file, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.35rem 0.65rem',
                                        background: 'var(--bg-body)', borderRadius: 'var(--border-radius-sm)',
                                        border: '1px solid var(--border-color)', fontSize: '0.82rem'
                                    }}>
                                        <span>📄</span>
                                        <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assign Tech Lead — Custom Dropdown */}
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative' }} ref={tlDropdownRef}>
                        <label>Assign Tech Lead *</label>

                        {/* Trigger button */}
                        {newProject.tech_lead_id ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.6rem 0.85rem',
                                border: '1.5px solid var(--color-primary)',
                                borderRadius: 'var(--border-radius-sm)',
                                background: 'var(--bg-input)',
                                cursor: 'pointer'
                            }} onClick={() => setTlDropdownOpen(o => !o)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                                    }}>
                                        {allUsers.find(u => String(u.id) === String(newProject.tech_lead_id))?.name?.[0]?.toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                        {allUsers.find(u => String(u.id) === String(newProject.tech_lead_id))?.name}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNewProject({ ...newProject, tech_lead_id: '' }); setTlDropdownOpen(false); }}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem 0.3rem', fontSize: '1rem', lineHeight: 1 }}
                                    title="Clear selection"
                                >✕</button>
                            </div>
                        ) : (
                            <div
                                onClick={() => { setTlDropdownOpen(o => !o); setTlSearch(''); }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.65rem 0.85rem',
                                    border: `1.5px solid ${tlDropdownOpen ? 'var(--color-primary)' : 'var(--border-color)'} `,
                                    borderRadius: 'var(--border-radius-sm)',
                                    background: 'var(--bg-input)', cursor: 'pointer',
                                    transition: 'all var(--transition)',
                                    boxShadow: tlDropdownOpen ? '0 0 0 3px var(--color-primary-bg)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>— Select a Tech Lead —</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: tlDropdownOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                            </div>
                        )}

                        {/* Dropdown panel */}
                        {tlDropdownOpen && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-md)',
                                border: '1px solid var(--border-color)',
                                zIndex: 100,
                                overflow: 'hidden',
                            }}>
                                {/* Search inside dropdown */}
                                <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search by name..."
                                        value={tlSearch}
                                        onChange={e => setTlSearch(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            width: '100%', border: '1.5px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius-sm)', padding: '0.45rem 0.7rem',
                                            fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)'
                                        }}
                                    />
                                </div>

                                {/* User list */}
                                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                    {allUsers
                                        .filter(u => u.name.toLowerCase().includes(tlSearch.toLowerCase()) || u.email?.toLowerCase().includes(tlSearch.toLowerCase()))
                                        .map(u => {
                                            const roleColors = {
                                                PM: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)' },
                                                SU: { bg: '#FDF2F8', color: '#DB2777' },
                                                TL: { bg: '#EFF6FF', color: '#2563EB' },
                                                JP: { bg: '#F1F5F9', color: '#475569' },
                                                PD: { bg: '#FFF7ED', color: '#EA580C' },
                                            };
                                            const badge = roleColors[u.role] || { bg: '#F1F5F9', color: '#475569' };
                                            const isSelected = String(newProject.tech_lead_id) === String(u.id);
                                            return (
                                                <div
                                                    key={u.id}
                                                    onClick={() => { setNewProject({ ...newProject, tech_lead_id: u.id }); setTlDropdownOpen(false); }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                                                        padding: '0.75rem 1rem',
                                                        cursor: 'pointer',
                                                        background: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                                                        transition: 'background 0.15s',
                                                        borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                                                    }}
                                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                >
                                                    {/* Avatar */}
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                                    }}>
                                                        {u.name?.[0]?.toUpperCase()}
                                                    </div>
 
                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                                    </div>
 
                                                    {/* Role badge */}
                                                    <span style={{
                                                        padding: '0.1rem 0.45rem', borderRadius: '4px',
                                                        fontSize: '0.62rem', fontWeight: 800,
                                                        background: badge.bg, color: badge.color,
                                                        flexShrink: 0, border: '1px solid currentColor', opacity: 0.8
                                                    }}>{u.role}</span>
                                                </div>
                                            );
                                        })}
                                    {allUsers.filter(u => u.name.toLowerCase().includes(tlSearch.toLowerCase())).length === 0 && (
                                        <EmptyState
                                            icon={FolderOpen}
                                            title="No projects found"
                                            subtitle="No projects match your search or filters."
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Hidden required input for form validation */}
                        <input type="text" required value={newProject.tech_lead_id} onChange={() => { }} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} />

                        {allUsers.length === 0 && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                No assignable users found. Invite users and assign roles first.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="modal__actions" style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" className="btn btn--ghost" onClick={() => { setShowCreate(false); setError(''); }}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={isCreating}>
                            <span>＋</span> {isCreating ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </Modal>


            {/* Update Status Modal */}
            <Modal open={!!showStatus} onClose={() => { setShowStatus(null); setError(''); }} title="Update Project Status">
                <form onSubmit={handleStatusUpdate}>
                    {error && <div className="alert alert--danger">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="proj-status">New Status</label>
                        <select
                            id="proj-status"
                            className="select"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            required
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowStatus(null)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
