import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { updateCourtRate, disableStaffAccount, enableStaffAccount, createMaintenanceBlock, fetchCourts, fetchRevenueOverviewData, fetchBookingsForDateRange } from '../../services/bookingService';
import type { BookingRecord } from '../../services/bookingService';
import { X, Send, CheckCircle, } from 'lucide-react';
import './AiConsultantWidget.css';
import { parseHistoricalDateQuery } from '../../utils/historicalDateParser';
import { ActionableHeatmap } from './ActionableHeatmap';
import dinkAiIcon from '../../assets/dink_ai_chat_icon.jpg';

interface ActionIntent {
  type: 'update_rate' | 'disable_staff' | 'activate_staff' | 'block_schedule' | 'prepare_block' | 'show_heatmap';
  payload: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'error';
  text: string;
  action?: ActionIntent;
  actionExecuted?: boolean;
  isHidden?: boolean;
}

const InteractiveBlockCard: React.FC<{ msgId: string, action: ActionIntent, onComplete: (msgId: string, text: string) => void }> = ({ msgId, action, onComplete }) => {
  const [startHour, setStartHour] = useState(action.payload.start_hour);
  const [endHour, setEndHour] = useState(action.payload.end_hour);
  const [overlaps, setOverlaps] = useState<BookingRecord[]>([]);
  const [calculating, setCalculating] = useState(true);

  const [courtIds, setCourtIds] = useState<string[]>([]);

  useEffect(() => {
    const checkConflicts = async () => {
      setCalculating(true);
      // Fetch master list of courts to map names to UUIDs
      const allCourts = await fetchCourts();
      const mappedIds = allCourts
        .filter(c => action.payload.courts.includes(c.name))
        .map(c => c.id);
      
      setCourtIds(mappedIds);

      const bookings = await fetchBookingsForDateRange(
        action.payload.start_date,
        action.payload.end_date,
        mappedIds
      );
      
      const overlapping = bookings.filter(b => b.start_hour < endHour && b.end_hour > startHour);
      setOverlaps(overlapping);
      setCalculating(false);
    };
    checkConflicts();
  }, [startHour, endHour, action.payload]);

  const customerOverlaps = overlaps.filter(b => !b.booking_code.includes('MAINT'));
  const maintOverlaps = overlaps.filter(b => b.booking_code.includes('MAINT'));
  const lostRevenue = customerOverlaps.reduce((sum, b) => sum + (b.total_price || 0), 0);

  const handleConfirm = async () => {
    if (customerOverlaps.length > 0) {
      alert("Cannot block: Real players are already booked. No refund policy applies. Let staff handle this on the day.");
      return;
    }

    try {
      // Overwrite existing MAINT blocks by deleting them first to free the physical DB slot
      if (maintOverlaps.length > 0) {
        for (const b of maintOverlaps) {
          const { error } = await supabase.from('bookings').delete().eq('id', b.id);
          if (error) throw new Error(`Failed to remove old block: ${error.message}`);
        }
      }
      
      const start = new Date(action.payload.start_date);
      const end = new Date(action.payload.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        for (const courtId of courtIds) {
          await createMaintenanceBlock(courtId, dateStr, startHour, endHour, action.payload.reason);
        }
      }
      onComplete(msgId, `\n\n✅ Block executed! ${maintOverlaps.length > 0 ? `Overwrote ${maintOverlaps.length} older maintenance blocks.` : ''}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create block');
    }
  };

  return (
    <div className="action-card" style={{ marginTop: '10px' }}>
      <p><strong>Prepare Block:</strong> {action.payload.reason}</p>
      <p className="text-xs text-gray-400 mb-2">Courts: {action.payload.courts.join(', ')}</p>
      <p className="text-xs text-gray-400 mb-2">Dates: {action.payload.start_date} to {action.payload.end_date}</p>
      
      <div className="flex flex-col gap-2 mb-3">
        <label className="text-xs">Start Hour: {startHour}:00</label>
        <input type="range" min="6" max="23" value={startHour} onChange={e => setStartHour(parseInt(e.target.value))} />
        <label className="text-xs">End Hour: {endHour}:00</label>
        <input type="range" min="7" max="24" value={endHour} onChange={e => setEndHour(parseInt(e.target.value))} />
      </div>

      {calculating ? (
        <p className="text-xs text-yellow-400">Checking conflicts...</p>
      ) : customerOverlaps.length > 0 ? (
        <div className="text-red-400 text-xs mb-3 p-2 border border-red-500 rounded bg-red-900 bg-opacity-20">
          ⚠️ Warning: {customerOverlaps.length} real player(s) booked during this time (₱{lostRevenue}).
          <br/><strong>Action:</strong> Let staff handle this on the day to avoid losing revenue.
        </div>
      ) : maintOverlaps.length > 0 ? (
        <div className="text-blue-400 text-xs mb-3 p-2 border border-blue-500 rounded bg-blue-900 bg-opacity-20">
          ℹ️ Note: Overlaps with {maintOverlaps.length} existing maintenance blocks. Proceeding will overwrite them.
        </div>
      ) : (
        <p className="text-emerald-400 text-xs mb-3">✅ No scheduling conflicts detected.</p>
      )}

      {customerOverlaps.length > 0 ? (
        <button disabled className="action-btn" style={{ background: '#4b5563', cursor: 'not-allowed' }}>
          Cannot Override Players
        </button>
      ) : (
        <button onClick={handleConfirm} className="action-btn" style={{ background: maintOverlaps.length > 0 ? '#3b82f6' : '#10b981' }}>
          <CheckCircle size={14} className="inline mr-1" /> {maintOverlaps.length > 0 ? 'Overwrite Blocks' : 'Confirm Block'}
        </button>
      )}
    </div>
  );
};

export const AiConsultantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1', role: 'model', text: "Hello! I'm Dink-Ai. Ask me about revenue, or ask me to block a court, update a rate, or disable a staff member."
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActionComplete = (msgId: string, extraText: string = '\n\n✅ Action Executed Successfully!') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionExecuted: true, text: m.text + extraText } : m));
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const gatherContext = async (userText?: string) => {
    // Fetch live data so the AI knows IDs and metrics
    const courts = await fetchCourts();
    const { data: staff } = await supabase.from('profiles').select('id, full_name, email, role, is_active');
    const revenue = await fetchRevenueOverviewData('this_month', 'all', 'day');
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Historical lookup: parse explicit month/day intent (e.g. "month of august",
    // "august 1 2026", "september 24") so the AI answers from real bookings
    // instead of claiming no record exists. Capped to 31 days by the parser.
    let requestedPeriod: {
      start_date: string;
      end_date: string;
      type: string;
      label: string;
      total_revenue: number;
      bookings_count: number;
      abv: number;
      court_breakdown: { name: string; bookings: number; revenue: number }[];
      daily_breakdown: { date: string; revenue: number; bookings: number }[];
    } | null = null;
    try {
      if (userText) {
        const parsed = parseHistoricalDateQuery(userText, new Date());
        if (parsed) {
          const courtIds = courts.map(c => c.id);
          const histBookings = courtIds.length > 0
            ? await fetchBookingsForDateRange(parsed.start_date, parsed.end_date, courtIds)
            : [];
          const real = histBookings.filter(b => !b.booking_code?.includes('MAINT'));
          const active = real.filter(b => b.status !== 'cancelled' && b.status !== 'CANCELLED');
          const total_revenue = active.reduce((sum, b) => sum + (b.total_price || 0), 0);
          const bookings_count = active.length;
          const abv = bookings_count > 0 ? Math.round((total_revenue / bookings_count) * 100) / 100 : 0;

          const courtMap: Record<string, { bookings: number; revenue: number }> = {};
          active.forEach(b => {
            const name = (b as any).court_name || courts.find(c => c.id === b.court_id)?.name || b.court_id;
            if (!courtMap[name]) courtMap[name] = { bookings: 0, revenue: 0 };
            courtMap[name].bookings += 1;
            courtMap[name].revenue += b.total_price || 0;
          });

          const dailyMap: Record<string, { revenue: number; bookings: number }> = {};
          active.forEach(b => {
            if (!dailyMap[b.booking_date]) dailyMap[b.booking_date] = { revenue: 0, bookings: 0 };
            dailyMap[b.booking_date].revenue += b.total_price || 0;
            dailyMap[b.booking_date].bookings += 1;
          });

          requestedPeriod = {
            ...parsed,
            total_revenue,
            bookings_count,
            abv,
            court_breakdown: Object.entries(courtMap)
              .map(([name, v]) => ({ name, ...v }))
              .sort((a, b) => b.revenue - a.revenue),
            daily_breakdown: Object.entries(dailyMap)
              .map(([date, v]) => ({ date, ...v }))
              .sort((a, b) => a.date.localeCompare(b.date)),
          };
        }
      }
    } catch (e) {
      console.error('Historical context fetch failed:', e);
    }

    return { courts, staff, revenue, requestedPeriod, currentDate };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    try {
      // 1. Gather context and build prompt array
      const contextData = await gatherContext(userText);
      
      const promptMessages = messages.filter(m => m.role !== 'error').map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      promptMessages.push({ role: 'user', parts: [{ text: userText }] });

      // 2. Call Edge Function
      const { data, error } = await supabase.functions.invoke('gemini-advisor', {
        body: { messages: promptMessages, context: contextData }
      });

      if (error) {
        if (error.context) {
          const errBody = await error.context.text();
          console.error("Edge Function Error Details:", errBody);
          throw new Error(`Server Error: ${errBody}`);
        }
        throw new Error(error.message);
      }

      // Supabase automatically parses JSON responses, so 'data' is already an object!
      // But just in case, we'll check if it's a string:
      const responseJson = typeof data === 'string' ? JSON.parse(data) : data;
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: responseJson.text_response || "I processed your request.",
        action: responseJson.suggested_action
      }]);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'error',
        text: "The consultant is currently unavailable or returned an error."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (msgId: string, action: ActionIntent) => {
    try {
      if (action.type === 'update_rate') {
        const allCourts = await fetchCourts();
        // If courts array is present, map by name. If fallback to court_id string, use that.
        let targetIds: string[] = [];
        if (action.payload.courts && Array.isArray(action.payload.courts)) {
          targetIds = allCourts.filter(c => action.payload.courts.includes(c.name)).map(c => c.id);
        } else if (action.payload.court_id) {
          targetIds = [action.payload.court_id];
        }

        for (const courtId of targetIds) {
          await updateCourtRate(courtId, action.payload.rate_type, action.payload.new_rate);
        }
      } else if (action.type === 'disable_staff') {
        await disableStaffAccount(action.payload.staff_id);
      } else if (action.type === 'activate_staff') {
        await enableStaffAccount(action.payload.staff_id);
      } else if (action.type === 'block_schedule') {
        await createMaintenanceBlock(
          action.payload.court_id, 
          action.payload.date, 
          action.payload.start_hour, 
          action.payload.end_hour, 
          action.payload.reason
        );
      }

      // Mark as executed
      handleActionComplete(msgId);
    } catch (err: any) {
      alert(err.message || "Failed to execute action.");
    }
  };

  return (
    <div className="ai-widget-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3><img src={dinkAiIcon} alt="Dink-Ai" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} /> Dink-Ai</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <div className="ai-chat-messages">
            {messages.filter(msg => !msg.isHidden).map(msg => (
              <div key={msg.id} className={`chat-bubble ${msg.role}`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                    part.startsWith('**') && part.endsWith('**') 
                      ? <strong key={i} className="text-emerald-300">{part.slice(2, -2)}</strong> 
                      : part
                  )}
                </div>
                
                {/* Action Confirmation Card */}
                {msg.action && !msg.actionExecuted && msg.role === 'model' && (
                  msg.action.type === 'prepare_block' ? (
                    <InteractiveBlockCard msgId={msg.id} action={msg.action} onComplete={handleActionComplete} />
                  ) : msg.action.type === 'show_heatmap' ? (
                    <ActionableHeatmap 
                       payload={msg.action.payload} 
                       onActionClick={(text) => setInput(text)} 
                       onDataAnalyzed={(summary) => {
                         setMessages(prev => {
                           if (prev.some(m => m.text === summary)) return prev;
                           return [...prev, { id: 'sys-' + Date.now(), role: 'user', text: summary, isHidden: true }];
                         });
                       }}
                    />
                  ) : (
                    <div className="action-card">
                      <p>Suggested Action: {msg.action.type.replace('_', ' ').toUpperCase()}</p>
                      <button onClick={() => executeAction(msg.id, msg.action!)} className="action-btn">
                        <CheckCircle size={14} className="inline mr-1" /> Confirm Action
                      </button>
                    </div>
                  )
                )}

              </div>
            ))}
            {loading && (
              <div className="chat-bubble model ai-thinking">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="ai-chat-input-area">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Ask for insights or propose a change..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button className={`ai-toggle-btn ${isOpen ? 'open' : 'closed'}`} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <img src={dinkAiIcon} alt="Dink-Ai Chat" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />}
      </button>
    </div>
  );
};