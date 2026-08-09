import React from 'react';
import { Calendar, Phone, Info } from 'lucide-react';
import './CustomerNavbar.css';

export const CustomerNavbar: React.FC = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="customer-navbar">
      <div className="navbar-container">
        {/* Flexible Logo Placeholder */}
        <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-placeholder">
            <span className="logo-text">Dink</span>
            <span className="logo-highlight">Responsibly</span>
          </div>
        </div>

        {/* Customer Navigation Links */}
        <nav className="nav-links">
          <button onClick={() => scrollToSection('availability')} className="nav-btn">
            <Calendar size={16} />
            Availability
          </button>
          <button onClick={() => scrollToSection('about')} className="nav-btn">
            <Info size={16} />
            About Us
          </button>
          <button onClick={() => scrollToSection('contact')} className="nav-btn">
            <Phone size={16} />
            Contact
          </button>
        </nav>
      </div>
    </header>
  );
};