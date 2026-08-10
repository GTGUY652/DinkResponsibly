import React, { useState } from 'react';
import { MessageSquareText, X, Send, CheckCircle2 } from 'lucide-react';
import './FloatingTicketModal.css';

export const FloatingTicketModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setIsOpen(false);
      setGuestName('');
      setGuestEmail('');
      setSubject('');
      setMessage('');
    }, 3000);
  };

  return (
    <>
      {/* Round Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="floating-ticket-btn"
        title="Send a Support Ticket to Owner"
      >
        <MessageSquareText size={24} />
      </button>

      {/* Slide-Up Popup Modal */}
      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Support Ticket</h3>
              <button onClick={() => setIsOpen(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>

            {sent ? (
              <div className="modal-body success-view">
                <CheckCircle2 size={40} className="text-accent" />
                <h4>Ticket Submitted</h4>
                <p>We received your message. We will reply to your email shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="modal-body modal-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Your email address"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Inquiry topic"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Message</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="How can we help you?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary full-width">
                  Submit Ticket <Send size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};