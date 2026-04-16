import { useState, useEffect } from 'react';
import { tasksAPI } from '../../api/api';
import { MessageSquare, Send, ArrowLeft, User, Clock } from 'lucide-react';

export default function TicketDetail({ ticketId, onClose, currentUserId, projectTeamTLId, onResolve }) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      // Assuming tasksAPI.getTickets might not give a single ticket direct route if we didn't add it to API.js
      // Let's rely on tasksAPI.getComments first and pass the ticket details if available, 
      // or implement detail fetch if needed. Since we don't have a specific `getTicket(id)` in tasksAPI yet,
      // we'll filter from the list or assume it was passed. Let's just grab the comments.
      const commentsRes = await tasksAPI.getComments(ticketId);
      setComments(commentsRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) fetchDetails();
  }, [ticketId]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await tasksAPI.createComment({ ticket: ticketId, text: newComment });
      setNewComment('');
      fetchDetails();
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div className="spinner-small" style={{ margin: '0 auto 12px' }}></div>
      <p style={{ fontSize: '0.9rem' }}>Loading ticket thread...</p>
    </div>
  );

  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      border: '1px solid var(--border-color)', 
      borderRadius: '16px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Thread Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'var(--bg-hover)', 
              border: 'none', 
              color: 'var(--text-primary)', 
              padding: '6px', 
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} color="var(--color-primary)" /> Discussion Thread
          </h4>
        </div>
        {/* We can add a resolve button here too for convenience if TL */}
      </div>
      
      {/* Comments List */}
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        maxHeight: '400px', 
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.1)'
      }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map(c => {
            const isMe = c.user_id === currentUserId;
            return (
              <div 
                key={c.id} 
                style={{ 
                  maxWidth: '85%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)', 
                  padding: '0 4px',
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {!isMe && <User size={10} />} {isMe ? 'You' : c.user_name}
                </div>
                <div style={{ 
                  background: isMe ? 'var(--color-primary)' : 'var(--bg-hover)', 
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  padding: '10px 14px', 
                  borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: isMe ? 'none' : '1px solid var(--border-color)'
                }}>
                  {c.text}
                </div>
                <div style={{ 
                  fontSize: '0.65rem', 
                  color: 'var(--text-muted)', 
                  display: 'flex', 
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  padding: '0 4px'
                }}>
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handlePostComment} 
        style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end'
        }}
      >
        <div style={{ flex: 1 }}>
          <textarea
            required
            rows="1"
            placeholder="Type your reply..."
            value={newComment}
            onChange={(e) => {
              setNewComment(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            style={{ 
              width: '100%', 
              borderRadius: '20px', 
              border: '1.5px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              padding: '10px 16px',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'none',
              maxHeight: '120px',
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim()}
          style={{ 
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: newComment.trim() ? 'var(--color-primary)' : 'var(--bg-hover)',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: newComment.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
