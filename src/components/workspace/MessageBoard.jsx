import { useState, useEffect, useCallback } from 'react';
import { workspaceAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { MessageSquarePlus, Clock } from 'lucide-react';
import Modal from '../Modal';
import { SkeletonCard } from '../ui/Skeleton';

export default function MessageBoard({ projectId }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPostModal, setShowPostModal] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchMessages = useCallback(async () => {
        try {
            const res = await workspaceAPI.getMessages(projectId);
            setMessages(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await workspaceAPI.createMessage({
                project: projectId,
                title: newPost.title,
                content: newPost.content,
            });
            setShowPostModal(false);
            setNewPost({ title: '', content: '' });
            fetchMessages();
        } catch (err) {
            setError('Failed to create post. ' + (err.response?.data?.detail || ''));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SkeletonCard style={{ height: '150px' }} />
            <SkeletonCard style={{ height: '150px' }} />
        </div>
    );

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Message Board</h3>
                    <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>Discuss topics and share updates</p>
                </div>
                <button className="btn btn--primary" onClick={() => setShowPostModal(true)}>
                    <MessageSquarePlus size={18} /> New Post
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.length === 0 ? (
                    <div className="empty-state">No messages yet. Start a discussion!</div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{msg.title}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <Clock size={14} />
                                    {new Date(msg.created_at).toLocaleString()}
                                </div>
                            </div>
                            <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {msg.content}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem'
                                }}>
                                    {msg.author_details?.name?.[0]?.toUpperCase()}
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{msg.author_details?.name}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Modal open={showPostModal} onClose={() => setShowPostModal(false)} title="New Message Post">
                <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {error && <div className="alert alert--danger">{error}</div>}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Title</label>
                        <input type="text" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} required placeholder="What's on your mind?" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Message Content</label>
                        <textarea value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} required rows={5} placeholder="Write your message here..."></textarea>
                    </div>
                    <div className="modal__actions">
                        <button type="button" className="btn btn--ghost" onClick={() => setShowPostModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary" disabled={submitting}>
                            {submitting ? 'Posting...' : 'Post Message'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
