import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { fetchAdminBookings, updateBookingStatus, deleteBookingRecord, fetchCourts } from '../../services/bookingService';
import type { BookingRecord, CourtRecord } from '../../services/bookingService';
import { Search, Calendar, Filter, RefreshCw, Clock, Trash2, FileText, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import './CheckInTable.css';

export interface CheckInTableProps {
  type?: 'regular' | 'maintenance';
}

export const CheckInTable: React.FC<CheckInTableProps> = ({ type = 'regular' }) => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [courtsList, setCourtsList] = useState<CourtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Custom Pickers State
  const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  
  const courtPickerRef = React.useRef<HTMLDivElement>(null);
  const datePickerRef = React.useRef<HTMLDivElement>(null);

  // Receipt Modal State
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<BookingRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (courtPickerRef.current && !courtPickerRef.current.contains(target)) {
        setIsCourtPickerOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCourts = useCallback(async () => {
    const data = await fetchCourts();
    if (data && data.length > 0) {
      setCourtsList(data);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminBookings();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourts();
    void fetchBookings();

    const channel = supabase
      .channel('realtime_admin_bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          void fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings, loadCourts]);

  const handleStatusChange = async (id: string, newStatus: 'confirmed' | 'checked_in' | 'cancelled') => {
    try {
      await updateBookingStatus(id, newStatus);
      await fetchBookings();
    } catch (err: any) {
      alert(`Failed to update booking status: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this booking record?')) {
      try {
        await deleteBookingRecord(id);
        await fetchBookings();
      } catch (err: any) {
        alert(`Failed to delete record: ${err.message}`);
      }
    }
  };

  const handleOpenReceipt = (booking: BookingRecord) => {
    setSelectedBookingForReceipt(booking);
    setIsReceiptModalOpen(true);
  };

  const formatHourLabel = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${ampm}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Convert UUID or ID to clean human-readable Court Name using relational court_name or fallback
  const getCourtDisplayName = (item: BookingRecord): string => {
    if (item.court_name && !item.court_name.includes('-')) return item.court_name;
    const match = courtsList.find((c) => c.id === item.court_id || c.name === item.court_id);
    if (match) return match.name;
    if (item.court_id && item.court_id.toLowerCase().includes('court')) return item.court_id;
    return 'Court B';
  };

  const filteredBookings = bookings.filter((item) => {
    const isMaintenance = item.booking_code && item.booking_code.includes('MAINT');
    if (type === 'regular' && isMaintenance) return false;
    if (type === 'maintenance' && !isMaintenance) return false;

    const query = searchQuery.toLowerCase();
    const courtName = getCourtDisplayName(item);
    const matchesSearch =
      item.booking_code.toLowerCase().includes(query) ||
      item.guest_name.toLowerCase().includes(query) ||
      item.guest_email.toLowerCase().includes(query) ||
      item.guest_phone.includes(query) ||
      courtName.toLowerCase().includes(query);

    const matchesCourt =
      selectedCourt === 'ALL' ||
      item.court_id === selectedCourt ||
      courtName === selectedCourt;

    const matchesDate = !selectedDate || item.booking_date === selectedDate;

    return matchesSearch && matchesCourt && matchesDate;
  });

  return (
    <div className="table-wrapper">
      <div className="table-header-controls">
        <div className="search-bar-group">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by Code (e.g. DR-8X9K2L), Guest Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <div className="custom-court-picker" ref={courtPickerRef}>
            <button
              className={`court-picker-trigger ${isCourtPickerOpen ? 'active' : ''}`}
              onClick={() => setIsCourtPickerOpen(!isCourtPickerOpen)}
            >
              <Filter size={14} style={{ marginRight: '0.25rem' }} />
              {selectedCourt === 'ALL' 
                ? 'All Courts' 
                : courtsList.find(c => c.id === selectedCourt)?.name || selectedCourt}
              <ChevronDown size={14} style={{ marginLeft: '0.25rem' }} />
            </button>
            <div className={`court-picker-modal ${isCourtPickerOpen ? 'open' : ''}`}>
              <button 
                className={`court-cell ${selectedCourt === 'ALL' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedCourt('ALL');
                  setIsCourtPickerOpen(false);
                }}
              >
                All Courts
              </button>
              {courtsList.map((court) => (
                <button 
                  key={court.id} 
                  className={`court-cell ${selectedCourt === court.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedCourt(court.id);
                    setIsCourtPickerOpen(false);
                  }}
                >
                  {court.name}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-date-picker" ref={datePickerRef}>
            <button 
              className={`date-picker-trigger ${isDatePickerOpen ? 'active' : ''}`}
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <Calendar size={14} style={{ marginRight: '0.25rem' }} />
              {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'mm/dd/yyyy'}
            </button>
            
            <div className={`date-picker-modal ${isDatePickerOpen ? 'open' : ''}`}>
              <div className="cal-header">
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                  <ChevronLeft size={16} />
                </button>
                <span className="cal-month-year">
                  {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="cal-weekdays">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div className="cal-days-grid">
                {(() => {
                  const year = viewDate.getFullYear();
                  const month = viewDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const days = [];
                  
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
                  }
                  
                  for (let i = 1; i <= daysInMonth; i++) {
                    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    const isSelected = selectedDate === dStr;
                    const isToday = new Date().toISOString().split('T')[0] === dStr;
                    
                    days.push(
                      <button
                        key={i}
                        className={`cal-cell ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
                        onClick={() => {
                          setSelectedDate(dStr);
                          setIsDatePickerOpen(false);
                        }}
                      >
                        {i}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
              <div className="cal-footer">
                <button 
                  className="cal-btn-clear"
                  onClick={() => {
                    setSelectedDate('');
                    setIsDatePickerOpen(false);
                  }}
                >
                  Clear
                </button>
                <button 
                  className="cal-btn-today"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setSelectedDate(todayStr);
                    setViewDate(new Date());
                    setIsDatePickerOpen(false);
                  }}
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          <button onClick={fetchBookings} className="refresh-btn" title="Refresh table">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading && bookings.length === 0 ? (
          <div className="table-empty">Loading records...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="table-empty">
            {type === 'regular' 
              ? 'No active court reservations found matching your search.' 
              : 'No maintenance blocks found matching your search.'}
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Booking Code</th>
                <th>Guest Details</th>
                <th>Court</th>
                <th>Date & Playing Time</th>
                <th>Total Price</th>
                <th>Check-in Status</th>
                <th>Receipt & Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="ref-badge">{b.booking_code}</span>
                  </td>
                  <td>
                    <div className="guest-info">
                      <span className="guest-name">{b.guest_name}</span>
                      <span className="guest-sub">{b.guest_email} &bull; {b.guest_phone}</span>
                    </div>
                  </td>
                  <td>
                    <span className="court-tag">{getCourtDisplayName(b)}</span>
                  </td>
                  <td>
                    <div className="time-info">
                      <span className="date-text">{formatDateDisplay(b.booking_date)}</span>
                      <span className="slot-text">
                        <Clock className="w-3 h-3 inline mr-1" />
                         <p>{formatHourLabel(b.start_hour)} - {formatHourLabel(b.end_hour)} ({b.duration_hours}h)</p>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="amount-text">₱{Number(b.total_price).toFixed(2)}</span>
                  </td>
                  <td>
                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id!, e.target.value as any)}
                      className={`status-select ${b.status}`}
                      disabled={b.status === 'APPROVED'}
                      style={{ cursor: b.status === 'APPROVED' ? 'not-allowed' : 'pointer' }}
                    >
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="cancelled">Refunded / Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleOpenReceipt(b)}
                        className="receipt-action-btn"
                        title="View Official Receipt"
                      >
                        <FileText size={15} /> Receipt
                      </button>
                      <button
                        onClick={() => handleDelete(b.id!)}
                        className="delete-action-btn"
                        title="Delete Reservation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Digital Receipt Modal Component */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        booking={selectedBookingForReceipt}
      />
    </div>
  );
};