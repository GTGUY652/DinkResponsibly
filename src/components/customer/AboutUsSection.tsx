import React from 'react';
import { Target, Users, Sparkles, ShieldCheck } from 'lucide-react';
import './AboutUsSection.css';

export const AboutUsSection: React.FC = () => {
  return (
    <section id="about" className="section-container">
      <div className="section-header">
        <h2 className="section-title">About DinkResponsibly</h2>
        <p className="section-subtitle">Dedicated to delivering high quality pickleball experiences in a vibrant community environment.</p>
      </div>

      <div className="about-grid">
        <div className="about-card">
          <Target className="about-icon text-accent" size={32} />
          <h3>Our Mission</h3>
          <p>We provide accessible, top tier pickleball courts for players of all skill levels, from beginners to tournament competitors.</p>
        </div>

        <div className="about-card">
          <Users className="about-icon text-accent" size={32} />
          <h3>Vibrant Community</h3>
          <p>DinkResponsibly connects local enthusiasts through regular games, casual practice matches, and social gatherings.</p>
        </div>

        <div className="about-card">
          <Sparkles className="about-icon text-accent" size={32} />
          <h3>Modern Facilities</h3>
          <p>Enjoy anti slip surfaces, professional net setups, high intensity LED lighting, and relaxing lounge areas.</p>
        </div>

        <div className="about-card">
          <ShieldCheck className="about-icon text-accent" size={32} />
          <h3>Direct Booking</h3>
          <p>No customer account registration required. Book instantly with guest checkout and instant confirmation.</p>
        </div>
      </div>
    </section>
  );
};