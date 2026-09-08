import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { PhilippinePeso, ShieldAlert, Save, Power, CheckCircle, AlertTriangle, Sun, Moon, CalendarDays } from 'lucide-react';
import './RateController.css';

export interface CourtItem {
  id: string;
  name: string;
  description: string;
  hourly_rate: number;
  weekday_day_rate: number;
  weekday_night_rate: number;
  weekend_rate: number;
  is_active: boolean;
}


export const RateController: React.FC = () => {
    const { profile } = useAuth();
    const isOwner = profile?.role === 'OWNER';

    const [courts, setCourts] = useState<CourtItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchCourts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('courts')
                .select('*')
                .order('name', { ascending: true });
            if (error) {
                console.error('Error fetching courts:', error.message);
            } else if (data) {
                setCourts(data as CourtItem[]);
            }
        } catch (err) {
            console.error('Unexpected error fetching courts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourts();
       
        const subscription = supabase
            .channel('realtime_courts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'courts' },
                () => {
                fetchCourts();
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleFieldChange = (id: string, field: keyof CourtItem, value: number | boolean) => {
        setCourts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        );
    };

    const saveCourtChanges = async (court: CourtItem) => {
        if (!isOwner) return;
        
        setSavingId(court.id);
        setMessage(null);
        
        try {
           
            const { error } = await supabase
                .from('courts')
                .update({
                weekday_day_rate: court.weekday_day_rate,
                weekday_night_rate: court.weekday_night_rate,
                weekend_rate: court.weekend_rate,
                hourly_rate: court.weekday_day_rate, // default reference
                is_active: court.is_active,
                })
                .eq('id', court.id);

            if (error) {
                setMessage({ type: 'error', text: `Failed to update ${court.name}: ${error.message}` });
            } else {
                setMessage({ type: 'success', text: `Updated ${court.name} dynamic rates & status successfully!` });
            }
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="rate-controller-wrapper">
            <div className="rate-controller-header">
                
                <div>
                    <h2>Dynamic Pricing & Operational Status Controller</h2>
                    <p>Automated weekday/weekend rate management & court toggles (6:00 AM - 2:00 AM daily).</p>
                </div>
               
                {!isOwner && (
                    <div className="restricted-badge">
                        <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-400" />
                        <span>Read-Only Access (Owner Only)</span>
                    </div>
                )}
            
            </div>
            {message && (
                <div className={`alert-banner ${message.type}`}>
                {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{message.text}</span>
                </div>
            )}
            {loading ? (
                <div className="table-empty">Loading courts...</div>
            ) : (
                <div className="courts-grid">
                {courts.map((court) => (
                    <div key={court.id} className={`court-card ${court.is_active ? 'active' : 'inactive'}`}>
                    <div className="court-card-header">
                        <div className="court-title-group">
                        <h3>{court.name}</h3>
                        <span className={`status-indicator ${court.is_active ? 'active' : 'inactive'}`}>
                            {court.is_active ? 'Operational' : 'Under Maintenance'}
                        </span>
                        </div>
                        <button
                        disabled={!isOwner}
                        onClick={() => handleFieldChange(court.id, 'is_active', !court.is_active)}
                        className={`toggle-power-btn ${court.is_active ? 'on' : 'off'}`}
                        title={court.is_active ? 'Deactivate Court' : 'Activate Court'}
                        >
                        <Power className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="dynamic-rates-group">
                        {/* Weekday Daytime Rate */}
                        <div className="rate-field">
                        <label htmlFor={`day-${court.id}`}>
                            <Sun className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
                            Weekday Daytime (6 AM - 4 PM)
                        </label>
                        <div className="input-with-symbol">
                            <PhilippinePeso className="currency-symbol" />
                            <input
                            id={`day-${court.id}`}
                            type="number"
                            min="0"
                            step="50"
                            disabled={!isOwner}
                            value={court.weekday_day_rate}
                            onChange={(e) =>
                                handleFieldChange(court.id, 'weekday_day_rate', parseFloat(e.target.value) || 0)
                            }
                            />
                        </div>
                        </div>
                        {/* Weekday Nighttime Rate */}
                        <div className="rate-field">
                        <label htmlFor={`night-${court.id}`}>
                            <Moon className="w-3.5 h-3.5 text-indigo-400 inline mr-1" />
                            Weekday Nighttime (5 PM - 2 AM)
                        </label>
                        <div className="input-with-symbol">
                            <PhilippinePeso className="currency-symbol" />
                            <input
                            id={`night-${court.id}`}
                            type="number"
                            min="0"
                            step="50"
                            disabled={!isOwner}
                            value={court.weekday_night_rate}
                            onChange={(e) =>
                                handleFieldChange(court.id, 'weekday_night_rate', parseFloat(e.target.value) || 0)
                            }
                            />
                        </div>
                        </div>
                        {/* Weekend Flat Rate */}
                        <div className="rate-field">
                        <label htmlFor={`weekend-${court.id}`}>
                            <CalendarDays className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                            Weekend Flat Rate (Sat - Sun)
                        </label>
                        <div className="input-with-symbol">
                            <PhilippinePeso className="currency-symbol" />
                            <input
                            id={`weekend-${court.id}`}
                            type="number"
                            min="0"
                            step="50"
                            disabled={!isOwner}
                            value={court.weekend_rate}
                            onChange={(e) =>
                                handleFieldChange(court.id, 'weekend_rate', parseFloat(e.target.value) || 0)
                            }
                            />
                        </div>
                        </div>
                    </div>
                    {isOwner && (
                        <button
                        onClick={() => saveCourtChanges(court)}
                        disabled={savingId === court.id}
                        className="save-court-btn"
                        >
                        <Save className="w-4 h-4 mr-1.5" />
                        {savingId === court.id ? 'Saving...' : 'Save Pricing & Status'}
                        </button>
                        )}
                    </div>
                    ))}
                </div>
            )}
        </div>
    );
}