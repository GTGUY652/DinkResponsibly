import React, { useState } from 'react';
import { X, ShieldAlert, User, Mail, Phone, CheckCircle, Loader2, ArrowRight, QrCode, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';
import { uploadPaymentReceipt } from '../../services/bookingService';
import './TermsModal.css';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtId?: string;
  bookingDate?: string;
  timeRangeText?: string;
  durationHours?: number;
  totalPrice: number;
  onConfirmBooking: (data: { name: string; email: string; phone: string; referenceLast4: string; receiptUrl: string }) => Promise<void>;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  courtId: _courtId,
  bookingDate: _bookingDate,
  timeRangeText: _timeRangeText,
  durationHours: _durationHours,
  totalPrice,
  onConfirmBooking,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // New Payment Fields
  const [referenceLast4, setReferenceLast4] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (!agreedToTerms) {
      setErrorMsg('You must acknowledge and agree to the No-Refund Policy before proceeding.');
      return;
    }
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMsg('Please complete all contact details (Name, Email, Phone).');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload a valid image file (PNG/JPG/WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File is too large. Please upload an image smaller than 5MB.');
        return;
      }
      setReceiptFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceLast4.length < 4) {
      setErrorMsg('Please enter the last 4 digits of your payment reference number.');
      return;
    }
    if (!receiptFile) {
      setErrorMsg('Please upload a screenshot of your payment receipt.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // 1. Compress Image natively on client-side
      const compressedFile = await compressImage(receiptFile);

      // 2. Upload securely to Supabase Storage
      const receiptUrl = await uploadPaymentReceipt(compressedFile);

      // 3. Confirm Booking
      await onConfirmBooking({
        name: guestName.trim(),
        email: guestEmail.trim(),
        phone: guestPhone.trim(),
        referenceLast4,
        receiptUrl
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
          {step === 1 ? <ShieldAlert className="header-icon text-amber" /> : <QrCode className="header-icon text-emerald" />}
          <h3>{step === 1 ? 'Venue Terms & Details' : 'Payment & Verification'}</h3>
          <button onClick={onClose} className="modal-close-btn" disabled={isSubmitting} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {errorMsg && <div className="modal-error" style={{ margin: '1rem', marginBottom: 0 }}>{errorMsg}</div>}

        {step === 1 ? (
          <div className="modal-scroll-content" style={{ padding: '1.25rem' }}>
            <div className="policy-box">
              <h4 className="policy-title">📌 Strict Venue Rules & No-Refund Policy</h4>
              <ul className="policy-list">
                <li><strong>Strict 1-Hour Slots:</strong> Court access ends promptly at the end of your reserved hour.</li>
                <li><strong>No-Refund Policy:</strong> Reservations are non-refundable once confirmed.</li>
                <li><strong>Proper Footwear:</strong> Non-marking court shoes are required on all courts.</li>
              </ul>
            </div>

            <div className="guest-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label><User size={16} /> Guest Full Name *</label>
                <input type="text" required placeholder="e.g. Juan Dela Cruz" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div className="form-group">
                <label><Mail size={16} /> Email Address *</label>
                <input type="email" required placeholder="e.g. juan@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label><Phone size={16} /> Contact Number *</label>
                <input type="tel" required placeholder="e.g. 0917 123 4567" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
              <div className="checkbox-group">
                <input type="checkbox" id="agreeTerms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} />
                <label htmlFor="agreeTerms">I have read and agree to the <strong>No-Refund Policy</strong>.</label>
              </div>
              <button onClick={handleNextStep} className="confirm-booking-btn" style={{ background: '#34d399', color: '#064e3b' }}>
                Next: Payment <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-scroll-content" style={{ padding: '1.25rem' }}>
            
            <div style={{ textAlign: 'center', background: '#0f172a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>Scan to Pay with GCash/Maya</h4>
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>Please pay exactly <strong style={{ color: '#a3e635' }}>₱{totalPrice.toLocaleString()}</strong></p>
              
              {/* Placeholder QR Code Box */}
              <div style={{ width: '180px', height: '180px', background: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                <QrCode size={100} color="#000" />
              </div>
            </div>

            <div className="guest-form" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Last 4 Digits of Reference Number *</label>
                <input 
                  type="text" 
                  maxLength={4} 
                  required 
                  placeholder="e.g. 1234" 
                  value={referenceLast4} 
                  onChange={(e) => setReferenceLast4(e.target.value.replace(/\D/g, ''))} 
                  disabled={isSubmitting}
                  style={{ letterSpacing: '0.2rem', fontWeight: 'bold' }}
                />
              </div>

              <div className="form-group">
                <label>Upload Proof of Payment *</label>
                <div style={{ border: '2px dashed #334155', padding: '1rem', borderRadius: '8px', textAlign: 'center', background: '#0f172a' }}>
                  <input type="file" id="receiptUpload" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} style={{ display: 'none' }} disabled={isSubmitting} />
                  <label htmlFor="receiptUpload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="Preview" style={{ maxHeight: '100px', borderRadius: '4px' }} />
                        <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Click to change photo</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={32} color="#64748b" />
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Tap to upload screenshot</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Max 5MB • PNG/JPG)</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setStep(1)} className="confirm-booking-btn" style={{ background: '#334155', color: '#f8fafc', flex: 1 }} disabled={isSubmitting}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button type="submit" className="confirm-booking-btn" disabled={isSubmitting} style={{ flex: 2 }}>
                  {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><CheckCircle size={18} /> Review & Book</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};