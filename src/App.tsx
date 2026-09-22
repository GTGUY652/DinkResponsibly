import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { CustomerLanding } from './pages/CustomerLanding';
import { CheckInTable } from './components/admin/CheckInTable';
import { RateController } from './components/admin/RateController';
import { TicketPortal } from './components/admin/TicketPortal';
import { StaffManager } from './components/admin/StaffManager';
import { RevenueOverview } from './components/admin/RevenueOverview';
import { LogOut, ListCheck, SlidersHorizontal, MessageSquareText, Users, ArrowLeft, PhilippinePeso, Wrench } from 'lucide-react';
import './App.css';
import { AiConsultantWidget } from './components/admin/AiConsultantWidget';

const AdminPortalContent: React.FC<{ onBackToCustomer: () => void }> = ({ onBackToCustomer }) => {
  const { user, profile, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'CHECKIN' | 'MAINTENANCE' | 'RATES' | 'TICKETS' | 'STAFF'>('REVENUE');

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
    <div className="admin-portal-wrapper">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <button onClick={onBackToCustomer} className="admin-back-btn">
            <ArrowLeft size={16} /> Back to Public Site
          </button>
          <h1 className="admin-title">DinkResponsibly</h1>
          <p className="admin-subtitle">Admin Portal</p>
          <p className="admin-user-info">
            Logged in as: <strong>{profile?.full_name || user.email}</strong><br/>({profile?.role || 'STAFF'})
          </p>
        </div>

        <nav className="admin-nav-bar">
          <button
            onClick={() => setActiveTab('REVENUE')}
            className={`admin-tab-btn ${activeTab === 'REVENUE' ? 'active' : ''}`}
          >
            <PhilippinePeso size={18} />
            Revenue Overview
          </button>

          <button
            onClick={() => setActiveTab('CHECKIN')}
            className={`admin-tab-btn ${activeTab === 'CHECKIN' ? 'active' : ''}`}
          >
            <ListCheck size={18} />
            Check-in Log
          </button>

          <button
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`admin-tab-btn ${activeTab === 'MAINTENANCE' ? 'active' : ''}`}
          >
            <Wrench size={18} />
            Maintenance Log
          </button>

          <button
            onClick={() => setActiveTab('RATES')}
            className={`admin-tab-btn ${activeTab === 'RATES' ? 'active' : ''}`}
          >
            <SlidersHorizontal size={18} />
            Court Rates
          </button>

          <button
            onClick={() => setActiveTab('TICKETS')}
            className={`admin-tab-btn ${activeTab === 'TICKETS' ? 'active' : ''}`}
          >
            <MessageSquareText size={18} />
            Support Inquiries
          </button>

          <button
            onClick={() => setActiveTab('STAFF')}
            className={`admin-tab-btn ${activeTab === 'STAFF' ? 'active' : ''}`}
          >
            <Users size={18} />
            Staff Management
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={signOut} className="admin-signout-btn">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="admin-main-content">
        {/* Active View */}
        {activeTab === 'REVENUE' && <RevenueOverview />}
        {activeTab === 'CHECKIN' && <CheckInTable type="regular" />}
        {activeTab === 'MAINTENANCE' && <CheckInTable type="maintenance" />}
        {activeTab === 'RATES' && <RateController />}
        {activeTab === 'TICKETS' && <TicketPortal />}
        {activeTab === 'STAFF' && <StaffManager />}
      </main>

      <AiConsultantWidget />
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