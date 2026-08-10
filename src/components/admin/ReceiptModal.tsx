import React from 'react';
import { X, Printer, ExternalLink, CheckCircle2, ShieldCheck, Building2, User, Calendar, Clock, DollarSign } from 'lucide-react';
import type { BookingRecord } from '../../services/bookingService';
import './ReceiptModal.css';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  const paymentRecord = booking.payments && booking.payments.length > 0 ? booking.payments[0] : null;
  const paymentMethod = paymentRecord?.payment_provider
    ? paymentRecord.payment_provider.toUpperCase()
    : 'ON-SITE CASH / FACILITY CHECK-IN';

  const formatHourLabel = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-modal-overlay" onClick={onClose}>
      <div className="receipt-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header Controls */}
        <div className="receipt-modal-actions no-print">
          <button onClick={handlePrint} className="receipt-btn-print">
            <Printer size={16} /> Print / Save PDF
          </button>
          {paymentRecord?.receipt_url && (
            <a
              href={paymentRecord.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="receipt-btn-external"
            >
              <ExternalLink size={16} /> PayMongo Web Receipt
            </a>
          )}
          <button onClick={onClose} className="receipt-btn-close">
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="receipt-paper" id="printable-receipt">
          {/* Header Branding */}
          <div className="receipt-brand-header">
            <div className="receipt-logo">
              <Building2 size={28} className="receipt-logo-icon" />
              <div>
                <h2>DinkResponsibly</h2>
                <p>Premier Pickleball Court Facility</p>
              </div>
            </div>
            <div className="receipt-title-badge">
              <span>OFFICIAL RECEIPT</span>
              <strong className="receipt-code">{booking.booking_code}</strong>
            </div>
          </div>

          <hr className="receipt-divider" />

          {/* Status Alert Banner */}
          <div className="receipt-status-banner">
            <CheckCircle2 size={20} />
            <div>
              <strong>Payment Status: CONFIRMED</strong>
              <span>Reservation logged and verified in facility booking system.</span>
            </div>
          </div>

          {/* Customer & Reservation Details Grid */}
          <div className="receipt-grid">
            <div className="receipt-info-block">
              <div className="info-label"><User size={14} /> Guest Information</div>
              <div className="info-value-main">{booking.guest_name}</div>
              <div className="info-value-sub">{booking.guest_email}</div>
              <div className="info-value-sub">{booking.guest_phone}</div>
            </div>

            <div className="receipt-info-block">
              <div className="info-label"><Calendar size={14} /> Reserved Schedule</div>
              <div className="info-value-main">{booking.court_name || booking.court_id}</div>
              <div className="info-value-sub">{formatDateDisplay(booking.booking_date)}</div>
              <div className="info-value-sub">
                <Clock size={12} className="inline mr-1" />
                {formatHourLabel(booking.start_hour)} - {formatHourLabel(booking.end_hour)} ({booking.duration_hours} {booking.duration_hours === 1 ? 'Hour' : 'Hours'})
              </div>
            </div>
          </div>

          <hr className="receipt-divider" />

          {/* Financial Breakdown Table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Hours</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Pickleball Court Reservation</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{booking.court_name || booking.court_id} &bull; {booking.booking_date}</div>
                </td>
                <td>{booking.duration_hours}h</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(booking.total_price).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="receipt-totals">
            <div className="receipt-total-row">
              <span>Subtotal:</span>
              <span>₱{Number(booking.total_price).toFixed(2)}</span>
            </div>
            <div className="receipt-total-row">
              <span>Tax / Fees:</span>
              <span>₱0.00</span>
            </div>
            <div className="receipt-total-row grand-total">
              <span>Total Paid:</span>
              <span>₱{Number(booking.total_price).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method & Guarantee */}
          <div className="receipt-footer-meta">
            <div>
              <span className="meta-label">Payment Method:</span>
              <strong className="meta-val"><DollarSign size={14} className="inline" /> {paymentMethod}</strong>
            </div>
            {paymentRecord?.payment_intent_id && (
              <div>
                <span className="meta-label">Transaction Ref:</span>
                <span className="meta-val">{paymentRecord.payment_intent_id}</span>
              </div>
            )}
          </div>

          <div className="receipt-security-note">
            <ShieldCheck size={16} />
            <span>Thank you for playing at DinkResponsibly! Please present this receipt code (<strong>{booking.booking_code}</strong>) upon arrival at the facility.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
