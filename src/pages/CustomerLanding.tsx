import React from 'react';
import { CustomerNavbar } from '../components/customer/CustomerNavbar';
import { HeroSection } from '../components/customer/HeroSection';
import { AvailabilitySection } from '../components/customer/AvailabilitySection';
import { AboutUsSection } from '../components/customer/AboutUsSection';
import { ContactSection } from '../components/customer/ContactSection';
import { FloatingTicketModal } from '../components/customer/FloatingTicketModal';
import './CustomerLanding.css';

export const CustomerLanding: React.FC = () => {
  return (
    <div className="customer-landing-root">
      <div className="noise-overlay" />
      <CustomerNavbar />
      <main className="customer-main-content">
        <HeroSection />
        <AvailabilitySection />
        <AboutUsSection />
        <ContactSection />
      </main>
      
      <footer className="customer-footer">
        <p>&copy; {new Date().getFullYear()} DinkResponsibly. All rights reserved.</p>
      </footer>
      <FloatingTicketModal />
    
    </div>
  );
}