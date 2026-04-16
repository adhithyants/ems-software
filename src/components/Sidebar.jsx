import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, ListTodo,
    UserCircle, Shield, LogOut, ChevronLeft, ChevronRight, Calendar, Clock, UsersRound, FileText
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [isHovered, setIsHovered] = useState(false);
    const collapsed = !isHovered;
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
        navigate('/');
    };

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/attendance', label: 'Attendance', icon: Clock, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/projects', label: 'Projects', icon: FolderKanban, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/teams', label: 'Teams', icon: Users, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/leaves', label: 'Leaves', icon: Calendar, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/work-reports', label: 'Work Reports', icon: FileText, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/profile', label: 'My Profile', icon: UserCircle, roles: ['SU', 'PM', 'TL', 'JP'] },
        { to: '/roles', label: 'Admin Panel', icon: Shield, roles: ['SU'] },
    ];

    const filteredItems = navItems.filter((item) => item.roles.includes(user?.role));

    const handlePrefetch = (path) => {
        switch (path) {
            case '/dashboard': import('../pages/Dashboard'); break;
            case '/attendance': import('../pages/Attendance'); break;
            case '/projects': import('../pages/Projects'); break;
            case '/teams': import('../pages/Teams'); break;
            case '/leaves': import('../pages/Leaves'); break;
            case '/work-reports': import('../pages/WorkReportsPage'); break;
            case '/profile': import('../pages/Profile'); break;
            case '/roles': import('../pages/RolesManagement'); break;
            default: break;
        }
    };

    return (
        <aside
            className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="sidebar__header" style={{
                height: 'var(--topbar-height)',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                borderBottom: '1px solid var(--border-color)'
            }}>
                <div style={{ width: 'var(--sidebar-collapsed)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                    <span
                        className="sidebar__logo"
                        style={{
                            cursor: 'default',
                            fontSize: '1.5rem',
                            fontWeight: 700
                        }}
                    >
                        APM
                    </span>
                </div>
            </div>

            {/* Organization workspace badge */}
            {user?.organization_name && (
                <div style={{
                    margin: collapsed ? '0 12px 12px 12px' : '0 16px 12px 16px',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    backgroundColor: 'var(--color-primary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? '0' : '8px',
                    minWidth: 0,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary)',
                        flexShrink: 0,
                    }} title={`Workspace: ${user.organization_name}`} />

                    <div style={{
                        opacity: collapsed ? 0 : 1,
                        width: collapsed ? 0 : '100%',
                        transition: 'opacity 0.2s',
                        overflow: 'hidden'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workspace</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.organization_name}</div>
                    </div>
                </div>
            )}

            <nav className="sidebar__nav">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onMouseEnter={() => handlePrefetch(item.to)}
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                        title={item.label}
                    >
                        <item.icon size={20} />
                        <span className="sidebar__label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar__footer">
                <button
                    className="sidebar__link sidebar__link--logout"
                    onClick={() => setShowLogoutModal(true)}
                    disabled={isLoggingOut}
                    title="Logout"
                >
                    <LogOut size={20} />
                    <span className="sidebar__label">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="card" style={{
                        width: '400px',
                        padding: '30px',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-2xl)',
                        border: '1px solid var(--border-color)',
                        animation: 'scaleIn 0.2s ease-out',
                        backgroundColor: 'var(--bg-card)'
                    }}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            backgroundColor: 'var(--color-danger-bg)', 
                            color: 'var(--color-danger)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            margin: '0 auto 20px auto'
                        }}>
                            <LogOut size={28} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>End Workday?</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '24px' }}>
                            Are you sure you want to logout? Today's work session will be officially ended, and you won't be able to start a new attendance timer until tomorrow.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn btn--outline" 
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setShowLogoutModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn--danger" 
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? 'Logging out...' : 'Logout & End Day'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}