export default function StatCard({ icon: Icon, label, value, color, onClick }) {
    return (
        <div
            className="stat-card"
            style={{
                '--stat-color': color || 'var(--color-primary)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s',
            }}
            onClick={onClick}
            onMouseEnter={(e) => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
        >
            <div className="stat-card__content">
                <span className="stat-card__label">{label}</span>
                <span className="stat-card__value">{value}</span>
            </div>
            {Icon && (
                <div className="stat-card__icon">
                    <Icon size={24} />
                </div>
            )}
        </div>
    );
}
