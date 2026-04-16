import { useState } from 'react';
import { tasksAPI } from '../../api/api';
import { AlertCircle, Shield, Info, UploadCloud, Plus } from 'lucide-react';

export default function TaskTicketForm({ taskId, onSuccess }) {
  const [ticketType, setTicketType] = useState('CLARIFICATION');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('task', taskId);
      formData.append('ticket_type', ticketType);
      formData.append('description', description);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      await tasksAPI.createTicket(formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.response?.data?.task?.[0] || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {error && (
        <div style={{ 
          background: 'var(--color-danger-bg)', 
          color: 'var(--color-danger)', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid var(--color-danger)'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
            Ticket Type
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '1.5px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                appearance: 'none',
                outline: 'none'
              }}
            >
              <option value="CLARIFICATION">Clarification</option>
              <option value="BLOCKER">Blocker</option>
              <option value="BUG">Bug</option>
            </select>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              {ticketType === 'BUG' ? <AlertCircle size={16} color="var(--color-danger)" /> : 
               ticketType === 'BLOCKER' ? <Shield size={16} color="var(--color-warning)" /> : 
               <Info size={16} color="var(--color-primary)" />}
            </div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
            Attachment <span style={{ fontWeight: 400 }}>(Optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              onChange={(e) => setAttachment(e.target.files[0])}
              style={{
                width: '100%',
                opacity: 0,
                position: 'absolute',
                inset: 0,
                cursor: 'pointer',
                zIndex: 2
              }}
            />
            <div style={{ 
              padding: '8px 12px', 
              borderRadius: '10px', 
              border: '1.5px solid var(--border-color)', 
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem'
            }}>
              <UploadCloud size={16} color="var(--text-muted)" />
              <span style={{ color: attachment ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {attachment ? attachment.name : 'Choose file...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
          Problem Description
        </label>
        <textarea
          required
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail..."
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1.5px solid var(--border-color)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            resize: 'vertical',
            minHeight: '80px',
            fontFamily: 'inherit'
          }}
        ></textarea>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="btn"
          style={{ 
            background: 'var(--color-success)', 
            color: '#fff', 
            padding: '10px 24px', 
            borderRadius: '10px', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            opacity: (loading || !description.trim()) ? 0.6 : 1,
            cursor: (loading || !description.trim()) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
          }}
        >
          {loading ? 'Creating...' : <><Plus size={18} /> Create Ticket</>}
        </button>
      </div>
    </form>
  );
}
