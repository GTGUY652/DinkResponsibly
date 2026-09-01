import React from 'react';
import { Target, Users, Sparkles, ShieldCheck } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-cards';
import './AboutUsSection.css';

const ABOUT_CARDS = [
  {
    icon: <Target className="about-icon text-accent" size={32} />,
    title: 'Our Mission',
    description: 'We provide accessible, top tier pickleball courts for players of all skill levels, from beginners to tournament competitors.'
  },
  {
    icon: <Users className="about-icon text-accent" size={32} />,
    title: 'Vibrant Community',
    description: 'DinkResponsibly connects local enthusiasts through regular games, casual practice matches, and social gatherings.'
  },
  {
    icon: <Sparkles className="about-icon text-accent" size={32} />,
    title: 'Modern Facilities',
    description: 'Enjoy anti slip surfaces, professional net setups, high intensity LED lighting, and relaxing lounge areas.'
  },
  {
    icon: <ShieldCheck className="about-icon text-accent" size={32} />,
    title: 'Direct Booking',
    description: 'No customer account registration required. Book instantly with guest checkout and instant confirmation.'
  }
];

export const AboutUsSection: React.FC = () => {
  return (
    <section id="about" className="section-container" style={{ overflow: 'hidden' }}>
      <div className="about-split-layout">
        <div className="about-text-content">
          <h2 className="section-title" style={{ textAlign: 'left', margin: '0 0 1.25rem 0' }}>
            About DinkResponsibly
          </h2>
          <p className="section-subtitle" style={{ textAlign: 'left', margin: '0', maxWidth: '100%' }}>
            Dedicated to delivering high quality pickleball experiences in a vibrant community environment. Swipe through our cards to see what we offer!
          </p>
        </div>

        <div className="about-swiper-container">
          <Swiper
            effect={'cards'}
            grabCursor={true}
            modules={[EffectCards, Autoplay]}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
            className="about-swiper"
          >
            {ABOUT_CARDS.map((card, idx) => (
              <SwiperSlide key={idx} className="about-card-slide">
                <div className="about-card">
                  <div className="about-card-inner">
                    {card.icon}
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};