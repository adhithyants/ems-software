import { useState, useEffect, useCallback } from 'react';
import { workspaceAPI, tasksAPI, leavesAPI } from '../../api/api';
import Modal from '../Modal';
import { Plus, Clock } from 'lucide-react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import CustomDatePicker from '../../components/CustomDatePicker';
import { SkeletonCard } from '../ui/Skeleton';
import CustomCalendarToolbar from '../CustomCalendarToolbar';

const DnDCalendar = withDragAndDrop(Calendar);

const PASTEL_COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#14b8a6', // Teal
];

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const CustomEvent = ({ event }) => {
    const [isHovered, setIsHovered] = useState(false);
    const itemType = event.resource.itemType;
    let icon = <Clock size={12} />;
    if (itemType === 'task') icon = <span style={{ fontSize: '10px' }}>✓</span>;
    if (itemType === 'leave') icon = <span style={{ fontSize: '10px' }}>✈</span>;

    return (
        <div
            className="rbc-custom-event"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', width: '100%' }}>
                <span style={{ 
                    flexShrink: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    opacity: 0.9
                }}>
                    {icon}
                </span>
                <span style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
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
                        {itemType === 'task' ? 'TASK' : itemType === 'leave' ? 'LEAVE' : 'EVENT'}
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{event.title}</div>

                    {itemType === 'task' && (
                        <div style={{ fontSize: '0.8rem' }}>
                            <div>Status: {event.resource.status}</div>
                            <div>Priority: {event.resource.priority}</div>
                            {event.resource.assigned_to && <div>Assignee: {event.resource.assigned_to.name}</div>}
                        </div>
                    )}

                    {itemType === 'leave' && (
                        <div style={{ fontSize: '0.8rem' }}>
                            <div>Type: {event.resource.leave_type}</div>
                            {event.resource.reason && <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{event.resource.reason}"</div>}
                        </div>
                    )}

                    {itemType === 'event' && event.resource.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {event.resource.description}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ScheduleCalendar({ projectId }) {
    const [events, setEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    // Create Mode
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', start_time: '', color: '#6366f1' });
    const [submitting, setSubmitting] = useState(false);

    // View Mode
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentView, setCurrentView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsRes, tasksRes, leavesRes] = await Promise.allSettled([
                workspaceAPI.getEvents(projectId),
                tasksAPI.list(), // Tasks are usually filtered, we'll manually filter if needed or rely on backend
                leavesAPI.getCalendarEvents()
            ]);

            if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data || []);

            // Filter tasks for this project
            if (tasksRes.status === 'fulfilled') {
                const projectTasks = (tasksRes.value.data || []).filter(t => {
                    const tProjId = typeof t.project === 'object' ? t.project?.id : t.project;
                    return tProjId === parseInt(projectId);
                });
                setTasks(projectTasks);
            }

            if (leavesRes.status === 'fulfilled') {
                // We'll show all approved leaves for now, or you could filter by team members if needed
                setLeaves(leavesRes.value.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch calendar data', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await workspaceAPI.createEvent({ project: projectId, ...newEvent });
            setShowNewEvent(false);
            setNewEvent({ title: '', description: '', start_time: '', color: '#6366f1' });
            fetchEvents();
        } catch (err) {
            console.error('Failed to create event', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectSlot = ({ start }) => {
        const defaultTime = format(start, "yyyy-MM-dd'T'HH:mm");
        setNewEvent({ title: '', description: '', start_time: defaultTime, color: '#6366f1' });
        setShowNewEvent(true);
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event.resource);
    };

    const eventPropGetter = useCallback((event) => {
        let bgColor = '#6366f1'; // Default Indigo

        if (event.resource.itemType === 'leave') {
            bgColor = '#8b5cf6'; // Purple for leaves
        } else if (event.resource.itemType === 'task') {
            const task = event.resource;
            if (task.status === 'COMPLETED') bgColor = '#10b981'; // Green
            else if (task.priority === 'URGENT' || task.priority === 'HIGH') bgColor = '#ef4444'; // Red
            else bgColor = '#3b82f6'; // Blue
        } else {
            // generic event color
            bgColor = event.resource.color || '#f59e0b'; // Amber for meetings/events
        }

        return {
            style: {
                backgroundColor: bgColor,
                borderColor: 'transparent',
                color: '#ffffff'
            }
        };
    }, []);

    const onEventDrop = async ({ event, start, end }) => {
        const itemType = event.resource.itemType;

        // Leaves cannot be dragged
        if (itemType === 'leave') return;

        try {
            if (itemType === 'task') {
                const dateStr = format(start, 'yyyy-MM-dd');
                await tasksAPI.update(event.resource.id, { due_date: dateStr });

                // Optimistic update
                setTasks(prev => prev.map(t => t.id === event.resource.id ? { ...t, due_date: dateStr } : t));
            } else if (itemType === 'event') {
                const startStr = format(start, "yyyy-MM-dd'T'HH:mm");
                // if the API requires end_time, we might calculate an endStr too based on old duration, assuming 1 hour if not present:
                await workspaceAPI.updateEvent(event.resource.id, { start_time: startStr });

                // Optimistic update
                setEvents(prev => prev.map(e => e.id === event.resource.id ? { ...e, start_time: startStr } : e));
            }
        } catch (err) {
            console.error('Failed to move item', err);
            // Optionally revert or re-fetch on error
            fetchEvents();
        }
    };

    if (loading) return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SkeletonCard style={{ height: '80px', borderRadius: '12px' }} />
            <SkeletonCard style={{ flex: 1, minHeight: '600px', borderRadius: '12px' }} />
        </div>
    );

    // Combine standard events
    const combinedEvents = [
        ...events.map(ev => {
            const startDate = new Date(ev.start_time);
            return {
                id: `event_${ev.id}`,
                title: ev.title,
                start: startDate,
                end: new Date(startDate.getTime() + 60 * 60 * 1000), // +1 hour default
                resource: { ...ev, itemType: 'event' }
            };
        }),
        ...tasks.map(t => {
            const dueDate = new Date(t.due_date + 'T00:00:00'); // Midnight for clean day boundaries
            return {
                id: `task_${t.id}`,
                title: t.name,
                start: dueDate,
                end: dueDate,
                allDay: true,
                resource: { ...t, itemType: 'task' }
            };
        }),
        ...leaves.map(l => {
            return {
                id: l.id,
                title: l.title,
                start: new Date(l.start),
                end: new Date(new Date(l.end).getTime() + 24 * 60 * 60 * 1000), // add 1 day so RBC shows it inclusive
                allDay: true,
                resource: { ...l, itemType: 'leave' }
            };
        })
    ];

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Project Calendar</h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track important dates and milestones</p>
                </div>
                <button className="btn btn--primary" onClick={() => setShowNewEvent(true)} style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 600 }}>
                    <Plus size={18} /> New Event
                </button>
            </div>

            <div className="calendar-container dashboard-calendar" style={{ flex: 1, backgroundColor: 'var(--bg-body)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)', minHeight: '600px', boxShadow: 'var(--shadow-sm)' }}>
                <style>{`
                    .dashboard-calendar .rbc-month-view {
                        border: 1px solid var(--border-color);
                        border-radius: 16px;
                        overflow: hidden;
                        background: var(--bg-card);
                        box-shadow: var(--shadow-sm);
                    }
                    .dashboard-calendar .rbc-header {
                        padding: 14px 0;
                        font-weight: 700;
                        color: var(--text-secondary);
                        border-bottom: 2px solid var(--border-color) !important;
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        letter-spacing: 1px;
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
                        border-radius: 8px;
                        padding: 6px 10px;
                        margin: 2px 6px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        transition: all 0.2s ease;
                        font-size: 0.75rem;
                        font-weight: 600;
                        border: none !important;
                    }
                    .dashboard-calendar .rbc-event:hover {
                        filter: brightness(1.05);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                        z-index: 10;
                    }
                    .dashboard-calendar .rbc-off-range-bg {
                        background: var(--bg-body) !important;
                        opacity: 0.5;
                    }
                    .dashboard-calendar .rbc-today {
                        background: color-mix(in srgb, var(--color-primary) 3%, transparent) !important;
                    }
                    .dashboard-calendar .rbc-time-view {
                        border: 1px solid var(--border-color);
                        border-radius: 16px;
                        overflow: hidden;
                        background: var(--bg-card);
                    }
                    .dashboard-calendar .rbc-agenda-view {
                        border: 1px solid var(--border-color);
                        border-radius: 16px;
                        overflow: hidden;
                        background: var(--bg-card);
                    }
                    .dashboard-calendar .rbc-agenda-table {
                        background: var(--bg-card);
                    }
                `}</style>
                <DnDCalendar
                    localizer={localizer}
                    events={combinedEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventDrop={onEventDrop}
                    resizable={false} 
                    views={['month', 'week', 'day', 'agenda']}
                    view={currentView}
                    date={currentDate}
                    onNavigate={(date) => setCurrentDate(date)}
                    onView={(view) => setCurrentView(view)}
                    eventPropGetter={eventPropGetter}
                    components={{ 
                        toolbar: CustomCalendarToolbar, 
                        event: CustomEvent,
                        month: {
                            dateHeader: ({ date, label }) => {
                                const isToday = new Date().toDateString() === date.toDateString();
                                return (
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '6px 0' }}>
                                        <span style={{
                                            width: isToday ? '30px' : 'auto',
                                            height: isToday ? '30px' : 'auto',
                                            borderRadius: isToday ? '50%' : '0',
                                            backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                                            color: isToday ? 'white' : 'inherit',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: isToday ? '800' : '600',
                                            fontSize: '0.8rem',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            }
                        }
                    }}
                    popup
                />
            </div>

            {/* Create Event Modal */}
            <Modal open={showNewEvent} onClose={() => setShowNewEvent(false)} title="Schedule Event">
                <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Event Title</label>
                        <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required autoFocus />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Description</label>
                        <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} rows={3} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Date & Time</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <CustomDatePicker
                                selectedDate={newEvent.start_time ? new Date(newEvent.start_time) : null}
                                onChange={(date) => {
                                    if (!date) return;
                                    const tzOffset = date.getTimezoneOffset() * 60000;
                                    const dateIso = new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
                                    let timePart = "09:00"; // default time if not set
                                    if (newEvent.start_time) {
                                        timePart = newEvent.start_time.split('T')[1];
                                    }
                                    setNewEvent({ ...newEvent, start_time: `${dateIso}T${timePart}` });
                                }}
                            />
                            <input
                                type="time"
                                className="input"
                                value={newEvent.start_time ? newEvent.start_time.split('T')[1] : ''}
                                onChange={(e) => {
                                    if (!newEvent.start_time) return;
                                    const datePart = newEvent.start_time.split('T')[0];
                                    setNewEvent({ ...newEvent, start_time: `${datePart}T${e.target.value}` });
                                }}
                                required
                                style={{ width: '120px' }}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Event Color</label>
                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                            {PASTEL_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setNewEvent({ ...newEvent, color })}
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: color,
                                        border: newEvent.color === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                                        cursor: 'pointer',
                                        padding: 0,
                                        outline: 'none',
                                        boxShadow: newEvent.color === color ? '0 0 0 2px var(--bg-card) inset' : 'none',
                                        transition: 'transform 0.1s'
                                    }}
                                    onMouseDown={(e) => e.target.style.transform = 'scale(0.9)'}
                                    onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowNewEvent(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Event Modal */}
            <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details">
                {selectedEvent && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{selectedEvent.title}</h4>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                {selectedEvent.description || 'No description provided.'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', background: 'var(--bg-body)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <Clock size={16} className="text-primary" />
                            <span style={{ fontWeight: 500 }}>
                                {new Date(selectedEvent.start_time).toLocaleString(undefined, {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>

                        {selectedEvent.creator_details && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Scheduled by {selectedEvent.creator_details.name}
                            </div>
                        )}

                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: selectedEvent.color || 'var(--color-primary)' }} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Event Color</span>
                        </div>

                        <div className="modal__actions">
                            <button type="button" className="btn btn--ghost" onClick={() => setSelectedEvent(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
