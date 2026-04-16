import React from 'react';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ status, title, tasks, mode, currentUser, onDrop, onDragStart, onShowDetail, onShowTickets }) {
    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        onDrop(e, status);
    };

    return (
        <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
                background: 'var(--bg-hover)',
                borderRadius: '12px',
                padding: '16px',
                minWidth: '220px',
                flex: 1,
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-color)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow-sm)'
            }}
            onDragEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-body)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onDragLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--border-color)' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</h4>
                <span style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    {tasks.length}
                </span>
            </div>

            <div className="kanban-cards-container" style={{ flex: 1, overflowY: 'auto' }}>
                {tasks.map(task => (
                    <KanbanCard
                        key={task.id}
                        task={task}
                        mode={mode}
                        currentUser={currentUser}
                        onDragStart={onDragStart}
                        onShowDetail={onShowDetail}
                        onShowTickets={onShowTickets}
                    />
                ))}
            </div>
        </div>
    );
}
