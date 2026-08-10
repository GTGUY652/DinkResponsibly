import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { CustomerLanding } from './pages/CustomerLanding';
import { CheckInTable } from './components/admin/CheckInTable';
import { RateController } from './components/admin/RateController';
import { TicketPortal } from './components/admin/TicketPortal';
import { StaffManager } from './components/admin/StaffManager';
import { LogOut, ListCheck, SlidersHorizontal, MessageSquareText, Users, ArrowLeft } from 'lucide-react';

const AdminPortalContent: React.FC<{ onBackToCustomer: () => void }> = ({ onBackToCustomer }) => {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'CHECKIN' | 'RATES' | 'TICKETS' | 'STAFF'>('CHECKIN');

  if (loading) {
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
          <button
            onClick={onBackToCustomer}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#a3e635', cursor: 'pointer', marginBottom: '0.5rem', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Public Site
          </button>
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
      <nav style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
          Check-in Log
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
          Court Rates & Toggles
        </button>

        <button
          onClick={() => setActiveTab('TICKETS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'TICKETS' ? '#10b981' : '#1e293b',
            color: activeTab === 'TICKETS' ? '#022c22' : '#94a3b8',
          }}
        >
          <MessageSquareText size={18} />
          Support Inquiries
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'STAFF' ? '#10b981' : '#1e293b',
            color: activeTab === 'STAFF' ? '#022c22' : '#94a3b8',
          }}
        >
          <Users size={18} />
          Staff Management
        </button>
      </nav>

      {/* Active View */}
      {activeTab === 'CHECKIN' && <CheckInTable />}
      {activeTab === 'RATES' && <RateController />}
      {activeTab === 'TICKETS' && <TicketPortal />}
      {activeTab === 'STAFF' && <StaffManager />}
    </div>
  );
};

export default function App() {
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('admin') === 'true' || window.location.hash === '#admin';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const isParamAdmin = queryParams.get('admin') === 'true';
      const isHashAdmin = window.location.hash === '#admin';
      setIsAdminView(isParamAdmin || isHashAdmin);
    };

    // Listen to hashchange and popstate events dynamically
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleBackToCustomer = () => {
    window.location.hash = '';
    setIsAdminView(false);
  };

  if (isAdminView) {
    return (
      <AuthProvider>
        <AdminPortalContent onBackToCustomer={handleBackToCustomer} />
      </AuthProvider>
    );
  }

  return <CustomerLanding />;
}