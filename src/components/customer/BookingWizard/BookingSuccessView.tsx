import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Calendar, Clock, Shield, User, RefreshCw } from 'lucide-react';
import './BookingSuccessView.css';

interface BookingSuccessViewProps {
  bookingCode: string;
  courtName: string;
  displayDate: string;
  timeRangeText: string;
  durationHours: number;
  totalPrice: number;
  guestName: string;
  referenceLast4: string;
  onBookAnother: () => void;
}

export const BookingSuccessView: React.FC<BookingSuccessViewProps> = ({
  bookingCode,
  courtName,
  displayDate,
  timeRangeText,
  durationHours,
  totalPrice,
  guestName,
  referenceLast4,
  onBookAnother,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="booking-success-container">
      <div className="success-icon-badge">
        <CheckCircle2 size={44} className="text-lime" />
      </div>

      <h3 className="success-headline">Reservation Submitted!</h3>
      <p className="success-subtext">
        Your booking has been received and is pending staff receipt verification.
      </p>

      <div className="booking-code-card">
        <span className="code-card-label">Your Booking Code</span>
        <div className="code-display-row">
          <span className="booking-code-text">{bookingCode}</span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="copy-code-btn"
            title="Copy Booking Code"
          >
            {copied ? <Check size={16} className="text-lime" /> : <Copy size={16} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="success-summary-grid">
        <div className="summary-item">
          <Shield size={16} className="summary-icon text-lime" />
          <div className="summary-details">
            <span className="label">Court</span>
            <strong className="value">{courtName}</strong>
          </div>
        </div>

        <div className="summary-item">
          <Calendar size={16} className="summary-icon text-lime" />
          <div className="summary-details">
            <span className="label">Date</span>
            <strong className="value">{displayDate}</strong>
          </div>
        </div>

        <div className="summary-item">
          <Clock size={16} className="summary-icon text-lime" />
          <div className="summary-details">
            <span className="label">Time</span>
            <strong className="value">{timeRangeText} ({durationHours} hr)</strong>
          </div>
        </div>

        <div className="summary-item">
          <User size={16} className="summary-icon text-lime" />
          <div className="summary-details">
            <span className="label">Guest</span>
            <strong className="value">{guestName}</strong>
          </div>
        </div>

        <div className="summary-item">
          <Check size={16} className="summary-icon text-lime" />
          <div className="summary-details">
            <span className="label">Amount Paid</span>
            <strong className="value">₱{totalPrice.toLocaleString()} (Ref: ****{referenceLast4})</strong>
          </div>
        </div>
      </div>

      <div className="success-footer-notes">
        <div className="notes-box">
          <span className="status-pill">Status: Pending Verification</span>
          <p>
            Please present this booking code and valid ID upon arrival at DinkResponsibly. Our front desk staff will check your payment receipt and assign your court.
          </p>
        </div>

        <button
          type="button"
          onClick={onBookAnother}
          className="book-another-btn"
        >
          <RefreshCw size={16} /> Book Another Court
        </button>
      </div>
    </div>
  );
};
