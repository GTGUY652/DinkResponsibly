import React, { useState, useEffect, useRef } from 'react';
import {
  PhilippinePeso,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  CreditCard,
  RefreshCw,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  fetchRevenueOverviewData,
  fetchCourts,
} from '../../services/bookingService';
import type { RevenueOverviewData, CourtRecord } from '../../services/bookingService';
import './RevenueOverview.css';

export const RevenueOverview: React.FC = () => {
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const courtPickerRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<string>('this_month');
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [isCourtPickerOpen, setIsCourtPickerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [navYear, setNavYear] = useState<number>(() => new Date().getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (monthPickerRef.current && !monthPickerRef.current.contains(target)) {
        setIsMonthPickerOpen(false);
      }
      if (courtPickerRef.current && !courtPickerRef.current.contains(target)) {
        setIsCourtPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [courts, setCourts] = useState<CourtRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RevenueOverviewData | null>(null);

  const derivedGranularity = dateRange === 'today' ? 'hour' : 'day';

  const loadData = async () => {
    setLoading(true);
    try {
      const refDate = dateRange === 'this_month' ? new Date(`${selectedMonth}-01T00:00:00`) : new Date();
      const [resData, courtList] = await Promise.all([
        fetchRevenueOverviewData(dateRange, courtFilter, derivedGranularity, refDate),
        fetchCourts(),
      ]);
      setData(resData);
      setCourts(courtList);
    } catch (err) {
      console.error('Error loading revenue metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, courtFilter, derivedGranularity, selectedMonth]);

  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Metric', 'Value'];
    const rows = [
      ['Today Revenue', `PHP ${data.todayRevenue}`],
      ['Today Growth Pct', `${data.todayGrowthPct}%`],
      ['Week Revenue', `PHP ${data.weekRevenue}`],
      ['Week Growth Pct', `${data.weekGrowthPct}%`],
      ['Month Revenue', `PHP ${data.monthRevenue}`],
      ['Month Progress Pct', `${data.monthProgressPct}%`],
      ['YTD Revenue', `PHP ${data.ytdRevenue}`],
      ['YTD Growth Pct', `${data.ytdGrowthPct}%`],
      ['Average Booking Value (ABV)', `PHP ${data.abv}`],
      ['Pending Balance', `PHP ${data.pendingBalance}`],
      ['Refunds Total', `PHP ${data.refundsTotal}`],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revenue_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="revenue-overview-container">
      {/* Toolbar Controls */}
      <div className="revenue-toolbar">
        <div className="toolbar-left">
          <div className="filter-btn-group">
            <button
              className={`filter-btn ${dateRange === 'today' ? 'active' : ''}`}
              onClick={() => setDateRange('today')}
            >
              Today
            </button>
            <button
              className={`filter-btn ${dateRange === 'last_7_days' ? 'active' : ''}`}
              onClick={() => setDateRange('last_7_days')}
            >
              Last 7 Days
            </button>
            <button
              className={`filter-btn ${dateRange === 'this_month' ? 'active' : ''}`}
              onClick={() => setDateRange('this_month')}
            >
              This Month
            </button>
            {dateRange === 'this_month' && (
              <div className="custom-month-picker" ref={monthPickerRef}>
                <button
                  className={`month-picker-trigger ${isMonthPickerOpen ? 'active' : ''}`}
                  onClick={() => {
                    setNavYear(parseInt(selectedMonth.split('-')[0], 10));
                    setIsMonthPickerOpen(!isMonthPickerOpen);
                  }}
                >
                  {(() => {
                    const [y, m] = selectedMonth.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                  })()}
                  <Calendar size={14} />
                </button>

                <div className={`month-picker-modal ${isMonthPickerOpen ? 'open' : ''}`}>
                  <div className="month-picker-header">
                    <button onClick={() => setNavYear((prev) => prev - 1)}>
                      <ChevronLeft size={16} />
                    </button>
                    <span>{navYear}</span>
                    <button onClick={() => setNavYear((prev) => prev + 1)}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="month-picker-grid">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                      (mon, index) => {
                        const mStr = (index + 1).toString().padStart(2, '0');
                        const value = `${navYear}-${mStr}`;
                        const isSelected = selectedMonth === value;
                        return (
                          <button
                            key={mon}
                            className={`month-cell ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedMonth(value);
                              setIsMonthPickerOpen(false);
                            }}
                          >
                            {mon}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="custom-court-picker" ref={courtPickerRef}>
            <button
              className={`court-picker-trigger ${isCourtPickerOpen ? 'active' : ''}`}
              onClick={() => setIsCourtPickerOpen(!isCourtPickerOpen)}
            >
              {courtFilter === 'all' 
                ? 'All Courts' 
                : courts.find(c => c.id === courtFilter)?.name || 'All Courts'}
              <ChevronDown size={14} style={{ marginLeft: '0.25rem' }} />
            </button>
            <div className={`court-picker-modal ${isCourtPickerOpen ? 'open' : ''}`}>
              <button 
                className={`court-cell ${courtFilter === 'all' ? 'selected' : ''}`}
                onClick={() => {
                  setCourtFilter('all');
                  setIsCourtPickerOpen(false);
                }}
              >
                All Courts
              </button>
              {courts.map((court) => (
                <button 
                  key={court.id} 
                  className={`court-cell ${courtFilter === court.id ? 'selected' : ''}`}
                  onClick={() => {
                    setCourtFilter(court.id);
                    setIsCourtPickerOpen(false);
                  }}
                >
                  {court.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="toolbar-right">
          <button className="export-csv-btn" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Top Row (AC-1) */}
      <div className="kpi-row">
        {/* Card 1: Today's Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>Today's Revenue</span>
            <div className="kpi-icon-wrapper">
              <PhilippinePeso size={18} />
            </div>
          </div>
          <div className="kpi-value">
            ₱{data ? data.todayRevenue.toLocaleString() : '0'}
          </div>
          <div className={`kpi-growth ${data && data.todayGrowthPct >= 0 ? 'positive' : 'negative'}`}>
            {data && data.todayGrowthPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{data ? `${data.todayGrowthPct >= 0 ? '+' : ''}${data.todayGrowthPct}%` : '0%'} vs yesterday</span>
          </div>
        </div>

        {/* Card 2: This Week's Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>This Week's Revenue</span>
            <div className="kpi-icon-wrapper">
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value">
            ₱{data ? data.weekRevenue.toLocaleString() : '0'}
          </div>
          <div className={`kpi-growth ${data && data.weekGrowthPct >= 0 ? 'positive' : 'negative'}`}>
            {data && data.weekGrowthPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{data ? `${data.weekGrowthPct >= 0 ? '+' : ''}${data.weekGrowthPct}%` : '0%'} vs last week</span>
          </div>
        </div>

        {/* Card 3: This Month's Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>This Month's Revenue</span>
            <div className="kpi-icon-wrapper">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="kpi-value">
            ₱{data ? data.monthRevenue.toLocaleString() : '0'}
          </div>
          <div className={`kpi-growth ${data && data.monthProgressPct >= 0 ? 'positive' : 'negative'}`}>
            {data && data.monthProgressPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{data ? `${data.monthProgressPct >= 0 ? '+' : ''}${data.monthProgressPct}%` : '0%'} vs prev month</span>
          </div>
        </div>

        {/* Card 4: YTD Revenue */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>Year-to-Date (YTD)</span>
            <div className="kpi-icon-wrapper">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="kpi-value">
            ₱{data ? data.ytdRevenue.toLocaleString() : '0'}
          </div>
          <div className={`kpi-growth ${data && data.ytdGrowthPct >= 0 ? 'positive' : 'negative'}`}>
            {data && data.ytdGrowthPct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{data ? `${data.ytdGrowthPct >= 0 ? '+' : ''}${data.ytdGrowthPct}%` : '0%'} YoY</span>
          </div>
        </div>
      </div>

      {/* Sub-header Metrics Band (AC-2) */}
      <div className="sub-metrics-band">
        <div className="sub-metric-card">
          <div className="sub-metric-icon">
            <CreditCard size={20} />
          </div>
          <div className="sub-metric-info">
            <span className="sub-metric-label">Average Booking Value (ABV)</span>
            <span className="sub-metric-value">₱{data ? data.abv.toFixed(2) : '0.00'}</span>
          </div>
        </div>

        <div className="sub-metric-card">
          <div className="sub-metric-icon">
            <RefreshCw size={20} />
          </div>
          <div className="sub-metric-info">
            <span className="sub-metric-label">Outstanding Pending Balances</span>
            <span className="sub-metric-value">₱{data ? data.pendingBalance.toLocaleString() : '0'}</span>
          </div>
        </div>

        <div className="sub-metric-card">
          <div className="sub-metric-icon">
            <PhilippinePeso size={20} />
          </div>
          <div className="sub-metric-info">
            <span className="sub-metric-label">Refunds & Adjustments</span>
            <span className="sub-metric-value">₱{data ? data.refundsTotal.toLocaleString() : '0'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Revenue Trend Chart (AC-3) */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title-group">
            <h3>Revenue Trend Analytics</h3>
            <p>Visualizing total income generated over selected period</p>
          </div>
        </div>

        <div className="chart-container">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              Loading financial chart data...
            </div>
          ) : data && data.trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="limeBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3e635" stopOpacity={1} />
                    <stop offset="100%" stopColor="#65a30d" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pData = payload[0].payload;
                      return (
                        <div className="custom-recharts-tooltip">
                          <div className="tooltip-label">Period: {pData.label}</div>
                          <div className="tooltip-value">Revenue: ₱{pData.revenue.toLocaleString()}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            Bookings: {pData.bookingsCount}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" fill="url(#limeBarGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8' }}>
              No revenue data recorded for selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
