const STATUS_MAP = {
    // Project statuses
    NOT_STARTED: { label: 'Not Started', color: 'var(--color-gray)' },
    IN_PROGRESS: { label: 'In Progress', color: 'var(--color-primary)' },
    ON_HOLD: { label: 'On Hold', color: 'var(--color-warning)' },
    DONE: { label: 'Done', color: 'var(--color-success)' },
    // Task statuses
    IN_REVIEW: { label: 'In Review', color: 'var(--color-warning)' },
    REJECTED: { label: 'Rejected', color: 'var(--color-danger)' },
    // Priorities
    URGENT: { label: 'Urgent', color: 'var(--color-danger)' },
    HIGH: { label: 'High', color: 'var(--color-warning)' },
    MEDIUM: { label: 'Medium', color: 'var(--color-primary)' },
    LOW: { label: 'Low', color: 'var(--color-gray)' },
    // Roles
    PM: { label: 'Project Manager', color: 'var(--color-primary)' },
    TL: { label: 'Tech Lead', color: 'var(--color-success)' },
    JP: { label: 'Junior Programmer', color: 'var(--color-warning)' },
    // Generic
    Pending: { label: 'Pending', color: 'var(--color-warning)' },
    Present: { label: 'Present', color: 'var(--color-success)' },
    Absent: { label: 'Absent', color: 'var(--color-danger)' },
};

export default function StatusBadge({ value }) {
    const config = STATUS_MAP[value] || { label: value, color: 'var(--color-gray)' };
    return (
        <span
            className="status-badge"
            style={{
                '--badge-color': config.color,
            }}
        >
            {config.label}
        </span>
    );
}
