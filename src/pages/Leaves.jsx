import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { leavesAPI, notificationsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Calendar as CalendarIcon, FileText, CheckCircle, Clock, Grid } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import CustomCalendarToolbar from '../components/CustomCalendarToolbar';
import './Leaves.css';
import { Skeleton, SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const locales = {
    'en-US': import('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function Leaves() {
    const { user } = useAuth();
    const isSU = user?.role === 'SU';
    const isPM = user?.role === 'PM';
    const isAdmin = isSU || isPM; // Can review pending requests
    const canApplyLeave = !isSU; // Everyone except SU can apply

    // View modes
    const [viewMode, setViewMode] = useState(isAdmin ? 'pending' : 'myLeaves'); // pending | calendar | myLeaves

    // States for JP/TL
    const [balance, setBalance] = useState({
        CL: { limit: 0, used: 0, remaining: 0 },
        EL: { limit: 0, used: 0, remaining: 0 },
        SL: { limit: 0, used: 0, remaining: 0 },
        HPL: { limit: 0, used: 0, remaining: 0 }
    });
    const [myRequests, setMyRequests] = useState([]);

    // States for PM
    const [pendingRequests, setPendingRequests] = useState([]);

    // Calendar States
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Form states
    const [activeTab, setActiveTab] = useState('Leave'); // Leave | OD | Deputation
    const [leaveType, setLeaveType] = useState('CL');
    const [odType, setOdType] = useState('Training');
    const [targetOrg, setTargetOrg] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // PM Modal States
    const [showRejectModal, setShowRejectModal] = useState(null); // stores request object
    const [disapprovalReason, setDisapprovalReason] = useState('');

    const fetchData = useCallback(async () => {
        try {
            // Admins (SU/PM) fetch pending requests
            if (isAdmin) {
                const res = await leavesAPI.getPending();
                setPendingRequests(res.data);
                if (res.data.length === 0 && canApplyLeave) {
                    setViewMode(prev => prev === 'pending' ? 'myLeaves' : prev);
                }
            }

            // Everyone except SU can apply for leave and see their own history
            if (canApplyLeave) {
                const res = await leavesAPI.getMy();
                if (res.data.balance) {
                    setBalance(res.data.balance);
                }
                setMyRequests(res.data.requests);

                // Mark leave-related notifications as read
                try {
                    const notifRes = await notificationsAPI.list();
                    const unreadLeaveNotifs = notifRes.data.filter(n => !n.is_read && n.link === '/leaves');
                    if (unreadLeaveNotifs.length > 0) {
                        await Promise.all(unreadLeaveNotifs.map(n => notificationsAPI.markRead(n.id)));
                    }
                } catch (err) {
                    console.error("Failed to mark leave notifications as read", err);
                }
            }

            // Always fetch calendar events
            const calRes = await leavesAPI.getCalendarEvents();
            const parseLocalDate = (dateStr) => {
                if (!dateStr) return new Date();
                const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
                return new Date(year, month - 1, day);
            };

            const formattedEvents = calRes.data.map(ev => ({
                ...ev,
                start: parseLocalDate(ev.start),
                // React-Big-Calendar treats end dates natively as exclusive.
                // Adding 1 day to the exact local midnight solves the off-by-one rendering.
                end: new Date(parseLocalDate(ev.end).getTime() + (24 * 60 * 60 * 1000)),
            }));
            setCalendarEvents(formattedEvents);

        } catch (err) {
            console.error("Failed to fetch leaves", err);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, canApplyLeave]);

    useEffect(() => {
        fetchData();

        const handleNotification = (e) => {
            const notif = e.detail;
            if (notif?.link?.includes('/leaves')) {
                fetchData();
            }
        };

        window.addEventListener('notificationReceived', handleNotification);
        return () => window.removeEventListener('notificationReceived', handleNotification);
    }, [fetchData]);

    const formatDateForApi = (date) => {
        if (!date) return null;
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    const handleApply = async (e) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            toast.warning('Please select a date range.');
            return;
        }

        const payload = {
            request_type: activeTab,
            start_date: formatDateForApi(startDate),
            end_date: formatDateForApi(endDate),
            reason: reason
        };

        if (activeTab === 'Leave') payload.leave_type = leaveType;
        if (activeTab === 'OD') payload.od_type = odType;
        if (activeTab === 'Deputation') payload.target_organization = targetOrg;

        try {
            await leavesAPI.apply(payload);
            toast.success(`${activeTab} request submitted successfully!`);
            setDateRange([null, null]);
            setReason('');
            setTargetOrg('');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || `Failed to submit ${activeTab} request.`);
        }
    };

    const handleApprove = async (id) => {
        try {
            await leavesAPI.review(id, { action: 'Approve' });
            toast.success('Request approved.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to approve');
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        try {
            await leavesAPI.review(showRejectModal.id, {
                action: 'Reject',
                disapproval_reason: disapprovalReason
            });
            setShowRejectModal(null);
            setDisapprovalReason('');
            toast.success('Request rejected.');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to reject');
        }
    };

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6'; // default blue
        if (event.type === 'holiday') backgroundColor = '#ef4444'; // red
        else if (event.type === 'leave') backgroundColor = '#8b5cf6'; // purple

        return {
            style: {
                backgroundColor,
                borderColor: 'transparent',
                color: '#ffffff',
                display: 'block',
                padding: '2px 5px',
                fontWeight: '500',
                fontSize: '0.85rem',
                borderRadius: '4px'
            }
        };
    };

    if (loading) {
        return (
            <div className="page" style={{ paddingTop: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} style={{ height: '80px', flex: 1, borderRadius: '12px' }} />
                    ))}
                </div>
                <SkeletonTable rows={5} columns={6} />
            </div>
        );
    }

    const unassignedRole = user?.role === 'PD';

    if (unassignedRole) {
        return (
            <div className="page" style={{ paddingTop: '2rem' }}>
                <EmptyState
                    icon={AlertTriangle}
                    title="Role Not Assigned"
                    subtitle="Leaves module unavailable until a role is assigned."
                />
            </div>
        );
    }

    let requestedDays = 0;
    if (startDate && endDate) {
        const diffTime = Math.abs(endDate - startDate);
        requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const isOverBalance = activeTab === 'Leave' && requestedDays > (balance[leaveType]?.remaining || 0);

    return (
        <div className="page leaves-page">
            <div className="page__header flex-between">
                <div>
                    <h2>Leave Management</h2>
                    <p className="text-secondary" style={{ marginTop: '0.25rem' }}>Track your leave balances, apply for leaves/OD, and view calendar.</p>
                </div>
                <div className="tabs tabs--pill">
                    {isAdmin && (
                        <button className={`tab ${viewMode === 'pending' ? 'active' : ''}`} onClick={() => setViewMode('pending')}>
                            <FileText size={16} /> Pending Requests
                        </button>
                    )}
                    {canApplyLeave && (
                        <button className={`tab ${viewMode === 'myLeaves' ? 'active' : ''}`} onClick={() => setViewMode('myLeaves')}>
                            <FileText size={16} /> My Leaves
                        </button>
                    )}
                    <button className={`tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
                        <Grid size={16} /> Calendar View
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' && (
                <div className="card h-full calendar-container" style={{ minHeight: '600px', padding: '1rem' }}>
                    <Calendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        date={currentDate}
                        onNavigate={date => setCurrentDate(date)}
                        style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={evt => setSelectedEvent(evt)}
                        components={{
                            toolbar: CustomCalendarToolbar,
                        }}
                        popup={true}
                        view="month"
                        views={['month']}
                    />
                </div>
            )}

            {viewMode === 'pending' && isAdmin && (
                <div className="card">
                    <div className="card__header">
                        <h3>Pending Requests</h3>
                    </div>
                    {pendingRequests.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
                            <p>No pending requests. You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name / Role</th>
                                        <th>Request Details</th>
                                        <th>Dates</th>
                                        <th>Reason</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingRequests.map(req => (
                                        <tr key={req.id}>
                                            <td>
                                                <div className="fw-500">{req.user_name}</div>
                                                <div className="text-xs text-secondary">{req.user_role}</div>
                                            </td>
                                            <td>
                                                <span className={`badge badge--outline badge--${req.request_type.toLowerCase()}`}>
                                                    {req.request_type}
                                                </span>
                                                {strDetails(req)}
                                            </td>
                                            <td>
                                                <div className="text-xs">From: <span className="fw-500">{new Date(req.start_date).toLocaleDateString()}</span></div>
                                                <div className="text-xs">To: <span className="fw-500">{new Date(req.end_date).toLocaleDateString()}</span></div>
                                                <div className="text-xs text-secondary mt-1">({req.days} days)</div>
                                            </td>
                                            <td style={{ maxWidth: '200px' }} className="truncate" title={req.reason}>{req.reason}</td>
                                            <td>
                                                <button className="btn btn--sm btn--success" onClick={() => handleApprove(req.id)} style={{ marginRight: '0.5rem' }}>
                                                    Approve
                                                </button>
                                                <button className="btn btn--sm btn--danger" onClick={() => setShowRejectModal(req)}>
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {viewMode === 'myLeaves' && canApplyLeave && (
                <div className="leaves-grid">
                    {/* Left Column: Form & History */}
                    <div className="leaves-left">
                        {/* Application Form Card */}
                        <div className="card mb-4">
                            <div className="tabs-header">
                                <button className={`tab-btn ${activeTab === 'Leave' ? 'active' : ''}`} onClick={() => setActiveTab('Leave')}>
                                    <CalendarIcon size={18} /> Leave
                                </button>
                                <button className={`tab-btn ${activeTab === 'OD' ? 'active' : ''}`} onClick={() => setActiveTab('OD')}>
                                    <Clock size={18} /> On Duty (OD)
                                </button>
                                <button className={`tab-btn ${activeTab === 'Deputation' ? 'active' : ''}`} onClick={() => setActiveTab('Deputation')}>
                                    <FileText size={18} /> Deputation
                                </button>
                            </div>
                            <form onSubmit={handleApply} className="leave-form">
                                {activeTab === 'Leave' && (
                                    <div className="form-group p-x">
                                        <label>Leave Type</label>
                                        <select className="select" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                                            <option value="CL">Casual Leave</option>
                                            <option value="SL">Sick Leave</option>
                                            <option value="EL">Earned Leave</option>
                                            <option value="HPL">Half Pay Leave</option>
                                        </select>
                                    </div>
                                )}

                                {activeTab === 'OD' && (
                                    <div className="form-group p-x">
                                        <label>OD Type</label>
                                        <select className="select" value={odType} onChange={(e) => setOdType(e.target.value)}>
                                            <option value="Training">Training</option>
                                            <option value="Field Work">Field Work</option>
                                            <option value="Official Meeting">Official Meeting</option>
                                        </select>
                                    </div>
                                )}

                                {activeTab === 'Deputation' && (
                                    <div className="form-group p-x">
                                        <label>Target Organization</label>
                                        <input
                                            type="text"
                                            className="input"
                                            required
                                            value={targetOrg}
                                            onChange={(e) => setTargetOrg(e.target.value)}
                                            placeholder="e.g., State Cooperatives Board"
                                        />
                                    </div>
                                )}

                                <div className="form-group p-x" style={{ position: 'relative' }}>
                                    <label>Select Date Range</label>
                                    <DatePicker
                                        selectsRange={true}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(update) => setDateRange(update)}
                                        placeholderText="Click to select dates"
                                        minDate={new Date()}
                                        className="input w-100"
                                        wrapperClassName="w-100"
                                        dateFormat="dd/MM/yyyy"
                                        isClearable={true}
                                    />
                                    {isOverBalance && activeTab === 'Leave' && (
                                        <p className="text-danger text-sm mt-2">Requested {requestedDays} days exceeds your remaining balance.</p>
                                    )}
                                </div>

                                <div className="form-group p-x">
                                    <label>{activeTab === 'Leave' ? 'Reason' : 'Purpose / Details'}</label>
                                    <textarea
                                        className="input"
                                        rows="3"
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Brief explanation..."
                                    ></textarea>
                                </div>
                                <div className="form-actions p-x">
                                    <button
                                        type="submit"
                                        className="btn btn--primary btn--full"
                                        disabled={isOverBalance || !startDate || !endDate || !reason || (activeTab === 'Deputation' && !targetOrg)}
                                    >
                                        Submit {activeTab} Request
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Request History */}
                        <div className="card">
                            <div className="card__header">
                                <h3>Request History</h3>
                            </div>
                            {myRequests.length === 0 ? (
                                <div className="empty-state min-h-xs">
                                    <p>No previous requests found.</p>
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table className="table borderless compact">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Dates</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myRequests.map(req => (
                                                <tr key={req.id}>
                                                    <td>
                                                        <div className="fw-500">{req.request_type}</div>
                                                        {strDetails(req)}
                                                    </td>
                                                    <td>
                                                        <div className="text-xs">{new Date(req.start_date).toLocaleDateString()} to</div>
                                                        <div className="text-xs">{new Date(req.end_date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td>
                                                        {req.status === 'Pending' && <span className="badge badge--warning badge--sm">Pending</span>}
                                                        {req.status === 'Approved' && <span className="badge badge--success badge--sm">Approved</span>}
                                                        {req.status === 'Rejected' && <span className="badge badge--danger badge--sm" title={req.disapproval_reason}>Rejected</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Leave Balances Info */}
                    <div className="leaves-right">
                        <div className="card balances-card">
                            <div className="card__header border-bottom-0 pb-0">
                                <h3 className="text-secondary-dark text-sm tracking-wide">CURRENT BALANCES</h3>
                            </div>

                            <div className="balances-grid p-4">
                                <BalanceItem title="CASUAL" code="CL" data={balance.CL} color="var(--color-primary)" />
                                <BalanceItem title="EARNED" code="EL" data={balance.EL} color="var(--color-primary)" />
                                <BalanceItem title="SICK" code="SL" data={balance.SL} color="var(--color-primary)" />
                                <BalanceItem title="HALF PAY" code="HPL" data={balance.HPL} color="var(--color-primary)" />
                            </div>
                            <div className="p-4 pt-0 text-xs text-secondary italic">
                                * Balances are updated after admin approval.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {isAdmin && (
                <Modal open={!!showRejectModal} onClose={() => setShowRejectModal(null)} title="Reject Request">
                    <form onSubmit={handleReject}>
                        <div className="form-group">
                            <label>Reason for Disapproval <span style={{ color: 'red' }}>*</span></label>
                            <textarea
                                className="input"
                                rows="3"
                                required
                                value={disapprovalReason}
                                onChange={(e) => setDisapprovalReason(e.target.value)}
                                placeholder="Explain why this request is rejected..."
                            ></textarea>
                        </div>
                        <div className="modal__actions">
                            <button type="button" className="btn btn--ghost" onClick={() => setShowRejectModal(null)}>Cancel</button>
                            <button type="submit" className="btn btn--danger">Confirm Reject</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Event Details Modal */}
            <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title}>
                {selectedEvent && (
                    <div className="event-details">
                        {selectedEvent.type === 'holiday' ? (
                            <>
                                <p className="mb-2"><strong>Type:</strong> Company Holiday</p>
                                <p><strong>Date:</strong> {format(selectedEvent.start, 'PP')}</p>
                            </>
                        ) : (
                            <>
                                <p className="mb-2"><strong>Status:</strong> <span className="badge badge--success badge--sm">Approved</span></p>
                                <p className="mb-2"><strong>Leave Type:</strong> {selectedEvent.leave_type}</p>
                                <p className="mb-2"><strong>Dates:</strong> {format(selectedEvent.start, 'MMM d, yyyy')} - {format(new Date(selectedEvent.end.getTime() - (24 * 60 * 60 * 1000)), 'MMM d, yyyy')}</p>
                                {selectedEvent.reason && <p className="mt-4 text-secondary">"{selectedEvent.reason}"</p>}
                            </>
                        )}
                        <div className="modal__actions mt-6">
                            <button type="button" className="btn btn--primary" onClick={() => setSelectedEvent(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

// Helper to render type details compactly
function strDetails(req) {
    if (req.request_type === 'Leave') return <div className="text-xs text-secondary">{req.leave_type}</div>;
    if (req.request_type === 'OD') return <div className="text-xs text-secondary">{req.od_type}</div>;
    if (req.request_type === 'Deputation') return <div className="text-xs text-secondary truncate" style={{ maxWidth: '120px' }} title={req.target_organization}>{req.target_organization}</div>;
    return null;
}

// Component for Individual Balance Card
function BalanceItem({ title, data, color }) {
    if (!data) return null;
    const pct = Math.min((data.used / data.limit) * 100, 100);

    return (
        <div className="balance-item">
            <h4 className="balance-title">{title}</h4>
            <div className="balance-stats">
                <span className="balance-rem">{data.remaining}</span>
                <span className="balance-label">days left {data.frequency === 'Monthly' ? '/ mo' : '/ yr'}</span>
            </div>
            <div className="balance-progress-wrapper">
                <div className="text-xs text-secondary mb-1" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Used: {data.used} / {data.limit}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>{data.frequency || 'Annual'}</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }}></div>
                </div>
            </div>
        </div>
    );
}

