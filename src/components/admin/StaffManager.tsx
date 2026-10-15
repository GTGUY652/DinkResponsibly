import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth, type UserProfile } from '../../context/AuthContext';
import {
  UserPlus, Shield, Mail, UserCheck, Trash2, AlertCircle, CheckCircle2,
  ShieldAlert, Power, ChevronDown, Pencil, X,
} from 'lucide-react';
import { canDeactivate, canDeleteUser, canDemoteOwner } from './staffGuards';
import './StaffManager.css';

export interface StaffProfile extends UserProfile {
  is_active?: boolean;
}

interface PendingDelete {
  id: string;
  name: string;
  email: string;
}

interface EditingState {
  id: string;
  fullName: string;
  role: 'STAFF' | 'OWNER';
  newPassword: string;
}

export const StaffManager: React.FC = () => {
  const { profile } = useAuth();
  const isOwner = profile?.role === 'OWNER';

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STAFF' | 'OWNER'>('STAFF');
  const [creating, setCreating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const rolePickerRef = React.useRef<HTMLDivElement>(null);

  // Owner-only edit + custom confirm modal (replaces native confirm())
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rolePickerRef.current && !rolePickerRef.current.contains(target)) {
        setIsRolePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const invokeManageStaff = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('manage-staff', { body });
    if (error) throw new Error(error.message);
    if (data?.error) {
      const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      throw new Error(msg);
    }
    return data;
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setCreating(true);
    setAlert(null);

    try {
      await invokeManageStaff({
        action: 'create',
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      setAlert({ type: 'success', text: `Account created for ${fullName.trim()} (${role})!` });
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('STAFF');
      fetchStaff();
    } catch (err) {
      console.error('Create error:', err);
      setAlert({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create account.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStaffActive = async (userId: string, currentStatus: boolean, name: string) => {
    if (!isOwner) return;
    if (userId === profile?.id) {
      setAlert({ type: 'error', text: 'You cannot change your own active status.' });
      return;
    }

    // Deactivating (not reactivating) is guarded
    if (currentStatus) {
      const guard = canDeactivate(staffList, userId);
      if (!guard.allowed) {
        setAlert({ type: 'error', text: guard.reason ?? 'Action blocked.' });
        return;
      }
    }

    try {
      await invokeManageStaff({
        action: 'update',
        user_id: userId,
        is_active: !currentStatus,
      });
      setAlert({
        type: 'success',
        text: `${name}'s account is now ${!currentStatus ? 'Active' : 'Deactivated'}.`,
      });
      fetchStaff();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to update status for ${name}.`,
      });
    }
  };

  const openDeleteModal = (userId: string, name: string, userEmail: string) => {
    if (!isOwner) return;
    if (userId === profile?.id) return;
    setPendingDelete({ id: userId, name, email: userEmail });
  };

  const confirmDeleteStaff = async () => {
    if (!isOwner || !pendingDelete) return;

    const guard = canDeleteUser(staffList, pendingDelete.id);
    if (!guard.allowed) {
      setAlert({ type: 'error', text: guard.reason ?? 'Delete blocked.' });
      setPendingDelete(null);
      return;
    }

    setDeleting(true);
    try {
      await invokeManageStaff({ action: 'delete', user_id: pendingDelete.id });
      setAlert({ type: 'success', text: `Removed ${pendingDelete.name} from staff list.` });
      setPendingDelete(null);
      fetchStaff();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to remove user.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (s: StaffProfile) => {
    if (!isOwner) return;
    setEditing({
      id: s.id,
      fullName: s.full_name,
      role: s.role,
      newPassword: '',
    });
  };

  const saveEdit = async () => {
    if (!isOwner || !editing) return;
    const target = staffList.find((u) => u.id === editing.id);
    if (!target) return;

    if (editing.id === profile?.id && editing.role !== target.role) {
      setAlert({ type: 'error', text: 'You cannot change your own role.' });
      return;
    }
    if (editing.role === 'STAFF' && target.role === 'OWNER') {
      const guard = canDemoteOwner(staffList, editing.id);
      if (!guard.allowed) {
        setAlert({ type: 'error', text: guard.reason ?? 'Demote blocked.' });
        return;
      }
    }

    setSaving(true);
    setAlert(null);
    try {
      await invokeManageStaff({
        action: 'update',
        user_id: editing.id,
        full_name: editing.fullName.trim(),
        role: editing.role,
      });
      if (editing.newPassword.trim().length > 0) {
        await invokeManageStaff({
          action: 'reset-password',
          user_id: editing.id,
          new_password: editing.newPassword,
        });
      }
      setAlert({ type: 'success', text: `Updated ${editing.fullName.trim()}.` });
      setEditing(null);
      fetchStaff();
    } catch (err) {
      setAlert({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update user.',
      });
    } finally {
      setSaving(false);
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
                  minLength={2}
                  maxLength={80}
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
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group custom-role-picker" ref={rolePickerRef}>
                <label>Role Level</label>
                <div
                    className={`role-picker-trigger ${isRolePickerOpen ? 'active' : ''}`}
                    onClick={() => setIsRolePickerOpen(!isRolePickerOpen)}
                >
                    <span style={{ flex: 1, textAlign: 'left' }}>
                        {role === 'STAFF' ? 'STAFF (Check-in & Inquiries)' : 'OWNER (Full Admin Access)'}
                    </span>
                    <ChevronDown size={14} />
                </div>
                <div className={`role-picker-modal ${isRolePickerOpen ? 'open' : ''}`}>
                    <div
                        className={`role-cell ${role === 'STAFF' ? 'selected' : ''}`}
                        onClick={() => {
                            setRole('STAFF');
                            setIsRolePickerOpen(false);
                        }}
                    >
                        STAFF (Check-in & Inquiries)
                    </div>
                    <div
                        className={`role-cell ${role === 'OWNER' ? 'selected' : ''}`}
                        onClick={() => {
                            setRole('OWNER');
                            setIsRolePickerOpen(false);
                        }}
                    >
                        OWNER (Full Admin Access)
                    </div>
                </div>
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
                          <Mail size={14} className="w-3 h-3" />
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
                              onClick={() => openEditModal(s)}
                              className="edit-user-btn"
                              title="Edit name / role / password"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStaffActive(s.id, active, s.full_name)}
                              className={`toggle-power-btn ${active ? 'on' : 'off'}`}
                              title={active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => openDeleteModal(s.id, s.full_name, s.email)}
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

      {pendingDelete && (
        <div className="staff-modal-overlay" onClick={() => !deleting && setPendingDelete(null)}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Permanently remove user?</h4>
            <p>
              This deletes <strong>{pendingDelete.name}</strong> ({pendingDelete.email}) including
              their login. This cannot be undone. Deactivate instead if they might return.
            </p>
            <div className="staff-modal-actions">
              <button
                className="staff-modal-cancel"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="staff-modal-danger"
                onClick={confirmDeleteStaff}
                disabled={deleting}
              >
                {deleting ? 'Removing...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="staff-modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="staff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff-modal-header">
              <h4>Edit account</h4>
              <button className="staff-modal-x" onClick={() => setEditing(null)} disabled={saving}>
                <X size={16} />
              </button>
            </div>
            <div className="staff-modal-field">
              <label>Full name</label>
              <input
                type="text"
                value={editing.fullName}
                onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="staff-modal-field">
              <label>Role (owner only)</label>
              <select
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value as 'STAFF' | 'OWNER' })}
              >
                <option value="STAFF">STAFF (Check-in & Inquiries)</option>
                <option value="OWNER">OWNER (Full Admin Access)</option>
              </select>
            </div>
            <div className="staff-modal-field">
              <label>New password (optional, min 8 chars)</label>
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={editing.newPassword}
                onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })}
              />
            </div>
            <div className="staff-modal-actions">
              <button
                className="staff-modal-cancel"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="staff-modal-primary"
                onClick={saveEdit}
                disabled={saving || editing.fullName.trim().length < 2}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
