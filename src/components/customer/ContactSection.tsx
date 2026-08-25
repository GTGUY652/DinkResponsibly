import React, { useState } from 'react';
import { Phone, Mail, Globe, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import './ContactSection.css';

export const ContactSection: React.FC = () => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const ticketRef = 'TICK-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabase.from('support_tickets').insert([{
        ticket_reference: ticketRef,
        guest_name: guestName,
        guest_email: guestEmail,
        subject: subject,
        message: message,
        status: 'OPEN'
      }]);

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setGuestName('');
        setGuestEmail('');
        setSubject('');
        setMessage('');
      }, 4000);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert('Failed to send ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="section-container">
      <div className="section-header">
        <h2 className="section-title">Get in Touch</h2>
        <p className="section-subtitle">Reach out to the venue owner directly or send an inquiry ticket.</p>
      </div>

      <div className="contact-grid">
        {/* Contact Info Box */}
        <div className="contact-info-card">
          <h3>Contact Details</h3>
          <p className="contact-intro">Have questions about venue rates, private events, or court reservations? Contact us directly:</p>

          <div className="info-list">
            <div className="info-item">
              <Phone className="text-accent" size={20} />
              <div>
                <span className="info-label">Phone / Mobile</span>
                <span className="info-val">+63 917 123 4567</span>
              </div>
            </div>

            <div className="info-item">
              <Mail className="text-accent" size={20} />
              <div>
                <span className="info-label">Email Address</span>
                <span className="info-val">owner@dinkresponsibly.ph</span>
              </div>
            </div>

            <div className="info-item">
              <Globe className="text-accent" size={20} />
              <div>
                <span className="info-label">Facebook Page</span>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="info-link">
                  facebook.com/DinkResponsibly
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Send Ticket / Message Form */}
        <div className="contact-form-card">
          <h3>Send a Ticket / Message</h3>

          {submitted ? (
            <div className="success-banner">
              <CheckCircle2 size={32} className="text-accent" />
              <h4>Ticket Sent Successfully</h4>
              <p>Thank you for reaching out. The owner will get back to you shortly via email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="ticket-form">
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Cruz"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. juan@gmail.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rate inquiry / Court reservation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write your message or question here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary form-submit-btn">
                Send Message <Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};