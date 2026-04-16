import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, teamsAPI } from '../api/api';
import { useTimesheet, useManagedUsers } from '../hooks/useSharedData';
import { Calendar, Clock, Filter, AlertTriangle, Download } from 'lucide-react';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

export default function Timesheets() {
    const { user } = useAuth();
    const isManager = ['SU', 'PM', 'TL'].includes(user?.role);

    // Filters
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const { data: timesheetData, isLoading: loading, error: queryError } = useTimesheet({
        month: selectedMonth,
        year: selectedYear,
        ...(isManager && selectedUserId ? { user_id: selectedUserId } : {})
    });
    
    const { data: teamMembers = [] } = useManagedUsers();
    
    const records = timesheetData?.records || [];
    const summaryUser = timesheetData?.user || null;
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');



    const formatDuration = (durationStr) => {
        if (!durationStr || durationStr === '00:00:00') return '-';
        const parts = durationStr.split(':');
        return `${parts[0]}h ${parts[1]}m`;
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            // Calculate start and end date for the selected month/year
            const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10);
            
            const params = {
                start_date: startDate,
                end_date: endDate,
            };
            if (isManager && selectedUserId) {
                params.user_id = selectedUserId;
            }

            const response = await attendanceAPI.exportExcel(params);
            
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const fileName = summaryUser 
                ? `timesheet_${summaryUser.name.replace(/\s+/g, '_')}_${selectedMonth}_${selectedYear}.xlsx`
                : `timesheet_${selectedMonth}_${selectedYear}.xlsx`;
            
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to export timesheet. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="timesheets-view">

            <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                        <label>Month</label>
                        <select
                            className="select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '100px' }}>
                        <label>Year</label>
                        <select
                            className="select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {isManager && (
                        <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                            <label>Employee</label>
                            <select
                                className="select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">My Timesheet</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.name || member.email}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance Calendar */}
            <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading calendar...
                    </div>
                ) : (
                    <AttendanceCalendar 
                        records={records} 
                        currentMonth={Number(selectedMonth)} 
                        currentYear={Number(selectedYear)}
                        onMonthChange={setSelectedMonth}
                        onYearChange={setSelectedYear}
                    />
                )}
            </div>

            {error && <div className="alert alert--danger">{error}</div>}

            <div className="card">
                <div className="card__header" style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={20} color="var(--color-primary)" />
                        <h3 style={{ margin: 0 }}>
                            {summaryUser ? `Attendance Logs: ${summaryUser.name || summaryUser.email}` : 'Attendance Logs'}
                        </h3>
                    </div>
                    <button 
                        className="btn btn--outline btn--sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={handleExport}
                        disabled={exporting || records.length === 0}
                    >
                        <Download size={14} /> {exporting ? 'Exporting...' : 'Export Spreadsheet'}
                    </button>
                </div>

                {loading ? (
                    <SkeletonTable rows={5} columns={6} />
                ) : records.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No records found"
                        subtitle="No attendance records found for the selected period."
                    />
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>First Login</th>
                                    <th>Last Logout</th>
                                    <th>Total Active Hrs</th>
                                    <th>Overtime</th>
                                    <th>Status</th>
                                    <th>Network Issues</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(record => (
                                    <tr key={record.id}>
                                        <td className="fw-500">{record.date}</td>
                                        <td>{record.first_login ? new Date(`1970-01-01T${record.first_login}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        <td>{record.last_logout ? new Date(`1970-01-01T${record.last_logout}Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        <td style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                                            {formatDuration(record.total_active_duration)}
                                        </td>
                                        <td style={{ color: record.overtime_duration && record.overtime_duration !== '00:00:00' ? 'var(--color-warning)' : 'inherit' }}>
                                            {formatDuration(record.overtime_duration)}
                                        </td>
                                        <td>
                                            {record.is_leave ? (
                                                <span className={`badge ${record.leave_type === 'Leave' ? 'badge--warning' : 'badge--primary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {record.leave_type === 'Leave' ? 'On Leave' : record.leave_type}
                                                </span>
                                            ) : record.is_late ? (
                                                <span className="badge badge--danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <AlertTriangle size={12} /> Late
                                                </span>
                                            ) : (
                                                <span className="badge badge--success">On Time</span>
                                            )}
                                        </td>
                                        <td>
                                            {record.invalid_network_sessions_count > 0 ? (
                                                <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                                                    {record.invalid_network_sessions_count} violation(s)
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
