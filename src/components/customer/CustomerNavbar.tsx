import React from 'react';
import { Calendar, Phone, Info, Activity, Sparkles } from 'lucide-react';
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
        {/* Brand Logo & Mark */}
        <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-badge-icon">
            <Activity size={18} className="logo-icon-svg" />
          </div>
          <div className="logo-placeholder">
            <span className="logo-text">Dink</span>
            <span className="logo-highlight">Responsibly</span>
          </div>
        </div>

        {/* Customer Navigation Links & Action */}
        <div className="nav-right-group">
          <nav className="nav-links">
            <button onClick={() => scrollToSection('availability')} className="nav-btn">
              <Calendar size={15} />
              Availability
            </button>
            <button onClick={() => scrollToSection('about')} className="nav-btn">
              <Info size={15} />
              About Us
            </button>
            <button onClick={() => scrollToSection('contact')} className="nav-btn">
              <Phone size={15} />
              Contact
            </button>
          </nav>

          <button onClick={() => scrollToSection('availability')} className="nav-cta-btn">
            <Sparkles size={14} />
            Book Court
          </button>
        </div>
      </div>
    </header>
  );
};