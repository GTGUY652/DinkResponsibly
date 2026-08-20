import React, { useState } from 'react';
import { Sun, Moon, Sparkles, AlertCircle, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import './Step3SlotSelect.css';

export interface DiscreteSlotItem {
  startHour: number; // e.g. 6 (for 6:00 AM)
  endHour: number;   // e.g. 7 (for 7:00 AM)
  label: string;     // "6:00 AM – 7:00 AM"
  rate: number;      // e.g. 400 or 500
  isBooked: boolean;
  session: 'AM' | 'PM';
}

interface Step3SlotSelectProps {
  slots: DiscreteSlotItem[];
  selectedHours: number[]; // Array of startHour integers, e.g. [6, 7]
  onToggleSlot: (startHour: number) => void;
  onResetSelection: () => void;
  loading: boolean;
}

export const Step3SlotSelect: React.FC<Step3SlotSelectProps> = ({
  slots,
  selectedHours,
  onToggleSlot,
  onResetSelection,
  loading,
}) => {
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'AM' | 'PM'>('ALL');
  const [contiguousNotice, setContiguousNotice] = useState<string | null>(null);

  const filteredSlots = slots.filter((slot) => {
    if (sessionFilter === 'ALL') return true;
    return slot.session === sessionFilter;
  });

  const sortedSelected = [...selectedHours].sort((a, b) => a - b);
  const minHour = sortedSelected.length > 0 ? sortedSelected[0] : null;
  const maxHour = sortedSelected.length > 0 ? sortedSelected[sortedSelected.length - 1] : null;

  const formatHourLabel = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const handleSlotClick = (slot: DiscreteSlotItem) => {
    if (slot.isBooked) return;

    if (selectedHours.length > 0) {
      const isAdjacent =
        minHour !== null &&
        maxHour !== null &&
        (slot.startHour === minHour - 1 || slot.startHour === maxHour + 1);

      const isAlreadySelected = selectedHours.includes(slot.startHour);

      if (!isAlreadySelected && !isAdjacent) {
        setContiguousNotice(
          `Reservations must be contiguous (consecutive hours). Selection started anew at ${slot.label}.`
        );
        setTimeout(() => setContiguousNotice(null), 4000);
      } else {
        setContiguousNotice(null);
      }
    } else {
      setContiguousNotice(null);
    }

    onToggleSlot(slot.startHour);
  };

  // Compute selected duration & total
  const selectedSlotObjects = slots.filter((s) => selectedHours.includes(s.startHour));
  const totalPrice = selectedSlotObjects.reduce((sum, s) => sum + s.rate, 0);
  const durationHours = selectedHours.length;

  const rangeSummaryText =
    minHour !== null && maxHour !== null
      ? `${formatHourLabel(minHour)} to ${formatHourLabel(maxHour + 1)}`
      : '';

  return (
    <div className="step-slot-select-container">
      <div className="step-heading-group">
        <h3 className="step-title">Choose 1-Hour Time Slots</h3>
        <p className="step-subtitle">
          Click discrete 1-hour blocks to build your session. Multiple slots must be consecutive (e.g. 6:00 AM–7:00 AM and 7:00 AM–8:00 AM).
        </p>
      </div>

      {/* Session Filter Tabs & Reset Button */}
      <div className="slot-filter-header">
        <div className="session-filter-buttons">
          <button
            type="button"
            onClick={() => setSessionFilter('ALL')}
            className={`filter-tab-btn ${sessionFilter === 'ALL' ? 'active' : ''}`}
          >
            <Sparkles size={14} /> Full Day (All)
          </button>
          <button
            type="button"
            onClick={() => setSessionFilter('AM')}
            className={`filter-tab-btn ${sessionFilter === 'AM' ? 'active' : ''}`}
          >
            <Sun size={14} /> Morning (AM)
          </button>
          <button
            type="button"
            onClick={() => setSessionFilter('PM')}
            className={`filter-tab-btn ${sessionFilter === 'PM' ? 'active' : ''}`}
          >
            <Moon size={14} /> Afternoon/Evening (PM)
          </button>
        </div>

        {selectedHours.length > 0 && (
          <button
            type="button"
            onClick={onResetSelection}
            className="reset-slots-btn"
            title="Clear selected slots"
          >
            <RefreshCw size={14} /> Reset Selection
          </button>
        )}
      </div>

      {contiguousNotice && (
        <div className="contiguous-notice-banner" role="alert">
          <AlertCircle size={16} />
          <span>{contiguousNotice}</span>
        </div>
      )}

      {loading ? (
        <div className="slots-loading-state">
          <Clock className="animate-spin" size={24} />
          <span>Loading court schedule...</span>
        </div>
      ) : (
        <div className="discrete-slots-grid">
          {filteredSlots.map((slot) => {
            const isSelected = selectedHours.includes(slot.startHour);

            return (
              <button
                key={slot.startHour}
                type="button"
                disabled={slot.isBooked}
                onClick={() => handleSlotClick(slot)}
                className={`discrete-slot-card ${isSelected ? 'selected' : ''} ${slot.isBooked ? 'booked' : ''}`}
                aria-pressed={isSelected}
                aria-label={`${slot.label}, ₱${slot.rate} per hour, ${slot.isBooked ? 'Booked' : 'Available'}`}
              >
                <div className="slot-time-range">{slot.label}</div>
                <div className="slot-status-badge">
                  {slot.isBooked ? (
                    <span className="badge-tag booked">Booked</span>
                  ) : isSelected ? (
                    <span className="badge-tag selected">Selected</span>
                  ) : (
                    <span className="badge-tag rate">₱{slot.rate}/hr</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Live Selection Summary */}
      {durationHours > 0 && (
        <div className="slot-selection-summary-bar">
          <div className="summary-left">
            <CheckCircle2 size={20} className="text-lime" />
            <div>
              <div className="summary-title">
                {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'} Selected ({rangeSummaryText})
              </div>
              <div className="summary-sub">Continuous playing session</div>
            </div>
          </div>
          <div className="summary-total-price">
            <span className="price-tag-label">Total Price</span>
            <span className="price-amount">₱{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
