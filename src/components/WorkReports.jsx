import { useState, useEffect, useRef } from 'react';
import api, { teamsAPI, authAPI, attendanceAPI } from '../api/api';
import CustomDatePicker from './CustomDatePicker';
import EmptyState from './ui/EmptyState';
import { FileText, Printer, Download, Image as ImageIcon, Trash2, Plus, X, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthenticatedImage from './ui/AuthenticatedImage';
import './WorkReports.css';

// Helper to format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
};

export default function WorkReports() {
    const { user } = useAuth();
    
    // Default to last 5 days
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 4); // 5-day span inclusive
    
    const [startDate, setStartDate] = useState(formatLocalDate(lastWeek));
    const [endDate, setEndDate] = useState(formatLocalDate(today));
    const canSeeOthers = ['SU', 'PM'].includes(user?.role);
    const [userId, setUserId] = useState(canSeeOthers ? '' : (user?.id || ''));
    
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const fileInputRef = useRef(null);

    const isWithinGracePeriod = (dateStr) => {
        if (!dateStr) return false;
        const reportDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        reportDate.setHours(0, 0, 0, 0);
        const diffDays = (today - reportDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 2;
    };

    const handleUploadEvidence = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('date', startDate); // Assumes single day report or start date
            formData.append('caption', ''); // Could add caption prompt here
            
            await attendanceAPI.uploadEvidence(formData);
            generateReport(); // Refresh report to show new image
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Failed to upload evidence');
        } finally {
            setUploading(false);
        }
    };

    const [deletingEvidenceId, setDeletingId] = useState(null);

    const handleDeleteEvidence = async (evidenceId) => {
        setDeletingId(evidenceId);
        try {
            await attendanceAPI.deleteEvidence(evidenceId);
            generateReport(); // Refresh
        } catch (err) {
            console.error(err);
            alert('Failed to delete evidence');
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        if (canSeeOthers) {
            fetchUsers();
        }
    }, [canSeeOthers]);

    const fetchUsers = async () => {
        try {
            const res = await authAPI.getReportEligibleUsers();
            setAllUsers(res.data);
            if (res.data.length > 0 && !userId) {
                setUserId(res.data[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const setToday = () => {
        const t = formatLocalDate(new Date());
        setStartDate(t);
        setEndDate(t);
    };

    const generateReport = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate || startDate
            });
            if (userId && canSeeOthers) {
                params.append('user_id', userId);
            }

            const res = await api.get(`/users/user-work-report?${params.toString()}`);
            setReportData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initialize report data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reports-view">
            {/* ── CONTROLS TAB (Hidden when Printing) ── */}
            <div className="report-controls-card no-print">
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    
                    <div className="form-group" style={{ marginBottom: 0, position: 'relative', zIndex: 50 }}>
                        <label>Report Period</label>
                        <CustomDatePicker 
                            isRange={true}
                            startDate={startDate ? new Date(startDate) : null}
                            endDate={endDate ? new Date(endDate) : null}
                            preferredPlacement="bottom"
                            onChange={([s, e]) => {
                                if (s) setStartDate(formatLocalDate(s));
                                if (e) setEndDate(formatLocalDate(e));
                                else setEndDate(''); // Placeholder for "to ..."
                            }}
                        />
                    </div>

                    {canSeeOthers && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px', position: 'relative', zIndex: 30 }}>
                            <label>Employee</label>
                            <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
                                {allUsers.length === 0 && <option value="">No eligible employees found</option>}
                                <optgroup label="Team Members">
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.email} - {u.role}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', zIndex: 20 }}>
                        <button 
                            className="btn btn--ghost" 
                            onClick={setToday}
                        >
                            Today
                        </button>
                        <button 
                            className="btn btn--primary" 
                            onClick={generateReport}
                            disabled={loading}
                        >
                            {loading ? 'Fetching...' : 'Generate Report'}
                        </button>
                        
                        {reportData && (
                            <button 
                                className="btn btn--secondary" 
                                onClick={() => window.print()}
                            >
                                <Download size={16} /> Save as PDF
                            </button>
                        )}
                    </div>
                </div>
                {error && <div style={{ color: 'var(--color-danger)', marginTop: '12px', fontSize: '0.9rem' }}>{error}</div>}
            </div>

            {/* ── RENDERED REPORT (Visible for Print) ── */}
            {reportData ? (
                <div className="printable-report card" style={{ padding: '40px' }}>
                    
                    {/* A. Global Header */}
                    <div className="report-header">
                        <div className="report-company">{reportData.header.company_name}</div>
                        <h1 className="report-title">Work Activity Report</h1>
                        
                        <div className="report-meta">
                            <div className="meta-block">
                                <span className="meta-label">Employee</span>
                                <span className="meta-value">{reportData.header.employee_name} ({reportData.header.employee_role})</span>
                            </div>
                            <div className="meta-block">
                                <span className="meta-label">Selected Day/Period</span>
                                <span className="meta-value">
                                    {reportData.header.start_date === reportData.header.end_date 
                                        ? reportData.header.start_date 
                                        : `${reportData.header.start_date} to ${reportData.header.end_date}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    <hr className="report-divider" />

                    {/* B. Attendance & Time Log */}
                    <div className="report-section">
                        <h2 className="section-title">Attendance & Time Log</h2>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Total Worked</th>
                                    <th>Break Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.work_clock.length > 0 ? reportData.work_clock.map((log, i) => (
                                    <tr key={i}>
                                        <td>{log.date}</td>
                                        <td>{log.clock_in}</td>
                                        <td>{log.clock_out}</td>
                                        <td style={{ fontWeight: 600 }}>{log.total_worked}</td>
                                        <td style={{ color: '#888' }}>{log.break_time}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>No attendance records for this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="report-section">
                        <h2 className="section-title">Project Activity</h2>
                        {reportData.projects.length > 0 ? reportData.projects.map((proj, i) => (
                            <div key={i} className="project-block-modern">
                                <div className="project-header-modern">
                                    <h3 className="project-name-caps">{proj.project_name}</h3>
                                    <div className="project-tags">
                                        <span className="proj-tag-modern role-tag">ROLE: {proj.user_role.toUpperCase()}</span>
                                        <span className={`proj-tag-modern status-tag ${proj.status.toLowerCase().replace(/\s+/g, '-')}`}>{proj.status.toUpperCase()}</span>
                                    </div>
                                </div>
                                
                                <div className="project-table-wrapper">
                                    <table className="report-table-modern">
                                        <thead>
                                            <tr>
                                                <th>TASK ASSIGNED NAME</th>
                                                <th>ASSIGNED TO</th>
                                                <th>TASK STATUS</th>
                                                {reportData.header.start_date !== reportData.header.end_date && <th>DATE</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proj.detailed_tasks.length > 0 ? proj.detailed_tasks.map((task, j) => (
                                                <tr key={j}>
                                                    <td className="task-name-cell">{task.task_name}</td>
                                                    <td className="assigned-cell">{task.assigned_to}</td>
                                                    <td className="status-cell">
                                                        <span className={`status-text ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    {reportData.header.start_date !== reportData.header.end_date && <td className="date-cell">{task.date}</td>}
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={reportData.header.start_date !== reportData.header.end_date ? 4 : 3} style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                                                        No specific task activity recorded in this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )) : (
                            <p style={{ color: '#888', fontStyle: 'italic' }}>No project activity detected during this period.</p>
                        )}
                    </div>
                    
                    {/* B. Daily Work Evidence (Gallery) */}
                    <div className="report-section">
                        <h2 className="section-title">Daily Work Evidence</h2>
                        <div className="evidence-gallery">
                            <div className="evidence-grid">
                                {reportData.daily_evidence && reportData.daily_evidence.length > 0 ? (
                                    reportData.daily_evidence.map((ev, idx) => (
                                        <div key={ev.id} className="evidence-card">
                                            {String(user?.id) === String(reportData.header.employee_id) && isWithinGracePeriod(startDate) && (
                                                <button 
                                                    className="evidence-delete-btn no-print"
                                                    onClick={() => handleDeleteEvidence(ev.id)}
                                                    title="Remove Evidence"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                            <div className="evidence-img-wrapper" style={{ position: 'relative', cursor: 'default' }}>
                                                {deletingEvidenceId === ev.id && (
                                                    <div style={{
                                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                        background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center', zIndex: 20, borderRadius: '4px'
                                                    }}>
                                                        <div className="spinner-sm" style={{ 
                                                            width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.2)', 
                                                            borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                                                            marginBottom: '8px'
                                                        }} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>Deleting...</span>
                                                    </div>
                                                )}
                                                <AuthenticatedImage url={ev.url} alt={`Evidence ${idx}`} className="evidence-img" />
                                            </div>
                                            {ev.caption && <div className="evidence-caption">{ev.caption}</div>}
                                        </div>
                                    ))
                                ) : (
                                    ! (String(user?.id) === String(reportData.header.employee_id) && startDate === endDate && isWithinGracePeriod(startDate)) && (
                                        <div className="evidence-empty">No visual evidence uploaded for this period.</div>
                                    )
                                )}

                                {/* Upload Trigger (Worker only, Single day, within 48h) */}
                                {String(user?.id) === String(reportData.header.employee_id) && startDate === endDate && isWithinGracePeriod(startDate) && (
                                    <div className="no-print">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            style={{ display: 'none' }} 
                                            accept="image/*"
                                            onChange={handleUploadEvidence}
                                        />
                                        <div 
                                            className="upload-placeholder"
                                            onClick={() => !uploading && fileInputRef.current.click()}
                                            style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.8 : 1 }}
                                        >
                                            {uploading ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                    <div className="spinner-sm" style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        border: '3px solid rgba(var(--color-primary-rgb), 0.2)', 
                                                        borderTopColor: 'var(--color-primary)', 
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>Uploading Evidence...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud size={24} color="var(--color-primary)" />
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{reportData.daily_evidence?.length > 0 ? 'Add More Evidence' : 'Upload Work Evidence'}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Screenshots, diagrams, results...</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* D. Summary Footer */}
                    <div className="report-footer-summary" style={{ marginTop: '32px' }}>
                        <div className="summary-item">
                            <div className="sum-val">{reportData.summary.total_projects_touched}</div>
                            <div className="sum-label">Projects Touched</div>
                        </div>
                        <div className="summary-item">
                            <div className="sum-val">{reportData.summary.total_tasks_closed}</div>
                            <div className="sum-label">Tasks Closed</div>
                        </div>
                        <div className="summary-item">
                            <div className="sum-val">{reportData.summary.total_evidence_uploads || 0}</div>
                            <div className="sum-label">Work Evidence Uploads</div>
                        </div>
                    </div>

                </div>
            ) : (
                <EmptyState 
                    icon={FileText} 
                    title="Work Report ready to generate" 
                    subtitle="Select an employee and date range, then click Generate to view their report." 
                />
            )}
        </div>
    );
}
