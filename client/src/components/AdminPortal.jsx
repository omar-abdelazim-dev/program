import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1500;
    const endValue = parseInt(value, 10) || 0;
    const startValue = displayValue;
    
    if (startValue === endValue) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(startValue + (endValue - startValue) * easeProgress));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{displayValue}</span>;
};

const roleLevels = { student: 0, instructor: 1, admin: 2, superadmin: 3 };
const canManage = (currentRole, targetRole) => (roleLevels[currentRole] || 0) > (roleLevels[targetRole] || 0);

export default function AdminPortal({ user, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard_overview');
  console.log("Admin Portal mounted with activeTab:", activeTab);
  
  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  
  // Loading & Processing States
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Sidebar Dropdown State
  const [expandedGroup, setExpandedGroup] = useState('Dashboard');

  const toggleGroup = (title) => {
    setExpandedGroup(prev => prev === title ? null : title);
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/courses/pending')
      ]);
      setStats(statsRes.data);
      setPendingCourses(pendingRes.data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (query = '') => {
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(query)}`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/admin/transactions');
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      navigate('/');
      return;
    }
    
    setLoading(true);
    if (activeTab.startsWith('dashboard') || activeTab.startsWith('courses')) {
      fetchDashboardData();
    } else if (activeTab.startsWith('users')) {
      fetchUsers(searchQuery);
    } else if (activeTab === 'enrollment') {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [user, navigate, activeTab]);

  // Live Debounced Search
  useEffect(() => {
    if (!activeTab.startsWith('users')) return;
    const delay = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, activeTab]);


  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/courses/${id}/approve`);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to approve course', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/courses/${id}/reject`);
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to reject course', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleInlinePromote = async (email, targetRole) => {
    try {
      let endpoint = '';
      if (targetRole === 'admin') endpoint = '/auth/promote';
      else if (targetRole === 'superadmin') endpoint = '/auth/promote-superadmin';
      else throw new Error('Invalid promotion target');
      
      await api.patch(endpoint, { email });
      if (activeTab.startsWith('users')) fetchUsers(searchQuery);
    } catch (err) {
      console.error('Failed to promote user', err);
      alert(err.response?.data?.message || 'Failed to promote user');
    }
  };

  const handleToggleBlock = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/block`);
      fetchUsers(searchQuery);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle block');
    }
  };

  const handleDemote = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/demote`);
      fetchUsers(searchQuery);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to demote user');
    }
  };

  if (loading && !stats && !users.length && !transactions.length) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Admin Portal...</div>;
  }

  const menuGroups = user?.role === 'superadmin' ? [
    {
      title: 'Dashboard',
      items: [
        { id: 'dashboard_overview', label: 'Overview' },
        { id: 'dashboard_stats', label: 'Statistics' },
        { id: 'dashboard_analytics', label: 'Analytics' },
        { id: 'dashboard_activity', label: 'Recent Activity' },
      ]
    },
    {
      title: 'User Management',
      items: [
        { id: 'users_students', label: 'Students' },
        { id: 'users_instructors', label: 'Instructors' },
        { id: 'users_admins', label: 'Admins' },
      ]
    },
    {
      title: 'Course Management',
      items: [
        { id: 'courses_all', label: 'Courses' },
        { id: 'courses_lessons', label: 'Lessons' },
        { id: 'courses_categories', label: 'Categories' },
      ]
    },
    {
      title: 'Enrollment Management',
      items: [{ id: 'enrollment', label: 'Enrollments' }]
    },
    {
      title: 'Certificate Management',
      items: [{ id: 'certificates', label: 'Certificates' }]
    },
    {
      title: 'Website Management',
      items: [
        { id: 'web_home', label: 'Homepage' },
        { id: 'web_about', label: 'About' },
        { id: 'web_faq', label: 'FAQ' },
        { id: 'web_contact', label: 'Contact' },
        { id: 'web_testimonials', label: 'Testimonials' },
      ]
    },
    {
      title: 'Announcement Management',
      items: [{ id: 'announcements', label: 'Announcements' }]
    },
    {
      title: 'Reports & Analytics',
      items: [{ id: 'reports', label: 'Reports & Analytics' }]
    },
    {
      title: 'Role & Permission',
      items: [{ id: 'roles', label: 'Role & Permission Management' }]
    },
    {
      title: 'System Settings',
      items: [{ id: 'settings', label: 'System Settings' }]
    },
    {
      title: 'Profile',
      items: [
        { id: 'profile_my', label: 'My Profile' },
        { id: 'profile_password', label: 'Change Password' }
      ]
    }
  ] : [
    {
      title: 'Dashboard',
      items: [
        { id: 'dashboard_overview', label: 'Overview' },
        { id: 'dashboard_stats', label: 'Statistics' },
        { id: 'dashboard_activity', label: 'Recent Activity' },
      ]
    },
    {
      title: 'Student Management',
      items: [{ id: 'users_students', label: 'Students' }]
    },
    {
      title: 'Instructor Management',
      items: [{ id: 'users_instructors', label: 'Instructors' }]
    },
    {
      title: 'Course Management',
      items: [
        { id: 'courses_all', label: 'Courses' },
        { id: 'courses_lessons', label: 'Lessons' },
        { id: 'courses_categories', label: 'Categories' },
      ]
    },
    {
      title: 'Enrollment Management',
      items: [{ id: 'enrollment', label: 'Enrollments' }]
    },
    {
      title: 'Certificate Management',
      items: [{ id: 'certificates', label: 'Certificates' }]
    },
    {
      title: 'Announcement Management',
      items: [{ id: 'announcements', label: 'Announcements' }]
    },
    {
      title: 'Reports',
      items: [{ id: 'reports', label: 'Reports' }]
    },
    {
      title: 'Profile',
      items: [
        { id: 'profile_my', label: 'My Profile' },
        { id: 'profile_password', label: 'Change Password' }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Navbar using top-nav styling */}
      <nav className="top-nav" style={{ position: 'relative', borderBottom:'1px solid rgba(255, 255, 255, 0.15)', zIndex: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '40px' }}>
          <Link to="/">
            <img 
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} 
              alt="Program Logo" 
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>
        <div className="nav-logo">
          <h1 style={{ fontSize: '1.2rem', margin: '0' }}>{user?.role === 'superadmin' ? 'Super Admin Portal' : 'Admin Portal'}</h1>
        </div>
        <div className="nav-controls" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="nav-icon-btn" onClick={toggleTheme} style={{ marginRight: '16px' }}>
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
          <div className="profile-wrapper">
            <div className="nav-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
              </svg>
            </div>
            <div className="profile-tooltip">
              <div className="tooltip-name">{user?.name}</div>
              <hr className="tooltip-divider" />
              <a href="#" className="tooltip-link">Profile</a>
              <a href="#" className="tooltip-link">Settings</a>
              <hr className="tooltip-divider" />
              <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="tooltip-link logout-link">Log out</a>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div className="glass-card" style={{ width: '280px', borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRight:'1px solid rgba(255, 255, 255, 0.15)', display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: '24px', overflowY: 'auto' }}>
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <div 
                onClick={() => toggleGroup(group.title)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '0.75rem', 
                  textTransform: 'uppercase', 
                  color: 'var(--c-sub)', 
                  fontWeight: 'bold', 
                  letterSpacing: '1px', 
                  marginBottom: '8px', 
                  padding: '8px', 
                  cursor: 'pointer',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
                className="hover-glow"
              >
                {group.title}
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ 
                    transform: expandedGroup === group.title ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateRows: expandedGroup === group.title ? '1fr' : '0fr',
                opacity: expandedGroup === group.title ? 1 : 0,
                transition: 'grid-template-rows 0.3s ease, opacity 0.3s ease'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {group.items.some(t => t.id === activeTab) && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '42px',
                      top: `${group.items.findIndex(t => t.id === activeTab) * 46}px`,
                      background: 'var(--c-input-bg)',
                      border: 'var(--c-border)',
                      borderTop: 'var(--c-border-top)',
                      borderLeft: 'var(--c-border-left)',
                      borderRadius: '12px',
                      transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      pointerEvents: 'none',
                      zIndex: 0
                    }} />
                  )}
                  {group.items.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="hover-glow"
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      height: '42px',
                      padding: '0 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: '12px',
                      color: activeTab === tab.id ? '#fff' : 'var(--c-sub)',
                      cursor: 'pointer',
                      fontWeight: activeTab === tab.id ? '600' : '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.9rem'
                    }}
                  >
                    {tab.label}
                    {tab.id === 'courses_all' && pendingCourses.length > 0 && (
                      <span style={{ background: 'var(--c-orange)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '12px' }}>
                        {pendingCourses.length}
                      </span>
                    )}
                  </button>
                ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto', minWidth: 0 }}>
          <div style={{ maxWidth: '100%', margin: '0 auto' }}>
            
            {activeTab === 'dashboard_overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Overview</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* First Row: Revenue, Students, Instructors */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                    <div className="glass-card stat-card" style={{ '--hover-color': '#10B981' }}>
                      <div className="stat-label">Revenue (Company Share)</div>
                      <div className="stat-value" style={{ color: '#10B981', background: 'none', WebkitTextFillColor: 'initial' }}>
                        EGP <AnimatedNumber value={stats.companyRevenue} />
                      </div>
                    </div>
                    <div className="glass-card stat-card" style={{ '--hover-color': 'var(--c-sub)' }}>
                      <div className="stat-label">Students</div>
                      <div className="stat-value" style={{ color: 'var(--hover-color)', background: 'none', WebkitTextFillColor: 'initial' }}><AnimatedNumber value={stats.totalStudents} /></div>
                    </div>
                    <div className="glass-card stat-card" style={{ '--hover-color': 'var(--c-orange)' }}>
                      <div className="stat-label">Instructors</div>
                      <div className="stat-value" style={{ color: 'var(--hover-color)', background: 'none', WebkitTextFillColor: 'initial' }}><AnimatedNumber value={stats.totalInstructors} /></div>
                    </div>
                  </div>

                  {/* Second Row: Super Admins, Admins */}
                  {user?.role === 'superadmin' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                      <div className="glass-card stat-card" style={{ '--hover-color': '#ef4444' }}>
                        <div className="stat-label">Super Admins</div>
                        <div className="stat-value" style={{ color: 'var(--hover-color)', background: 'none', WebkitTextFillColor: 'initial' }}><AnimatedNumber value={stats.totalSuperAdmins || 0} /></div>
                      </div>
                      <div className="glass-card stat-card" style={{ '--hover-color': 'var(--c-purple)' }}>
                        <div className="stat-label">Admins</div>
                        <div className="stat-value" style={{ color: 'var(--hover-color)', background: 'none', WebkitTextFillColor: 'initial' }}><AnimatedNumber value={stats.totalAdmins || 0} /></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Enrollments by Category</h3>
                  {Object.keys(stats.categoryCounts).length === 0 ? (
                    <p style={{ color: 'var(--c-sub)' }}>No enrollments yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.entries(stats.categoryCounts).map(([cat, count]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--c-input-bg)', borderRadius: '8px' }}>
                          <span style={{ fontWeight: '500' }}>{cat}</span>
                          <span style={{ color: 'var(--c-orange)', fontWeight: 'bold' }}>{count} enrolled</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab.startsWith('users') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.8rem', margin: 0 }}>User Management</h2>
                  <div style={{ position: 'relative', width: '350px' }}>
                    <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-sub)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                    <input 
                      type="text" 
                      placeholder="Search users by name, email, or phone..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', background: isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--c-border-active)', padding: '12px 16px 12px 42px', borderRadius: '12px', color: 'var(--c-text)', outline: 'none', transition: 'all 0.3s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.02)' }}
                      onMouseEnter={(e) => { e.target.style.background = isLightMode ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)' }}
                      onMouseLeave={(e) => { if(document.activeElement !== e.target) e.target.style.background = isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)' }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--c-orange)';
                        e.target.style.background = isLightMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 17, 23, 0.8)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(251, 146, 60, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--c-border-active)';
                        e.target.style.background = isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)';
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.02)';
                      }}
                    />
                  </div>
                </div>

                <div className="glass-card" style={{ overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--c-border-subtle)' }}>
                      <tr>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Name</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Email</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Phone</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Role</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Status</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => {
                        if (activeTab === 'users_students') return u.role === 'student';
                        if (activeTab === 'users_instructors') return u.role === 'instructor';
                        if (activeTab === 'users_admins') return u.role === 'admin' || u.role === 'superadmin';
                        return true;
                      }).length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>No users found</td></tr>
                      ) : (
                        users.filter(u => {
                          if (activeTab === 'users_students') return u.role === 'student';
                          if (activeTab === 'users_instructors') return u.role === 'instructor';
                          if (activeTab === 'users_admins') return u.role === 'admin' || u.role === 'superadmin';
                          return true;
                        }).map(u => (
                          <tr key={u._id} style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
                            <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>{u.name}</td>
                            <td style={{ padding: '16px', color: 'var(--c-sub)', whiteSpace: 'nowrap' }}>{u.email}</td>
                            <td style={{ padding: '16px', color: 'var(--c-sub)' }}>{u.phone || '-'}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem',
                                background: u.role === 'superadmin' ? 'rgba(239, 68, 68, 0.2)' : u.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : u.role === 'instructor' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                color: u.role === 'superadmin' ? '#ef4444' : u.role === 'admin' ? '#a78bfa' : u.role === 'instructor' ? '#fb923c' : 'var(--c-sub)'
                              }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ color: u.isBlocked ? '#ef4444' : '#10B981', fontSize: '0.9rem' }}>
                                {u.isBlocked ? 'Blocked' : 'Active'}
                              </span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap', position: 'relative', zIndex: openDropdownId === u._id ? 50 : 'auto' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', position: 'relative', zIndex: openDropdownId === u._id ? 50 : 'auto' }}>
                                {u._id !== user.id && canManage(user?.role, u.role) && (
                                  <>
                                    {user?.role === 'superadmin' && u.role !== 'instructor' && (
                                      <div 
                                        tabIndex={-1}
                                        onBlur={(e) => {
                                          if (!e.currentTarget.contains(e.relatedTarget)) {
                                            setOpenDropdownId(null);
                                          }
                                        }}
                                        style={{ display: 'inline-block', position: 'relative', zIndex: openDropdownId === u._id ? 50 : 'auto' }}
                                      >
                                        <button 
                                          onClick={() => setOpenDropdownId(openDropdownId === u._id ? null : u._id)}
                                          style={{ background: isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border-active)', padding: '0 12px', borderRadius: '6px', color: 'var(--c-light)', cursor: 'pointer', height: '34px', outline: 'none', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', width: '100%', transition: 'all 0.2s' }}
                                          onMouseEnter={(e) => { e.currentTarget.style.background = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'; }}
                                        >
                                          Assign Role
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                                        </button>
                                        <div className="profile-tooltip" style={{ 
                                          right: 0, 
                                          top: '100%', 
                                          marginTop: '4px', 
                                          width: '100%', 
                                          zIndex: 10, 
                                          textAlign: 'left',
                                          opacity: openDropdownId === u._id ? 1 : 0,
                                          visibility: openDropdownId === u._id ? 'visible' : 'hidden',
                                          transform: openDropdownId === u._id ? 'translateY(0)' : 'translateY(10px)',
                                          pointerEvents: openDropdownId === u._id ? 'auto' : 'none',
                                          transition: 'all 0.15s ease-out',
                                          background: isLightMode ? '#ffffff' : '#0f1117',
                                          backdropFilter: 'none',
                                          WebkitBackdropFilter: 'none'
                                        }}>
                                          {user?.role === 'superadmin' && u.role !== 'admin' && <a href="#" onClick={(e) => { e.preventDefault(); handleInlinePromote(u.email, 'admin'); setOpenDropdownId(null); }} className="tooltip-link">Admin</a>}
                                          {user?.role === 'superadmin' && u.role !== 'superadmin' && <a href="#" onClick={(e) => { e.preventDefault(); handleInlinePromote(u.email, 'superadmin'); setOpenDropdownId(null); }} className="tooltip-link">Super Admin</a>}
                                        </div>
                                      </div>
                                    )}
                                    {u.role !== 'student' && !(user?.role === 'superadmin' && u.role === 'instructor') && (
                                      <button 
                                        onClick={() => handleDemote(u._id)}
                                        style={{ background: isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border-active)', padding: '6px 12px', borderRadius: '6px', color: 'var(--c-light)', cursor: 'pointer', height: '34px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)'; }}
                                      >Demote</button>
                                    )}
                                    <button 
                                      onClick={() => handleToggleBlock(u._id)}
                                      style={{ background: u.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${u.isBlocked ? '#10B981' : '#ef4444'}`, padding: '6px 12px', borderRadius: '6px', color: u.isBlocked ? '#10B981' : '#ef4444', cursor: 'pointer', height: '34px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = u.isBlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = u.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'; }}
                                    >
                                      {u.isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'enrollment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Financial Transactions</h2>
                <div className="glass-card" style={{ overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--c-border-subtle)' }}>
                      <tr>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Date</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Student</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)' }}>Course</th>
                        <th style={{ padding: '16px', fontWeight: '600', color: 'var(--c-sub)', textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>No transactions found</td></tr>
                      ) : (
                        transactions.map(t => (
                          <tr key={t._id} style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
                            <td style={{ padding: '16px', color: 'var(--c-sub)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '16px' }}>{t.student?.name || 'Unknown User'}</td>
                            <td style={{ padding: '16px' }}>{t.course?.title || 'Unknown Course'}</td>
                            <td style={{ padding: '16px', textAlign: 'right', color: '#10B981', fontWeight: '600' }}>
                              EGP {t.amountPaid}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'courses_all' && (
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Pending Course Approvals</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingCourses.length === 0 ? (
                    <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--c-sub)' }}>
                      No pending courses to review. You're all caught up!
                    </div>
                  ) : (
                    pendingCourses.map(course => (
                      <div key={course._id} className="glass-card hover-glow" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          {course.thumbnailUrl ? (
                            <img src={course.thumbnailUrl} alt={course.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                          ) : (
                            <div style={{ width: '120px', height: '80px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px' }}></div>
                          )}
                          <div>
                            <h3 style={{ fontSize: '1.3rem', margin: '0 0 8px 0' }}>{course.title}</h3>
                            <div style={{ color: 'var(--c-sub)', fontSize: '0.95rem' }}>
                              By {course.instructor?.name || 'Unknown'} • EGP {course.price} • {course.category}
                            </div>
                            <div style={{ marginTop: '8px', color: 'var(--c-sub)', fontSize: '0.85rem' }}>
                              {course.description.substring(0, 80)}...
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => handleReject(course._id)}
                            disabled={processingId === course._id}
                            className="glass-btn hover-glow" 
                            style={{ padding: '8px 16px', fontSize: '0.95rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(course._id)}
                            disabled={processingId === course._id}
                            className="glass-btn hover-glow" 
                            style={{ padding: '8px 16px', fontSize: '0.95rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.5)' }}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
