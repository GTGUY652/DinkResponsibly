import React, { useState } from 'react';
import { QrCode, Image as ImageIcon, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import './Step5PaymentReceipt.css';

export interface PaymentSubmissionData {
  referenceLast4: string;
  receiptFile: File | null;
  previewUrl: string | null;
}

interface Step5PaymentReceiptProps {
  totalPrice: number;
  courtName: string;
  displayDate: string;
  timeRangeText: string;
  durationHours: number;
  paymentData: PaymentSubmissionData;
  onChangePaymentData: (data: Partial<PaymentSubmissionData>) => void;
  onSubmitBooking: () => Promise<void>;
  isSubmitting: boolean;
  onBack: () => void;
}

export const Step5PaymentReceipt: React.FC<Step5PaymentReceiptProps> = ({
  totalPrice,
  courtName,
  displayDate,
  timeRangeText,
  durationHours,
  paymentData,
  onChangePaymentData,
  onSubmitBooking,
  isSubmitting,
  onBack,
}) => {
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setFileError('Please upload an image file (PNG, JPG, or WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }
      setFileError(null);
      const objectUrl = URL.createObjectURL(file);
      onChangePaymentData({
        receiptFile: file,
        previewUrl: objectUrl,
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentData.referenceLast4.length < 4) {
      setFileError('Please enter the last 4 digits of your transaction reference number.');
      return;
    }
    if (!paymentData.receiptFile) {
      setFileError('Please upload your payment receipt screenshot.');
      return;
    }
    await onSubmitBooking();
  };

  return (
    <form onSubmit={handleFormSubmit} className="step-payment-receipt-container">
      <div className="step-heading-group">
        <h3 className="step-title">Scan QR & Upload Receipt</h3>
        <p className="step-subtitle">
          Pay via GCash or Maya by scanning the venue QR code below, then submit your receipt screenshot.
        </p>
      </div>

      {fileError && (
        <div className="payment-error-banner" role="alert">
          {fileError}
        </div>
      )}

      <div className="payment-grid-layout">
        {/* Left Column: QR Code Box & Amount */}
        <div className="qr-code-presentation-card">
          <div className="qr-header">
            <span className="qr-pill-tag">Official Venue GCash / Maya</span>
            <h4 className="qr-title">Scan to Pay</h4>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {courtName} • {displayDate}
              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{timeRangeText} ({durationHours} {durationHours === 1 ? 'hr' : 'hrs'})</div>
            </div>
          </div>

          <div className="qr-code-box">
            <div className="qr-white-card">
              <QrCode size={130} color="#040c1a" />
              <span className="qr-caption">DinkResponsibly Official GCash</span>
            </div>
          </div>

          <div className="qr-payable-banner">
            <span className="payable-label">Amount Due</span>
            <span className="payable-amount">₱{totalPrice.toLocaleString()}</span>
          </div>

          <div className="qr-notes">
            <span>Account Name: <strong>DinkResponsibly Pickleball</strong></span>
            <span>Account Number: <strong>0917 888 9999</strong></span>
          </div>
        </div>

        {/* Right Column: Reference Number & Receipt Upload */}
        <div className="payment-proof-card">
          <h4 className="card-subheading">Proof of Payment</h4>

          <div className="form-input-group">
            <label htmlFor="ref-last4">
              Last 4 Digits of Reference Number <span className="req">*</span>
            </label>
            <input
              id="ref-last4"
              type="text"
              required
              maxLength={4}
              placeholder="e.g. 8492"
              value={paymentData.referenceLast4}
              onChange={(e) =>
                onChangePaymentData({
                  referenceLast4: e.target.value.replace(/\D/g, ''),
                })
              }
              className="ref-code-input"
              disabled={isSubmitting}
            />
            <span className="input-hint">Enter the final 4 numbers from your GCash/bank SMS or receipt.</span>
          </div>

          <div className="form-input-group">
            <label>
              Upload Payment Screenshot <span className="req">*</span>
            </label>
            <div className="receipt-uploader-dropzone">
              <input
                id="receipt-file-input"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="file-hidden-input"
              />
              <label htmlFor="receipt-file-input" className="dropzone-label">
                {paymentData.previewUrl ? (
                  <div className="preview-container">
                    <img src={paymentData.previewUrl} alt="Receipt preview" className="receipt-img-preview" />
                    <span className="change-photo-btn">Click to choose a different photo</span>
                  </div>
                ) : (
                  <div className="dropzone-content">
                    <ImageIcon size={36} className="text-secondary" />
                    <span className="dropzone-text">Click or tap to upload receipt</span>
                    <span className="dropzone-sub">PNG, JPG, or WEBP up to 5MB</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="checkout-action-row">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="wizard-back-btn"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting || paymentData.referenceLast4.length < 4 || !paymentData.receiptFile}
              className="wizard-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Verifying & Booking...
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Confirm & Submit Reservation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
