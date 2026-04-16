import { useState, useEffect } from 'react';
import { dashboardAPI } from '../../api/api';
import { AlertCircle, Bug, ShieldAlert } from 'lucide-react';
import StatCard from '../StatCard';
import { useNavigate } from 'react-router-dom';

export default function TicketDashboardStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_open_tickets: 0,
    most_blocked_tasks: [],
    bug_frequency_per_team: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardAPI.getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load ticket stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Loading ticket stats...</div>;

  return (
    <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: '600' }}>Ticket Overview</h3>

      <div className="stats-grid">
        <StatCard
          icon={AlertCircle}
          label="Total Open Tickets"
          value={stats.total_open_tickets}
          color="var(--color-danger)"
          onClick={() => navigate('/tasks')}
        />
      </div>

      <div className="cards-grid">
        <div className="card">
          <div className="card__header">
            <h3>
              <ShieldAlert size={18} style={{ color: 'var(--color-warning)' }} /> Most Blocked Tasks
            </h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {stats.most_blocked_tasks.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>No blocked tasks currently.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {stats.most_blocked_tasks.map(t => (
                  <li key={t.task_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }} title={t.title}>{t.title}</span>
                    <span className="status-badge" style={{ '--badge-color': 'var(--color-warning)' }}>
                      {t.blockers} Blockers
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h3>
              <Bug size={18} style={{ color: 'var(--color-danger)' }} /> Bug Frequency / Team
            </h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {stats.bug_frequency_per_team.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>No bugs reported yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {stats.bug_frequency_per_team.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{item.team}</span>
                    <span className="status-badge" style={{ '--badge-color': 'var(--color-danger)' }}>
                      {item.count} Bugs
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
