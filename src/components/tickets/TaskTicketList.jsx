import { useEffect, useState } from 'react';
import { tasksAPI } from '../../api/api';
import TaskTicketForm from './TaskTicketForm';
import TicketDetail from './TicketDetail';
import { Ticket, AlertCircle, MessageSquare, ChevronRight, CheckCircle } from 'lucide-react';

export default function TaskTicketList({ taskId, projectTeamTLId, currentUserId }) {
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const fetchTickets = async () => {
    try {
      const { data } = await tasksAPI.getTickets(taskId);
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets', err);
    }
  };

  useEffect(() => {
    if (taskId) fetchTickets();
  }, [taskId]);

  const openTicketsCount = tickets.filter(t => t.status === 'OPEN').length;
  const canCreateTicket = openTicketsCount < 3;

  const handleResolve = async (ticketId) => {
    try {
      await tasksAPI.resolveTicket(ticketId);
      fetchTickets();
      if (selectedTicketId === ticketId) setSelectedTicketId(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resolve ticket');
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
      {!selectedTicketId ? (
        <>
          {/* Header Area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={18} color="var(--color-primary)" /> Task Tickets
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: openTicketsCount >= 3 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  {openTicketsCount} / 3 Active Issues
                </span>
                {openTicketsCount >= 3 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                    Limit Reached
                  </span>
                )}
              </div>
            </div>
            
            {canCreateTicket && (
              <button
                onClick={() => setShowForm(!showForm)}
                className={`btn btn--sm ${showForm ? 'btn--ghost' : 'btn--primary'}`}
                style={{ borderRadius: '8px', padding: '8px 16px' }}
              >
                {showForm ? 'Cancel' : 'New Ticket'}
              </button>
            )}
          </div>

          {/* New Ticket Form Segment */}
          {showForm && canCreateTicket && (
            <div style={{ marginBottom: '20px' }}>
              <TaskTicketForm 
                taskId={taskId} 
                onSuccess={() => {
                  setShowForm(false);
                  fetchTickets();
                }} 
              />
            </div>
          )}

          {/* Ticket List Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tickets.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                background: 'var(--bg-hover)', 
                borderRadius: '12px', 
                border: '1px dashed var(--border-color)' 
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <Ticket size={20} color="var(--text-muted)" />
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>No tickets for this task yet.</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use tickets for blockers or clarifications.</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="card" 
                  style={{ 
                    padding: '12px 16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ 
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: ticket.ticket_type === 'BUG' ? 'var(--color-danger-bg)' : 
                                     ticket.ticket_type === 'BLOCKER' ? 'var(--color-warning-bg)' : 
                                     'rgba(var(--color-primary-rgb), 0.1)',
                        color: ticket.ticket_type === 'BUG' ? 'var(--color-danger)' : 
                               ticket.ticket_type === 'BLOCKER' ? 'var(--color-warning)' : 
                               'var(--color-primary)',
                        border: '1px solid currentColor',
                        textTransform: 'uppercase'
                      }}>
                        {ticket.ticket_type}
                      </span>
                      <span style={{ 
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: ticket.status === 'OPEN' ? 'var(--color-success-bg)' : 'var(--bg-hover)',
                        color: ticket.status === 'OPEN' ? 'var(--color-success)' : 'var(--text-muted)',
                        border: '1px solid currentColor',
                        textTransform: 'uppercase'
                      }}>
                        {ticket.status}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '0.92rem', 
                      fontWeight: 600, 
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ticket.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      By {ticket.created_by_name} • {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                     {ticket.status === 'OPEN' && currentUserId === projectTeamTLId && (
                       <button
                         onClick={() => handleResolve(ticket.id)}
                         className="btn btn--sm"
                         title="Mark as Resolved"
                         style={{ 
                            background: 'var(--color-success-bg)', 
                            color: 'var(--color-success)', 
                            border: '1px solid var(--color-success)',
                            padding: '6px'
                         }}
                       >
                         <CheckCircle size={16} />
                       </button>
                     )}
                     <button
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="btn btn--sm btn--ghost"
                        style={{ background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                     >
                        <MessageSquare size={14} /> <span>Thread</span> <ChevronRight size={14} />
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div style={{ marginTop: '0.5rem' }}>
           <button 
             onClick={() => setSelectedTicketId(null)}
             className="btn btn--ghost btn--sm"
             style={{ marginBottom: '1rem' }}
           >
             &larr; Back to Tickets
           </button>
           <TicketDetail 
              ticketId={selectedTicketId} 
              onClose={() => setSelectedTicketId(null)}
              currentUserId={currentUserId}
              projectTeamTLId={projectTeamTLId}
              onResolve={() => handleResolve(selectedTicketId)}
           />
        </div>
      )}
    </div>
  );
}
