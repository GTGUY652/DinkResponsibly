import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { fetchVenueRules, FALLBACK_VENUE_RULES, type VenueRule } from '../../../services/venueRulesService';
import './Step4GuestDetails.css';

export interface GuestDetailsState {
  name: string;
  email: string;
  phone: string;
  agreedToTerms: boolean;
}

interface Step4GuestDetailsProps {
  guestDetails: GuestDetailsState;
  onChangeGuestDetails: (details: Partial<GuestDetailsState>) => void;
  courtName: string;
  displayDate: string;
  timeRangeText: string;
  durationHours: number;
  totalPrice: number;
}

export const Step4GuestDetails: React.FC<Step4GuestDetailsProps> = ({
  guestDetails,
  onChangeGuestDetails,
  courtName,
  displayDate,
  timeRangeText,
  durationHours,
  totalPrice,
}) => {
  const [rules, setRules] = useState<VenueRule[]>(FALLBACK_VENUE_RULES);

  useEffect(() => {
    let isLive = true;
    fetchVenueRules().then((fetched) => {
      if (isLive) setRules(fetched);
    });
    return () => {
      isLive = false;
    };
  }, []);

  return (
    <div className="step-guest-details-container">
      <div className="step-heading-group">
        <h3 className="step-title">Guest Details & Venue Policy</h3>
        <p className="step-subtitle">
          Please provide your contact information for reservation confirmation and check-in verification.
        </p>
      </div>

      <div className="guest-step-grid">
        {/* Left Side: Contact Form */}
        <div className="guest-form-card">
          <h4 className="card-subheading">Contact Information</h4>

          <div className="form-input-group">
            <label htmlFor="guest-name">
              <User size={15} /> Full Name <span className="req">*</span>
            </label>
            <input
              id="guest-name"
              type="text"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={guestDetails.name}
              onChange={(e) => onChangeGuestDetails({ name: e.target.value })}
              className="guest-text-input"
            />
          </div>

          <div className="form-input-group">
            <label htmlFor="guest-email">
              <Mail size={15} /> Email Address <span className="req">*</span>
            </label>
            <input
              id="guest-email"
              type="email"
              required
              placeholder="e.g. juan@example.com"
              value={guestDetails.email}
              onChange={(e) => onChangeGuestDetails({ email: e.target.value })}
              className="guest-text-input"
            />
          </div>

          <div className="form-input-group">
            <label htmlFor="guest-phone">
              <Phone size={15} /> Contact Number <span className="req">*</span>
            </label>
            <input
              id="guest-phone"
              type="tel"
              required
              placeholder="e.g. 0917 123 4567"
              value={guestDetails.phone}
              onChange={(e) => onChangeGuestDetails({ phone: e.target.value })}
              className="guest-text-input"
            />
          </div>

          <div className="terms-checkbox-box">
            <label className="checkbox-label" htmlFor="terms-agreement">
              <input
                id="terms-agreement"
                type="checkbox"
                checked={guestDetails.agreedToTerms}
                onChange={(e) => onChangeGuestDetails({ agreedToTerms: e.target.checked })}
                className="terms-checkbox"
              />
              <span>
                I have read and agree to the <strong>Strict 1-Hour Schedule</strong> and <strong>No-Refund Policy</strong>.
              </span>
            </label>
          </div>
        </div>

        {/* Right Side: Policy Rules & Reservation Summary */}
        <div className="policy-summary-column">
          <div className="reservation-recap-box">
            <h4 className="card-subheading">
              <CheckCircle2 size={16} className="text-lime" /> Reservation Summary
            </h4>
            <div className="recap-list">
              <div className="recap-row">
                <span className="recap-label">Court:</span>
                <strong className="recap-val">{courtName}</strong>
              </div>
              <div className="recap-row">
                <span className="recap-label">Date:</span>
                <strong className="recap-val">{displayDate}</strong>
              </div>
              <div className="recap-row">
                <span className="recap-label">Time:</span>
                <strong className="recap-val">{timeRangeText} ({durationHours} {durationHours === 1 ? 'Hour' : 'Hours'})</strong>
              </div>
              <div className="recap-row total">
                <span className="recap-label">Total Amount:</span>
                <strong className="recap-total">₱{totalPrice.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="venue-policy-card">
            <div className="policy-header">
              <ShieldAlert size={18} className="text-amber" />
              <h4>Strict Venue Rules</h4>
            </div>
            <ul className="rules-bullet-list">
              {rules.map((rule) => (
                <li key={rule._id}>
                  <strong>{rule.title}</strong> {rule.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
