import React, { useState } from 'react';
import { X, ShieldAlert, User, Mail, Phone, CheckCircle, Loader2 } from 'lucide-react';
import './TermsModal.css';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtId: string;
  bookingDate: string; // Format e.g. "Dec 20, 2026"
  timeRangeText: string;
  durationHours: number;
  totalPrice: number;
  onConfirmBooking: (guestDetails: { name: string; email: string; phone: string }) => Promise<void>;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  courtId,
  bookingDate,
  timeRangeText,
  durationHours,
  totalPrice,
  onConfirmBooking,
}) => {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrorMsg('You must acknowledge and agree to the No-Refund Policy before confirming.');
      return;
    }
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMsg('Please complete all contact details (Name, Email, Phone).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmBooking({
        name: guestName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal-card">
        <div className="modal-header">
          <ShieldAlert className="header-icon text-amber" />
          <h3>Venue Terms & Guest Checkout</h3>
          <button onClick={onClose} className="modal-close-btn" disabled={isSubmitting} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Reservation Summary */}
        <div className="modal-summary-box">
          <div className="summary-row">
            <span>Court:</span> <strong>{courtId}</strong>
          </div>
          <div className="summary-row">
            <span>Date & Time:</span> <strong>{bookingDate} ({timeRangeText})</strong>
          </div>
          <div className="summary-row">
            <span>Duration:</span> <strong>{durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}</strong>
          </div>
          <div className="summary-row total">
            <span>Total Payable:</span> <strong>₱{totalPrice.toLocaleString()}</strong>
          </div>
        </div>

        {/* Rules & Policy Section */}
        <div className="policy-box">
          <h4 className="policy-title">📌 Strict Venue Rules & No-Refund Policy</h4>
          <ul className="policy-list">
            <li><strong>Strict 1-Hour Slots:</strong> Court access ends promptly at the end of your reserved hour.</li>
            <li><strong>No-Refund Policy:</strong> Reservations are non-refundable once confirmed. Rescheduling requires 24h prior notice.</li>
            <li><strong>Proper Footwear:</strong> Non-marking court shoes are required on all courts.</li>
          </ul>
        </div>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="guest-form">
          <div className="form-group">
            <label><User size={16} /> Guest Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label><Mail size={16} /> Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. juan@example.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label><Phone size={16} /> Contact Number *</label>
            <input
              type="tel"
              required
              placeholder="e.g. 0917 123 4567"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={isSubmitting}
            />
            <label htmlFor="agreeTerms">
              I have read, understood, and accept the venue rules and <strong>No-Refund Policy</strong>.
            </label>
          </div>

          <button type="submit" className="confirm-booking-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Processing Booking...
              </>
            ) : (
              <>
                Confirm Reservation <CheckCircle size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};