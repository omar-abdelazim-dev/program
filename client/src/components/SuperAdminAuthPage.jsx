import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import api from '../api/axios';

export default function SuperAdminAuthPage({ onLoginSuccess, isLightMode }) {
  const { i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const response = await api.post('/auth/superadmin/login', { email, password });
      onLoginSuccess(response.data.user);
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Failed to login');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="auth-wrapper animate-entrance">
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100 }} dir="ltr">
        <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')} className="nav-icon-btn-auth">
          {i18n.language === 'ar' ? 'EN' : 'AR'}
        </button>
      </div>
      <div className="auth-split-grid">
        <div className="auth-left">
          <div className="auth-header"><img src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} alt="Program Logo" className="auth-logo" /></div>
          <h1>Program <span className="highlight">Super Admin</span><br /><span className="highlight">Control Room.</span></h1>
          <p>Restricted access for platform owners and super administrators.</p>
        </div>
        <div className="auth-right">
          <div className="auth-card glass-card">
            <div className="auth-header" style={{ marginBottom: '32px' }}>
              <h2>Super Admin Login</h2>
              <p>Sign in to access elevated platform controls</p>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              {authError && <div className="auth-error-message" style={{ color: '#ef4444', marginBottom: '1rem' }}>{authError}</div>}
              <div className="input-group"><label>Super Admin Email *</label><input type="email" placeholder="admin@example.com" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <div className="input-group"><label>Password *</label><div className="password-input-wrapper"><input type={showPassword ? 'text' : 'password'} placeholder="••••••••" required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? 'Hide' : 'Show'}</button></div></div>
              <div className="auth-actions" style={{ marginTop: '24px' }}><button type="submit" className="glass-btn auth-submit-btn" disabled={isLoggingIn}>{isLoggingIn ? 'Authenticating...' : 'Sign In'}</button></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
