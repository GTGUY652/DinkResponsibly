import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import './Step2DateSelect.css';

import type { CourtRecord } from '../../../services/bookingService';

interface Step2DateSelectProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  selectedDay: number;
  closedDays?: number[];
  activeCourt?: CourtRecord;
  onChangeMonth: (year: number, month: number) => void;
  onSelectDay: (day: number) => void;
}

export const Step2DateSelect: React.FC<Step2DateSelectProps> = ({
  currentYear,
  currentMonth,
  selectedDay,
  closedDays = [],
  activeCourt,
  onChangeMonth,
  onSelectDay,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 6 = Sat

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      onChangeMonth(currentYear - 1, 11);
    } else {
      onChangeMonth(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      onChangeMonth(currentYear + 1, 0);
    } else {
      onChangeMonth(currentYear, currentMonth + 1);
    }
  };

  // Check if selected date is weekend
  const selectedDateObj = new Date(currentYear, currentMonth, selectedDay);
  const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

  return (
    <div className="step-date-select-container">
      <div className="step-heading-group">
        <h3 className="step-title">Select Reservation Date</h3>
        <p className="step-subtitle">
          Choose the day you plan to play. Bookings can be made up to several months in advance.
        </p>
      </div>

      <div className="calendar-card-wrapper">
        <div className="calendar-nav-bar">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="cal-nav-btn"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="calendar-current-month">
            <CalendarIcon size={18} className="text-lime" />
            <span className="month-label">{monthNames[currentMonth]} {currentYear}</span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="cal-nav-btn"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="calendar-weekdays-row notranslate">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="calendar-days-matrix notranslate">
          {/* Blank offset cells for alignment */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`offset-${i}`} className="cal-day-cell empty" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const cellDate = new Date(currentYear, currentMonth, day);
            cellDate.setHours(0, 0, 0, 0);
            const isPast = cellDate < today;
            const isToday = cellDate.getTime() === today.getTime();
            const isSelected = selectedDay === day;
            const isClosed = closedDays.includes(day);

            return (
              <button
                key={day}
                type="button"
                disabled={isPast || isClosed}
                onClick={() => onSelectDay(day)}
                className={`cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isClosed ? 'closed' : ''}`}
                aria-label={`${monthNames[currentMonth]} ${day}, ${currentYear}`}
                aria-pressed={isSelected}
              >
                <span className="day-number">{day}</span>
                {isToday && <span className="today-dot" title="Today" />}
                {isClosed && <span className="closed-slash" title="Closed" />}
              </button>
            );
          })}
        </div>

        <div className="selected-date-banner">
          <div className="date-badge-left">
            <CheckCircle2 size={18} className="text-lime" />
            <span>Selected Date: <strong>{monthShort[currentMonth]} {selectedDay}, {currentYear}</strong></span>
          </div>
          <span className="rate-hint-tag">
            {isWeekend 
              ? `🎉 Weekend Flat Rate Applies (₱${activeCourt?.weekend_rate ?? 500}/hr)` 
              : `⚡ Standard Weekday Pricing (₱${activeCourt?.weekday_day_rate ?? 400}–₱${activeCourt?.weekday_night_rate ?? 500}/hr)`}
          </span>
        </div>
      </div>
    </div>
  );
};
