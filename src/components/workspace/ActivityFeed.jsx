import { useState, useEffect, useCallback } from 'react';
import { workspaceAPI } from '../../api/api';
import { Activity, Clock, Github } from 'lucide-react';
import { SkeletonCard } from '../ui/Skeleton';

export default function ActivityFeed({ projectId }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = useCallback(async () => {
        try {
            const res = await workspaceAPI.getActivity(projectId);
            setActivities(res.data || []);
        } catch (err) { }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    if (loading) return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SkeletonCard style={{ height: '80px', borderRadius: '8px' }} />
            <SkeletonCard style={{ height: '80px', borderRadius: '8px' }} />
            <SkeletonCard style={{ height: '80px', borderRadius: '8px' }} />
        </div>
    );

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ margin: 0 }}>Activity Feed</h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>Recent actions and updates</p>
            </div>

            <div style={{ position: 'relative', paddingLeft: '1rem' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '23px', width: '2px', background: 'var(--border-color)' }}></div>

                {activities.length === 0 ? (
                    <div className="empty-state">No activity logged yet.</div>
                ) : (
                    activities.map((log) => {
                        const isGithubEvent = log.action.toLowerCase().includes('push') || log.action.toLowerCase().includes('pull request');
                        const Icon = isGithubEvent ? Github : Activity;
                        const iconColor = isGithubEvent ? '#24292f' : 'var(--color-primary)';
                        const iconBorder = isGithubEvent ? '#24292f' : 'var(--color-primary)';

                        return (
                        <div key={log.id} style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid ${iconBorder}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, zIndex: 1
                            }}>
                                <Icon size={14} />
                            </div>
                            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '0.95rem' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>{log.user_details?.name || 'System'}</strong> {log.action.toLowerCase()}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                {log.description && (
                                    <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '4px' }}>
                                        "{log.description}"
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
