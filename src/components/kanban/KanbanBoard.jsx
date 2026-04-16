import React from 'react';
import KanbanColumn from './KanbanColumn';

const STATUSES = [
    { id: 'ASSIGNED', title: 'Assigned' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'UNDER_REVIEW', title: 'Under Review' },
    { id: 'COMPLETED', title: 'Completed' }
];

export default function KanbanBoard({ tasks, mode, currentUser, onStatusChange, onShowDetail, onShowTickets }) {

    const handleDragStart = (e, task) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('sourceStatus', task.status);
    };

    const handleDrop = (e, targetStatus) => {
        const taskIdStr = e.dataTransfer.getData('taskId');
        const sourceStatus = e.dataTransfer.getData('sourceStatus');

        if (!taskIdStr) return;
        const taskId = parseInt(taskIdStr, 10);

        if (sourceStatus === targetStatus) return; // Dropped in same column

        // Validation logic
        if (mode === 'jp') {
            // Check ownership fail-safe
            const task = tasks.find(t => t.id === taskId);
            if (task && task.assigned_to?.id !== currentUser?.id) {
                onStatusChange(null, 'error', `Access Denied: This task is assigned to ${task.assigned_to?.name || 'another user'}. Only the assignee can modify its status.`);
                return;
            }

            if (sourceStatus === 'ASSIGNED' && targetStatus === 'IN_PROGRESS') {
                onStatusChange(taskId, 'start');
            } else if (sourceStatus === 'IN_PROGRESS' && targetStatus === 'UNDER_REVIEW') {
                onStatusChange(taskId, 'submit');
            } else {
                onStatusChange(null, 'error', 'Invalid move: You can only move Assigned -> In Progress, or In Progress -> Under Review');
            }
        } else if (mode === 'tl' || mode === 'pm') {
            if (sourceStatus === 'UNDER_REVIEW' && targetStatus === 'COMPLETED') {
                onStatusChange(taskId, 'approve');
            } else if (sourceStatus === 'UNDER_REVIEW' && targetStatus === 'IN_PROGRESS') {
                onStatusChange(taskId, 'reject');
            } else {
                onStatusChange(null, 'error', 'Invalid move: Managers can only move Under Review -> Completed or back to In Progress.');
            }
        }
    };

    return (
        <div
            className="kanban-board"
            style={{
                display: 'flex',
                gap: '20px',
                overflowX: 'auto',
                paddingBottom: '16px',
                height: '100%',
            }}
        >
            {STATUSES.map(statusObj => {
                let columnTasks = tasks.filter(t => t.status === statusObj.id);

                return (
                    <KanbanColumn
                        key={statusObj.id}
                        status={statusObj.id}
                        title={statusObj.title}
                        tasks={columnTasks}
                        mode={mode}
                        currentUser={currentUser}
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onShowDetail={onShowDetail}
                        onShowTickets={onShowTickets}
                    />
                );
            })}
        </div>
    );
}
