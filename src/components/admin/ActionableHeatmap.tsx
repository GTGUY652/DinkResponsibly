import React, { useEffect, useState } from 'react';
import { fetchBookingsForDateRange, fetchCourts, } from '../../services/bookingService';
import type { BookingRecord, CourtRecord } from '../../services/bookingService'

interface ActionableHeatmapProps {
  payload: { start_date: string; end_date: string };
  onActionClick: (prefilledText: string) => void;
  onDataAnalyzed?: (summary: string) => void;
}

export const ActionableHeatmap: React.FC<ActionableHeatmapProps> = ({ payload, onActionClick, onDataAnalyzed }) => {
  const [activeTab, setActiveTab] = useState<'peak_hours' | 'court_compare'>('peak_hours');
  const [metric, setMetric] = useState<'utilization' | 'revenue'>('utilization');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [courts, setCourts] = useState<CourtRecord[]>([]);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const courtList = await fetchCourts();

        setCourts(courtList);

        const bks = await fetchBookingsForDateRange(payload.start_date, payload.end_date, courtList.map(c => c.id));
      
        const realBookings = bks.filter(b => !b.booking_code?.startsWith('MAINT'));
        setBookings(realBookings);

        setLoading(false);
    };
    loadData();
  }, [payload]);

  // Process Court Comparison Data
  const courtStats = courts.map(court => {
    const courtBookings = bookings.filter(b => b.court_id === court.id || b.court_name === court.name);
    return {
      name: court.name,
      utilization: courtBookings.length,
      revenue: courtBookings.reduce((sum, b) => sum + (b.total_price || 0), 0)
    };
  }).sort((a, b) => b[metric] - a[metric]); // Sort by most active/revenue

  // Process Peak Hours Data (Simple Day vs Hour Map)
  const hours = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  const peakData = hours.map(hr => {
    const hrBookings = bookings.filter(b => b.start_hour <= hr && b.end_hour > hr);
    return {
      hour: hr,
      label: `${hr % 12 || 12} ${hr >= 12 ? 'PM' : 'AM'}`,
      utilization: hrBookings.length,
      revenue: hrBookings.reduce((sum, b) => sum + ((b.total_price || 0) / (b.duration_hours || 1)), 0)
    };
  });
  
  const maxPeakValue = Math.max(...peakData.map(d => d[metric])) || 1;

  useEffect(() => {
    if (loading || bookings.length === 0 || courts.length === 0 || !onDataAnalyzed) return;
    
    // 1. Peak Hour & Court
    const topHour = [...peakData].sort((a,b) => b.utilization - a.utilization)[0];
    const topCourt = [...courtStats].sort((a,b) => b.revenue - a.revenue)[0];
    
    // 2. Day of Week Analysis
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = dayNames.map(name => ({ name, bookings: 0 }));
    
    bookings.forEach(b => {
      if (!b.booking_date) return;
      const parts = b.booking_date.split('-');
      if (parts.length === 3) {
        // Parse safely to avoid timezone shifting
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        dayStats[d.getDay()].bookings += 1;
      }
    });
    
    const sortedDays = [...dayStats].sort((a, b) => b.bookings - a.bookings);
    const daySummary = sortedDays.map(d => `${d.name} (${d.bookings} bookings)`).join(', ');
    
    if (topHour && topCourt) {
      const summary = `[System Note: The heatmap was just displayed to the user for ${payload.start_date} to ${payload.end_date}. 
Peak Time: ${topHour.label} (${topHour.utilization} bookings). 
Top Court: ${topCourt.name} (₱${topCourt.revenue}). 
Weekly Day Breakdown (Busiest to Quietest): ${daySummary}. 
Use this exact data to provide highly detailed insights about their busiest days, quietest days, and peak hours. Answer naturally without mentioning this system note.]`;
      onDataAnalyzed(summary);
    }
  }, [loading, bookings, courts]);

  if (loading) return <div className="text-xs text-emerald-400 mt-2 p-2 bg-emerald-900 bg-opacity-20 rounded border border-emerald-500">Fetching booking data for {payload.start_date} to {payload.end_date}...</div>;

  return (
    <div className="action-card" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p className="text-sm font-bold">Data Report: {payload.start_date} to {payload.end_date}</p>
      
      {/* Navigation Toggles */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('peak_hours')} 
          style={{
            flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s',
            backgroundColor: activeTab === 'peak_hours' ? '#10b981' : '#1f2937',
            color: activeTab === 'peak_hours' ? '#ffffff' : '#9ca3af'
          }}
        >
          Peak Hours
        </button>
        <button 
          onClick={() => setActiveTab('court_compare')} 
          style={{
            flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s',
            backgroundColor: activeTab === 'court_compare' ? '#10b981' : '#1f2937',
            color: activeTab === 'court_compare' ? '#ffffff' : '#9ca3af'
          }}
        >
          Compare Courts
        </button>
      </div>

      {/* Metric Toggles */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', backgroundColor: '#111827', padding: '4px', borderRadius: '8px' }}>
        <button 
          onClick={() => setMetric('utilization')} 
          style={{
            flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: '0.2s',
            backgroundColor: metric === 'utilization' ? '#374151' : 'transparent',
            color: metric === 'utilization' ? '#ffffff' : '#6b7280'
          }}
        >
          Total Bookings
        </button>
        <button 
          onClick={() => setMetric('revenue')} 
          style={{
            flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: '0.2s',
            backgroundColor: metric === 'revenue' ? '#374151' : 'transparent',
            color: metric === 'revenue' ? '#ffffff' : '#6b7280'
          }}
        >
          Revenue (₱)
        </button>
      </div>

      {activeTab === 'peak_hours' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {peakData.map(d => {
            const intensity = (d[metric] / maxPeakValue);
            return (
              <div 
                key={d.hour} 
                onClick={() => onActionClick(`Create a promo rate for ${d.label}`)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                  background: `rgba(16, 185, 129, ${Math.max(0.1, intensity)})`, 
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                <span className="text-xs font-bold">{d.label}</span>
                <span className="text-xs">{metric === 'revenue' ? `₱${d.revenue.toFixed(0)}` : `${d.utilization} bookings`}</span>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'court_compare' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {courtStats.map((c, i) => (
             <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: '8px', borderRadius: '4px', border: '1px solid #374151' }}>
               <span className="text-xs font-bold">{i + 1}. {c.name}:</span>
               <span className="text-xs text-emerald-400 font-bold">{metric === 'revenue' ? `₱${c.revenue}` : `${c.utilization} bookings`}</span>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};