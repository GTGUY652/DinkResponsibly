import React from 'react';
import { BookingWizard } from './BookingWizard/BookingWizard';
import './AvailabilitySection.css';

export const AvailabilitySection: React.FC = () => {
  return (
    <section id="availability" className="section-container">
      <div className="section-header">
        <div className="section-eyebrow">Availability • Live</div>
        <h2 className="section-title">Court Availability & Booking</h2>
        <p className="section-subtitle">
          Five steps — court, date, time, details, payment. Straight continuous hours, dynamic pricing, instant confirmation.
        </p>
      </div>

      <BookingWizard />
    </section>
  );
};