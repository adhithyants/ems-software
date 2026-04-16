import { useState } from 'react';
import { Users, UserX, AlertTriangle, Clock, Download, Filter, Calendar } from 'lucide-react';
import { useSuMetrics, useAllUsers } from '../hooks/useSharedData';
import { attendanceAPI } from '../api/api';
import Modal from '../components/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';

export default function AdminAttendance() {
    // Default to today's date in YYYY-MM-DD format
    // Always today for Live Dashboard
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate] = useState(todayStr);

    const { data: metrics, isLoading: loading } = useSuMetrics({ date: selectedDate });
    const { data: allUsers = [] } = useAllUsers();

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportParams, setExportParams] = useState({
        exportType: 'excel',
        startDate: todayStr,
        endDate: todayStr,
        userId: ''
    });
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    const handleExport = async (e) => {
        if (e) e.preventDefault();
        setExporting(true);

        const { exportType, startDate, endDate, userId } = exportParams;

        try {
            // Build query params
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            if (userId) params.append('user_id', userId);

            const response = exportType === 'excel'
                ? await attendanceAPI.exportExcel(Object.fromEntries(params.entries()))
                : await attendanceAPI.exportPdf(Object.fromEntries(params.entries()));

            // Determine correct mime type and file extension based on export type
            const mimeType = exportType === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';
            const extension = exportType === 'excel' ? 'xlsx' : 'pdf';
            const filename = `attendance_report_${startDate}_to_${endDate}.${extension}`;

            // Create a blob from the successful response
            const blob = new Blob([response.data], { type: mimeType });

            // Create temporary object URL and link to trigger download visually
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Clean up DOM and URL
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            setShowExportModal(false); // Close modal on success
        } catch (err) {
            console.error(`Failed to export ${exportType}:`, err);
            setError(`Failed to download ${exportType} file. Please check permission or try again later.`);
        } finally {
            setExporting(false);
        }
    };

    if (loading) return (
        <div className="admin-attendance-view" style={{ paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} style={{ height: '100px', borderRadius: '12px' }} />
                ))}
            </div>
            <SkeletonTable rows={6} columns={5} />
        </div>
    );
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="admin-attendance-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0 }}>Live Dashboard</h3>
                    <div style={{
                        backgroundColor: 'var(--color-primary-bg)',
                        color: 'var(--color-primary)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: '1px solid var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Calendar size={14} /> Today: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setShowExportModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} /> Export Report
                    </button>
                </div>
            </div>

            {/* Export Filter Modal */}
            <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export Attendance Report">
                <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Start Date</label>
                            <DatePicker
                                selected={exportParams.startDate ? new Date(exportParams.startDate + 'T00:00:00') : null}
                                onChange={(d) => {
                                    if (!d) return;
                                    const tzOffset = d.getTimezoneOffset() * 60000;
                                    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                                    setExportParams({ ...exportParams, startDate: localISOTime });
                                }}
                                className="form-input custom-datepicker-input"
                                dateFormat="yyyy-MM-dd"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>End Date</label>
                            <DatePicker
                                selected={exportParams.endDate ? new Date(exportParams.endDate + 'T00:00:00') : null}
                                onChange={(d) => {
                                    if (!d) return;
                                    const tzOffset = d.getTimezoneOffset() * 60000;
                                    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                                    setExportParams({ ...exportParams, endDate: localISOTime });
                                }}
                                className="form-input custom-datepicker-input"
                                dateFormat="yyyy-MM-dd"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Specific Employee (Optional)</label>
                        <select
                            className="form-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            value={exportParams.userId}
                            onChange={(e) => setExportParams({ ...exportParams, userId: e.target.value })}
                        >
                            <option value="">All Employees</option>
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.name || user.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="modal__actions" style={{ marginTop: '16px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={exporting}>
                            <Download size={16} /> {exporting ? `Downloading ${exportParams.exportType.toUpperCase()}...` : `Download ${exportParams.exportType.toUpperCase()}`}
                        </button>
                    </div>
                </form>
            </Modal>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <MetricCard
                    title="Active Now"
                    value={metrics?.currently_active}
                    icon={Users}
                    color="#34a853"
                />
                <MetricCard
                    title="Network Issues"
                    value={metrics?.invalid_network}
                    icon={AlertTriangle}
                    color="#fbbc05"
                />
                <MetricCard
                    title="Inactive Today"
                    value={metrics?.currently_inactive}
                    icon={UserX}
                    color="#ea4335"
                />
                <MetricCard
                    title="Late Logins"
                    value={metrics?.late_logins}
                    icon={Clock}
                    color="#ff6d01"
                />
                <MetricCard
                    title="Total Overtime (hrs)"
                    value={metrics?.total_overtime_hours}
                    icon={Clock}
                    color="#4285f4"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 300px', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Users size={20} color="#34a853" />
                        <h3 style={{ margin: 0 }}>Active Employees</h3>
                    </div>
                    {metrics?.active_users_list?.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {metrics.active_users_list.map(user => (
                                <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.role}</div>
                                    </div>
                                    {!user.is_network_valid ? (
                                        <span className="badge badge--danger" style={{ fontSize: '0.75rem' }}>
                                            Invalid Net
                                        </span>
                                    ) : (
                                        <span className="badge badge--success" style={{ fontSize: '0.75rem' }}>
                                            Working
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No one is currently active.</p>
                    )}
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <UserX size={20} color="#ea4335" />
                        <h3 style={{ margin: 0 }}>Inactive Employees</h3>
                    </div>
                    {metrics?.inactive_users_list?.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {metrics.inactive_users_list.map(user => (
                                <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.role}</div>
                                    </div>
                                    {user.leave_status ? (
                                        <span className="badge badge--warning" style={{ fontSize: '0.75rem' }}>
                                            {user.leave_status}
                                        </span>
                                    ) : (
                                        <span className="badge badge--secondary" style={{ fontSize: '0.75rem' }}>
                                            Away
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>Everyone is active today.</p>
                    )}
                </div>

                <div className="card" style={{ padding: '24px', alignSelf: 'start' }}>
                    <h3>Quick Insights</h3>
                    <ul style={{ marginTop: '16px', lineHeight: '1.8' }}>
                        <li>Total employees tracked today: <strong>{metrics?.total_employees_scanned_today}</strong></li>
                        <li>{metrics?.currently_active > 0 ? 'Teams are actively working.' : 'No active sessions right now.'}</li>
                        {metrics?.invalid_network > 0 && (
                            <li style={{ color: '#ea4335' }}>
                                Warning: {metrics.invalid_network} employee(s) currently working on invalid IP networks.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// Simple internal component for the cards
function MetricCard({ title, value, icon: Icon, color }) {
    return (
        <div style={{
            backgroundColor: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>{title}</span>
                <div style={{ backgroundColor: `${color}15`, padding: '8px', borderRadius: '8px' }}>
                    <Icon size={20} color={color} />
                </div>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value || 0}</span>
        </div>
    );
}
