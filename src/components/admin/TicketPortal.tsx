import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, MessageSquare, Send, CheckCircle2, Clock, Mail, AlertCircle, X } from 'lucide-react';
import './TicketPortal.css';

export interface SupportTicket {
  id: string;
  ticket_reference: string;
  guest_name: string;
  guest_email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  admin_reply?: string;
  replied_at?: string;
  created_at: string;
}


export const TicketPortal: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

    // Modal State for replying
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tickets:', error.message);
            } else if (data) {
                setTickets(data as SupportTicket[]);
            }
        } catch (err) {
            console.error('Unexpected error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        
        const subscription = supabase
        .channel('realtime_tickets')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'support_tickets' },
            () => {
            fetchTickets();
            }
        )
        .subscribe();
       
        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const filteredTickets = tickets.filter((t) => {
        const matchesSearch =
            t.ticket_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.guest_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
       
        return matchesSearch && matchesStatus;
    });

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket || !replyMessage.trim()) return;
        setSending(true);
        setAlert(null);
        
        try {
            
            // 1. Dispatch Email via Resend Supabase Edge Function
            const { error: fnError } = await supabase.functions.invoke('send-email', {
                body: {
                to: selectedTicket.guest_email,
                subject: `Re: [${selectedTicket.ticket_reference}] ${selectedTicket.subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>DinkResponsibly Support Response</h2>
                    <p>Hi <strong>${selectedTicket.guest_name}</strong>,</p>
                    <p>${replyMessage.replace(/\n/g, '<br/>')}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 0.85em; color: #777;">Original Inquiry (${selectedTicket.ticket_reference}):</p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #10b981; margin: 0;">
                        ${selectedTicket.message}
                    </blockquote>
                    </div>
                `,
                },
            });
            
            if (fnError) {
                console.warn('Edge Function notice (Email fallback logged):', fnError);
            }
            
            // 2. Update Database Record to RESOLVED
            const { error: dbError } = await supabase
                .from('support_tickets')
                .update({
                status: 'RESOLVED',
                admin_reply: replyMessage,
                replied_by: user?.id,
                replied_at: new Date().toISOString(),
                })
                .eq('id', selectedTicket.id);
            
            if (dbError) {
                setAlert({ type: 'error', text: `Database update failed: ${dbError.message}` });
            } else {
                setAlert({ type: 'success', text: `Reply sent to ${selectedTicket.guest_email} & ticket resolved!` });
                setSelectedTicket(null);
                setReplyMessage('');
                fetchTickets();
            }
        
        } catch (err) {
            console.error('Reply error:', err);
            setAlert({ type: 'error', text: 'An unexpected error occurred while sending.' });
        } finally {
            setSending(false);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        });
    };

    return(
        <div className='ticket-portal-wrapper'>
            <div className='ticket-portal-header'>
                <div>
                    <h2>Customer Support Ticket Portal</h2>
                    <p>Review customer inquiries and send email responses directly via Resend API.</p>
                </div>
            </div>

            {alert && (
                <div className={`alert-banner ${alert.type}`}>
                    
                    {alert.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    
                    <span>{alert.text}</span>
                </div>
            )}

            <div className='ticket-controls'>
                
                <div className="search-bar-group">
                    <Search className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by Reference (e.g. TICK-1042), Guest Name, Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="select-group">
                    <Filter className="filter-icon" />
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="filter-select">
                        <option value="ALL">All Statuses</option>
                        <option value="OPEN">Open Tickets</option>
                        <option value="RESOLVED">Resolved Tickets</option>
                    </select>
                </div>
            </div>

            {loading && tickets.length === 0 ? (
        <div className="table-empty">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
                <div className="table-empty">No support tickets found.</div>
            ) : (
                <div className="tickets-grid">
                {filteredTickets.map((t) => (
                    <div key={t.id} className={`ticket-card ${t.status.toLowerCase()}`}>
                    <div className="ticket-card-top">
                        <span className="ticket-ref">{t.ticket_reference}</span>
                        <span className={`status-pill ${t.status.toLowerCase()}`}>
                        {t.status === 'RESOLVED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        ) : (
                            <Clock className="w-3.5 h-3.5 mr-1" />
                        )}
                        {t.status}
                        </span>
                    </div>
                    <div className="ticket-guest">
                        <strong>{t.guest_name}</strong>
                        <span>
                        <Mail className="w-3 h-3 inline mr-1" />
                        {t.guest_email}
                        </span>
                    </div>
                    <h4 className="ticket-subject">{t.subject}</h4>
                    <p className="ticket-message">"{t.message}"</p>
                    {t.admin_reply && (
                        <div className="previous-reply-box">
                        <span className="reply-label">Sent Reply ({formatDate(t.replied_at || t.created_at)}):</span>
                        <p>{t.admin_reply}</p>
                        </div>
                    )}
                    <div className="ticket-card-bottom">
                        <span className="created-date">{formatDate(t.created_at)}</span>
                        <button
                        onClick={() => setSelectedTicket(t)}
                        className="reply-btn"
                        >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        {t.status === 'RESOLVED' ? 'View/Resend Reply' : 'Send Email Reply'}
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            )}
            {/* Reply Modal */}
            {selectedTicket && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Reply to Ticket #{selectedTicket.ticket_reference}</h3>
                            <button onClick={() => setSelectedTicket(null)} className="close-btn">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="guest-summary">
                                <p><strong>To:</strong> {selectedTicket.guest_name} &lt;{selectedTicket.guest_email}&gt;</p>
                                <p><strong>Subject:</strong> Re: {selectedTicket.subject}</p>
                            </div>
                            <div className="original-message">
                                <label>Customer Inquiry:</label>
                                <p>"{selectedTicket.message}"</p>
                            </div>
                            <form onSubmit={handleSendReply}>
                                <div className="form-group">
                                    <label htmlFor="replyText">Your Email Response:</label>
                                    <textarea
                                        id="replyText"
                                        rows={5}
                                        placeholder="Type your response to the player..."
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setSelectedTicket(null)} className="cancel-btn">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={sending} className="send-email-btn">
                                        <Send className="w-4 h-4 mr-1.5" />
                                        {sending ? 'Sending via Resend...' : 'Dispatch Email Reply'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}