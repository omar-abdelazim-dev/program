import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import api from '../api/axios';

export default function AdminAuthPage({ onLoginSuccess, isLightMode, toggleTheme }) {
  const { i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.user.role !== 'admin') {
        setAuthError('Unauthorized. Only Admins can log in here.');
        setIsLoggingIn(false);
        return;
      }
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_lang', i18n.language);
      onLoginSuccess(response.data.user);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to login');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="auth-wrapper animate-entrance">
      {/* Utility Actions */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 100, display: 'flex', gap: '12px' }} dir="ltr">
        <button 
          onClick={toggleTheme} 
          className="nav-icon-btn-auth"
          title="Toggle Theme"
        >
          {isLightMode ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          )}
        </button>

        <button 
          onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")} 
          className="nav-icon-btn-auth"
          title="Toggle Language"
          style={{ fontWeight: '600', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}
        >
          {i18n.language === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div className="auth-split-grid">
        
        {/* Left Side: Branding / Marketing Copy */}
        <div className="auth-left">
          <div className="auth-header">
            <img 
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} 
              alt="Program Logo" 
              className="auth-logo"
            />
          </div>
          
          <h1>
            Program <span className="highlight">Admin</span><br/>
            <span className="highlight">Command Center.</span>
          </h1>
          
          <p>
            Secure access for authorized administrators only. Manage courses, instructors, and approve new content.
          </p>
        </div>

        {/* Right Side: Auth Card */}
        <div className="auth-right">
          <div className="auth-card glass-card">
            
            <div className="auth-header" style={{ marginBottom: '32px' }}>
              <h2>Admin Login</h2>
              <p>Sign in to access the administrator portal</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              
              <div className="step-content animate-entrance" style={{ display: 'block' }}>
                {authError && <div className="auth-error-message" style={{ color: '#ef4444', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>{authError}</div>}
                
                <div className="input-group">
                  <label>Admin Email *</label>
                  <input type="email" placeholder="admin@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                
                <div className="input-group">
                  <label>Password *</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="auth-actions" style={{ marginTop: '24px' }}>
                <button type="submit" className="glass-btn auth-submit-btn" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <span className="spinner-wrapper">
                      <svg className="btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                      Authenticating...
                    </span>
                  ) : (
                    <>Sign In <svg className="btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
