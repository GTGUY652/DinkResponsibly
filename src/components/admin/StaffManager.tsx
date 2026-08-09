import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import { useAuth, type UserProfile } from '../../context/AuthContext';
import { UserPlus, Shield, Mail, UserCheck, Trash2, AlertCircle, CheckCircle2, ShieldAlert, Power } from 'lucide-react';
import './StaffManager.css';

// Secondary client so signing up staff does NOT switch the Owner session
const tempAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface StaffProfile extends UserProfile {
  is_active?: boolean;
}

export const StaffManager: React.FC = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for creating staff
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STAFF' | 'OWNER'>('STAFF');
  const [creating, setCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff list:', error.message);
      } else if (data) {
        setStaffList(data as StaffProfile[]);
      }
    } catch (err) {
      console.error('Unexpected error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();

    // Supabase Realtime for profiles table
    const subscription = supabase
      .channel('realtime_profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setCreating(true);
    setAlert(null);

    try {
      const { data, error: authError } = await tempAuthClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) {
        setAlert({ type: 'error', text: authError.message });
      } else if (data.user) {
        setAlert({ type: 'success', text: `Account created for ${fullName} (${role})!` });
        setEmail('');
        setPassword('');
        setFullName('');
        // Brief delay to allow trigger execution
        setTimeout(fetchStaff, 600);
      }
    } catch (err) {
      console.error('Create error:', err);
      setAlert({ type: 'error', text: 'An unexpected error occurred while creating user.' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStaffActive = async (userId: string, currentStatus: boolean, name: string) => {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) {
        setAlert({ type: 'error', text: `Failed to update status for ${name}: ${error.message}` });
      } else {
        setAlert({
          type: 'success',
          text: `${name}'s account is now ${!currentStatus ? 'Active' : 'Deactivated'}.`,
        });
        fetchStaff();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDeleteStaff = async (userId: string, name: string) => {
    if (!isOwner) return;
    if (!confirm(`Are you sure you want to permanently remove ${name}?`)) return;

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        setAlert({ type: 'error', text: `Failed to remove user: ${error.message}` });
      } else {
        setAlert({ type: 'success', text: `Removed ${name} from staff list.` });
        fetchStaff();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="staff-manager-wrapper">
      <div className="staff-manager-header">
        <div>
          <h2>Staff Account Management Portal</h2>
          <p>Create and manage Court Owner and Staff access credentials & active status.</p>
        </div>

        {!isOwner && (
          <div className="restricted-badge">
            <ShieldAlert className="w-4 h-4 mr-1.5 text-amber-400" />
            <span>Restricted: Owner Only Feature</span>
          </div>
        )}
      </div>

      {alert && (
        <div className={`alert-banner ${alert.type}`}>
          {alert.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{alert.text}</span>
        </div>
      )}

      {isOwner && (
        <div className="create-staff-card">
          <h3>
            <UserPlus className="w-5 h-5 text-emerald-400 inline mr-2" />
            Create New Staff / Admin Account
          </h3>

          <form onSubmit={handleCreateStaff} className="staff-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="staffName">Full Name</label>
                <input
                  id="staffName"
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="staffEmail">Email Address</label>
                <input
                  id="staffEmail"
                  type="email"
                  placeholder="staff@dinkresponsibly.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="staffPassword">Password</label>
                <input
                  id="staffPassword"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="staffRole">Role Level</label>
                <select
                  id="staffRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'STAFF' | 'OWNER')}
                >
                  <option value="STAFF">STAFF (Check-in & Inquiries)</option>
                  <option value="OWNER">OWNER (Full Admin Access)</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={creating} className="create-btn">
              <UserCheck className="w-4 h-4 mr-1.5" />
              {creating ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      <div className="staff-list-section">
        <h3>Current Authorized Users ({staffList.length})</h3>

        {loading ? (
          <div className="table-empty">Loading user accounts...</div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role Level</th>
                <th>Status</th>
                <th>User ID</th>
                {isOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const active = s.is_active !== false;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="guest-info">
                        <span className="guest-name">{s.full_name || 'Admin User'}</span>
                        <span className="guest-sub">
                          <Mail className="w-3 h-3 inline mr-1" />
                          {s.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${s.role.toLowerCase()}`}>
                        <Shield className="w-3.5 h-3.5 mr-1" />
                        {s.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-indicator ${active ? 'active' : 'inactive'}`}>
                        {active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <span className="id-code">{s.id.substring(0, 8)}...</span>
                    </td>
                    {isOwner && (
                      <td>
                        {s.id !== profile?.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleToggleStaffActive(s.id, active, s.full_name)}
                              className={`toggle-power-btn ${active ? 'on' : 'off'}`}
                              title={active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteStaff(s.id, s.full_name)}
                              className="delete-user-btn"
                              title="Permanently remove user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="you-tag">You (Current)</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};