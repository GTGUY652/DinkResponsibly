import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Phone, Info, Activity, Menu, X } from 'lucide-react';
import './CustomerNavbar.css';

export const CustomerNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Close menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock background body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

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

        {/* Customer Navigation Links & Action (Desktop) */}
        <div className="nav-right-group desktop-only">
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
            Book Court
          </button>
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Render Mobile Sliding Drawer & Backdrop via Portal to body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className={`mobile-drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
              <div className="drawer-header">
                <div
                  className="logo-container"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="logo-badge-icon">
                    <Activity size={18} className="logo-icon-svg" />
                  </div>
                  <div className="logo-placeholder">
                    <span className="logo-text">Dink</span>
                    <span className="logo-highlight">Responsibly</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="drawer-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="mobile-drawer-links">
                <button onClick={() => scrollToSection('availability')} className="mobile-nav-item">
                  <div className="mobile-nav-icon"><Calendar size={18} /></div>
                  <span>Court Availability</span>
                </button>
                <button onClick={() => scrollToSection('about')} className="mobile-nav-item">
                  <div className="mobile-nav-icon"><Info size={18} /></div>
                  <span>About Us</span>
                </button>
                <button onClick={() => scrollToSection('contact')} className="mobile-nav-item">
                  <div className="mobile-nav-icon"><Phone size={18} /></div>
                  <span>Contact & Location</span>
                </button>
              </nav>

              <div className="mobile-drawer-footer">
                <button onClick={() => scrollToSection('availability')} className="mobile-drawer-cta">
                  Book a Court Now
                </button>
              </div>
            </aside>
          </>,
          document.body
        )}
    </header>
  );
};