import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Sun, Moon, Sparkles, AlertCircle, Info, CheckCircle, Wrench } from 'lucide-react';
import { fetchBookedSlots, createBooking, generateBookingCode, fetchCourts } from '../../services/bookingService';
import type { CourtRecord } from '../../services/bookingService';
import { supabase } from '../../services/supabase';
import { TermsModal } from './TermsModal';
import './AvailabilitySection.css';

interface TimePointItem {
  hour: number; // 24h: 6, 7, 8...
  label: string; // "8:00 AM"
  rate: number; // Dynamic PHP rate
  isBooked: boolean;
  session: 'AM' | 'PM';
}

export const AvailabilitySection: React.FC = () => {
  const today = new Date();
  const [courtsList, setCourtsList] = useState<CourtRecord[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('Court A');
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed: 0 = Jan, 11 = Dec
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'AM' | 'PM'>('ALL');

  const [startHour, setStartHour] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [bookedHours, setBookedHours] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [bookingSuccessCode, setBookingSuccessCode] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  const loadCourts = useCallback(async () => {
    const data = await fetchCourts();
    if (data && data.length > 0) {
      setCourtsList(data);
    }
  }, []);

  useEffect(() => {
    void loadCourts();

    const subscription = supabase
      .channel('realtime_customer_courts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        () => {
          void loadCourts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadCourts]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNameShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const formattedDateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
  const displayDateStr = `${monthNameShort[currentMonth]} ${selectedDay}, ${currentYear}`;

  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const activeCourtRecord = courtsList.find((c) => c.id === selectedCourt || c.name === selectedCourt);
  const isCourtOperational = activeCourtRecord ? activeCourtRecord.is_active : true;
  const displayCourtName = activeCourtRecord?.name || selectedCourt;

  const rawHourList = [
    { hour: 6, label: '6:00 AM', session: 'AM' as const },
    { hour: 7, label: '7:00 AM', session: 'AM' as const },
    { hour: 8, label: '8:00 AM', session: 'AM' as const },
    { hour: 9, label: '9:00 AM', session: 'AM' as const },
    { hour: 10, label: '10:00 AM', session: 'AM' as const },
    { hour: 11, label: '11:00 AM', session: 'AM' as const },
    { hour: 12, label: '12:00 PM', session: 'AM' as const },

    { hour: 13, label: '1:00 PM', session: 'PM' as const },
    { hour: 14, label: '2:00 PM', session: 'PM' as const },
    { hour: 15, label: '3:00 PM', session: 'PM' as const },
    { hour: 16, label: '4:00 PM', session: 'PM' as const },
    { hour: 17, label: '5:00 PM', session: 'PM' as const },
    { hour: 18, label: '6:00 PM', session: 'PM' as const },
    { hour: 19, label: '7:00 PM', session: 'PM' as const },
    { hour: 20, label: '8:00 PM', session: 'PM' as const },
    { hour: 21, label: '9:00 PM', session: 'PM' as const },
    { hour: 22, label: '10:00 PM', session: 'PM' as const },
  ];

  const baseTimePoints = rawHourList.map((item) => {
    let rate = 400;
    if (activeCourtRecord) {
      if (isWeekend) {
        rate = activeCourtRecord.weekend_rate ?? 500;
      } else {
        rate = item.hour < 17 ? activeCourtRecord.weekday_day_rate : activeCourtRecord.weekday_night_rate;
      }
    } else {
      if (isWeekend) rate = 500;
      else rate = item.hour < 17 ? 400 : 500;
    }
    return { ...item, rate };
  });

  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true);
    const bookedRanges = await fetchBookedSlots(selectedCourt, formattedDateStr);

    const occupied: number[] = [];
    bookedRanges.forEach((range) => {
      for (let h = range.start_hour; h < range.end_hour; h++) {
        occupied.push(h);
      }
    });

    setBookedHours(occupied);
    setLoadingSlots(false);
  }, [selectedCourt, formattedDateStr]);

  useEffect(() => {
    void loadAvailability();
    setStartHour(null);
    setEndHour(null);
    setErrorMessage(null);
  }, [selectedCourt, currentYear, currentMonth, selectedDay, loadAvailability]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [currentMonth, currentYear, daysInMonth, selectedDay]);

  const timePoints: TimePointItem[] = baseTimePoints.map((tp) => ({
    ...tp,
    isBooked: !isCourtOperational || bookedHours.includes(tp.hour),
  }));

  const formatHourLabel = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const handleMarkerClick = (clickedHour: number, isBooked: boolean) => {
    if (!isCourtOperational) {
      setErrorMessage(`${displayCourtName} is currently Under Maintenance and unavailable for reservations.`);
      return;
    }
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
    if (startHour === null || !isCourtOperational) {
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

  const handleConfirmBooking = async (guestDetails: { name: string; email: string; phone: string }) => {
    if (startHour === null || !isCourtOperational) return;
    const effectiveEnd = endHour !== null ? endHour : startHour + 1;
    const bookingCode = generateBookingCode();

    await createBooking({
      booking_code: bookingCode,
      court_id: selectedCourt,
      booking_date: formattedDateStr,
      start_hour: startHour,
      end_hour: effectiveEnd,
      duration_hours: summary.duration,
      total_price: summary.totalPrice,
      guest_name: guestDetails.name,
      guest_email: guestDetails.email,
      guest_phone: guestDetails.phone,
      status: 'confirmed',
    });

    setBookingSuccessCode(bookingCode);
    setIsModalOpen(false);
    setStartHour(null);
    setEndHour(null);
    await loadAvailability();
  };

  const availableCourtsDisplay = courtsList.length > 0 ? courtsList : [
    { id: 'Court A', name: 'Court A', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court B', name: 'Court B', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court C', name: 'Court C', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
    { id: 'Court D', name: 'Court D', weekday_day_rate: 400, weekday_night_rate: 500, weekend_rate: 500, is_active: true },
  ];

  return (
    <section id="availability" className="section-container">
      {startHour !== null && (
        <button
          onClick={() => { setStartHour(null); setEndHour(null); setErrorMessage(null); }}
          className="floating-reset-corner-btn"
          title="Clear Time Selection"
        >
          <RefreshCw size={16} /> Reset Selection
        </button>
      )}

      <div className="section-header">
        <h2 className="section-title">Court Availability & Booking</h2>
        <p className="section-subtitle">Pick a date, select your court, choose AM/PM sessions, and click Start and End hour markers to select playing time.</p>
      </div>

      {bookingSuccessCode && (
        <div className="booking-success-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={24} />
            <div>
              <strong>Reservation Confirmed!</strong>
              <div style={{ fontSize: '0.88rem', color: '#a7f3d0' }}>
                Your Booking Code is: <strong style={{ color: '#fff', fontSize: '1rem' }}>{bookingSuccessCode}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setBookingSuccessCode(null)}
            style={{ background: 'transparent', border: 'none', color: '#a7f3d0', cursor: 'pointer', fontWeight: 700 }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="availability-grid">
        <div className="card-box date-card">
          <div className="card-title-bar">
            <CalendarIcon size={20} className="text-accent" />
            <h3>When do you want to play?</h3>
          </div>

          <div className="calendar-header">
            <button onClick={handlePrevMonth} className="cal-nav-btn" title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <span className="cal-month">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={handleNextMonth} className="cal-nav-btn" title="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-days-header">
            <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
          </div>

          <div className="calendar-grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`cal-day-btn ${selectedDay === day ? 'selected' : ''}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="card-box booking-card">
          <div className="card-title-bar">
            <Clock size={20} className="text-accent" />
            <h3>Select Court & Playing Hours</h3>
            {loadingSlots && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>Loading availability...</span>}
          </div>

          <div className="court-tabs">
            {availableCourtsDisplay.map((court) => (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court.id)}
                className={`court-tab-btn ${selectedCourt === court.id ? 'active' : ''} ${!court.is_active ? 'inactive' : ''}`}
              >
                {court.name}
                {!court.is_active && <span className="maintenance-badge">Maintenance</span>}
              </button>
            ))}
          </div>

          {!isCourtOperational && (
            <div className="court-maintenance-alert">
              <Wrench size={20} />
              <div>
                <strong>{displayCourtName} is currently Under Maintenance</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  This court is temporarily unavailable for reservations. Please choose another court.
                </div>
              </div>
            </div>
          )}

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

          <div style={{ margin: '0 0 1rem 0' }}>
            {isCourtOperational && startHour === null && (
              <p className="timeline-instruction" style={{ margin: 0 }}>
                Click a Start Hour marker, then click an End Hour marker to select your duration.
              </p>
            )}
            {isCourtOperational && startHour !== null && endHour === null && (
              <p className="timeline-instruction" style={{ color: '#a3e635', margin: 0, fontWeight: 700 }}>
                Start Hour: {formatHourLabel(startHour)}. Now click your End Hour marker.
              </p>
            )}
            {isCourtOperational && startHour !== null && endHour !== null && (
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

          <div className="spacious-slots-grid">
            {displayedPoints.map((point) => {
              const effectiveEnd = endHour !== null ? endHour : startHour;
              const isInRange =
                startHour !== null &&
                effectiveEnd !== null &&
                point.hour >= startHour &&
                point.hour <= effectiveEnd;

              const isSlotDisabled = !isCourtOperational || point.isBooked;

              return (
                <div
                  key={point.hour}
                  onClick={() => handleMarkerClick(point.hour, isSlotDisabled)}
                  className={`slot-card-item ${isSlotDisabled ? 'booked' : ''} ${isInRange ? 'in-range' : ''}`}
                  style={{ cursor: isSlotDisabled ? 'not-allowed' : 'pointer' }}
                >
                  <div className="slot-card-top" style={{ justifyContent: 'center' }}>
                    <span className="slot-card-time" style={{ fontSize: '1.1rem' }}>{point.label}</span>
                  </div>
                  <div className="slot-card-bottom" style={{ justifyContent: 'center', marginTop: '0.4rem' }}>
                    {!isCourtOperational ? (
                      <span className="status-tag taken">Unavailable</span>
                    ) : point.isBooked ? (
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

          {summary.isComplete ? (
            <div className="booking-summary-bar">
              <div>
                <span className="summary-label">Reservation Summary:</span>
                <strong>
                  {displayCourtName} &bull; {displayDateStr} ({summary.rangeText}, {summary.duration} {summary.duration === 1 ? 'Hour' : 'Hours'})
                </strong>
                <div style={{ color: '#a3e635', fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem' }}>
                  Total Price: ₱{summary.totalPrice.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary"
              >
                Book {summary.duration} {summary.duration === 1 ? 'Hour' : 'Hours'} <CheckCircle2 size={18} />
              </button>
            </div>
          ) : (
            <div className="booking-summary-bar prompt" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Info size={18} className="text-accent" />
              <span>
                {!isCourtOperational
                  ? 'This court is currently undergoing maintenance. Please select an operational court above.'
                  : startHour === null
                  ? 'Click a Start Hour marker above.'
                  : `Start Hour set to ${formatHourLabel(startHour)}. Click an End Hour marker to complete your reservation.`}
              </span>
            </div>
          )}
        </div>
      </div>

      <TermsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courtId={displayCourtName}
        bookingDate={displayDateStr}
        timeRangeText={summary.rangeText}
        durationHours={summary.duration}
        totalPrice={summary.totalPrice}
        onConfirmBooking={handleConfirmBooking}
      />
    </section>
  );
};