import { useState, useEffect, useCallback, useRef } from 'react';
import { workspaceAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { Send } from 'lucide-react';
import { SkeletonCard } from '../ui/Skeleton';

export default function ChatRoom({ projectId }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const fetchChat = useCallback(async () => {
        try {
            const res = await workspaceAPI.getChat(projectId);
            setMessages(res.data || []);
        } catch (err) { }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => {
        fetchChat();
        const interval = setInterval(fetchChat, 5000); 
        return () => clearInterval(interval);
    }, [fetchChat]);

    useEffect(() => {
        // Auto-scroll to bottom only within this container
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        try {
            await workspaceAPI.sendChat({ project: projectId, content: newMessage });
            setNewMessage('');
            fetchChat();
        } catch (err) { }
    };

    if (loading) return (
        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SkeletonCard style={{ height: '60px', borderRadius: '12px' }} />
            <SkeletonCard style={{ height: '100px', borderRadius: '12px', width: '70%', alignSelf: 'flex-end' }} />
            <SkeletonCard style={{ height: '80px', borderRadius: '12px', width: '60%' }} />
        </div>
    );

    return (
        /* FIX 1: Main container takes full available height and prevents outer scrolling */
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 200px)', // Adjust 200px based on your Layout header height
            overflow: 'hidden', 
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
        }}>
            
            {/* Header: Fixed at the top */}
            <div style={{ 
                padding: '1.25rem 1.5rem', 
                borderBottom: '1px solid var(--border-color)', 
                flexShrink: 0,
                background: 'var(--bg-card)'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Team Chat</h3>
                <p className="text-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
                    Project Discussions
                </p>
            </div>

            {/* FIX 2: Message Area - The ONLY part that scrolls */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem', 
                background: 'var(--bg-body)',
                scrollbarWidth: 'thin'
            }}>
                {messages.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = String(msg.sender_details?.id) === String(user?.id);
                        const showName = idx === 0 || messages[idx - 1].sender_details?.id !== msg.sender_details?.id;

                        return (
                            <div key={msg.id} style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: isMe ? 'flex-end' : 'flex-start' 
                            }}>
                                {showName && !isMe && (
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 600, 
                                        color: 'var(--text-muted)', 
                                        marginBottom: '4px', 
                                        marginLeft: '4px' 
                                    }}>
                                        {msg.sender_details?.name}
                                    </span>
                                )}
                                <div style={{
                                    maxWidth: '80%', 
                                    padding: '0.6rem 1rem', 
                                    borderRadius: '16px',
                                    background: isMe ? 'var(--color-primary)' : 'var(--bg-card)',
                                    color: isMe ? '#fff' : 'var(--text-primary)',
                                    border: isMe ? 'none' : '1px solid var(--border-color)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    // Notion-style bubble logic
                                    borderBottomRightRadius: isMe ? '4px' : '16px',
                                    borderBottomLeftRadius: isMe ? '16px' : '4px',
                                }}>
                                    <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{msg.content}</div>
                                    <div style={{ 
                                        fontSize: '0.6rem', 
                                        opacity: 0.7, 
                                        textAlign: 'right', 
                                        marginTop: '4px' 
                                    }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* FIX 3: Input Area - Fixed at the bottom */}
            <form onSubmit={handleSend} style={{ 
                padding: '1rem 1.5rem', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                gap: '0.75rem', 
                background: 'var(--bg-card)', 
                flexShrink: 0 
            }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    style={{ 
                        flex: 1, 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        padding: '0.6rem 1rem', 
                        outline: 'none',
                        background: 'var(--bg-body)',
                        color: 'var(--text-primary)'
                    }}
                />
                <button 
                    type="submit" 
                    disabled={!newMessage.trim()} 
                    style={{
                        background: newMessage.trim() ? 'var(--color-primary)' : 'var(--border-color)',
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '8px', 
                        padding: '0 1rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}