import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomCalendarToolbar({ label, onNavigate, onView, view, views }) {
    // Determine the views array if not passed by react-big-calendar directly (usually it passes an array of strings)
    const availableViews = Array.isArray(views) ? views : Object.keys(views || { month: true, week: true, day: true, agenda: true });

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button
                    type="button"
                    onClick={() => onNavigate('TODAY')}
                    style={{
                        borderRadius: '9999px',
                        padding: '6px 20px',
                        background: 'transparent',
                        border: `1px solid var(--color-primary)`,
                        color: 'var(--color-primary)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                >
                    Today
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        type="button"
                        onClick={() => onNavigate('PREV')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('NEXT')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>
                
                <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginLeft: '4px' }}>
                    {label}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-input)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {availableViews.map(v => {
                    const isActive = view === v;
                    return (
                        <button
                            key={v}
                            type="button"
                            onClick={() => onView(v)}
                            style={{
                                borderRadius: '6px',
                                padding: '6px 16px',
                                background: isActive ? 'var(--color-primary)' : 'transparent',
                                border: 'none',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: isActive ? 'var(--shadow-md)' : 'none',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--color-primary)'; }}
                            onMouseOut={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
