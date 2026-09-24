import React from 'react';
import { Target, Users, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';
import './AboutUsSection.css';

const ABOUT_CARDS = [
  {
    icon: <Target size={20} />,
    title: 'Our Mission',
    description: 'Accessible, top-tier courts for every level — from first-timers to tournament competitors.',
    meta: 'Inclusive • Competitive',
    featured: true,
  },
  {
    icon: <Users size={20} />,
    title: 'Vibrant Community',
    description: 'Regular games, practice matches and social gatherings that connect Cebu players.',
    meta: 'Weekly meetups',
  },
  {
    icon: <Sparkles size={20} />,
    title: 'Modern Facilities',
    description: 'Anti-slip surfaces, pro nets, high-intensity LEDs and a relaxed lounge.',
    meta: 'Open 6AM — 2AM',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Direct Booking',
    description: 'No account needed. Guest checkout with instant confirmation.',
    meta: 'Zero signup',
  }
];

export const AboutUsSection: React.FC = () => {
  return (
    <section id="about" className="section-container">
      <div className="about-section-header">
        <div className="about-eyebrow">Why DinkResponsibly</div>
        <h2 className="about-title">Built for players, not paperwork.</h2>
        <p className="about-subtitle">
          High-quality pickleball in a welcoming, community-driven environment — four pro-grade indoor courts, ready when you are.
        </p>
      </div>

      <div className="about-bento-grid">
        {ABOUT_CARDS.map((card, idx) => {
          const isFullWidth = idx === ABOUT_CARDS.length - 1 && !card.featured;
          return (
            <article key={idx} className={`about-bento-card ${card.featured ? 'featured' : ''} ${isFullWidth ? 'full-width' : ''}`}>
              {card.featured && <div className="featured-badge">Featured • Since 2024</div>}
              <div className={isFullWidth ? 'full-width-main' : undefined}>
                <div className="about-icon-wrap">{card.icon}</div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <div className="about-card-meta">
                    <span>{card.meta}</span>
                    <ArrowUpRight size={12} />
                  </div>
                </div>
              </div>
              {card.featured && (
                <div className="featured-visual" aria-hidden>
                  <img src="/hero_court.jpg" alt="" />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};
