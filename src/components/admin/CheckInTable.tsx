import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Search, Calendar, Filter, ExternalLink, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import './CheckInTable.css';

export interface BookingRecord {
  id: string;
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  court_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: 'CONFIRMED' | 'CANCELLED';
  created_at: string;
  courts?: { name: string };
  payments?: { receipt_url: string; payment_provider: string; amount: number }[];
}

export const CheckInTable: React.FC = () => {
    const [bookings, setBookings] = useState<BookingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourt, setSelectedCourt] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState('');

    const fetchBookings = async () => {
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    courts ( name ),
                    payments ( receipt_url, payment_provider, amount )
                `)
                .order('start_time', { ascending: false });

            if (error) {
                console.error('Error fetching bookings:', error.message);
            } else if (data) {
                setBookings(data as unknown as BookingRecord[]);
            }
            
        } catch (err) {
            console.error('Unexpected error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    };

      useEffect(() => {
        fetchBookings();
        
        // Supabase Realtime Subscription
        
        const channel = supabase
        .channel('realtime_bookings')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            () => {
            fetchBookings();
            }
        )
        .subscribe();
        
        return () => {
        supabase.removeChannel(channel);
        };
  }, []);

  // Filter bookings based on search query, selected court, and date
  const filteredBookings = bookings.filter((item) => {
    const matchesSearch =
      item.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guest_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.guest_phone.includes(searchQuery);
    
    const matchesCourt = selectedCourt === 'ALL' || item.courts?.name === selectedCourt;
    
    const matchesDate = !selectedDate || new Date(item.start_time).toISOString().split('T')[0] === selectedDate;
    
    return matchesSearch && matchesCourt && matchesDate;
  });  
  
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="table-wrapper">
      <div className="table-header-controls">
        
        <div className="search-bar-group">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by Reference (e.g. PB-8942A), Guest Name, or Phone..."
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
          <div className="table-empty">Loading bookings...</div>
        ) : filteredBookings.length === 0 ? (
          <div className="table-empty">No paid bookings found matching your search.</div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Reference Code</th>
                <th>Guest Details</th>
                <th>Court</th>
                <th>Reserved Time</th>
                <th>Total Paid</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const receiptUrl = b.payments?.[0]?.receipt_url;
                return (
                  <tr key={b.id}>
                    <td>
                      <span className="ref-badge">{b.booking_reference}</span>
                    </td>
                    <td>
                      <div className="guest-info">
                        <span className="guest-name">{b.guest_name}</span>
                        <span className="guest-sub">{b.guest_email} • {b.guest_phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="court-tag">{b.courts?.name || 'Court'}</span>
                    </td>
                    <td>
                      <div className="time-info">
                        <span className="date-text">{formatDate(b.start_time)}</span>
                        <span className="slot-text">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTime(b.start_time)} - {formatTime(b.end_time)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="amount-text">₱{b.total_price.toFixed(2)}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${b.status.toLowerCase()}`}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {b.status}
                      </span>
                    </td>
                    <td>
                      {receiptUrl ? (
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="receipt-link"
                          title="View PayMongo Digital Receipt"
                        >
                          Receipt <ExternalLink className="w-3 h-3 ml-1 inline" />
                        </a>
                      ) : (
                        <span className="no-receipt">Paid via PayMongo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

}