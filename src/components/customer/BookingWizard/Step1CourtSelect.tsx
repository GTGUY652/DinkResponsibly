import React from 'react';
import { CheckCircle2, Wrench, ShieldCheck, Zap } from 'lucide-react';
import type { CourtRecord } from '../../../services/bookingService';
import './Step1CourtSelect.css';

interface Step1CourtSelectProps {
  courtsList: CourtRecord[];
  selectedCourt: string;
  onSelectCourt: (courtId: string) => void;
}

export const Step1CourtSelect: React.FC<Step1CourtSelectProps> = ({
  courtsList,
  selectedCourt,
  onSelectCourt,
}) => {
  const courts: CourtRecord[] = courtsList.length > 0 ? courtsList : [
    { id: 'Court A', name: 'Court A', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court B', name: 'Court B', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court C', name: 'Court C', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court D', name: 'Court D', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
  ];

  return (
    <div className="step-court-select-container">
      <div className="step-heading-group">
        <h3 className="step-title">Choose Your Pickleball Court</h3>
        <p className="step-subtitle">
          Select one of our 4 professional acrylic cushion courts. All courts feature tournament netting and LED lighting.
        </p>
      </div>

      <div className="mobile-swipe-hint">
        <span>Swipe courts →</span>
      </div>

      <div className="court-cards-grid">
        {courts.map((court) => {
          const isSelected = selectedCourt === court.id || selectedCourt === court.name;
          const isOperational = court.is_active;

          return (
            <div
              key={court.id}
              className={`court-selection-card ${isSelected ? 'selected' : ''} ${!isOperational ? 'disabled' : ''}`}
              onClick={() => isOperational && onSelectCourt(court.id)}
              role="button"
              tabIndex={isOperational ? 0 : -1}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (isOperational && (e.key === 'Enter' || e.key === ' ')) {
                  onSelectCourt(court.id);
                }
              }}
            >
              <div className="court-card-header">
                <div className="court-card-name-group">
                  <span className="court-pill-badge">{isOperational ? 'Pro Grade' : 'Unavailable'}</span>
                  <h4 className="court-name">{court.name}</h4>
                </div>
                {isSelected && isOperational && (
                  <div className="selected-badge-icon">
                    <CheckCircle2 size={22} className="text-lime" />
                  </div>
                )}
              </div>

              {!isOperational ? (
                <div className="court-maintenance-tag">
                  <Wrench size={16} />
                  <span>Under Maintenance</span>
                </div>
              ) : (
                <div className="court-specs-list">
                  <div className="spec-item">
                    <ShieldCheck size={15} className="spec-icon" />
                    <span>Regulation tournament dimensions</span>
                  </div>
                  <div className="spec-item">
                    <Zap size={15} className="spec-icon" />
                    <span>Anti-glare high-lumen floodlights</span>
                  </div>
                </div>
              )}

              <div className="court-pricing-preview">
                <div className="price-item">
                  <span className="price-label">Daytime (6AM–5PM):</span>
                  <strong className="price-val">₱{court.weekday_day_rate || 400}/hr</strong>
                </div>
                <div className="price-item">
                  <span className="price-label">Night & Weekend:</span>
                  <strong className="price-val">₱{court.weekday_night_rate || 500}/hr</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
