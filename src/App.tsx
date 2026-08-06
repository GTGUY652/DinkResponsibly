import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { LogOut, UserCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { user, profile, loading, signOut} = useAuth();

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
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: '#1e293b', padding: '1rem 2rem', borderRadius: '0.75rem', border: '1px solid #334155' }}>
        
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
      
      <main style={{ background: '#1e293b', padding: '3rem', borderRadius: '0.75rem', border: '1px solid #334155', textAlign: 'center' }}>
        <UserCheck size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Authentication Working Successfully!</h2>
        <p style={{ color: '#94a3b8' }}>You are logged in as {profile?.role || 'STAFF'}. We are ready to build Phase 2 (Live Check-in & Transaction Table)!</p>
      </main>
    
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
