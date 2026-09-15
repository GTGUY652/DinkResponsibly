import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import './HeroSection.css';
import { sanityClient } from '../../lib/sanity';

export const HeroSection: React.FC = () => {
  const [heroData, setHeroData] = useState({
    description: "Experience high energy pickleball matches on 4 pro-grade courts. Instant 1-hour slot reservations, dynamic rates from ₱400/hr, and effortless guest checkout.",
    imageUrl: "/hero_court.jpg",
    caption: "4 Premium Outdoor & Indoor Pickleball Courts • Manila"
  });

  useEffect(() => {
    sanityClient.fetch(`*[_type == "hero"][0]{
      description,
      "imageUrl": image.asset->url,
      caption
    }`).then((data) => {
      if (data) {
        setHeroData(prev => ({
          description: data.description || prev.description,
          imageUrl: data.imageUrl || prev.imageUrl,
          caption: data.caption || prev.caption
        }));
      }
    }).catch(console.error);
  }, []);

  const scrollToAvailability = () => {
    document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left Side: Headline & Copy */}
        <div className="hero-content">
          <h1 className="hero-title">
            Reserve Your Court at <br />
            <span className="brand-accent">DinkResponsibly</span>
          </h1>

          <p className="hero-description">
            {heroData.description}
          </p>

          <div className="hero-cta-group">
            <button onClick={scrollToAvailability} className="btn-primary">
              Book Court Now 
              <div className="btn-icon-wrapper">
                <ArrowRight size={16} />
              </div>
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

          <div className="card-image-container">
            <img 
              src={heroData.imageUrl} 
              alt="DinkResponsibly Modern Luxury Pickleball Court" 
              className="hero-court-img"
            />
            <div className="card-image-overlay" />
            <div className="card-caption">
              <div className="caption-tag">PRO VENUE</div>
              <h3>DinkResponsibly Courts</h3>
              <p>{heroData.caption}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};