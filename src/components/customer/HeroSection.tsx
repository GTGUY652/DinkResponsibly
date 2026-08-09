import React from 'react';
import { ArrowRight, Sparkles, Trophy } from 'lucide-react';
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
            COURTS AVAILABLE NOW
          </div>

          <h1 className="hero-title">
            Welcome to <br />
            <span className="brand-accent">DinkResponsibly</span>
          </h1>

          <p className="hero-description">
            At DinkResponsibly, we bring players together through high energy pickleball matches, premium courts, and a welcoming community. Whether you are here for competitive games or fun with friends, reserve your court slot in seconds.
          </p>

          <div className="hero-cta-group">
            <button onClick={scrollToAvailability} className="btn-primary">
              Browse Courts <ArrowRight size={18} />
            </button>
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary">
              View Amenities
            </button>
          </div>
        </div>

        {/* Right Side: Visual Card Layout with Rate Tag */}
        <div className="hero-visual-card">
          <div className="rate-floating-badge">
            <Sparkles size={16} className="badge-icon" />
            <div>
              <span className="badge-sub">Starting from</span>
              <div className="badge-price">₱400/hr</div>
            </div>
          </div>

          <div className="card-image-placeholder">
            <Trophy size={64} className="hero-placeholder-icon" />
            <div className="card-caption">
              <h3>DinkResponsibly Courts</h3>
              <p>4 Premium Outdoor & Indoor Pickleball Courts</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};