import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { updateCourtRate, disableStaffAccount, enableStaffAccount, createMaintenanceBlock, fetchCourts, fetchRevenueOverviewData } from '../../services/bookingService';
import { MessageSquare, X, Send, Bot, CheckCircle, } from 'lucide-react';
import './AiConsultantWidget.css';

interface ActionIntent {
  type: 'update_rate' | 'disable_staff' | 'activate_staff' | 'block_schedule';
  payload: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'error';
  text: string;
  action?: ActionIntent;
  actionExecuted?: boolean;
}

export const AiConsultantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1', role: 'model', text: "Hello! I'm your AI Consultant. Ask me about revenue, or ask me to block a court, update a rate, or disable a staff member."
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const gatherContext = async () => {
    // Fetch live data so the AI knows IDs and metrics
    const courts = await fetchCourts();
    const { data: staff } = await supabase.from('profiles').select('id, full_name, email, role, is_active');
    const revenue = await fetchRevenueOverviewData('last_7_days');
    return { courts, staff, revenue };
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
      const contextData = await gatherContext();
      
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
        await updateCourtRate(action.payload.court_id, action.payload.rate_type, action.payload.new_rate);
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
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionExecuted: true, text: m.text + '\n\n✅ Action Executed Successfully!' } : m));
    } catch (err: any) {
      alert(err.message || "Failed to execute action.");
    }
  };

  return (
    <div className="ai-widget-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3><Bot size={18} className="text-emerald-400" /> AI Action Consultant</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
          
          <div className="ai-chat-messages">
            {messages.map(msg => (
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
                  <div className="action-card">
                    <p>Suggested Action: {msg.action.type.replace('_', ' ').toUpperCase()}</p>
                    <button onClick={() => executeAction(msg.id, msg.action!)} className="action-btn">
                      <CheckCircle size={14} className="inline mr-1" /> Confirm Action
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="chat-bubble model opacity-70">Thinking...</div>}
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

      <button className="ai-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};