import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../hooks/useSharedData';
import { ArrowLeft, MessageSquare, ListTodo, Calendar, MessageCircle, Activity, Folder, LayoutDashboard, Users, ShieldAlert } from 'lucide-react';
import { SkeletonCard } from '../components/ui/Skeleton';

import WorkspaceOverview from '../components/workspace/WorkspaceOverview';
import WorkspaceTasks from '../components/workspace/WorkspaceTasks';
import MessageBoard from '../components/workspace/MessageBoard';
import ScheduleCalendar from '../components/workspace/ScheduleCalendar';
import ChatRoom from '../components/workspace/ChatRoom';
import ActivityFeed from '../components/workspace/ActivityFeed';
import WorkspaceDocs from '../components/workspace/WorkspaceDocs';
import GitRepository from '../components/workspace/GitRepository';
import ProjectLogs from '../components/workspace/ProjectLogs';
import StatusBadge from '../components/StatusBadge';
import { Github, ClipboardList } from 'lucide-react';

export default function ProjectWorkspace() {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const initialModule = location.state?.activeModule || searchParams.get('module') || null;
    
    const { data: project, isLoading: loading } = useProject(id);
    const [activeModule, setActiveModuleState] = useState(initialModule);

    useEffect(() => {
        // Redirect if project load fails
        if (!loading && !project) {
            navigate('/projects');
        }
    }, [loading, project, navigate]);

    // Synchronize state with URL
    const setActiveModule = useCallback((moduleId) => {
        setActiveModuleState(moduleId);
        const newSearchParams = new URLSearchParams(window.location.search);
        if (moduleId) {
            newSearchParams.set('module', moduleId);
        } else {
            newSearchParams.delete('module');
        }
        const newRelativePathQuery = window.location.pathname + (newSearchParams.toString() ? '?' + newSearchParams.toString() : '');
        // Use replace instead of push to avoid cluttering history if desired, 
        // but navigate() with search is cleaner for React Router
        navigate({ search: newSearchParams.toString() }, { replace: true });
    }, [navigate]);

    useEffect(() => {
        // Sync state if URL changes (e.g. back button)
        const params = new URLSearchParams(location.search);
        const moduleFromUrl = params.get('module');
        if (moduleFromUrl !== activeModule) {
            setActiveModuleState(moduleFromUrl);
        }
    }, [location.search, activeModule]);

    if (loading) return (
        <div className="page" style={{ paddingTop: '2rem' }}>
            <SkeletonCard />
        </div>
    );

    if (!project) return null;

    // Phase 6: Contextual Role Resolution & Security Guard
    const effectiveRole = user?.role === 'SU' ? 'SU' : project.my_role;
    const hasAccess = !!effectiveRole;

    if (!hasAccess) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '600px' }}>
                <div style={{ textAlign: 'center', background: 'var(--bg-card)', padding: '3rem', borderRadius: '24px', border: '1px solid var(--border-color)', maxWidth: '480px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldAlert size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Access Restricted</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        You are not a member of this project. If you believe this is an error, please contact your Project Manager or Supervisor.
                    </p>
                    <button className="btn btn--primary" onClick={() => navigate('/projects')}>
                        Return to Projects
                    </button>
                </div>
            </div>
        );
    }

    const modules = [
        {
            id: 'board',
            label: 'Message Board',
            icon: MessageSquare,
            color: 'var(--color-warning)',
            bg: 'var(--color-warning-bg)',
            desc: 'Post announcements, pitch ideas, and keep updates on-the-record.'
        },
        {
            id: 'tasks',
            label: 'Tasks',
            icon: ListTodo,
            color: 'var(--color-success)',
            bg: 'var(--color-success-bg)',
            desc: 'Manage project tasks across different stages using the interactive Kanban board.'
        },
        {
            id: 'docs',
            label: 'Docs & Files',
            icon: Folder,
            color: 'var(--color-warning)',
            bg: 'var(--color-warning-bg)',
            desc: 'Share and organize docs, spreadsheets, images, and other files.'
        },
        {
            id: 'chat',
            label: 'Chat',
            icon: MessageCircle,
            color: 'var(--color-primary)',
            bg: 'var(--color-primary-bg)',
            desc: 'Chat casually with your team, ask questions, without ceremony.'
        },
        {
            id: 'schedule',
            label: 'Schedule',
            icon: Calendar,
            color: 'var(--color-primary)',
            bg: 'var(--color-primary-bg)',
            desc: 'Set important dates on a shared schedule and subscribe to events.'
        },
        {
            id: 'activity',
            label: 'Activity Feed',
            icon: Activity,
            color: 'var(--color-danger)',
            bg: 'var(--color-danger-bg)',
            desc: 'See everything that\'s been happening across the project.'
        },
        {
            id: 'github',
            label: 'Git Repository',
            icon: Github,
            color: '#24292f',
            bg: '#f6f8fa',
            desc: 'Track commits, pull requests, and see developer activity.'
        },
        {
            id: 'logs',
            label: 'Project Logs',
            icon: ClipboardList,
            color: 'var(--color-primary)',
            bg: 'var(--color-primary-bg)',
            desc: 'Maintain an audit trail of major events, bugs, and reports.'
        },
    ];

    return (
        <div className="page" style={{ position: 'relative', flex: 1, minHeight: 0, overflow: activeModule ? 'hidden' : 'visible', display: 'flex', flexDirection: 'column' }}>
            <style>
                {`
                    .nav-dock-btn {
                        display: flex;
                        align-items: center;
                        gap: 0;
                        padding: 0.6rem 1rem;
                        border-radius: 999px;
                        border: none;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.85rem;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        outline: none;
                    }
                    .nav-dock-btn .nav-dock-text {
                        max-width: 0;
                        opacity: 0;
                        white-space: nowrap;
                        overflow: hidden;
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .nav-dock-btn:hover, .nav-dock-btn.active {
                        gap: 0.4rem;
                    }
                    .nav-dock-btn:hover .nav-dock-text, .nav-dock-btn.active .nav-dock-text {
                        max-width: 150px;
                        opacity: 1;
                    }
                    .nav-dock-btn:hover:not(.active) {
                        background: rgba(120, 120, 120, 0.1) !important;
                        color: var(--text-primary) !important;
                    }

                    @media (max-width: 768px) {
                        .workspace-header-inner {
                            flex-direction: column;
                            align-items: flex-start !important;
                            gap: 1rem;
                        }
                        .workspace-meta-group {
                            justify-content: flex-start !important;
                            width: 100%;
                        }
                        .nav-dock-btn .nav-dock-text {
                            display: none;
                        }
                        .nav-dock-btn:hover, .nav-dock-btn.active {
                             gap: 0;
                        }
                        .nav-dock-container {
                             width: 90% !important;
                             max-width: 480px;
                        }
                    }

                    .workspace-module-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 1.75rem;
                        width: 100%;
                        padding: 0 0.5rem 2rem 0.5rem;
                        transition: all 0.3s ease;
                    }

                    @media (max-width: 1200px) {
                        .workspace-module-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 600px) {
                        .workspace-module-grid {
                            grid-template-columns: 1fr;
                            gap: 1.25rem;
                        }
                    }
                `}
            </style>

            {/* Header Area */}
            <div style={{ flexShrink: 0, paddingBottom: activeModule ? '1rem' : '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="workspace-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: activeModule ? 'center' : 'flex-start' }}>

                    {/* Left: Nav & Title */}
                    <div style={{ display: 'flex', flexDirection: activeModule ? 'row' : 'column', alignItems: activeModule ? 'center' : 'flex-start', gap: activeModule ? '1rem' : '0.25rem' }}>
                        {activeModule ? (
                            <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => setActiveModule(null)}
                            >
                                <ArrowLeft size={16} /> <span style={{ textDecoration: 'underline' }}>Back</span>
                            </button>
                        ) : null}

                        <h2 style={{ fontSize: activeModule ? '1.5rem' : '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
                            {project.name}
                        </h2>
                    </div>

                    {/* Right: Meta & Actions */}
                    <div className="workspace-meta-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: activeModule ? 0 : '1rem' }}>
                        <StatusBadge value={project.status} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'var(--bg-card)', padding: '0.3rem 0.8rem', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
                            <Users size={14} />
                            <span style={{ fontWeight: 500 }}>{project.team?.name || 'Unassigned'}</span>
                        </div>
                        {!activeModule && (
                            <button
                                className="btn btn--outline btn--sm"
                                onClick={() => setActiveModule('overview')}
                                style={{ borderRadius: '999px' }}
                            >
                                View Details
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: activeModule ? 'hidden' : 'visible', background: activeModule ? 'var(--bg-card)' : 'transparent', borderRadius: activeModule ? '12px' : '0', border: activeModule ? '1px solid var(--border-color)' : 'none', marginBottom: '1.5rem' }}>

                {!activeModule ? (
                    /* The Grid */
                    <div className="workspace-module-grid">
                        {modules.map(mod => (
                            <div
                                key={mod.id}
                                onClick={() => setActiveModule(mod.id)}
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                    e.currentTarget.style.boxShadow = '0 12px 30px -5px rgba(255, 122, 0, 0.25)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                                    {mod.label}
                                </div>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: mod.bg,
                                    color: mod.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1.5rem'
                                }}>
                                    <mod.icon size={36} strokeWidth={2.5} />
                                </div>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    {mod.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* The Active Module View */
                    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '4rem' }}>
                        {activeModule === 'overview' && <WorkspaceOverview project={project} />}
                        {activeModule === 'tasks' && <WorkspaceTasks projectId={id} project={project} />}
                        {activeModule === 'board' && <MessageBoard projectId={id} />}
                        {activeModule === 'schedule' && <ScheduleCalendar projectId={id} />}
                        {activeModule === 'chat' && <ChatRoom projectId={id} />}
                        {activeModule === 'activity' && <ActivityFeed projectId={id} />}
                        {activeModule === 'docs' && <WorkspaceDocs project={project} />}
                        {activeModule === 'github' && <GitRepository project={project} />}
                        {activeModule === 'logs' && <ProjectLogs projectId={id} project={project} />}
                    </div>
                )}
            </div>

            {/* Minimal Nav Dock (Floating) */}
            {activeModule && (
                <div className="nav-dock-container" style={{
                    position: 'fixed',
                    bottom: '1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--bg-card)',
                    padding: '0.4rem',
                    borderRadius: '999px',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-color)',
                    zIndex: 1000
                }}>
                    <button
                        onClick={() => setActiveModule('overview')}
                        title="Overview"
                        className={`nav-dock-btn ${activeModule === 'overview' ? 'active' : ''}`}
                        style={{
                            background: activeModule === 'overview' ? 'var(--color-primary)' : 'transparent',
                            color: activeModule === 'overview' ? '#fff' : 'var(--text-secondary)'
                        }}
                    >
                        <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
                        <span className="nav-dock-text">Overview</span>
                    </button>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.25rem' }}></div>
                    {modules.map(mod => (
                        <button
                            key={mod.id}
                            title={mod.label}
                            className={`nav-dock-btn ${activeModule === mod.id ? 'active' : ''}`}
                            onClick={() => setActiveModule(mod.id)}
                            style={{
                                background: activeModule === mod.id ? 'var(--color-primary)' : 'transparent',
                                color: activeModule === mod.id ? '#fff' : 'var(--text-secondary)'
                            }}
                        >
                            <mod.icon size={18} style={{ flexShrink: 0 }} />
                            <span className="nav-dock-text">{mod.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
