import { useState, useEffect } from 'react';
import api, { attendanceAPI, teamsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import CustomDatePicker from './CustomDatePicker';
import { SkeletonTable } from './ui/Skeleton';
import EmptyState from './ui/EmptyState';
import { FileText, Download } from 'lucide-react';

export default function DetailedReports() {
    const { user: currentUser } = useAuth();
    const todayStr = new Date().toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [role, setRole] = useState('All');
    const [userId, setUserId] = useState('');
    
    // Group By logic (day vs week)
    const [groupBy, setGroupBy] = useState('day'); 
    
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [startDate, endDate, role, userId, groupBy]);

    const fetchUsers = async () => {
        try {
            const res = await teamsAPI.getManagedUsers();
            setAllUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (role !== 'All') params.append('role', role);
            if (userId) params.append('user_id', userId);

            const res = await api.get(`/attendance/admin-dashboard/reports/?${params.toString()}`);
            let data = res.data.reports || [];
            
            // Client-side grouping for Weekly/Aggregate
            if (groupBy === 'week') {
                data = groupReportsByWeek(data);
            }
            
            setReports(data);
            setError('');
        } catch (err) {
            setError('Failed to load reports.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {
                start_date: startDate,
                end_date: endDate
            };
            if (role !== 'All') params.role = role;
            if (userId) params.user_id = userId;

            const response = await attendanceAPI.exportExcel(params);
            
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `detailed_attendance_${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export report. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const groupReportsByWeek = (data) => {
        // Group by user, then aggregate hours for the date range
        const userGroups = {};
        
        data.forEach(row => {
            const uid = row.user_id;
            if (!userGroups[uid]) {
                userGroups[uid] = {
                    id: uid,
                    user_name: row.user_name,
                    user_role: row.user_role,
                    date: `${startDate} to ${endDate}`,
                    total_seconds: 0,
                    overtime_seconds: 0,
                    late_count: 0,
                    invalid_nets: 0
                };
            }
            userGroups[uid].total_seconds += parseDuration(row.total_active_duration);
            userGroups[uid].overtime_seconds += parseDuration(row.overtime_duration);
            if (row.is_late) userGroups[uid].late_count++;
            userGroups[uid].invalid_nets += row.invalid_network_sessions_count;
        });

        return Object.values(userGroups).map(g => ({
            ...g,
            total_active_duration: formatSecondsToHHMM(g.total_seconds),
            overtime_duration: formatSecondsToHHMM(g.overtime_seconds),
            is_late: g.late_count > 0 ? "Yes (" + g.late_count + ")" : "No",
            invalid_network_sessions_count: g.invalid_nets
        }));
    };

    const parseDuration = (dur) => {
        if (!dur) return 0;
        const [h, m, s] = dur.split(':').map(Number);
        return (h * 3600) + (m * 60) + (s || 0);
    };

    const formatSecondsToHHMM = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
    };

    const formatDurationDisplay = (durationStr) => {
        if (!durationStr || durationStr === '00:00:00') return '-';
        const parts = durationStr.split(':');
        return `${parts[0]}h ${parts[1]}m`;
    };

    const setQuickRange = (type) => {
        const today = new Date();
        if (type === 'today') {
            const iso = today.toISOString().slice(0, 10);
            setStartDate(iso);
            setEndDate(iso);
        } else if (type === 'week') {
            const first = today.getDate() - today.getDay(); 
            const last = first + 6;
            const startStr = new Date(today.setDate(first)).toISOString().slice(0, 10);
            const endStr = new Date(today.setDate(last)).toISOString().slice(0, 10);
            setStartDate(startStr);
            setEndDate(endStr);
        }
    };

    return (
        <div className="reports-view">
            <div className="card" style={{ padding: '20px', marginBottom: '24px', position: 'relative', zIndex: 100, overflow: 'visible' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Start Date</label>
                        <CustomDatePicker 
                            selectedDate={startDate ? new Date(startDate) : null}
                            onChange={(d) => { if(d) setStartDate(d.toISOString().slice(0, 10)) }}
                        />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>End Date</label>
                        <CustomDatePicker 
                            selectedDate={endDate ? new Date(endDate) : null}
                            onChange={(d) => { if(d) setEndDate(d.toISOString().slice(0, 10)) }}
                        />
                    </div>

                    {currentUser?.role !== 'TL' && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                            <label>Role</label>
                            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="All">All Roles</option>
                                {currentUser?.role === 'SU' && <option value="PM">Project Manager</option>}
                                <option value="PM" style={{ display: 'none' }}></option> {/* Hidden spacer */}
                                <option value="TL">Team Lead</option>
                                <option value="JP">Junior Programmer</option>
                            </select>
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                        <label>Employee</label>
                        <select className="select" value={userId} onChange={(e) => setUserId(e.target.value)}>
                            <option value="">All Employees</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                        <label>Grouping</label>
                        <select className="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                            <option value="day">Day-wise</option>
                            <option value="week">Aggregate Total</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                        <button className="btn btn--outline btn--sm" onClick={() => setQuickRange('today')}>Today</button>
                        <button className="btn btn--outline btn--sm" onClick={() => setQuickRange('week')}>This Week</button>
                    </div>

                    <button 
                        className="btn btn--primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}
                        onClick={handleExport}
                        disabled={exporting || reports.length === 0}
                    >
                        <Download size={18} /> {exporting ? 'Exporting...' : 'Export Spreadsheet'}
                    </button>

                </div>
            </div>

            <div className="card">
                <div className="card__header">
                    <h3><FileText size={18} /> Attendance Reports</h3>
                </div>

                {loading ? (
                     <SkeletonTable rows={10} columns={7} />
                ) : error ? (
                     <div className="alert alert--danger" style={{ margin: '20px' }}>{error}</div>
                ) : reports.length === 0 ? (
                    <EmptyState icon={FileText} title="No records found" subtitle="Try adjusting your filters to find records." />
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    {groupBy === 'day' && <th>First Login</th>}
                                    {groupBy === 'day' && <th>Last Logout</th>}
                                    <th>Total Active Hrs</th>
                                    <th>Overtime</th>
                                    <th>Late / Flags</th>
                                    <th>Network Issues</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((row, i) => (
                                    <tr key={row.id || i}>
                                        <td className="fw-500">{row.date}</td>
                                        <td>{row.user_name}</td>
                                        <td><span className="badge badge--secondary" style={{ fontSize: '0.7rem' }}>{row.user_role}</span></td>
                                        
                                        {groupBy === 'day' && (
                                            <td>{row.first_login ? new Date(`1970-01-01T${row.first_login}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        )}
                                        {groupBy === 'day' && (
                                            <td>{row.last_logout ? new Date(`1970-01-01T${row.last_logout}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        )}

                                        <td style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                                            {formatDurationDisplay(row.total_active_duration)}
                                        </td>
                                        <td style={{ color: row.overtime_duration && row.overtime_duration !== '00:00:00' ? 'var(--color-warning)' : 'inherit' }}>
                                            {formatDurationDisplay(row.overtime_duration)}
                                        </td>
                                        
                                        <td>
                                            {groupBy === 'day' ? (
                                                row.is_late ? <span className="badge badge--danger" style={{ fontSize: '0.7rem' }}>Late</span> : <span className="badge badge--success" style={{ fontSize: '0.7rem' }}>On Time</span>
                                            ) : (
                                                <span className={row.is_late !== "No" ? "badge badge--danger" : ""} style={{ fontSize: '0.7rem' }}>{row.is_late}</span>
                                            )}
                                        </td>
                                        <td>
                                            {row.invalid_network_sessions_count > 0 ? (
                                                <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                                                    {row.invalid_network_sessions_count} violation(s)
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>None</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
