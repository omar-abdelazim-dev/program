import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { currentUser } from '../data';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

export default function TopNav({ user, activeTab, setActiveTab, toggleTheme, isLightMode, onLogout, cartCount, notifications }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const exploreRef = useRef(null);
  const dashboardRef = useRef(null);
  const myCoursesRef = useRef(null);

  const getActiveRef = () => {
    if (activeTab === 'explore') return exploreRef;
    if (activeTab === 'dashboard') return dashboardRef;
    if (activeTab === 'mycourses') return myCoursesRef;
    return { current: null };
  };

  useEffect(() => {
    const activeRef = getActiveRef();
    if (activeRef.current) {
      setIndicatorStyle({
        left: activeRef.current.offsetLeft,
        width: activeRef.current.offsetWidth
      });
    }
  }, [activeTab]);

  useEffect(() => {
    const handleResize = () => {
      const activeRef = getActiveRef();
      if (activeRef.current) {
        setIndicatorStyle({
          left: activeRef.current.offsetLeft,
          width: activeRef.current.offsetWidth
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  return (
    <nav className="top-nav">
      <div className="nav-row-top">
        <div className="nav-logo">
          <Link to="/student" style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} 
              alt="Program Logo" 
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>

        <div className="nav-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" placeholder="Search courses, lessons, topics..." />
        </div>

        <div className="nav-controls">
          <button className="nav-icon-btn" id="themeToggle" onClick={toggleTheme}>
            {isLightMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="12" y1="2" x2="12" y2="4"></line>
                <line x1="12" y1="20" x2="12" y2="22"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="2" y1="12" x2="4" y2="12"></line>
                <line x1="20" y1="12" x2="22" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          <Link to="/checkout/cart" className="nav-icon-btn" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: '0px', right: '0px', background: 'var(--c-orange)', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cartCount}
              </span>
            )}
          </Link>

          <div className="profile-wrapper">
            <button className="nav-icon-btn nav-bell">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notifications && notifications.length > 0 && (
                <span className="nav-dot"></span>
              )}
            </button>
            <div className="profile-tooltip" style={{ width: '320px', padding: '12px' }}>
              <div className="tooltip-name" style={{ fontSize: '1rem', marginBottom: '8px' }}>Notifications</div>
              <hr className="tooltip-divider" />
              {(!notifications || notifications.length === 0) ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--c-sub)', fontSize: '0.9rem' }}>
                  No new notifications
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.sort((a, b) => b.timestamp - a.timestamp).map((notif, idx) => (
                    <div key={notif.id || idx} style={{ padding: '12px 8px', borderBottom: idx !== notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-h)', marginBottom: '4px' }}>{notif.text}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)', textAlign: 'right' }}>
                        {new Date(notif.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="profile-wrapper">
            <div className="nav-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
              </svg>
            </div>
            <div className="profile-tooltip">
              <div className="tooltip-name">{user?.name || currentUser.name}</div>
              <hr className="tooltip-divider" />
              <a href="#" className="tooltip-link">Profile</a>
              <a href="#" className="tooltip-link">Settings</a>
              <hr className="tooltip-divider" />
              <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="tooltip-link logout-link">Log out</a>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-row-bottom">
        <button 
          ref={exploreRef}
          className={`nav-tab ${activeTab === 'explore' ? 'active' : ''}`} 
          onClick={() => setActiveTab('explore')}
        >
          Explore
        </button>
        {user?.role === 'student' && (
          <button
            ref={dashboardRef}
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
        )}

        {user?.role === 'instructor' && (
          <Link to="/instructor" className="nav-tab" style={{ textDecoration: 'none' }}>
            Instructor Portal
          </Link>
        )}

        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <Link to="/admin" className="nav-tab" style={{ textDecoration: 'none' }}>
            Admin Portal
          </Link>
        )}

        {user?.role === 'student' && (
          <button
            ref={myCoursesRef}
            className={`nav-tab ${activeTab === 'mycourses' ? 'active' : ''}`}
            onClick={() => setActiveTab('mycourses')}
          >
            My Courses
          </button>
        )}
        <button className="nav-tab" disabled>
          Certificates <span className="badge-soon">Coming soon</span>
        </button>
        
        {/* The Sliding Indicator */}
        <div className="nav-indicator" style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}></div>
      </div>
    </nav>
  );
}
