import React from 'react';
import { Eye, Ticket, GripVertical, AlertCircle } from 'lucide-react';

// StatusBadge logic replicated for cards
const StatusBadge = ({ value }) => {
    let color = '';
    switch (value) {
        case 'URGENT': color = 'var(--color-danger)'; break;
        case 'HIGH': color = 'var(--color-warning)'; break;
        case 'MEDIUM': color = 'var(--color-primary)'; break;
        case 'LOW': color = 'var(--color-success)'; break;
        case 'ASSIGNED': color = 'var(--color-gray)'; break;
        case 'IN_PROGRESS': color = 'var(--color-primary)'; break;
        case 'UNDER_REVIEW': color = 'var(--color-warning)'; break;
        case 'COMPLETED': color = 'var(--color-success)'; break;
        case 'REJECTED': color = 'var(--color-danger)'; break;
        default: color = 'var(--text-muted)';
    }

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color,
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            whiteSpace: 'nowrap'
        }}>
            {value?.replace(/_/g, ' ')}
        </span>
    );
};

export default function KanbanCard({ task, mode, currentUser, onDragStart, onShowDetail, onShowTickets }) {
    // Draggable constraint logic
    // JPs can only drag ASSIGNED (to IN_PROGRESS) or IN_PROGRESS (to UNDER_REVIEW via prompt)
    // AND the task must be assigned to them.
    const isOwner = task.assigned_to?.id === currentUser?.id;
    const isDraggable = (
        (mode === 'jp' && ['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && isOwner) ||
        ((mode === 'tl' || mode === 'pm') && task.status === 'UNDER_REVIEW')
    );

    return (
        <div
            className="kanban-card"
            draggable={isDraggable}
            onDragStart={(e) => onDragStart(e, task)}
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: 'var(--shadow-sm)',
                cursor: isDraggable ? 'grab' : (mode === 'jp' && !isOwner ? 'not-allowed' : 'default'),
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                opacity: (mode === 'jp' && !isOwner) ? 0.75 : 1
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 20px -5px rgba(255, 122, 0, 0.25)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
            onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="fw-600" style={{ fontSize: '0.95rem', lineHeight: '1.4', color: 'var(--text-primary)' }}>{task.name}</span>
                {isDraggable && <GripVertical size={14} color="var(--text-muted)" style={{ cursor: 'grab' }} />}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <StatusBadge value={task.priority} />
                    {task.status === 'IN_PROGRESS' && task.correction_description && (
                        <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            background: 'var(--color-danger)',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <AlertCircle size={10} strokeWidth={3} />
                            Needs Correction
                        </span>
                    )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.due_date}</span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span><strong>Proj:</strong> {task.project?.name}</span>
                <span><strong>To:</strong> {task.assigned_to?.name}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                <button
                    className="btn btn--ghost btn--sm"
                    title="View Details"
                    onClick={() => onShowDetail(task)}
                    style={{ padding: '4px' }}
                >
                    <Eye size={16} />
                </button>
                <button
                    className="btn btn--ghost btn--sm"
                    title="Tickets"
                    onClick={() => onShowTickets(task)}
                    style={{ padding: '4px', color: 'var(--color-primary)' }}
                >
                    <Ticket size={16} />
                </button>
            </div>
        </div>
    );
}
