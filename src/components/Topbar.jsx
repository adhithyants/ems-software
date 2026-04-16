import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import api, { notificationsAPI, attendanceAPI } from '../api/api';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications, useAttendanceStatus } from '../hooks/useSharedData';
import { Play, Square, Clock, Bell, X, CheckCheck, Moon, Sun, Calendar, Palette, Coffee, Utensils, Loader2, XCircle } from 'lucide-react';
import { getAccessToken } from '../lib/authStorage';


import Breadcrumbs from './ui/Breadcrumbs';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./TopbarCalendar.css";

const ROLE_LABELS = { PM: 'Project Manager', TL: 'Tech Lead', JP: 'Junior Programmer' };

const THEMES = [
    { id: 'default', name: 'Aptivora Original', color: '#FF8A00', bg: '#162118' },
    { id: 'oceanic', name: 'Oceanic Focus', color: '#0EA5E9', bg: '#0F172A' },
    { id: 'cyberpunk', name: 'Cyberpunk Pulse', color: '#EC4899', bg: '#1F112D' },
    { id: 'forest', name: 'Forest Earth', color: '#10B981', bg: '#181A18' },
    { id: 'monochrome', name: 'Monochrome', color: '#FFFFFF', bg: '#000000' }
];

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/timesheets': 'Timesheets',
    '/teams': 'Teams',
    '/leaves': 'Leaves',
    '/profile': 'My Profile',
    '/roles': 'Roles & Access',
};

export default function Topbar() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { theme, setTheme } = useTheme();

    const queryClient = useQueryClient();
    const { data: notifications = [] } = useNotifications();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const [activeSession, setActiveSession] = useState(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [breaksTaken, setBreaksTaken] = useState([]);

    const { data: statusData } = useAttendanceStatus();
    
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [showCancelBreak, setShowCancelBreak] = useState(false);
    const cancelTimerRef = useRef(null);
    
    // State for the hoverable calendar
    const [showCalendar, setShowCalendar] = useState(false);

    // Logic to sync timer from useAttendanceStatus
    useEffect(() => {
        if (statusData) {
            if (statusData.active_session) {
                setActiveSession(statusData.active_session);
                const startStr = statusData.active_session.start_time;
                const elapsed = Math.floor((new Date() - new Date(startStr)) / 1000);
                setSessionTime(elapsed > 0 ? elapsed : 0);
            } else {
                setActiveSession(null);
                setSessionTime(0);
            }
            if (statusData.breaks_taken) {
                setBreaksTaken(statusData.breaks_taken);
            }
        }
    }, [statusData]);

    // WebSocket connection for real-time updates
    useEffect(() => {
        if (!user) return;
        let ws;
        let active = true;

        const connectWebSocket = async () => {
            const token = await getAccessToken();
            if (!active || !token) return;

            // Calculate WebSocket URL dynamically based on current API base URL
            const apiBaseUrl = api.defaults.baseURL || 'http://localhost:8000/api';
            const urlObj = new URL(apiBaseUrl);
            const wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsPath = urlObj.pathname.endsWith('/api') 
                ? urlObj.pathname.replace('/api', '/ws/notifications/')
                : '/ws/notifications/';
            const wsUrl = `${wsProtocol}//${urlObj.host}${wsPath}?token=${token}`;

            ws = new WebSocket(wsUrl);

            ws.onopen = () => console.log('WebSocket connected for notifications');
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'notification') {
                    const newNotification = data.notification;
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });

                    // Show a toast when a new notification comes in
                    toast.info(`New Notification: ${newNotification.message}`);

                    // Dispatch global event so other pages can refresh their data
                    window.dispatchEvent(new CustomEvent('notificationReceived', { detail: newNotification }));
                } else if (data.type === 'silent_refresh') {
                    // Silent refresh — no toast, no badge, just tell pages to re-fetch
                    queryClient.invalidateQueries(); // Invalidate everything for silent refresh
                    window.dispatchEvent(new CustomEvent('silentRefresh', { detail: { link: data.link } }));
                }
            };
            ws.onerror = (error) => console.error('WebSocket error:', error);
            ws.onclose = () => console.log('WebSocket disconnected for notifications');
        };

        connectWebSocket();

        return () => {
            active = false;
            ws?.close();
        };
    }, [user, toast]);

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            try {
                await notificationsAPI.markRead(notification.id);
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (error) {
                console.error("Failed to mark notification as read", error);
            }
        }

        if (notification.link) {
            setIsSidebarOpen(false);
            navigate(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };


    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showBreakMenu, setShowBreakMenu] = useState(false);
    const [showThemeMenu, setShowThemeMenu] = useState(false);

    // Timer logic
    useEffect(() => {
        let interval;
        if (activeSession) {
            interval = setInterval(() => {
                setSessionTime((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const handleStartBreak = async (breakType) => {
        setIsAttendanceLoading(true);
        try {
            await api.post('/attendance/start_break/', { break_type: breakType });
            setShowBreakMenu(false);
            
            // Show cancel button for 30 seconds
            setShowCancelBreak(true);
            if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
            cancelTimerRef.current = setTimeout(() => setShowCancelBreak(false), 30000);
            
            toast.info(`Started ${breakType.replace('_', ' ')} break.`);
            queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to start break.");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const handleCancelBreak = async () => {
        setIsAttendanceLoading(true);
        try {
            await api.post('/attendance/cancel_break/');
            setShowCancelBreak(false);
            if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
            toast.success("Break canceled. Work resumed.");
            queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to cancel break.");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const handleEndBreak = async () => {
        setIsAttendanceLoading(true);
        try {
            await api.post('/attendance/end_break/');
            setShowCancelBreak(false);
            if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
            toast.success("Break ended. Resumed work.");
            queryClient.invalidateQueries({ queryKey: ['attendance', 'status'] });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to end break.");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const isWorking = activeSession?.session_type === 'WORK';
    const isOnBreak = activeSession && activeSession.session_type !== 'WORK';

    // Helper formatting for UI
    const sessionLabel = isWorking ? "Working" :
        isOnBreak ? `On Break (${activeSession.session_type.replace('_', ' ')})` :
            "Inactive";

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <header className="topbar">
            {/* Breadcrumbs instead of generic title */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <Breadcrumbs />
            </div>

            <div className="topbar__right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                
                {/* Date with Calendar Hover */}
                <div 
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setShowCalendar(true)}
                    onMouseLeave={() => setShowCalendar(false)}
                >
                    <div style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)', 
                        background: 'var(--bg-hover)', 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        cursor: 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Calendar size={14} />
                        {formattedDate}
                    </div>
                    
                    {showCalendar && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            right: 0, 
                            zIndex: 1000, 
                            paddingTop: '8px',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            <div className="topbar-datepicker" style={{ 
                                background: 'var(--bg-card)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '16px', 
                                boxShadow: 'var(--shadow-xl)',
                                overflow: 'hidden'
                            }}>
                                <DatePicker 
                                    selected={now}
                                    inline
                                    readOnly
                                />
                            </div>
                        </div>
                    )}
                </div>



                {/* Attendance & Break Tracker UI */}
                <div 
                    style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '6px 12px', borderRadius: '8px',
                        backgroundColor: isWorking ? 'var(--color-success-bg)' : isOnBreak ? 'var(--color-warning-bg)' : 'var(--bg-hover)',
                        border: `1px solid ${isWorking ? 'var(--color-success)' : isOnBreak ? 'var(--color-warning)' : 'var(--border-color)'}`,
                        position: 'relative',
                        minWidth: '240px'
                    }}>

                    <Clock size={16} color={isWorking ? 'var(--color-success)' : isOnBreak ? 'var(--color-warning)' : 'var(--text-secondary)'} />
                    <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '12px', borderRight: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.7rem', color: isWorking ? 'var(--color-success)' : isOnBreak ? 'var(--color-warning)' : 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {sessionLabel}
                        </span>
                        <span style={{
                            fontFamily: 'monospace', fontSize: '1rem',
                            color: isWorking ? 'var(--color-success)' : isOnBreak ? 'var(--color-warning)' : 'var(--text-secondary)', fontWeight: 'bold'
                        }}>
                            {formatTime(sessionTime)}
                        </span>
                    </div>

                    {isWorking && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowBreakMenu(!showBreakMenu)}
                                disabled={isAttendanceLoading}
                                className="btn-press"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', padding: '6px 12px',
                                    borderRadius: '6px', cursor: isAttendanceLoading ? 'not-allowed' : 'pointer', fontWeight: '600',
                                    opacity: isAttendanceLoading ? 0.7 : 1,
                                    fontSize: '0.85rem',
                                    minWidth: '110px',
                                    justifyContent: 'center'
                                }}
                            >
                                {isAttendanceLoading ? (
                                    <>
                                        <Loader2 size={14} className="spinner" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Square size={14} />
                                        Take Break
                                    </>
                                )}
                            </button>

                            {showBreakMenu && (
                                <div 
                                    style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '10px',
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                                        boxShadow: 'var(--shadow-xl)', zIndex: 100, minWidth: '220px',
                                        overflow: 'hidden', padding: '6px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '8px 12px', letterSpacing: '0.5px' }}>
                                        Select Break Type
                                    </div>
                                    <button
                                        onClick={() => handleStartBreak('COFFEE_1')}
                                        disabled={breaksTaken.includes('COFFEE_1') || isAttendanceLoading}
                                        className="dropdown-item-hover btn-press"
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                                            textAlign: 'left', border: 'none', background: 'none', 
                                            cursor: breaksTaken.includes('COFFEE_1') ? 'not-allowed' : 'pointer', 
                                            color: breaksTaken.includes('COFFEE_1') ? 'var(--text-muted)' : 'var(--text-primary)',
                                            borderRadius: '8px', fontSize: '0.9rem'
                                        }}
                                    >
                                        <Coffee size={16} color={breaksTaken.includes('COFFEE_1') ? 'var(--text-muted)' : 'var(--color-warning)'} />
                                        10m Coffee Break 1
                                    </button>
                                    <button
                                        onClick={() => handleStartBreak('LUNCH')}
                                        disabled={breaksTaken.includes('LUNCH') || isAttendanceLoading}
                                        className="dropdown-item-hover btn-press"
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                                            textAlign: 'left', border: 'none', background: 'none', 
                                            cursor: breaksTaken.includes('LUNCH') ? 'not-allowed' : 'pointer', 
                                            color: breaksTaken.includes('LUNCH') ? 'var(--text-muted)' : 'var(--text-primary)',
                                            borderRadius: '8px', fontSize: '0.9rem'
                                        }}
                                    >
                                        <Utensils size={16} color={breaksTaken.includes('LUNCH') ? 'var(--text-muted)' : 'var(--color-danger)'} />
                                        30m Lunch Break
                                    </button>
                                    <button
                                        onClick={() => handleStartBreak('COFFEE_2')}
                                        disabled={breaksTaken.includes('COFFEE_2') || isAttendanceLoading}
                                        className="dropdown-item-hover btn-press"
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', 
                                            textAlign: 'left', border: 'none', background: 'none', 
                                            cursor: breaksTaken.includes('COFFEE_2') ? 'not-allowed' : 'pointer', 
                                            color: breaksTaken.includes('COFFEE_2') ? 'var(--text-muted)' : 'var(--text-primary)',
                                            borderRadius: '8px', fontSize: '0.9rem'
                                        }}
                                    >
                                        <Coffee size={16} color={breaksTaken.includes('COFFEE_2') ? 'var(--text-muted)' : 'var(--color-warning)'} />
                                        10m Coffee Break 2
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isOnBreak && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleEndBreak}
                                disabled={isAttendanceLoading}
                                className="btn-press"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: 'var(--color-success)', color: 'white', border: 'none', padding: '6px 12px',
                                    borderRadius: '6px', cursor: isAttendanceLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                    opacity: isAttendanceLoading ? 0.8 : 1,
                                    fontSize: '0.85rem',
                                    minWidth: '110px',
                                    justifyContent: 'center'
                                }}
                            >
                                {isAttendanceLoading ? (
                                    <>
                                        <Loader2 size={14} className="spinner" />
                                        Resuming...
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} fill="white" />
                                        Resume Work
                                    </>
                                )}
                            </button>

                            {showCancelBreak && (
                                <button
                                    onClick={handleCancelBreak}
                                    disabled={isAttendanceLoading}
                                    className="btn-press"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', padding: '6px 12px',
                                        borderRadius: '6px', cursor: isAttendanceLoading ? 'not-allowed' : 'pointer', fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <XCircle size={14} />
                                    Cancel Break
                                </button>
                            )}
                        </div>
                    )}


                </div>

                {/* Theme Selector UI */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowThemeMenu(!showThemeMenu)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '8px', 
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', 
                            transition: 'color 0.2s', position: 'relative'
                        }}
                        title="Select Theme"
                    >
                        <Palette size={20} />
                        {/* Current theme indicator dot */}
                        <div style={{
                            position: 'absolute', bottom: '6px', right: '6px',
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)', border: '1.5px solid var(--bg-card)'
                        }} />
                    </button>

                    {showThemeMenu && (
                        <>
                            <div 
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} 
                                onClick={() => setShowThemeMenu(false)} 
                            />
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                                boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: '220px',
                                overflow: 'hidden', padding: '8px'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '8px 12px', letterSpacing: '0.5px' }}>
                                    Interface Theme
                                </div>
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            setTheme(t.id);
                                            setShowThemeMenu(false);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px',
                                            textAlign: 'left', border: 'none',
                                            background: theme === t.id ? 'var(--bg-hover)' : 'transparent',
                                            cursor: 'pointer', color: 'var(--text-primary)',
                                            borderRadius: '8px', transition: 'background 0.2s',
                                            fontWeight: theme === t.id ? '600' : '400', gap: '12px'
                                        }}
                                        onMouseEnter={e => { if (theme !== t.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                        onMouseLeave={e => { if (theme !== t.id) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        {/* Theme Preview Dot */}
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: `linear-gradient(135deg, ${t.bg} 50%, ${t.color} 50%)`,
                                            border: `1px solid ${theme === t.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            boxShadow: theme === t.id ? `0 0 8px ${t.color}40` : 'none',
                                            transform: theme === t.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s'
                                        }} />
                                        {t.name}
                                        {theme === t.id && <CheckCheck size={16} color="var(--color-primary)" style={{ marginLeft: 'auto' }} />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Notifications Bell */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '7px', right: '9px', background: 'var(--color-danger)',
                                width: '8px', height: '8px', borderRadius: '50%'
                            }}></span>
                        )}
                    </button>
                </div>

                <div
                    className="topbar__user"
                    onClick={() => navigate('/profile')}
                    style={{ cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', transition: 'opacity 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    title="Go to Profile"
                >
                    <div className="topbar__info">
                        <span className="topbar__name">{user?.name}</span>
                        <span className="topbar__role">{ROLE_LABELS[user?.role] || user?.role}</span>
                    </div>
                    <div className="topbar__avatar">
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Notification Sidebar */}
            <div style={{
                position: 'fixed', top: 0, right: isSidebarOpen ? 0 : '-350px',
                width: '320px', height: '100vh',
                backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)',
                zIndex: 1000, display: 'flex', flexDirection: 'column',
                transition: 'right 0.3s ease-in-out'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Notifications</h3>
                        {unreadCount > 0 && (
                            <span style={{
                                background: 'var(--color-danger)', color: 'white', fontSize: '0.75rem',
                                padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'
                            }}>
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                title="Mark all as read"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex' }}
                            >
                                <CheckCheck size={18} />
                            </button>
                        )}
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color="var(--text-secondary)" />
                        </button>
                    </div>
                </div>
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-body)' }}>
                    {notifications.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>No notifications yet.</p>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                style={{
                                    padding: '12px 16px', marginBottom: '12px',
                                    backgroundColor: n.is_read ? 'var(--bg-card)' : 'var(--color-primary-bg)',
                                    border: `1px solid ${n.is_read ? 'var(--border-color)' : 'var(--color-primary-light)'}`,
                                    borderRadius: '8px',
                                    boxShadow: 'var(--shadow-sm)',
                                    cursor: n.link ? 'pointer' : 'default',
                                    transition: 'background-color 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {!n.is_read && (
                                    <div style={{
                                        position: 'absolute', top: '16px', left: '8px',
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        backgroundColor: 'var(--color-primary)'
                                    }} />
                                )}
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', paddingLeft: !n.is_read ? '8px' : '0' }}>
                                    {n.message}
                                </p>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: !n.is_read ? '8px' : '0' }}>
                                    {new Date(n.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Screen Overlay */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 999 }}
                ></div>
            )}
        </header>
    );
}
