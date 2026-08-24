import React from 'react';
import { BookingWizard } from './BookingWizard/BookingWizard';
import './AvailabilitySection.css';

export const AvailabilitySection: React.FC = () => {
  return (
    <section id="availability" className="section-container">
      <div className="section-header">
        <h2 className="section-title">Court Availability & Booking</h2>
        <p className="section-subtitle">
          Follow our 5-step guided wizard to choose your court, select playing date and time slots, and secure your reservation.
        </p>
      </div>

      <BookingWizard />
    </section>
  );
};