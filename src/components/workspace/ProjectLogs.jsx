import React, { useState, useEffect, useCallback } from 'react';
import { projectsAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trash2, FileText, Download, Plus, Calendar, User as UserIcon } from 'lucide-react';
import Modal from '../Modal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ProjectLogs({ projectId, project }) {
    const { user } = useAuth();
    const toast = useToast();
    
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Phase 6: Contextual Role Resolution
    const effectiveRole = user?.role === 'SU' ? 'SU' : project?.my_role;
    const isPM = effectiveRole === 'PM';
    const isTL = effectiveRole === 'TL';
    const isSU = effectiveRole === 'SU';
    
    // Management = PM or TL or SU
    const isManagement = isPM || isTL || isSU;
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [logType, setLogType] = useState('Bug Found');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const LOG_CHOICES = ['Bug Found', 'Bug Fixed', 'Requirement Change', 'General Update'];

    const getBadgeColor = (type) => {
        switch(type) {
            case 'Bug Found': return 'var(--color-danger)';
            case 'Bug Fixed': return 'var(--color-success)';
            case 'Requirement Change': return 'var(--color-warning)';
            default: return 'var(--color-primary)';
        }
    };

    const fetchLogs = useCallback(async () => {
        try {
            const res = await projectsAPI.getLogs(projectId);
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleCreateLog = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await projectsAPI.createLog(projectId, { log_type: logType, content });
            setLogs(prev => [res.data, ...prev]);
            setShowModal(false);
            setContent('');
            setLogType('Bug Found');
            toast.success('Log added successfully!');
        } catch (err) {
            toast.error('Failed to create log.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        if (!window.confirm("Are you sure you want to delete this log?")) return;
        try {
            await projectsAPI.deleteLog(projectId, logId);
            setLogs(prev => prev.filter(l => l.id !== logId));
            toast.success('Log deleted.');
        } catch (err) {
            toast.error('Failed to delete log.');
        }
    };

    const downloadCSV = () => {
        if (logs.length === 0) {
            toast.warning('No logs to download.');
            return;
        }

        const headers = ['Date & Time', 'Author', 'Log Type', 'Content'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const date = `"${new Date(log.created_at).toLocaleString()}"`;
            const author = log.author_name;
            const type = log.log_type;
            const content = `"${log.content.replace(/"/g, '""')}"`; // escape quotes for CSV
            csvRows.push([date, author, type, content].join(','));
        });
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `Project_Logs_${project.name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} className="text-secondary" /> Project Logs
                    </h3>
                    <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>Official audit trail of major project events</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(isManagement) && logs.length > 0 && (
                        <button className="btn btn--sm btn--outline" onClick={downloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Download size={14} /> Export CSV
                        </button>
                    )}
                    {isManagement && (
                        <button className="btn btn--sm btn--primary" onClick={() => setShowModal(true)}>
                            <Plus size={14} /> New Log
                        </button>
                    )}
                </div>
            </div>
            
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '10px' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="empty-state min-h-xs" style={{ padding: '2rem' }}>
                        <p>No project logs recorded yet.</p>
                    </div>
                ) : (
                    <div className="log-timeline" style={{ padding: '1rem' }}>
                        {logs.map(log => (
                            <div key={log.id} style={{ 
                                display: 'flex', gap: '1rem', marginBottom: '1.5rem', 
                                borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' 
                            }}>
                                <div style={{ width: '4px', backgroundColor: getBadgeColor(log.log_type), borderRadius: '4px', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <span style={{ 
                                                fontSize: '0.75rem', fontWeight: 600, color: getBadgeColor(log.log_type), 
                                                textTransform: 'uppercase', letterSpacing: '0.5px' 
                                            }}>{log.log_type}</span>
                                        </div>
                                        {isManagement && user.id === log.author && (
                                            <button 
                                                title="Delete Log"
                                                onClick={() => handleDeleteLog(log.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', opacity: 0.5, cursor: 'pointer', padding: 0 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>{log.content}</p>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <UserIcon size={12} /> {log.author_name}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} /> {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Project Log">
                <form onSubmit={handleCreateLog}>
                    <div className="form-group">
                        <label>Log Type</label>
                        <select className="select" value={logType} onChange={(e) => setLogType(e.target.value)}>
                            {LOG_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Details</label>
                        <textarea 
                            className="input" 
                            rows="4" 
                            required 
                            placeholder="Describe what happened..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Add Log'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
