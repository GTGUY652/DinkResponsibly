import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import './AdminLogin.css';

export const AdminLogin: React.FC = () => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSumbit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      // 1. Pre-check if account is deactivated in profiles table
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (userProfile && userProfile.is_active === false) {
        setErrorMessage('⛔ Access Denied: Your staff account has been deactivated by the Court Owner.');
        return;
      }

      // 2. Proceed to sign in if account is active
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      }
    } catch (err) {
      console.error('Login check error:', err);
      setErrorMessage('An unexpected error occurred during login.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="icon-wrapper">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>
          <h2>Admin Dashboard Login</h2>
          <p>DinkResponsibly Booking Portal</p>
        </div>

        {errorMessage && (
          <div className="error-alert">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSumbit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="admin@dinkresponsibly.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="btn-icon" />
          </button>
        </form>
      </div>
    </div>
  );
};