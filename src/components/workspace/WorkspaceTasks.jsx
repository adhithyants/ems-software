import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { tasksAPI, teamsAPI } from '../../api/api';
import KanbanBoard from '../kanban/KanbanBoard';
import Modal from '../Modal';
import TaskTicketList from '../tickets/TaskTicketList';
import StatusBadge from '../StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Plus, UploadCloud, X, Clock, User, Calendar, FileText, Layout, Info, ShieldAlert, Filter, UserCircle, Users as UsersIcon, GitBranch } from 'lucide-react';
import CustomDatePicker from '../../components/CustomDatePicker';
import { SkeletonTable } from '../ui/Skeleton';

const PRIORITY_OPTIONS = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export default function WorkspaceTasks({ projectId, project }) {
    const { user } = useAuth();
    const location = useLocation();
    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [newTask, setNewTask] = useState({ name: '', description: '', assigned_to: '', priority: 'MEDIUM', due_date: '' });
    const [submitting, setSubmitting] = useState(false);

    const [showDetail, setShowDetail] = useState(null);
    const [showTickets, setShowTickets] = useState(null);

    // Submit work modal state
    const [showSubmitModal, setShowSubmitModal] = useState(null);
    const [showOverdueModal, setShowOverdueModal] = useState(false);
    
    // Filtering state
    const [filterWorker, setFilterWorker] = useState('all'); // 'all', 'me', or <workerId>
    const [submitData, setSubmitData] = useState({ work_description: '', git_link: '', files: [] });
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Review/Reject modal state
    const [showReviewModal, setShowReviewModal] = useState(null);
    const [reviewAction, setReviewAction] = useState('approve');
    const [rejectReason, setRejectReason] = useState('');
    const [reviewDueDate, setReviewDueDate] = useState('');
    const [reviewError, setReviewError] = useState('');

    const [kanbanError, setKanbanError] = useState(null); // { title, message }

    // Phase 6: Contextual Role Resolution
    const effectiveRole = user?.role === 'SU' ? 'SU' : project?.my_role;
    const isManagement = ['PM', 'TL', 'SU'].includes(effectiveRole);

    const fetchData = useCallback(async () => {
        try {
            const tasksRes = await tasksAPI.listByProject(projectId);
            setTasks(tasksRes.data || []);

            if (isManagement) {
                // Management can assign to anyone in the team/org depending on depth
                if (effectiveRole === 'PM' || effectiveRole === 'SU') {
                    // PMs/SUs can assign to anyone in the org
                    const usersRes = await teamsAPI.getAllUsers();
                    setTeamMembers(usersRes.data || []);
                } else if (project?.team?.id) {
                    // TLs - fetch team members for current project
                    const teamsRes = await teamsAPI.list();
                    const allTeams = teamsRes.data || [];
                    const thisTeam = allTeams.find(t => t.id === project.team.id);
                    if (thisTeam && thisTeam.members) {
                        setTeamMembers(thisTeam.members);
                    }
                }
            } else {
                 setTeamMembers([user]); // JP can only assign to self (if allowed) or see self
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    }, [projectId, project?.team?.id, user?.role]);
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle deep-linking to tickets from Dashboard
    useEffect(() => {
        if (!loading && tasks.length > 0 && location.state?.openTaskId) {
            const targetId = Number(location.state.openTaskId);
            const taskToOpen = tasks.find(t => Number(t.id) === targetId);
            if (taskToOpen) {
                setShowTickets(taskToOpen);
                // Clear state to prevent re-opening on tab switch or refresh
                window.history.replaceState({}, document.title);
            }
        }
    }, [loading, tasks, location.state]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await tasksAPI.create({
                project: projectId,
                name: newTask.name,
                description: newTask.description,
                assigned_to: newTask.assigned_to || null,
                priority: newTask.priority,
                due_date: newTask.due_date || null,
            });
            setShowCreate(false);
            setNewTask({ name: '', description: '', assigned_to: '', priority: 'MEDIUM', due_date: '' });
            fetchData();
        } catch (err) {
            console.error('Failed to create task', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKanbanStatusChange = async (taskId, action, errorMsg) => {
        if (errorMsg) {
            setKanbanError({
                title: 'Invalid Move',
                message: errorMsg
            });
            return;
        }

        // Open modals instead of auto-executing for submit and reject
        if (action === 'submit') {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.due_date) {
                const today = new Date().setHours(0,0,0,0);
                const dueDate = new Date(task.due_date).setHours(0,0,0,0);
                if (dueDate < today) {
                    setShowOverdueModal(true);
                    return;
                }
            }
            setShowSubmitModal(taskId);
            return;
        }
        if (action === 'reject') {
            setShowReviewModal(taskId);
            setReviewAction('reject');
            return;
        }
        if (action === 'approve') {
            setShowReviewModal(taskId);
            setReviewAction('approve');
            return;
        }

        // Only 'start' is auto-executed
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'IN_PROGRESS', correction_description: null } : t
        ));

        try {
            await tasksAPI.start(taskId);
            fetchData();
        } catch (err) {
            console.error('Status change failed', err);
            setTasks(originalTasks);
        }
    };

    // Handle submit work form
    const handleSubmitWork = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('work_description', submitData.work_description);
            formData.append('git_link', submitData.git_link);
            if (submitData.files) {
                submitData.files.forEach(f => formData.append('files', f));
            }
            await tasksAPI.submit(showSubmitModal, formData);
            setShowSubmitModal(null);
            setSubmitData({ work_description: '', files: [] });
            fetchData();
        } catch (err) {
            setSubmitError(err.response?.data?.detail || 'Failed to submit task.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle review (approve/reject) form
    const handleReview = async (e) => {
        e.preventDefault();
        setReviewError('');
        try {
            const data = { action: reviewAction };
            if (reviewAction === 'reject') {
                data.reason = rejectReason;
                if (reviewDueDate) data.due_date = reviewDueDate;
            }
            await tasksAPI.review(showReviewModal, data);
            setShowReviewModal(null);
            setReviewAction('approve');
            setRejectReason('');
            setReviewDueDate('');
            fetchData();
        } catch (err) {
            setReviewError(err.response?.data?.detail || 'Failed to review task.');
        }
    };

    const handleGracePeriod = async (taskId) => {
        try {
            await tasksAPI.gracePeriod(taskId);
            fetchData();
            setShowDetail(null); // Close modal to refresh view
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to grant grace period.');
        }
    };

    const isImage = (name = '') => /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(name);

    
    // Determine user's role relative to this project's team
    let boardMode = 'jp'; // Default to JP view restrictions
    if (effectiveRole === 'PM' || effectiveRole === 'SU') {
        boardMode = 'pm';
    } else if (effectiveRole === 'TL') {
        boardMode = 'tl';
    }

    if (loading) return (
        <div style={{ padding: '2rem', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexShrink: 0 }}>
                <div><div style={{ width: '150px', height: '28px', background: 'var(--bg-hover)', borderRadius: '4px', marginBottom: '8px' }}></div></div>
                <div style={{ width: '120px', height: '36px', background: 'var(--bg-hover)', borderRadius: '6px' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px', flex: 1 }}>
                <SkeletonTable style={{ minWidth: '280px', height: '400px', borderRadius: '12px', flexShrink: 0 }} />
                <SkeletonTable style={{ minWidth: '280px', height: '400px', borderRadius: '12px', flexShrink: 0 }} />
                <SkeletonTable style={{ minWidth: '280px', height: '400px', borderRadius: '12px', flexShrink: 0 }} />
                <SkeletonTable style={{ minWidth: '280px', height: '400px', borderRadius: '12px', flexShrink: 0 }} />
            </div>
        </div>
    );

    // Derived filtered tasks
    const filteredTasks = tasks.filter(task => {
        if (filterWorker === 'all') return true;
        if (filterWorker === 'me') return task.assigned_to?.id === user?.id;
        return task.assigned_to?.id === parseInt(filterWorker);
    });


    return (
        <div style={{ padding: '2rem', height: '100%', overflow: 'hidden', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexShrink: 0 }}>
                <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Project Tasks</h3>
                    <p className="text-muted" style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>Manage work via the Kanban board</p>
                </div>
                {boardMode !== 'jp' && (
                    <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} /> Assign Task
                    </button>
                )}
            </div>

            {/* Premium Filter Bar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'var(--bg-card)', 
                padding: '12px 20px', 
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                marginBottom: '24px',
                gap: '20px',
                flexWrap: 'wrap',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        background: 'rgba(255,122,0,0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <Filter size={18} color="var(--color-primary)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Work Focus</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Filter tasks by assignee</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Common "All" option */}
                    <button 
                        onClick={() => setFilterWorker('all')}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            borderColor: filterWorker === 'all' ? 'var(--color-primary)' : 'var(--border-color)',
                            background: filterWorker === 'all' ? 'rgba(255,122,0,0.1)' : 'transparent',
                            color: filterWorker === 'all' ? 'var(--color-primary)' : 'var(--text-muted)'
                        }}
                    >
                        <UsersIcon size={14} /> All Tasks
                    </button>

                    {/* JP Role: "My Tasks" Toggle */}
                    {effectiveRole === 'JP' && (
                        <button 
                            onClick={() => setFilterWorker('me')}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '999px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                border: '1px solid',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                borderColor: filterWorker === 'me' ? 'var(--color-primary)' : 'var(--border-color)',
                                background: filterWorker === 'me' ? 'rgba(255,122,0,0.1)' : 'transparent',
                                color: filterWorker === 'me' ? 'var(--color-primary)' : 'var(--text-muted)'
                            }}
                        >
                            <UserCircle size={14} /> My Tasks
                        </button>
                    )}

                    {/* Management Role: Worker Selection */}
                    {isManagement && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Worker:</span>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    value={filterWorker === 'all' || filterWorker === 'me' ? 'all' : filterWorker}
                                    onChange={(e) => setFilterWorker(e.target.value)}
                                    style={{
                                        padding: '6px 28px 6px 10px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        appearance: 'none',
                                        cursor: 'pointer',
                                        minWidth: '130px'
                                    }}
                                >
                                    <option value="all">Select Team Member...</option>
                                    {teamMembers.filter(m => m.id !== user?.id).map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                    <UserCircle size={12} color="var(--text-muted)" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Kanban area — scrollable within the panel */}
            <div style={{ flex: 1, minHeight: 0, maxHeight: 'calc(100vh - 280px)', overflow: 'hidden' }}>
                <KanbanBoard
                    tasks={filteredTasks}
                    mode={boardMode}
                    currentUser={user}
                    onStatusChange={handleKanbanStatusChange}
                    onShowDetail={setShowDetail}
                    onShowTickets={setShowTickets}
                />
            </div>

            {/* Modals */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Task" overflowVisible={true}>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Task Name</label>
                        <input type="text" value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Description</label>
                        <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={3}></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Assignee</label>
                            <select className="select" value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}>
                                <option value="">Unassigned</option>
                                {isManagement ? (
                                    teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                ) : (
                                    <option value={user?.id}>{user?.name} (Me)</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Priority</label>
                            <select className="select" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Due Date</label>
                        <CustomDatePicker
                            selectedDate={newTask.due_date ? new Date(newTask.due_date) : null}
                            preferredPlacement="right"
                            onChange={(date) => {
                                if (!date) return;
                                const tzOffset = date.getTimezoneOffset() * 60000;
                                const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
                                setNewTask({ ...newTask, due_date: localISOTime });
                            }}
                        />
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══ Kanban Error/Warning Modal ═══ */}
            <Modal 
                open={!!kanbanError} 
                onClose={() => setKanbanError(null)} 
                title={kanbanError?.title || 'Action Restricted'}
            >
                <div style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ 
                        margin: '0 auto 20px', 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <ShieldAlert size={32} color="var(--color-danger)" />
                    </div>
                    <p style={{ 
                        fontSize: '0.95rem', 
                        color: 'var(--text-primary)', 
                        lineHeight: '1.6',
                        marginBottom: '24px'
                    }}>
                        {kanbanError?.message}
                    </p>
                    <button 
                        className="btn btn--primary" 
                        style={{ width: '100%' }}
                        onClick={() => setKanbanError(null)}
                    >
                        I Understand
                    </button>
                </div>
            </Modal>

            {/* ═══ Submit Work Modal ═══ */}
            <Modal open={!!showSubmitModal} onClose={() => { setShowSubmitModal(null); setSubmitError(''); setSubmitData({ work_description: '', git_link: '', files: [] }); }} title="Submit Work">
                <form onSubmit={handleSubmitWork}>
                    {submitError && <div className="alert alert--danger">{submitError}</div>}

                    {/* Work Summary */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Work Summary <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </div>
                        <textarea
                            placeholder="Describe what you completed in detail..."
                            value={submitData.work_description}
                            onChange={(e) => setSubmitData({ ...submitData, work_description: e.target.value })}
                            required
                            rows={4}
                            style={{
                                width: '100%', borderRadius: '8px', border: '1.5px solid var(--border-color)',
                                padding: '12px 14px', fontSize: '0.95rem', color: 'var(--text-primary)',
                                backgroundColor: 'var(--bg-input)', resize: 'vertical', outline: 'none',
                                boxSizing: 'border-box', fontFamily: 'inherit',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-primary-bg)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>

                    {/* Git Link Block */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Git URL / Branch Reference
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="https://github.com/... or branch-name"
                                value={submitData.git_link}
                                onChange={(e) => setSubmitData({ ...submitData, git_link: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px 14px 12px 40px', borderRadius: '8px',
                                    border: '1.5px solid var(--border-color)', background: 'var(--bg-input)',
                                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                                    boxSizing: 'border-box', transition: 'all 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            />
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                <GitBranch size={18} color="var(--text-muted)" />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Link directly to your code for faster reviews.
                        </div>
                    </div>

                    {/* File Upload */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Attachments
                        </div>
                        <label
                            htmlFor="ws-task-files"
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                border: '2px dashed var(--color-primary-light)', borderRadius: '12px',
                                padding: '28px 20px', backgroundColor: 'var(--color-primary-bg)',
                                cursor: 'pointer', transition: 'background-color 0.2s', textAlign: 'center'
                            }}
                        >
                            <input
                                id="ws-task-files" type="file" multiple style={{ display: 'none' }}
                                onChange={(e) => {
                                    const newFiles = Array.from(e.target.files);
                                    if (newFiles.length > 0) {
                                        setSubmitData(prev => ({ ...prev, files: prev.files ? [...prev.files, ...newFiles] : newFiles }));
                                    }
                                    e.target.value = null;
                                }}
                            />
                            <UploadCloud size={28} color="var(--color-primary)" strokeWidth={1.5} />
                            <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '6px' }}>
                                Click to upload files
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                                Images, videos, code files, or documents
                            </div>
                        </label>

                        {/* Selected files list */}
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
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSubmitData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) })); }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--color-danger)', borderRadius: '4px', transition: 'background-color 0.15s' }}
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
                        <button type="button" className="btn btn--ghost" onClick={() => { setShowSubmitModal(null); setSubmitData({ work_description: '', files: [] }); }}>Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 24px', borderRadius: '8px', border: 'none', fontWeight: 600,
                                fontSize: '0.9rem', cursor: 'pointer', background: 'var(--color-success)',
                                color: '#ffffff', transition: 'background-color 0.2s', boxShadow: 'var(--shadow-sm)',
                                opacity: isSubmitting ? 0.7 : 1,
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══ Review Task Modal (Approve / Reject with reason) ═══ */}
            <Modal 
                open={!!showReviewModal} 
                onClose={() => { 
                    setShowReviewModal(null); 
                    setReviewError(''); 
                    setReviewAction('approve'); 
                    setRejectReason(''); 
                    setReviewDueDate('');
                }} 
                title="Review Task"
                overflowVisible={true}
            >
                {(() => {
                    const taskToReview = tasks.find(t => t.id === showReviewModal);
                    if (!taskToReview) return null;

                    return (
                        <div style={{ padding: '0 4px' }}>
                            {/* JP Work Summary */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    JP Work Summary
                                </div>
                                <p style={{ color: 'var(--text-primary)', fontSize: '0.93rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', margin: 0 }}>
                                    {taskToReview.work_description || 'No description provided.'}
                                </p>
                                
                                {taskToReview.git_link && (
                                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,122,0,0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,122,0,0.2)' }}>
                                        <GitBranch size={16} color="var(--color-primary)" />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Git Reference</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>
                                                {taskToReview.git_link.startsWith('http') ? (
                                                    <a href={taskToReview.git_link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{taskToReview.git_link}</a>
                                                ) : taskToReview.git_link}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Attachments */}
                            {taskToReview.attachments && taskToReview.attachments.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                        Attachments ({taskToReview.attachments.length})
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                        {taskToReview.attachments.map(att => (
                                            <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-hover)' }}>
                                                {isImage(att.file_name) ? (
                                                    <img src={att.url} alt={att.file_name} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                                                ) : (
                                                    <div style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📄</div>
                                                )}
                                                <div style={{ padding: '6px 8px', borderTop: '1px solid var(--border-color)' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }} title={att.file_name}>{att.file_name}</div>
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View Full Size ↗</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Review Form */}
                            <form onSubmit={handleReview}>
                                {reviewError && <div className="alert alert--danger">{reviewError}</div>}

                                {/* Decision toggle */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>Decision</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button type="button" onClick={() => setReviewAction('approve')} style={{
                                            padding: '14px 12px', borderRadius: '10px',
                                            border: `2px solid ${reviewAction === 'approve' ? 'var(--color-success)' : 'var(--border-color)'}`,
                                            background: reviewAction === 'approve' ? 'var(--color-success-bg)' : 'var(--bg-card)',
                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s ease',
                                        }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: reviewAction === 'approve' ? 'var(--color-success)' : 'var(--text-primary)' }}>Approve Task</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Mark as Completed</div>
                                        </button>
                                        <button type="button" onClick={() => setReviewAction('reject')} style={{
                                            padding: '14px 12px', borderRadius: '10px',
                                            border: `2px solid ${reviewAction === 'reject' ? 'var(--color-danger)' : 'var(--border-color)'}`,
                                            background: reviewAction === 'reject' ? 'var(--color-danger-bg)' : 'var(--bg-card)',
                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.18s ease',
                                        }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: reviewAction === 'reject' ? 'var(--color-danger)' : 'var(--text-primary)' }}>Request Revision</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Send back for fixes</div>
                                        </button>
                                    </div>
                                </div>

                                {/* Rejection details — conditionally rendered */}
                                {reviewAction === 'reject' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Correction Details <span style={{ color: 'var(--color-danger)' }}>*</span>
                                    </div>
                                    <textarea
                                        placeholder="Explain what the JP needs to fix..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        required
                                        rows={3}
                                        style={{
                                            width: '100%', borderRadius: '8px', border: '1.5px solid var(--border-color)',
                                            padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', outline: 'none',
                                            boxSizing: 'border-box', fontFamily: 'inherit',
                                            color: 'var(--text-primary)', backgroundColor: 'var(--bg-input)',
                                            marginBottom: '16px'
                                        }}
                                    />

                                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        New Due Date (Optional)
                                    </div>
                                    <CustomDatePicker
                                        selectedDate={reviewDueDate ? new Date(reviewDueDate) : null}
                                        preferredPlacement="right"
                                        onChange={(date) => {
                                            if (!date) {
                                                setReviewDueDate('');
                                                return;
                                            }
                                            const tzOffset = date.getTimezoneOffset() * 60000;
                                            const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
                                            setReviewDueDate(localISOTime);
                                        }}
                                    />
                                </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
                                    <button type="button" className="btn btn--ghost" onClick={() => { setShowReviewModal(null); setReviewAction('approve'); setRejectReason(''); }}>Cancel</button>
                                    <button type="submit" style={{
                                        padding: '9px 22px', borderRadius: '8px', border: 'none', fontWeight: 700,
                                        fontSize: '0.88rem', cursor: 'pointer',
                                        background: reviewAction === 'approve' ? 'var(--color-success)' : 'var(--color-primary)',
                                        color: '#fff', transition: 'background 0.18s ease',
                                    }}>
                                        {reviewAction === 'approve' ? 'Approve Task' : 'Send Feedback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    );
                })()}
            </Modal>

            {/* ═══ Enhanced Task Details Modal ═══ */}
            <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Task Details">
                {showDetail && (
                    <div className="task-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Task Title Area */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <FileText size={16} color="var(--color-primary)" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Name</span>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{showDetail.name}</h2>
                        </div>

                        {/* Task Description Area */}
                        {showDetail.description && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <Info size={16} color="var(--color-primary)" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
                                </div>
                                <div style={{ 
                                    color: 'var(--text-primary)', 
                                    fontSize: '0.9rem', 
                                    lineHeight: 1.6, 
                                    whiteSpace: 'pre-wrap', 
                                    background: 'rgba(255,255,255,0.02)', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '12px', 
                                    padding: '14px 16px',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    {showDetail.description}
                                </div>
                            </div>
                        )}

                        {/* Metadata Grid */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(2, 1fr)', 
                            gap: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '4px',
                            borderRadius: '12px'
                        }}>
                            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <User size={12} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned To</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{showDetail.assigned_to?.name}</div>
                            </div>

                            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <Layout size={12} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</span>
                                </div>
                                <StatusBadge value={showDetail.priority} />
                            </div>

                            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <Info size={12} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                                </div>
                                <StatusBadge value={showDetail.status} />
                            </div>

                            <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <Calendar size={12} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Date</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{showDetail.due_date || 'No Date'}</div>
                            </div>
                        </div>

                        {/* Git Reference Section (In Details Modal) */}
                        {showDetail.git_link && (
                            <div style={{ background: 'var(--bg-hover)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <GitBranch size={14} color="var(--color-primary)" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Code Reference</span>
                                </div>
                                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <code style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                                        {showDetail.git_link}
                                    </code>
                                    {showDetail.git_link.startsWith('http') && (
                                        <a href={showDetail.git_link} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary" style={{ borderRadius: '6px', fontSize: '0.7rem', textDecoration: 'none' }}>
                                            Visit ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Grace Period Action Section (TL ONLY) */}
                        {boardMode === 'tl' && (new Date(showDetail.due_date) < new Date().setHours(0,0,0,0)) && showDetail.status !== 'COMPLETED' && (
                            <div style={{ 
                                background: 'var(--color-warning-bg)', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                border: '1px solid var(--color-warning)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '50%', 
                                        background: 'rgba(255, 122, 0, 0.1)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        <Clock size={16} color="var(--color-warning)" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-warning)' }}>Task is Overdue</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 122, 0, 0.8)' }}>Grant a quick extension?</div>
                                    </div>
                                </div>
                                <button 
                                    className="btn btn--primary" 
                                    onClick={() => handleGracePeriod(showDetail.id)}
                                    style={{ 
                                        background: 'var(--color-warning)', 
                                        color: '#fff', 
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(255, 122, 0, 0.2)'
                                    }}
                                >
                                    Grant 2-Day Grace
                                </button>
                            </div>
                        )}

                        {/* Work Summary Section */}
                        {showDetail.work_description && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    Worker Submission
                                </div>
                                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', margin: 0 }}>
                                    {showDetail.work_description}
                                </p>
                            </div>
                        )}
                        
                        {/* Attachments UI (Existing logic reused with better spacing) */}
                        {showDetail.attachments && showDetail.attachments.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    Submission Attachments
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                    {showDetail.attachments.map(att => (
                                        <div key={att.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-card)' }}>
                                            {isImage(att.file_name) ? (
                                                <img src={att.url} alt={att.file_name} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📄</div>
                                            )}
                                            <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem' }}>
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Download File ↗</a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rejection Feedback */}
                        {showDetail.correction_description && (
                            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: '12px', padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={14} /> Refinement Required
                                </div>
                                <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                                    {showDetail.correction_description}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal open={!!showTickets} onClose={() => setShowTickets(null)} title={`Tickets: ${showTickets?.name}`}>
                {showTickets && (
                    <TaskTicketList
                        taskId={showTickets.id}
                        projectTeamTLId={project?.team?.current_tech_lead}
                        currentUserId={user?.id}
                    />
                )}
            </Modal>
            {/* ═══ Overdue Submission Block Modal ═══ */}
            <Modal open={showOverdueModal} onClose={() => setShowOverdueModal(false)} title="Submission Blocked">
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        borderRadius: '50%', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        border: '1px solid var(--color-danger)'
                    }}>
                        <ShieldAlert size={32} color="var(--color-danger)" />
                    </div>
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                        Deadline Has Passed
                    </h3>
                    
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
                        You cannot submit this task for review because it is currently <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>Overdue</span>. 
                        Please contact your <span style={{ fontWeight: 600 }}>Tech Lead</span> to request a 2-day Grace Period extension before proceeding.
                    </p>

                    <button 
                        className="btn btn--primary" 
                        onClick={() => setShowOverdueModal(false)}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 700 }}
                    >
                        Understood
                    </button>
                </div>
            </Modal>
        </div>
    );
}
