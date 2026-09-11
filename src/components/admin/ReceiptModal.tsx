import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import type { BookingRecord } from '../../services/bookingService';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  return createPortal(
    <div onClick={onClose} style={{ zIndex: 1000, position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0f172a', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', border: '1px solid #334155' }}>
        
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <FileText size={18} /> Receipt Verification
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Info Grid */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
             <div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Guest Name</p>
                <strong style={{ color: '#f8fafc' }}>{booking.guest_name}</strong>
             </div>
             <div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Total Amount</p>
                <strong style={{ color: '#a3e635' }}>₱{Number(booking.total_price).toLocaleString()}</strong>
             </div>
             <div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Ref. No. (Last 4 Digits)</p>
                <strong style={{ color: '#f8fafc', letterSpacing: '0.1rem', fontSize: '1.1rem' }}>{booking.payment_reference_last4 || 'N/A'}</strong>
             </div>
             <div>
                <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Booking Code</p>
                <strong style={{ color: '#38bdf8' }}>{booking.booking_code}</strong>
             </div>
          </div>

          {/* Image Viewer */}
          <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            {booking.receipt_url ? (
              <img 
                src={booking.receipt_url} 
                alt="Payment Receipt" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '500px', 
                  height: 'auto',
                  objectFit: 'contain', 
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }} 
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>
                <ImageIcon size={48} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No Receipt Uploaded</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};