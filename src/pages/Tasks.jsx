import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, projectsAPI, teamsAPI } from '../api/api';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useLocation } from 'react-router-dom';
import { Plus, ListTodo, Search, Eye, UserCheck, User as UserIcon, UploadCloud, X, Ticket, LayoutDashboard, List } from 'lucide-react';
import KanbanBoard from '../components/kanban/KanbanBoard';
import { SkeletonTable } from '../components/ui/Skeleton';
import InlineSelect from '../components/ui/InlineSelect';
import CustomDatePicker from '../components/CustomDatePicker';

const PRIORITY_OPTIONS = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const STATUS_OPTIONS = ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'];

export default function Tasks() {
    const { user, refreshUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [showTickets, setShowTickets] = useState(null);
    const [showReview, setShowReview] = useState(null);
    const [showSubmit, setShowSubmit] = useState(null);
    const [newTask, setNewTask] = useState({
        name: '', description: '', project_id: '', assigned_to_id: '',
        priority: 'MEDIUM', due_date: '',
    });
    const [viewMode, setViewMode] = useState('board'); // 'list' or 'board'
    const [submitData, setSubmitData] = useState({ work_description: '', files: null });
    const [reviewAction, setReviewAction] = useState('approve');
    const [rejectReason, setRejectReason] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const location = useLocation();

    /* ── fetch everything: always load teams + projects for dual-role derivation ── */
    const fetchData = useCallback(async () => {
        try {
            const [tasksRes, projRes, teamsRes] = await Promise.all([
                tasksAPI.list(),
                projectsAPI.list(),
                teamsAPI.list(),
            ]);
            setTasks(tasksRes.data);
            setProjects(projRes.data);
            setTeams(teamsRes.data);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        fetchData();
        const handleNotification = (e) => {
            const notif = e.detail;
            if (notif?.link?.includes('/tasks')) {
                fetchData();
            }
        };

        window.addEventListener('notificationReceived', handleNotification);

        if (location.state?.openCreateTask) {
            setShowCreate(true);
            if (location.state?.projectId) {
                setNewTask(prev => ({ ...prev, project_id: String(location.state.projectId) }));
            }
            window.history.replaceState({}, document.title);
        }

        return () => window.removeEventListener('notificationReceived', handleNotification);
    }, [fetchData, location.state]);

    // Silently refresh user.id if missing from stale localStorage session
    useEffect(() => { if (!user?.id) refreshUser(); }, []);

    /* ═══════════════════════════════════════════════════════════
       Derive per-team roles for the logged-in user.
       Matching uses user.id when available, falls back to user.name
       for stale localStorage sessions that pre-date the id field.
       ═══════════════════════════════════════════════════════════ */
    const matchesUser = (person) => {
        if (!person) return false;
        if (user?.id) return person.id === user.id;
        return person.name === user?.name; // fallback: match by name
    };

    /* team IDs where this user is TL */
    const tlTeamIds = teams
        .filter(t => matchesUser(t.tech_lead))
        .map(t => t.id);

    /* team IDs where this user is a JP member */
    const jpTeamIds = teams
        .filter(t => t.members?.some(m => matchesUser(m)))
        .map(t => t.id);

    const isPM = user?.role === 'PM';
    /* Show TL section if user leads any team, OR global role is TL and no id derivation yet */
    const isTLSomewhere = tlTeamIds.length > 0 || (user?.role === 'TL' && teams.length === 0);
    /* Show JP section if user is member of any team */
    const isJPSomewhere = jpTeamIds.length > 0;

    /* project.id → team.id lookup */
    const projectTeamMap = {};
    projects.forEach(p => {
        const teamId = typeof p.team === 'object' ? p.team?.id : p.team;
        if (p.id && teamId) projectTeamMap[p.id] = teamId;
    });

    const getProjectTeamId = (task) => {
        const projId = typeof task.project === 'object' ? task.project?.id : task.project;
        return projId ? projectTeamMap[projId] : undefined;
    };

    /* Section A — tasks for projects in teams the user leads */
    const tlTasks = tlTeamIds.length > 0
        ? tasks.filter(t => { const tid = getProjectTeamId(t); return tid && tlTeamIds.includes(tid); })
        : (user?.role === 'TL' && teams.length === 0) ? tasks : [];

    /* Section B — tasks assigned TO this user (JP role in another team)
       Filter tasks to only those assigned to user, from projects in JP teams */
    const jpProjectIds = new Set(
        projects
            .filter(p => { const tid = typeof p.team === 'object' ? p.team?.id : p.team; return tid && jpTeamIds.includes(tid); })
            .map(p => p.id)
    );
    const myTasks = tasks.filter(t => {
        const assignedMatch = matchesUser(t.assigned_to);
        if (!assignedMatch) return false;
        // If we know JP teams, only show tasks from those projects
        if (jpTeamIds.length > 0) {
            const projId = typeof t.project === 'object' ? t.project?.id : t.project;
            return jpProjectIds.has(projId);
        }
        return true; // fallback: show all assigned tasks
    });

    /* TL projects (scoped to TL's teams, for create task form) */
    const tlProjects = tlTeamIds.length > 0
        ? projects.filter(p => { const tid = typeof p.team === 'object' ? p.team?.id : p.team; return tid && tlTeamIds.includes(tid); })
        : user?.role === 'TL' ? projects : [];


    /* ── apply search/filter ── */
    const applyFilters = (list) => list.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !filterStatus || t.status === filterStatus;
        const matchPriority = !filterPriority || t.priority === filterPriority;
        return matchSearch && matchStatus && matchPriority;
    });

    /* ── handlers ── */
    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);
        try {
            await tasksAPI.create({
                name: newTask.name,
                description: newTask.description,
                priority: newTask.priority,
                due_date: newTask.due_date,
                project: parseInt(newTask.project_id),
                assigned_to: parseInt(newTask.assigned_to_id),
            });
            setShowCreate(false);
            setNewTask({ name: '', description: '', project_id: '', assigned_to_id: '', priority: 'MEDIUM', due_date: '' });
            setSuccess('Task created successfully!');
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create task.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleStartTask = async (taskId) => {
        const originalTasks = [...tasks];
        // Optimistically update UI
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'IN_PROGRESS', correction_description: null } : t
        ));

        try {
            await tasksAPI.start(taskId);
            setSuccess('Task started!');
            // Sync quietly to pick up any other backend changes
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            // Revert on failure
            setTasks(originalTasks);
            setError(err.response?.data?.detail || 'Failed to start task.');
        }
    };

    const handlePriorityChange = async (taskId, newPriority) => {
        try {
            await tasksAPI.updatePriority(taskId, newPriority);
            setSuccess('Priority updated!');
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update priority.');
        }
    };

    // Kanban drag-and-drop handler adapter
    const handleKanbanStatusChange = (taskId, action, errorMsg) => {
        if (errorMsg) {
            toast.error(errorMsg);
            return;
        }
        if (action === 'start') {
            handleStartTask(taskId);
        } else if (action === 'submit') {
            setShowSubmit(taskId);
        } else if (action === 'approve') {
            setReviewAction('approve');
            setShowReview(taskId);
            // Could auto-approve here, but prompting ensures consistency 
            // handleReview() requires an event, so we just pop the modal
        } else if (action === 'reject') {
            setReviewAction('reject');
            setShowReview(taskId);
        }
    };

    const handleSubmitTaskForm = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('work_description', submitData.work_description);
            if (submitData.files) {
                Array.from(submitData.files).forEach(f => formData.append('files', f));
            }
            await tasksAPI.submit(showSubmit, formData);
            setSuccess('Task submitted for review!');
            setShowSubmit(null);
            setSubmitData({ work_description: '', files: null });
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit task.');
        }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = { action: reviewAction };
            if (reviewAction === 'reject') data.reason = rejectReason;
            await tasksAPI.review(showReview, data);
            setShowReview(null);
            setReviewAction('approve');
            setRejectReason('');
            setSuccess(`Task ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
            fetchData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to review task.');
        }
    };

    if (loading) return (
        <div className="page" style={{ paddingTop: '2rem' }}>
            <div className="page__header">
                <SkeletonTable rows={1} columns={1} style={{ width: '200px', height: '40px', marginBottom: '1rem' }} />
            </div>
            <SkeletonTable rows={6} columns={7} />
        </div>
    );



    /* ═══════════════════════════════════════════════════════════
       Shared TaskRow component
       ═══════════════════════════════════════════════════════════ */
    const TaskRow = ({ task, mode }) => {
        const priorityOptions = PRIORITY_OPTIONS.map(p => ({ value: p, label: p }));

        // Handle inline status selection to pop correct modals
        const handleInlineStatusChange = (newStatus) => {
            if (newStatus === task.status) return;

            if (mode === 'jp') {
                if (task.status === 'ASSIGNED' && newStatus === 'IN_PROGRESS') {
                    handleStartTask(task.id);
                } else if (task.status === 'IN_PROGRESS' && newStatus === 'UNDER_REVIEW') {
                    setShowSubmit(task.id);
                }
            } else if (mode === 'tl' || mode === 'pm') {
                if (task.status === 'UNDER_REVIEW') {
                    if (newStatus === 'COMPLETED') {
                        setReviewAction('approve');
                        setShowReview(task.id);
                    } else if (newStatus === 'IN_PROGRESS' || newStatus === 'NEEDS_CORRECTION') {
                        setReviewAction('reject');
                        setShowReview(task.id);
                    }
                }
            }
        };

        const getStatusOptions = () => {
            if (mode === 'jp') {
                if (task.status === 'ASSIGNED') return [{ value: 'ASSIGNED', label: 'ASSIGNED' }, { value: 'IN_PROGRESS', label: 'IN_PROGRESS' }];
                if (task.status === 'IN_PROGRESS') return [{ value: 'IN_PROGRESS', label: 'IN_PROGRESS' }, { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' }];
                return [{ value: task.status, label: task.status }];
            } else {
                if (task.status === 'UNDER_REVIEW') return [
                    { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' },
                    { value: 'COMPLETED', label: 'COMPLETED (Approve)' },
                    { value: 'NEEDS_CORRECTION', label: 'NEEDS CORRECTION (Reject)' }
                ];
                return [{ value: task.status, label: task.status }];
            }
        };

        return (
            <tr key={task.id}>
                <td className="fw-500">{task.name}</td>
                <td>{task.project?.name}</td>
                <td>{task.assigned_to?.name}</td>
                <td>
                    <InlineSelect
                        value={task.priority}
                        options={priorityOptions}
                        onChange={(val) => handlePriorityChange(task.id, val)}
                        disabled={mode === 'jp'}
                    />
                </td>
                <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <InlineSelect
                            value={task.status}
                            options={getStatusOptions()}
                            onChange={handleInlineStatusChange}
                            disabled={getStatusOptions().length <= 1}
                        />
                        {task.status === 'IN_PROGRESS' && task.correction_description && (
                            <span style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                background: 'var(--color-danger)',
                                color: 'white',
                                borderRadius: '4px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                            }}>
                                Needs Correction
                            </span>
                        )}
                    </div>
                </td>
                <td>{task.due_date}</td>
                <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        {/* Primary actions (JP/TL/PM) */}
                        {mode === 'jp' && task.status === 'ASSIGNED' && (
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={() => handleStartTask(task.id)}
                                style={{ whiteSpace: 'nowrap', width: '100%' }}
                            >
                                Start Work
                            </button>
                        )}
                        {mode === 'jp' && task.status === 'IN_PROGRESS' && (
                            <button
                                className="btn btn--primary btn--sm"
                                onClick={() => setShowSubmit(task.id)}
                                style={{ whiteSpace: 'nowrap', width: '100%' }}
                            >
                                Submit
                            </button>
                        )}
                        {mode === 'tl' && task.status === 'UNDER_REVIEW' && (
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={() => setShowReview(task.id)}
                                style={{ whiteSpace: 'nowrap', width: '100%' }}
                            >
                                Review
                            </button>
                        )}
                        {mode === 'pm' && task.status === 'UNDER_REVIEW' && (
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={() => setShowReview(task.id)}
                                style={{ whiteSpace: 'nowrap', width: '100%' }}
                            >
                                Review
                            </button>
                        )}

                        {/* Icon actions */}
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                                className="btn btn--ghost btn--sm"
                                title="View Details"
                                onClick={() => setShowDetail(task)}
                            >
                                <Eye size={16} />
                            </button>
                            <button
                                className="btn btn--ghost btn--sm"
                                title="Tickets"
                                onClick={() => setShowTickets(task)}
                                style={{ color: 'var(--color-primary)' }}
                            >
                                <Ticket size={16} />
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const TaskTable = ({ list, mode, emptyMsg }) => (
        <div className="card">
            <div className="table-wrapper">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Project</th>
                            <th>Assigned To</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Due Date</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applyFilters(list).map(task => (
                            <TaskRow key={task.id} task={task} mode={mode} />
                        ))}
                        {applyFilters(list).length === 0 && (
                            <tr>
                                <td colSpan={7} className="empty-row">
                                    <ListTodo size={32} />
                                    <p>{emptyMsg}</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="page">
            {/* ── Global alerts ── */}
            {success && <div className="alert alert--success">{success}</div>}
            {error && !showCreate && !showReview && <div className="alert alert--danger">{error}</div>}

            {/* ── Shared search + filter bar ── */}
            <div className="filters-row" style={{ marginBottom: '1.25rem' }}>
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <select className="select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                    <option value="">All Priorities</option>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            {/* ═══════════════════════════════════════════════════════
                PM — single unified view
                ═══════════════════════════════════════════════════════ */}
            {isPM && (
                <>
                    <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Tasks</h2>
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: viewMode === 'list' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <List size={16} /> List
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: viewMode === 'board' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'board' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <LayoutDashboard size={16} /> Board
                            </button>
                        </div>
                    </div>
                    {viewMode === 'list' ? (
                        <TaskTable
                            list={tasks}
                            mode="pm"
                            emptyMsg="No tasks found"
                        />
                    ) : (
                        <KanbanBoard
                            tasks={applyFilters(tasks)}
                            mode="pm"
                            onStatusChange={handleKanbanStatusChange}
                            onShowDetail={setShowDetail}
                            onShowTickets={setShowTickets}
                        />
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════
                Section A — Assign Tasks (TL mode)
                Visible whenever user leads at least one team
                ═══════════════════════════════════════════════════════ */}
            {!isPM && isTLSomewhere && (
                <div className="tasks-section">
                    <div className="tasks-section__header">
                        <div className="tasks-section__title">
                            <span className="tasks-section__icon tasks-section__icon--tl">
                                <UserCheck size={16} />
                            </span>
                            <div>
                                <h3>Assign Tasks</h3>
                                <span className="tasks-section__sub">Tasks you assign and review as Tech Lead</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)', marginRight: '8px' }}>
                                <button onClick={() => setViewMode('list')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: viewMode === 'list' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                    <List size={16} />
                                </button>
                                <button onClick={() => setViewMode('board')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: viewMode === 'board' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'board' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                    <LayoutDashboard size={16} />
                                </button>
                            </div>
                            <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
                                <Plus size={15} /> Assign Task
                            </button>
                        </div>
                    </div>
                    {viewMode === 'list' ? (
                        <TaskTable
                            list={tlTasks}
                            mode="tl"
                            emptyMsg="No tasks assigned in your team's projects yet"
                        />
                    ) : (
                        <KanbanBoard
                            tasks={applyFilters(tlTasks)}
                            mode="tl"
                            onStatusChange={handleKanbanStatusChange}
                            onShowDetail={setShowDetail}
                            onShowTickets={setShowTickets}
                        />
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                Section B — My Tasks (JP mode)
                Always visible when user is JP in any team
                ═══════════════════════════════════════════════════════ */}
            {!isPM && (isJPSomewhere || myTasks.length > 0) && (
                <div className="tasks-section">
                    <div className="tasks-section__header">
                        <div className="tasks-section__title">
                            <span className="tasks-section__icon tasks-section__icon--jp">
                                <UserIcon size={16} />
                            </span>
                            <div>
                                <h3>My Tasks</h3>
                                <span className="tasks-section__sub">Tasks assigned to you — start, work and submit for review</span>
                            </div>
                        </div>
                        {!isPM && !isTLSomewhere && (
                            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <button onClick={() => setViewMode('list')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: viewMode === 'list' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                    <List size={16} />
                                </button>
                                <button onClick={() => setViewMode('board')} style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: viewMode === 'board' ? 'var(--bg-hover)' : 'transparent', color: viewMode === 'board' ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                    <LayoutDashboard size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    {viewMode === 'list' ? (
                        <TaskTable
                            list={myTasks}
                            mode="jp"
                            emptyMsg="No tasks assigned to you yet"
                        />
                    ) : (
                        <KanbanBoard
                            tasks={applyFilters(myTasks)}
                            mode="jp"
                            onStatusChange={handleKanbanStatusChange}
                            onShowDetail={setShowDetail}
                            onShowTickets={setShowTickets}
                        />
                    )}
                </div>
            )}

            {/* ── Fallback: user has no team context yet ── */}
            {!isPM && !isTLSomewhere && !isJPSomewhere && myTasks.length === 0 && (
                <div className="empty-state" style={{ marginTop: '3rem' }}>
                    <ListTodo size={48} />
                    <p>No tasks or team assignments found.</p>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                Modals (shared)
                ══════════════════════════════════════════════════════ */}

            {/* Task Detail Modal */}
            <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Task Details">
                {showDetail && (
                    <div className="task-detail">
                        <div className="detail-row">
                            <span className="text-muted">Name</span>
                            <span className="fw-500">{showDetail.name}</span>
                        </div>
                        <div className="detail-row">
                            <span className="text-muted">Description</span>
                            <p>{showDetail.description}</p>
                        </div>
                        <div className="detail-grid">
                            <div className="detail-row">
                                <span className="text-muted">Project</span>
                                <span>{showDetail.project?.name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="text-muted">Assigned To</span>
                                <span>{showDetail.assigned_to?.name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="text-muted">Priority</span>
                                <StatusBadge value={showDetail.priority} />
                            </div>
                            <div className="detail-row">
                                <span className="text-muted">Status</span>
                                <StatusBadge value={showDetail.status} />
                            </div>
                            <div className="detail-row">
                                <span className="text-muted">Due Date</span>
                                <span>{showDetail.due_date}</span>
                            </div>
                            <div className="detail-row">
                                <span className="text-muted">Created</span>
                                <span>{new Date(showDetail.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        {showDetail.correction_description && (
                            <div className="detail-row detail-row--rejection">
                                <span className="text-muted">Correction Feedback</span>
                                <p className="text-danger">{showDetail.correction_description}</p>
                            </div>
                        )}
                        {showDetail.work_description && (
                            <div className="detail-row mt-3">
                                <span className="text-muted">Work Summary</span>
                                <p className="text-sm mt-1">{showDetail.work_description}</p>
                            </div>
                        )}
                        {showDetail.attachments && showDetail.attachments.length > 0 && (
                            <div className="detail-row mt-3">
                                <span className="text-muted">Attachments</span>
                                <ul className="list-disc pl-5 mt-1">
                                    {showDetail.attachments.map(att => (
                                        <li key={att.id}>
                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm line-clamp-1">
                                                {att.file_name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Task Tickets Modal */}
            <Modal open={!!showTickets} onClose={() => setShowTickets(null)} title={`Tickets: ${showTickets?.name}`}>
                {showTickets && (
                    <TaskTicketList
                        taskId={showTickets.id}
                        projectTeamTLId={showTickets.project?.team?.current_tech_lead}
                        currentUserId={user?.id}
                    />
                )}
            </Modal>

            {/* Create Task Modal — scoped to TL's projects */}
            <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); setNewTask({ name: '', description: '', project_id: '', assigned_to_id: '', priority: 'MEDIUM', due_date: '' }); }} title="Assign Task">
                <form onSubmit={handleCreate}>
                    {error && <div className="alert alert--danger">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="task-name">Task Name</label>
                        <input
                            id="task-name"
                            type="text"
                            placeholder="e.g. Implement login page"
                            value={newTask.name}
                            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="task-desc">Description</label>
                        <textarea
                            id="task-desc"
                            placeholder="Task description..."
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            required
                            rows={3}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="task-project">Project</label>
                            <select
                                id="task-project"
                                className="select"
                                value={newTask.project_id}
                                onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value, assigned_to_id: '' })}
                                required
                            >
                                <option value="">Select Project</option>
                                {/* TL only sees their own team's projects; PM sees all */}
                                {(isPM ? projects : tlProjects).map(p => (
                                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-assign">Assign To</label>
                            <select
                                id="task-assign"
                                className="select"
                                value={newTask.assigned_to_id}
                                onChange={(e) => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
                                required
                                disabled={!newTask.project_id}
                            >
                                <option value="">Select Junior Programmer</option>
                                {(() => {
                                    if (!newTask.project_id) return null;
                                    const proj = projects.find(p => p.id === parseInt(newTask.project_id));
                                    if (!proj || !proj.team) return null;
                                    const teamIdToFind = typeof proj.team === 'object' ? proj.team.id : proj.team;
                                    const team = teams.find(t => t.id === teamIdToFind);
                                    if (!team || !team.members || !Array.isArray(team.members)) return null;
                                    return team.members.map(m => (
                                        <option key={m.id || m.junior?.id} value={m.id || m.junior?.id}>
                                            {m.name || m.junior?.name}
                                        </option>
                                    ));
                                })()}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="task-priority">Priority</label>
                            <select
                                id="task-priority"
                                className="select"
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <CustomDatePicker
                                selectedDate={newTask.due_date ? new Date(newTask.due_date) : null}
                                onChange={(date) => {
                                    if (!date) return;
                                    const tzOffset = date.getTimezoneOffset() * 60000;
                                    const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
                                    setNewTask({ ...newTask, due_date: localISOTime });
                                }}
                            />
                        </div>
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={isCreating}>
                            {isCreating ? 'Assigning...' : 'Assign Task'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Submit Task Modal — Restyled */}
            <Modal open={!!showSubmit} onClose={() => { setShowSubmit(null); setError(''); setSubmitData({ work_description: '', files: [] }); }} title="Submit Work">
                <form onSubmit={handleSubmitTaskForm}>
                    {error && <div className="alert alert--danger">{error}</div>}

                    {/* Work Summary */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Work Summary <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </div>
                        <textarea
                            id="work-desc"
                            placeholder="Describe what you completed in detail..."
                            value={submitData.work_description}
                            onChange={(e) => setSubmitData({ ...submitData, work_description: e.target.value })}
                            required
                            rows={4}
                            style={{
                                width: '100%',
                                borderRadius: '8px',
                                border: '1.5px solid var(--border-color)',
                                padding: '12px 14px',
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-input)',
                                resize: 'vertical',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--color-primary)';
                                e.target.style.boxShadow = '0 0 0 3px var(--color-primary-bg)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border-color)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* File Upload Area */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Attachments (Code/Screenshots)
                        </div>
                        <label
                            htmlFor="task-files"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed var(--color-primary-light)',
                                borderRadius: '12px',
                                padding: '32px 20px',
                                backgroundColor: 'var(--color-primary-bg)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                textAlign: 'center'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-bg)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-bg)'}
                        >
                            <input
                                id="task-files"
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const newFiles = Array.from(e.target.files);
                                    if (newFiles.length > 0) {
                                        setSubmitData(prev => ({
                                            ...prev,
                                            files: prev.files ? [...prev.files, ...newFiles] : newFiles
                                        }));
                                    }
                                    e.target.value = null; // Reset input so same file can be selected again if needed
                                }}
                            />
                            <UploadCloud className="mb-2" size={32} color="#3B82F6" strokeWidth={1.5} />
                            <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                                Click to upload or drag and drop
                            </div>
                            <div style={{ color: 'var(--color-primary-light)', fontSize: '0.85rem' }}>
                                Code files, images, or documents (multiple allowed)
                            </div>
                        </label>

                        {/* Selected Files List */}
                        {submitData.files && submitData.files.length > 0 && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {submitData.files.map((file, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                        <div style={{ fontSize: '1.2rem', marginRight: '8px' }}>📄</div>
                                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {file.name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '10px' }}>
                                            {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubmitData(prev => ({
                                                    ...prev,
                                                    files: prev.files.filter((_, i) => i !== idx)
                                                }));
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--color-danger)',
                                                borderRadius: '4px',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            title="Remove file"
                                        >
                                            <X size={16} strokeWidth={2} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn btn--ghost" onClick={() => setShowSubmit(null)}>Cancel</button>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                background: 'var(--color-success)',
                                color: '#ffffff',
                                transition: 'background-color 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-success)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-success)'}
                        >
                            Submit for Review
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Review Task Modal — Restyled */}
            <Modal open={!!showReview} onClose={() => { setShowReview(null); setError(''); setReviewAction('approve'); setRejectReason(''); }} title="Review Task">
                {(() => {
                    const taskToReview = tasks.find(t => t.id === showReview);
                    if (!taskToReview) return null;

                    const isImage = (name = '') => /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name);

                    return (
                        <div style={{ padding: '0 4px' }}>

                            {/* ── Work Summary ── */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    JP Work Summary
                                </div>
                                <p style={{ color: 'var(--text-primary)', fontSize: '0.93rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', margin: 0 }}>
                                    {taskToReview.work_description || 'No description provided.'}
                                </p>
                            </div>

                            {/* ── Attachments ── */}
                            {taskToReview.attachments && taskToReview.attachments.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Attachments ({taskToReview.attachments.length})
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                        {taskToReview.attachments.map(att => (
                                            <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-hover)' }}>
                                                {isImage(att.file_name) ? (
                                                    <img
                                                        src={att.url}
                                                        alt={att.file_name}
                                                        style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }}
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                                        📄
                                                    </div>
                                                )}
                                                <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }} title={att.file_name}>
                                                        {att.file_name}
                                                    </div>
                                                    <a
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                                                    >
                                                        View Full Size ↗
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Form ── */}
                            <form onSubmit={handleReview}>
                                {error && <div className="alert alert--danger">{error}</div>}

                                {/* Decision Toggle */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Decision
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {/* Approve card */}
                                        <button
                                            type="button"
                                            onClick={() => setReviewAction('approve')}
                                            style={{
                                                padding: '14px 12px',
                                                borderRadius: '10px',
                                                border: `2px solid ${reviewAction === 'approve' ? 'var(--color-success)' : 'var(--border-color)'}`,
                                                background: reviewAction === 'approve' ? 'var(--color-success-bg)' : 'var(--bg-card)',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.18s ease',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: reviewAction === 'approve' ? 'var(--color-success)' : 'var(--text-primary)' }}>
                                                Approve Task
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Mark as Completed</div>
                                        </button>

                                        {/* Reject card */}
                                        <button
                                            type="button"
                                            onClick={() => setReviewAction('reject')}
                                            style={{
                                                padding: '14px 12px',
                                                borderRadius: '10px',
                                                border: `2px solid ${reviewAction === 'reject' ? 'var(--color-danger)' : 'var(--border-color)'}`,
                                                background: reviewAction === 'reject' ? 'var(--color-danger-bg)' : 'var(--bg-card)',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.18s ease',
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: reviewAction === 'reject' ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                                                Request Revision
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Send back for fixes</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Correction textarea — animated */}
                                <div style={{
                                    overflow: 'hidden',
                                    maxHeight: reviewAction === 'reject' ? '160px' : '0px',
                                    opacity: reviewAction === 'reject' ? 1 : 0,
                                    transition: 'max-height 0.25s ease, opacity 0.2s ease',
                                    marginBottom: reviewAction === 'reject' ? '16px' : 0,
                                }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Correction Details <span style={{ color: 'var(--color-danger)' }}>*</span>
                                    </div>
                                    <textarea
                                        placeholder="Explain what the JP needs to fix..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        required={reviewAction === 'reject'}
                                        rows={3}
                                        style={{
                                            width: '100%',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--border-color)',
                                            padding: '10px 12px',
                                            fontSize: '0.9rem',
                                            resize: 'vertical',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit',
                                            color: 'var(--text-primary)',
                                            backgroundColor: 'var(--bg-input)',
                                        }}
                                    />
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                                    <button type="button" className="btn btn--ghost" onClick={() => { setShowReview(null); setReviewAction('approve'); setRejectReason(''); }}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '9px 22px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.88rem',
                                            cursor: 'pointer',
                                            background: reviewAction === 'approve' ? 'var(--color-success)' : 'var(--color-primary)',
                                            color: '#fff',
                                            transition: 'background 0.18s ease',
                                        }}
                                    >
                                        {reviewAction === 'approve' ? 'Approve Task' : 'Send Feedback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    );
                })()}
            </Modal>

        </div >
    );
}
