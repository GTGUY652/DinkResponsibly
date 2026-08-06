import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { CheckInTable } from './components/admin/CheckInTable';
import { RateController } from './components/admin/RateController';
import { LogOut, ListCheck, SlidersHorizontal } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'RATES'>('CHECKIN');

  if(loading) {
    return (
      <div className="login-container">
        <div style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Loading application...</div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#1e293b', padding: '1rem 2rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: '#f8fafc' }}>DinkResponsibly Admin Portal</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
            Logged in as: <strong style={{ color: '#10b981' }}>{profile?.full_name || user.email}</strong> ({profile?.role || 'STAFF'})
          </p>
        </div>
        <button
          onClick={signOut}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ef4444', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </header>
      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('CHECKIN')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'CHECKIN' ? '#10b981' : '#1e293b',
            color: activeTab === 'CHECKIN' ? '#022c22' : '#94a3b8',
          }}
        >
          <ListCheck size={18} />
          Check-in & Bookings Log
        </button>
        <button
          onClick={() => setActiveTab('RATES')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'RATES' ? '#10b981' : '#1e293b',
            color: activeTab === 'RATES' ? '#022c22' : '#94a3b8',
          }}
        >
          <SlidersHorizontal size={18} />
          Court Rates & Status Toggles
        </button>
      </nav>
      {/* Render Active View */}
      {activeTab === 'CHECKIN' && <CheckInTable />}
      {activeTab === 'RATES' && <RateController />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
