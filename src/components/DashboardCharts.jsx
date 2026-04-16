import { useMemo } from 'react';
import './DashboardCharts.css';

/* ─── Status color mapping ─────────────────────────────────────── */
const STATUS_COLORS = {
    ASSIGNED: { light: '#94A3B8', dark: '#64748B' },
    IN_PROGRESS: { light: '#3B82F6', dark: '#529CCA' },
    UNDER_REVIEW: { light: '#F59E0B', dark: '#D4A95A' },
    COMPLETED: { light: '#10B981', dark: '#4DAB9A' },
    NEEDS_CORRECTION: { light: '#EF4444', dark: '#D16D6A' },
};

const STATUS_LABELS = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    UNDER_REVIEW: 'Under Review',
    COMPLETED: 'Completed',
    NEEDS_CORRECTION: 'Needs Correction',
};

/* ─── 1. Task Distribution Donut ───────────────────────────────── */
export function TaskDistributionChart({ tasks = [] }) {
    const data = useMemo(() => {
        const counts = {};
        tasks.forEach(t => {
            counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return Object.entries(counts).map(([status, count]) => ({
            status,
            count,
            label: STATUS_LABELS[status] || status,
            color: STATUS_COLORS[status]?.light || '#94A3B8',
        }));
    }, [tasks]);

    const total = tasks.length;
    if (total === 0) {
        return (
            <div className="chart-card">
                <h4 className="chart-card__title">Task Distribution</h4>
                <div className="chart-card__empty">No tasks yet</div>
            </div>
        );
    }

    // Build donut segments
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let cumulativeOffset = 0;

    const segments = data.map(d => {
        const pct = d.count / total;
        const dashLength = pct * circumference;
        const offset = cumulativeOffset;
        cumulativeOffset += dashLength;
        return { ...d, pct, dashLength, offset };
    });

    return (
        <div className="chart-card">
            <h4 className="chart-card__title">Task Distribution</h4>
            <div className="donut-chart">
                <svg viewBox="0 0 160 160" className="donut-chart__svg">
                    {segments.map((seg, i) => (
                        <circle
                            key={i}
                            cx="80" cy="80" r={radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="20"
                            strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                            strokeDashoffset={-seg.offset}
                            className="donut-chart__segment"
                        />
                    ))}
                    <text x="80" y="74" textAnchor="middle" className="donut-chart__total">{total}</text>
                    <text x="80" y="92" textAnchor="middle" className="donut-chart__label">tasks</text>
                </svg>
                <div className="donut-chart__legend">
                    {segments.map((seg, i) => (
                        <div key={i} className="donut-chart__legend-item">
                            <span className="donut-chart__legend-dot" style={{ background: seg.color }} />
                            <span className="donut-chart__legend-text">{seg.label}</span>
                            <span className="donut-chart__legend-count">{seg.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── 2. Weekly Activity Bar Chart ─────────────────────────────── */
const BAR_COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
];

export function WeeklyActivityChart({ tasks = [] }) {
    const data = useMemo(() => {
        const today = new Date();
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
            // Count tasks whose due_date matches or were completed around this day
            const count = tasks.filter(t => {
                if (t.status === 'COMPLETED' && t.updated_at) {
                    return t.updated_at.slice(0, 10) === dateStr;
                }
                return false;
            }).length;
            days.push({ dateStr, dayLabel, count });
        }
        return days;
    }, [tasks]);

    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="chart-card">
            <h4 className="chart-card__title">Weekly Activity</h4>
            <div className="bar-chart">
                <div className="bar-chart__bars">
                    {data.map((d, i) => (
                        <div key={i} className="bar-chart__column">
                            <div className="bar-chart__bar-wrapper">
                                <div
                                    className="bar-chart__bar"
                                    style={{
                                        height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 0)}%`,
                                        background: `linear-gradient(180deg, ${BAR_COLORS[i % BAR_COLORS.length]}, ${BAR_COLORS[i % BAR_COLORS.length]}99)`,
                                        boxShadow: d.count > 0 ? `0 -2px 12px ${BAR_COLORS[i % BAR_COLORS.length]}33` : 'none',
                                    }}
                                    title={`${d.dayLabel}: ${d.count} completed`}
                                />
                            </div>
                            <span className="bar-chart__day">{d.dayLabel}</span>
                            <span className="bar-chart__count">{d.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── 3. Project Progress Chart ────────────────────────────────── */
export function ProjectProgressChart({ projects = [], tasks = [] }) {
    const data = useMemo(() => {
        return projects.map(p => {
            const projectTasks = tasks.filter(t => t.project?.id === p.id);
            const total = projectTasks.length;
            const completed = projectTasks.filter(t => t.status === 'COMPLETED').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { name: p.name, total, completed, pct, status: p.status };
        }).filter(p => p.total > 0).slice(0, 6); // Show top 6 projects only
    }, [projects, tasks]);

    if (data.length === 0) {
        return (
            <div className="chart-card">
                <h4 className="chart-card__title">Project Progress</h4>
                <div className="chart-card__empty">No projects with tasks</div>
            </div>
        );
    }

    return (
        <div className="chart-card">
            <h4 className="chart-card__title">Project Progress</h4>
            <div className="progress-chart">
                {data.map((p, i) => (
                    <div key={i} className="progress-chart__item">
                        <div className="progress-chart__header">
                            <span className="progress-chart__name">{p.name}</span>
                            <span className="progress-chart__stats">{p.completed}/{p.total} • {p.pct}%</span>
                        </div>
                        <div className="progress-chart__bar-bg">
                            <div
                                className="progress-chart__bar-fill"
                                style={{
                                    width: `${p.pct}%`,
                                    background: p.pct === 100
                                        ? 'var(--color-success)'
                                        : p.pct >= 50
                                            ? 'var(--color-primary)'
                                            : 'var(--color-warning)'
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
