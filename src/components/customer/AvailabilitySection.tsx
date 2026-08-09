import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Sun, Moon, Sparkles, AlertCircle, Info } from 'lucide-react';
import './AvailabilitySection.css';

interface TimePointItem {
  hour: number; // 24h: 6, 7, 8...
  label: string; // "8:00 AM"
  rate: number; // 400 or 500 PHP
  isBooked: boolean;
  session: 'AM' | 'PM';
}

export const AvailabilitySection: React.FC = () => {
  const [selectedCourt, setSelectedCourt] = useState<string>('Court A');
  const [selectedDate, setSelectedDate] = useState<number>(20);
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  // Start hour and End hour markers
  const [startHour, setStartHour] = useState<number | null>(8);
  const [endHour, setEndHour] = useState<number | null>(11); // 8:00 to 11:00 = 3 Hours
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const courts = [
    { id: 'Court A', name: 'Court A (Premium Hardcourt)' },
    { id: 'Court B', name: 'Court B (Standard Hardcourt)' },
    { id: 'Court C', name: 'Court C (Tournament Court)' },
    { id: 'Court D', name: 'Court D (Practice Court)' },
  ];

  // Hour Markers (06:00 AM to 10:00 PM)
  const timePoints: TimePointItem[] = [
    // Morning AM Session
    { hour: 6, label: '6:00 AM', rate: 400, isBooked: false, session: 'AM' },
    { hour: 7, label: '7:00 AM', rate: 400, isBooked: true, session: 'AM' }, // Booked example
    { hour: 8, label: '8:00 AM', rate: 400, isBooked: false, session: 'AM' },
    { hour: 9, label: '9:00 AM', rate: 400, isBooked: false, session: 'AM' },
    { hour: 10, label: '10:00 AM', rate: 400, isBooked: false, session: 'AM' },
    { hour: 11, label: '11:00 AM', rate: 400, isBooked: false, session: 'AM' },
    { hour: 12, label: '12:00 PM', rate: 400, isBooked: false, session: 'AM' },

    // Afternoon & Evening PM Session
    { hour: 13, label: '1:00 PM', rate: 400, isBooked: false, session: 'PM' },
    { hour: 14, label: '2:00 PM', rate: 400, isBooked: false, session: 'PM' },
    { hour: 15, label: '3:00 PM', rate: 400, isBooked: false, session: 'PM' },
    { hour: 16, label: '4:00 PM', rate: 400, isBooked: false, session: 'PM' },
    { hour: 17, label: '5:00 PM', rate: 500, isBooked: true, session: 'PM' }, // Booked example
    { hour: 18, label: '6:00 PM', rate: 500, isBooked: false, session: 'PM' },
    { hour: 19, label: '7:00 PM', rate: 500, isBooked: false, session: 'PM' },
    { hour: 20, label: '8:00 PM', rate: 500, isBooked: false, session: 'PM' },
    { hour: 21, label: '9:00 PM', rate: 500, isBooked: false, session: 'PM' },
    { hour: 22, label: '10:00 PM', rate: 500, isBooked: false, session: 'PM' },
  ];

  const formatHourLabel = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const handleMarkerClick = (clickedHour: number, isBooked: boolean) => {
    if (isBooked) return;
    setErrorMessage(null);

    if (startHour === null || (startHour !== null && endHour !== null)) {
      setStartHour(clickedHour);
      setEndHour(null);
    } else if (startHour !== null && endHour === null) {
      if (clickedHour < startHour) {
        setStartHour(clickedHour);
        setEndHour(null);
      } else if (clickedHour === startHour) {
        setEndHour(startHour + 1);
      } else {
        let hasConflict = false;
        for (let h = startHour; h < clickedHour; h++) {
          const slot = timePoints.find((s) => s.hour === h);
          if (!slot || slot.isBooked) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          setErrorMessage('Selection cannot cross a booked slot. Setting new Start Hour.');
          setStartHour(clickedHour);
          setEndHour(null);
        } else {
          setEndHour(clickedHour);
        }
      }
    }
  };

  const displayedPoints = timePoints.filter((point) => {
    if (sessionFilter === 'AM') return point.session === 'AM';
    if (sessionFilter === 'PM') return point.session === 'PM';
    return true;
  });

  const calculateSummary = () => {
    if (startHour === null) {
      return { duration: 0, totalPrice: 0, rangeText: '', isComplete: false };
    }

    const effectiveEnd = endHour !== null ? endHour : startHour + 1;
    const duration = effectiveEnd - startHour;
    let totalPrice = 0;

    for (let h = startHour; h < effectiveEnd; h++) {
      const slot = timePoints.find((s) => s.hour === h);
      if (slot) totalPrice += slot.rate;
    }

    const startText = formatHourLabel(startHour);
    const endText = formatHourLabel(effectiveEnd);
    const rangeText = `${startText} to ${endText}`;

    return { duration, totalPrice, rangeText, isComplete: endHour !== null };
  };

  const summary = calculateSummary();

  return (
    <section id="availability" className="section-container">
      {/* Floating Corner Reset Button (Pops up at top right when time is selected) */}
      {startHour !== null && (
        <button
          onClick={() => { setStartHour(null); setEndHour(null); setErrorMessage(null); }}
          className="floating-reset-corner-btn"
          title="Clear Time Selection"
        >
          <RefreshCw size={16} /> Reset Time Selection
        </button>
      )}

      <div className="section-header">
        <h2 className="section-title">Court Availability & Booking</h2>
        <p className="section-subtitle">Pick a date, select your court, choose AM/PM sessions, and click Start and End hour markers to select playing time.</p>
      </div>

      <div className="availability-grid">
        {/* Step 1: Calendar Date Picker Card */}
        <div className="card-box date-card">
          <div className="card-title-bar">
            <CalendarIcon size={20} className="text-accent" />
            <h3>When do you want to play?</h3>
          </div>

          <div className="calendar-header">
            <button className="cal-nav-btn"><ChevronLeft size={16} /></button>
            <span className="cal-month">December 2026</span>
            <button className="cal-nav-btn"><ChevronRight size={16} /></button>
          </div>

          <div className="calendar-days-header">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="calendar-grid">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`cal-day-btn ${selectedDate === day ? 'selected' : ''}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Timeline Grid with Hour Markers */}
        <div className="card-box booking-card">
          <div className="card-title-bar">
            <Clock size={20} className="text-accent" />
            <h3>Select Court & Playing Hours</h3>
          </div>

          {/* Court Tabs */}
          <div className="court-tabs">
            {courts.map((court) => (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court.id)}
                className={`court-tab-btn ${selectedCourt === court.id ? 'active' : ''}`}
              >
                {court.name}
              </button>
            ))}
          </div>

          {/* AM / PM Session Filter Tabs */}
          <div className="session-filter-container">
            <span className="session-label">Filter Session:</span>
            <div className="session-tabs">
              <button
                onClick={() => setSessionFilter('ALL')}
                className={`session-tab-btn ${sessionFilter === 'ALL' ? 'active' : ''}`}
              >
                <Sparkles size={14} /> Full Day (All Hours)
              </button>
              <button
                onClick={() => setSessionFilter('AM')}
                className={`session-tab-btn ${sessionFilter === 'AM' ? 'active' : ''}`}
              >
                <Sun size={14} /> Morning (AM Session)
              </button>
              <button
                onClick={() => setSessionFilter('PM')}
                className={`session-tab-btn ${sessionFilter === 'PM' ? 'active' : ''}`}
              >
                <Moon size={14} /> Afternoon & Evening (PM Session)
              </button>
            </div>
          </div>

          {/* Guidance Banner */}
          <div style={{ margin: '0 0 1rem 0' }}>
            {startHour === null && (
              <p className="timeline-instruction" style={{ margin: 0 }}>
                Click a Start Hour marker, then click an End Hour marker to select your duration.
              </p>
            )}
            {startHour !== null && endHour === null && (
              <p className="timeline-instruction" style={{ color: '#a3e635', margin: 0, fontWeight: 700 }}>
                Start Hour: {formatHourLabel(startHour)}. Now click your End Hour marker.
              </p>
            )}
            {startHour !== null && endHour !== null && (
              <p className="timeline-instruction" style={{ color: '#10b981', margin: 0, fontWeight: 700 }}>
                {summary.duration} {summary.duration === 1 ? 'Hour' : 'Hours'} Selected ({formatHourLabel(startHour)} to {formatHourLabel(endHour)}).
              </p>
            )}
          </div>

          {errorMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Time Marker Cards Grid */}
          <div className="spacious-slots-grid">
            {displayedPoints.map((point) => {
              const effectiveEnd = endHour !== null ? endHour : startHour;
              const isInRange =
                startHour !== null &&
                effectiveEnd !== null &&
                point.hour >= startHour &&
                point.hour <= effectiveEnd;

              return (
                <div
                  key={point.hour}
                  onClick={() => handleMarkerClick(point.hour, point.isBooked)}
                  className={`slot-card-item ${point.isBooked ? 'booked' : ''} ${isInRange ? 'in-range' : ''}`}
                >
                  <div className="slot-card-top" style={{ justifyContent: 'center' }}>
                    <span className="slot-card-time" style={{ fontSize: '1.1rem' }}>{point.label}</span>
                  </div>
                  <div className="slot-card-bottom" style={{ justifyContent: 'center', marginTop: '0.4rem' }}>
                    {point.isBooked ? (
                      <span className="status-tag taken">Booked</span>
                    ) : isInRange ? (
                      <span className="status-tag open-selected">Selected</span>
                    ) : (
                      <span className="status-tag open">₱{point.rate}/hr</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reservation Summary Bar */}
          {summary.isComplete ? (
            <div className="booking-summary-bar">
              <div>
                <span className="summary-label">Reservation Summary:</span>
                <strong>
                  {selectedCourt} &bull; Dec {selectedDate}, 2026 ({summary.rangeText}, {summary.duration} {summary.duration === 1 ? 'Hour' : 'Hours'})
                </strong>
                <div style={{ color: '#a3e635', fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem' }}>
                  Total Price: ₱{summary.totalPrice.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() =>
                  alert(`Confirmed booking for ${selectedCourt} on Dec ${selectedDate}, 2026 (${summary.rangeText}). Total: ₱${summary.totalPrice}`)
                }
                className="btn-primary"
              >
                Book {summary.duration} {summary.duration === 1 ? 'Hour' : 'Hours'} <CheckCircle2 size={18} />
              </button>
            </div>
          ) : (
            <div className="booking-summary-bar prompt" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Info size={18} className="text-accent" />
              <span>
                {startHour === null
                  ? 'Click a Start Hour marker above.'
                  : `Start Hour set to ${formatHourLabel(startHour)}. Click an End Hour marker to complete your reservation.`}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};