import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import './HeroSection.css';

export const HeroSection: React.FC = () => {
  const scrollToAvailability = () => {
    document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left Side: Headline & Copy */}
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot"></span>
            COURTS OPEN & AVAILABLE NOW
          </div>

          <h1 className="hero-title">
            Reserve Your Court at <br />
            <span className="brand-accent">DinkResponsibly</span>
          </h1>

          <p className="hero-description">
            Experience high energy pickleball matches on 4 pro-grade courts. Instant 1-hour slot reservations, dynamic rates from ₱400/hr, and effortless guest checkout.
          </p>

          <div className="hero-cta-group">
            <button onClick={scrollToAvailability} className="btn-primary">
              Book Court Now <ArrowRight size={18} />
            </button>
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary">
              View Amenities
            </button>
          </div>

          <div className="hero-trust-bar">
            <div className="trust-item">
              <ShieldCheck size={16} className="trust-icon" />
              <span>Direct Guest Checkout</span>
            </div>
            <div className="trust-item">
              <Zap size={16} className="trust-icon" />
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Card Layout with Generated Court Media */}
        <div className="hero-visual-card">
          <div className="rate-floating-badge">
            <Sparkles size={16} className="badge-icon" />
            <div>
              <span className="badge-sub">Rates starting at</span>
              <div className="badge-price">₱400<span className="unit">/hr</span></div>
            </div>
          </div>

          <div className="card-image-container">
            <img 
              src="/hero_court.jpg" 
              alt="DinkResponsibly Modern Luxury Pickleball Court" 
              className="hero-court-img"
            />
            <div className="card-image-overlay" />
            <div className="card-caption">
              <div className="caption-tag">PRO VENUE</div>
              <h3>DinkResponsibly Courts</h3>
              <p>4 Premium Outdoor & Indoor Pickleball Courts • Manila</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};