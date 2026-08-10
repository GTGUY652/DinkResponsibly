import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { fetchAdminBookings, updateBookingStatus, deleteBookingRecord, fetchCourts } from '../../services/bookingService';
import type { BookingRecord, CourtRecord } from '../../services/bookingService';
import { Search, Calendar, Filter, RefreshCw, Clock, Trash2, FileText } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import './CheckInTable.css';

export const CheckInTable: React.FC = () => {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [courtsList, setCourtsList] = useState<CourtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // Receipt Modal State
  const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<BookingRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
          <div className="select-group">
            <Filter className="filter-icon" />
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Courts</option>
              <option value="Court A">Court A</option>
              <option value="Court B">Court B</option>
              <option value="Court C">Court C</option>
              <option value="Court D">Court D</option>
            </select>
          </div>

          <div className="date-group">
            <Calendar className="date-icon" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button onClick={fetchBookings} className="refresh-btn" title="Refresh table">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading && bookings.length === 0 ? (
          <div className="table-empty">Loading reservations...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="table-empty">No active court reservations found matching your search.</div>
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
                        {formatHourLabel(b.start_hour)} - {formatHourLabel(b.end_hour)} ({b.duration_hours}h)
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
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="cancelled">Cancelled</option>
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