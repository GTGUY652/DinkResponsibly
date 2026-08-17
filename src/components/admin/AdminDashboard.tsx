import React, { useState } from 'react';
import { CheckInTable } from './CheckInTable';
import { RateController } from './RateController';
import { TicketPortal } from './TicketPortal';
import { StaffManager } from './StaffManager';
import { RevenueOverview } from './RevenueOverview';
import { ListCheck, SlidersHorizontal, MessageSquareText, Users, DollarSign } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REVENUE' | 'CHECKIN' | 'RATES' | 'TICKETS' | 'STAFF'>('REVENUE');

  return (
    <div className="admin-dashboard-container">
      <nav className="admin-nav-bar">
        <button
          onClick={() => setActiveTab('REVENUE')}
          className={`admin-tab-btn ${activeTab === 'REVENUE' ? 'active' : ''}`}
        >
          <DollarSign size={18} />
          Revenue & Financials
        </button>

        <button
          onClick={() => setActiveTab('CHECKIN')}
          className={`admin-tab-btn ${activeTab === 'CHECKIN' ? 'active' : ''}`}
        >
          <ListCheck size={18} />
          Check-in Log
        </button>

        <button
          onClick={() => setActiveTab('RATES')}
          className={`admin-tab-btn ${activeTab === 'RATES' ? 'active' : ''}`}
        >
          <SlidersHorizontal size={18} />
          Court Rates & Toggles
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

      {/* Active View */}
      {activeTab === 'REVENUE' && <RevenueOverview />}
      {activeTab === 'CHECKIN' && <CheckInTable />}
      {activeTab === 'RATES' && <RateController />}
      {activeTab === 'TICKETS' && <TicketPortal />}
      {activeTab === 'STAFF' && <StaffManager />}
    </div>
  );
};

export default AdminDashboard;
