import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, projectsAPI, tasksAPI, leavesAPI, workspaceAPI, notificationsAPI, attendanceAPI } from '../api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAllProjects, useAllTeams, useTasks, useCalendarEvents, useWorkspaceEvents, usePendingLeaves, useSuMetrics, useNotifications } from '../hooks/useSharedData';
import { FolderKanban, Users, CheckSquare, MessageSquare, MessageCircle, X, ChevronLeft, ChevronRight, Calendar, Clock, ClipboardList } from 'lucide-react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import CustomCalendarToolbar from '../components/CustomCalendarToolbar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import addMonths from 'date-fns/addMonths';
import subMonths from 'date-fns/subMonths';
import addWeeks from 'date-fns/addWeeks';
import subWeeks from 'date-fns/subWeeks';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Leaves.css';
// ─── Helpers ────────────────────────────────────────────────────────────────



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

// ─── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({ onClick, to, icon: Icon, iconColor, iconBg, label, value, loading, badge }) {
    const Tag = to ? Link : 'div';
    
    return (
        <Tag
            to={to}
            onClick={onClick}
            style={{
                textDecoration: 'none',
                backgroundColor: 'var(--bg-card)',
                border: `1px solid var(--border-color)`,
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                flex: '1 1 0',
                minWidth: 0,
                alignSelf: 'stretch',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.zIndex = '40';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.zIndex = '1';
            }}
        >
            <div style={{
                width: '44px', height: '44px',
                borderRadius: '10px',
                backgroundColor: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 12px ${iconBg}`,
                marginBottom: '16px'
            }}>
                <Icon size={22} color={iconColor} />
            </div>
            {badge > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    minWidth: '24px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}>
                    {badge}
                </div>
            )}
            <div style={{ marginTop: 'auto' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, visibility: value === undefined ? 'hidden' : 'visible', display: value === undefined ? 'none' : 'block' }}>
                    {value !== undefined ? (loading ? '—' : value) : '0'}
                </div>
            </div>
        </Tag>
    );
}

// ─── Custom Event ──────────────────────────────────────────────────────────

const CustomEvent = ({ event }) => {
    const [isHovered, setIsHovered] = useState(false);
    const itemType = event.type || (event.resource && event.resource.itemType) || 'event';
    let icon = <Clock size={12} />;
    if (itemType === 'task') icon = <span style={{ fontSize: '10px' }}>✓</span>;
    if (itemType === 'leave') icon = <span style={{ fontSize: '10px' }}>✈</span>;

    return (
        <div
            className="rbc-custom-event"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                {icon}
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.title}
                </span>
            </div>

            {isHovered && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '4px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-md)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    zIndex: 1000,
                    minWidth: '200px',
                    color: 'var(--text-primary)',
                    cursor: 'default'
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        {itemType}
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{event.title}</div>
                </div>
            )}
        </div>
    );
};

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const now = new Date();

    // ─── Data Layer (Hooks) ───
    const { data: projects = [], isLoading: projectsLoading } = useAllProjects();
    const { data: teams = [], isLoading: teamsLoading } = useAllTeams();
    const { data: tasks = [], isLoading: tasksLoading } = useTasks();
    const { data: calendarEventsRaw = [] } = useCalendarEvents();
    const { data: workspaceEventsRaw = [] } = useWorkspaceEvents();
    const { data: pendingLeaves = [] } = usePendingLeaves({ enabled: ['SU', 'PM'].includes(user?.role) });
    const { data: notifications = [] } = useNotifications();
    const { data: suMetrics = null } = useSuMetrics({}, { enabled: user?.role === 'SU' });

    // ─── UI State ───
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState('month');
    const [calendarProjectFilter, setCalendarProjectFilter] = useState(null);
    const [showInboxModal, setShowInboxModal] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showTasksModal, setShowTasksModal] = useState(false);

    const isLoading = projectsLoading || teamsLoading || tasksLoading;
    const calendarWrapperRef = useRef(null);

    // ─── Derived Metadata ───
    const validProjectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

    const stats = useMemo(() => {
        const unreadBoardNotifs = notifications.filter(n => !n.is_read && n.link?.includes('module=board'));
        const unreadChatNotifs = notifications.filter(n => !n.is_read && n.link?.includes('module=chat'));
        const unreadTicketNotifs = notifications.filter(n => !n.is_read && n.link?.includes('module=tasks') && n.link?.includes('taskId='));
        const unreadTaskNotifs = notifications.filter(n => !n.is_read && n.link === '/tasks');
        const unreadProjectNotifs = notifications.filter(n => !n.is_read && n.link === '/projects');
        const unreadTeamNotifs = notifications.filter(n => !n.is_read && n.link === '/teams');

        const ACTIVE_STATUS_LIST = ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW'];
        const activeTasks = tasks.filter(t => {
            const projectId = t.project?.id || t.project;
            const isValidProject = ['SU', 'PM'].includes(user?.role) || validProjectIds.has(projectId);
            if (!isValidProject || !ACTIVE_STATUS_LIST.includes(t.status)) return false;
            return ['SU', 'PM'].includes(user?.role) || t.assigned_to?.id === user?.id;
        });

        return {
            projects: projects.length,
            teams: teams.length,
            tasks: activeTasks.length,
            pendingLeaves: pendingLeaves.length,
            unreadMessages: unreadBoardNotifs,
            unreadChats: unreadChatNotifs,
            unreadTickets: unreadTicketNotifs,
            unreadTasks: unreadTaskNotifs,
            unreadProjects: unreadProjectNotifs,
            unreadTeams: unreadTeamNotifs,
        };
    }, [projects, teams, tasks, pendingLeaves, notifications, user?.role, validProjectIds]);

    const calendarEvents = useMemo(() => {
        const projectEvents = workspaceEventsRaw
            .filter(e => ['SU', 'PM'].includes(user?.role) || validProjectIds.has(e.project))
            .map(e => ({
                id: `proj_${e.id}`,
                title: e.title,
                start: new Date(e.start_time),
                end: e.end_time ? new Date(e.end_time) : new Date(new Date(e.start_time).getTime() + (60 * 60 * 1000)),
                type: 'project',
                project_id: e.project,
            }));

        const taskEvents = tasks
            .filter(t => {
                const projectId = t.project?.id || t.project;
                const isValidProject = ['SU', 'PM'].includes(user?.role) || validProjectIds.has(projectId);
                if (!t.due_date || t.status === 'COMPLETED' || !isValidProject) return false;
                return ['SU', 'PM'].includes(user?.role) || t.assigned_to?.id === user?.id;
            })
            .map(t => {
                const projectId = t.project?.id || t.project;
                const dueStr = t.due_date + "T00:00:00";
                return {
                    id: `task_${t.id}`,
                    title: `[Task Due] ${t.name}`,
                    start: new Date(dueStr),
                    end: new Date(dueStr),
                    type: 'task',
                    project_id: projectId,
                };
            });

        const formattedLeaveEvents = calendarEventsRaw.map(e => ({
            ...e,
            start: new Date(e.start),
            end: e.end ? new Date(e.end) : new Date(e.start)
        }));

        const combined = [...formattedLeaveEvents, ...projectEvents, ...taskEvents];
        return calendarProjectFilter 
            ? combined.filter(e => e.project_id === calendarProjectFilter || e.project === calendarProjectFilter)
            : combined;
    }, [calendarEventsRaw, workspaceEventsRaw, tasks, user?.role, validProjectIds, calendarProjectFilter]);

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6'; // default blue
        if (event.type === 'holiday') backgroundColor = '#ef4444'; // red
        else if (event.type === 'leave') backgroundColor = '#8b5cf6'; // purple
        else if (event.type === 'project' || event.type === 'task') {
            const PROJECT_COLORS = [
                '#3b82f6', // blue
                '#10b981', // emerald
                '#f59e0b', // amber
                '#ec4899', // pink
                '#06b6d4', // cyan
                '#f43f5e', // rose
                '#84cc16', // lime
                '#6366f1'  // indigo
            ];
            // Deterministic selection based on project ID
            const idVal = String(event.project_id || event.id || 0);
            let sum = 0;
            for (let i = 0; i < idVal.length; i++) {
                sum += idVal.charCodeAt(i);
            }
            backgroundColor = PROJECT_COLORS[sum % PROJECT_COLORS.length];
        }

        return {
            style: {
                backgroundColor,
                borderColor: 'transparent',
                color: '#ffffff'
            }
        };
    };

    // PD role: no dashboard
    if (user?.role === 'PD') {
        return (
            <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Awaiting Role Assignment</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Please wait for the Project Manager to grant you access.</p>
                </div>
            </div>
        );
    }

    const handleProjectsClick = async () => {
        if (stats.unreadProjects?.length > 0) {
            try {
                await Promise.all(stats.unreadProjects.map(n => notificationsAPI.markRead(n.id)));
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
                console.error("Failed to mark project notifications as read:", err);
            }
        }
    };

    const handleTeamsClick = async () => {
        if (stats.unreadTeams?.length > 0) {
            try {
                await Promise.all(stats.unreadTeams.map(n => notificationsAPI.markRead(n.id)));
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
                console.error("Failed to mark team notifications as read:", err);
            }
        }
    };

    const handleTasksClick = async () => {
        if (stats.unreadTasks?.length > 0) {
            try {
                await Promise.all(stats.unreadTasks.map(n => notificationsAPI.markRead(n.id)));
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (err) {
                console.error("Failed to mark task notifications as read:", err);
            }
        }
        setShowTasksModal(true);
    };

    return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>



            {/* ── Metric Cards ── */}
            <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Overview</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                    {user?.role === 'SU' && suMetrics && (
                        <>
                            <MetricCard
                                icon={Users}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Total Employees"
                                value={suMetrics?.total_org_employees || 0}
                                loading={isLoading}
                            />
                            <MetricCard
                                icon={CheckSquare}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Currently Active"
                                value={suMetrics.currently_active || 0}
                                loading={isLoading}
                                badge={suMetrics.invalid_network > 0 ? suMetrics.invalid_network : undefined}
                            />
                        </>
                    )}
                    {['SU', 'PM', 'TL', 'JP'].includes(user?.role) && (
                        <>
                            <MetricCard
                                to="/projects"
                                onClick={handleProjectsClick}
                                icon={FolderKanban}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Projects"
                                value={stats.projects}
                                loading={isLoading}
                                badge={stats.unreadProjects?.length}
                            />
                            <MetricCard
                                to="/teams"
                                onClick={handleTeamsClick}
                                icon={Users}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Teams"
                                value={stats.teams}
                                loading={isLoading}
                                badge={stats.unreadTeams?.length}
                            />
                        </>
                    )}
                    {['TL', 'JP'].includes(user?.role) && (
                        <MetricCard
                            onClick={handleTasksClick}
                            icon={CheckSquare}
                            iconColor="var(--color-primary)"
                            iconBg="var(--color-primary-bg)"
                            label="Tasks"
                            value={stats.tasks}
                            loading={isLoading}
                            badge={stats.unreadTasks?.length}
                        />
                    )}
                    {['PM', 'TL', 'JP'].includes(user?.role) && (
                        <MetricCard
                            to="/leaves"
                            icon={Calendar}
                            iconColor="var(--color-primary)"
                            iconBg="var(--color-primary-bg)"
                            label="Leaves"
                            loading={isLoading}
                            badge={stats.pendingLeaves}
                        />
                    )}
                    {['SU', 'PM', 'TL', 'JP'].includes(user?.role) && (
                        <>
                            <MetricCard
                                onClick={() => setShowInboxModal(true)}
                                icon={MessageSquare}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Message Board"
                                loading={isLoading}
                                badge={stats.unreadMessages.length}
                            />
                            <MetricCard
                                onClick={() => setShowChatModal(true)}
                                icon={MessageCircle}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Project Chats"
                                loading={isLoading}
                                badge={stats.unreadChats.length}
                            />
                            <MetricCard
                                onClick={() => setShowTicketModal(true)}
                                icon={CheckSquare}
                                iconColor="var(--color-primary)"
                                iconBg="var(--color-primary-bg)"
                                label="Tickets"
                                loading={isLoading}
                                badge={stats.unreadTickets.length}
                            />
                        </>
                    )}
                    {['PM', 'TL', 'JP'].includes(user?.role) && (
                        <MetricCard
                            onClick={() => setShowLogsModal(true)}
                            icon={ClipboardList}
                            iconColor="var(--color-primary)"
                            iconBg="var(--color-primary-bg)"
                            label="Project Logs"
                            loading={isLoading}
                        />
                    )}
                </div>
            </div>

            {/* ── Scheduled Events ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Calendar Overview</h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Filter:</span>
                    <div style={{ position: 'relative' }}>
                        <select 
                            value={calendarProjectFilter || ''}
                            onChange={(e) => setCalendarProjectFilter(e.target.value ? parseInt(e.target.value) : null)}
                            style={{
                                padding: '8px 32px 8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.85rem',
                                appearance: 'none',
                                cursor: 'pointer',
                                minWidth: '150px'
                            }}
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        {calendarProjectFilter ? (
                            <button 
                                onClick={() => setCalendarProjectFilter(null)}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                                title="Clear Filter"
                            >
                                <X size={14} />
                            </button>
                        ) : (
                            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '10px' }}>
                                ▼
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="calendar-container dashboard-calendar" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
                <style>{`
                    .dashboard-calendar .rbc-month-view {
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        overflow: hidden;
                        background: var(--bg-body);
                    }
                    .dashboard-calendar .rbc-header {
                        padding: 12px 0;
                        font-weight: 600;
                        color: var(--text-secondary);
                        border-bottom: 1px solid var(--border-color) !important;
                        text-transform: uppercase;
                        font-size: 0.8rem;
                        letter-spacing: 0.5px;
                        background: var(--bg-card);
                    }
                    .dashboard-calendar .rbc-month-row {
                        border-bottom: 1px solid var(--border-color);
                    }
                    .dashboard-calendar .rbc-day-bg + .rbc-day-bg {
                        border-left: 1px solid var(--border-color);
                    }
                    .dashboard-calendar .rbc-date-cell {
                        padding: 8px;
                        font-weight: 500;
                        color: var(--text-primary);
                    }
                    .dashboard-calendar .rbc-event {
                        border-radius: 6px;
                        padding: 4px 8px;
                        margin: 2px 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        transition: filter 0.15s ease, transform 0.15s ease;
                        font-size: 0.8rem;
                    }
                    .dashboard-calendar .rbc-event:hover {
                        filter: brightness(1.1);
                        transform: scale(1.02);
                        z-index: 10;
                    }
                    .dashboard-calendar .rbc-off-range-bg {
                        background: var(--bg-hover) !important;
                    }
                    .dashboard-calendar .rbc-today {
                        background: color-mix(in srgb, var(--color-primary) 5%, transparent) !important;
                    }
                    .dashboard-calendar .rbc-time-view {
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        overflow: hidden;
                    }
                `}</style>
                <div style={{ height: '750px' }}>
                    <BigCalendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        date={calendarDate}
                        view={calendarView}
                        onNavigate={(newDate) => setCalendarDate(newDate)}
                        onView={(newView) => setCalendarView(newView)}
                        components={{
                            toolbar: CustomCalendarToolbar,
                            event: CustomEvent,
                            month: {
                                dateHeader: ({ date, label }) => {
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '4px 0' }}>
                                            <span style={{
                                                width: isToday ? '28px' : 'auto',
                                                height: isToday ? '28px' : 'auto',
                                                borderRadius: isToday ? '50%' : '0',
                                                backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                                                color: isToday ? 'white' : 'inherit',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: isToday ? '700' : '500',
                                                fontSize: '0.85rem'
                                            }}>
                                                {label}
                                            </span>
                                        </div>
                                    );
                                }
                            }
                        }}
                        selectable
                        onSelectSlot={(slotInfo) => {
                            const clickedDate = slotInfo.start;
                            setCalendarDate((prev) =>
                                prev && prev.toDateString() === clickedDate.toDateString() ? null : clickedDate
                            );
                        }}
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}

                        popup={true}
                        views={['month', 'week', 'agenda']}
                    />
                </div>
            </div>

            {/* ── Inbox Modal (Messages) ── */}
            {showInboxModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowInboxModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Unread Messages</h3>
                            <button onClick={() => setShowInboxModal(false)} className="btn btn--ghost" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>You have no open projects.</p>
                            ) : (() => {
                                const grouped = {};
                                projects.forEach(p => {
                                    grouped[p.id] = { notifs: [], project: p };
                                });
                                stats.unreadMessages.forEach(n => {
                                    const match = n.link.match(/\/projects\/(\d+)\?module=board/);
                                    if (match) {
                                        const pid = parseInt(match[1]);
                                        if (grouped[pid]) {
                                            grouped[pid].notifs.push(n);
                                        }
                                    }
                                });

                                return Object.values(grouped).map((data) => (
                                    <div key={data.project.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--bg-hover)' }}
                                        onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' })}
                                        onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--border-color)', transform: 'translateY(0)' })}
                                        onClick={async () => {
                                            if (data.notifs.length > 0) {
                                                await Promise.all(data.notifs.map(n => notificationsAPI.markRead(n.id)));
                                                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                            }
                                            setShowInboxModal(false);
                                            navigate(`/projects/${data.project.id}?module=board`);
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.project.name}</span>
                                        {data.notifs.length > 0 ? (
                                            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                                {data.notifs.length} new
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No new updates</span>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Chat Modal ── */}
            {showChatModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowChatModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Unread Chats</h3>
                            <button onClick={() => setShowChatModal(false)} className="btn btn--ghost" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>You have no open projects.</p>
                            ) : (() => {
                                const grouped = {};
                                projects.forEach(p => {
                                    grouped[p.id] = { notifs: [], project: p };
                                });
                                stats.unreadChats.forEach(n => {
                                    const match = n.link.match(/\/projects\/(\d+)\?module=chat/);
                                    if (match) {
                                        const pid = parseInt(match[1]);
                                        if (grouped[pid]) {
                                            grouped[pid].notifs.push(n);
                                        }
                                    }
                                });

                                return Object.values(grouped).map((data) => (
                                    <div key={data.project.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--bg-hover)' }}
                                        onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' })}
                                        onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--border-color)', transform: 'translateY(0)' })}
                                        onClick={async () => {
                                            if (data.notifs.length > 0) {
                                                await Promise.all(data.notifs.map(n => notificationsAPI.markRead(n.id)));
                                                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                            }
                                            setShowChatModal(false);
                                            navigate(`/projects/${data.project.id}?module=chat`);
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.project.name}</span>
                                        {data.notifs.length > 0 ? (
                                            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                                {data.notifs.length} new
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No new updates</span>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {/* ── Ticket Modal ── */}
            {showTicketModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowTicketModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Tickets</h3>
                            <button onClick={() => setShowTicketModal(false)} className="btn btn--ghost" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>You have no open projects.</p>
                            ) : (() => {
                                const grouped = {};
                                projects.forEach(p => {
                                    grouped[p.id] = { notifs: [], project: p, taskIds: new Set() };
                                });
                                stats.unreadTickets.forEach(n => {
                                    // Extract pid and tid from link: /projects/1?module=tasks&taskId=2...
                                    const pMatch = n.link?.match(/\/projects\/(\d+)/);
                                    const tMatch = n.link?.match(/taskId=(\d+)/);
                                    
                                    const pid = pMatch ? parseInt(pMatch[1]) : null;
                                    const tid = tMatch ? parseInt(tMatch[1]) : null;

                                    if (pid && grouped[pid]) {
                                        grouped[pid].notifs.push(n);
                                        if (tid) grouped[pid].taskIds.add(tid);
                                    }
                                });

                                return Object.values(grouped).map((data) => (
                                    <div key={data.project.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--bg-hover)' }}
                                        onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' })}
                                        onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--border-color)', transform: 'translateY(0)' })}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (data.notifs.length > 0) {
                                                await Promise.all(data.notifs.map(n => notificationsAPI.markRead(n.id)));
                                                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                                            }
                                            setShowTicketModal(false);
                                            
                                            // Take the first taskId for deep-linking if multiple exist
                                            const firstTaskId = data.taskIds.size > 0 ? Array.from(data.taskIds)[0] : null;
                                            navigate(`/projects/${data.project.id}?module=tasks`, { state: { activeModule: 'tasks', openTaskId: firstTaskId } });
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.project.name}</span>
                                            {data.taskIds.size > 0 && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {data.taskIds.size} task{data.taskIds.size > 1 ? 's' : ''} with updates
                                                </span>
                                            )}
                                        </div>
                                        {data.notifs.length > 0 ? (
                                            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                                {data.notifs.length}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No new updates</span>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {showTasksModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowTasksModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Select Project</h3>
                            <button onClick={() => setShowTasksModal(false)} className="btn btn--ghost" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>You have no open projects.</p>
                            ) : (() => {
                                const ACTIVE_STATUS_LIST = ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW'];
                                const projectTaskCounts = {};
                                tasks.forEach(t => {
                                    if (!ACTIVE_STATUS_LIST.includes(t.status)) return;
                                    const pid = t.project?.id || t.project;
                                    if (pid && (user?.role === 'PM' || user?.role === 'SU' || t.assigned_to?.id === user?.id)) {
                                        projectTaskCounts[pid] = (projectTaskCounts[pid] || 0) + 1;
                                    }
                                });

                                return projects.map((proj) => {
                                    const count = projectTaskCounts[proj.id] || 0;
                                    return (
                                        <div key={proj.id}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--bg-hover)' }}
                                            onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' })}
                                            onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--border-color)', transform: 'translateY(0)' })}
                                            onClick={() => {
                                                setShowTasksModal(false);
                                                navigate(`/projects/${proj.id}?module=tasks`, { state: { activeModule: 'tasks' } });
                                            }}
                                        >
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</span>
                                            <span style={{ backgroundColor: count > 0 ? 'var(--color-primary)' : 'var(--color-primary-bg)', color: count > 0 ? 'white' : 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, border: count === 0 ? '1px solid var(--color-primary)' : 'none' }}>
                                                {count} active task{count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Project Logs Modal ── */}
            {showLogsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowLogsModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Project Logs</h3>
                            <button onClick={() => setShowLogsModal(false)} className="btn btn--ghost" style={{ padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>Select a project to view its audit trail.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>You have no open projects.</p>
                            ) : projects.map(proj => (
                                <div key={proj.id}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'var(--bg-hover)' }}
                                    onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--color-primary)', transform: 'translateY(-2px)' })}
                                    onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--border-color)', transform: 'translateY(0)' })}
                                    onClick={() => {
                                        setShowLogsModal(false);
                                        navigate(`/projects/${proj.id}?module=logs`, { state: { activeModule: 'logs' } });
                                    }}
                                >
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                        <ClipboardList size={14} /> View Logs
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Leaves Modal Removed ── */}
        </div>
    );
}