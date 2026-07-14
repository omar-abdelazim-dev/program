import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

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

export default function AdminPortal({ user, onLogout }) {
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

  // Promote Admin State
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteStatus, setPromoteStatus] = useState({ type: '', msg: '' });
  const [promoting, setPromoting] = useState(false);

  // Promote Instructor State
  const [promoteInstructorEmail, setPromoteInstructorEmail] = useState('');
  const [promoteInstructorStatus, setPromoteInstructorStatus] = useState({ type: '', msg: '' });
  const [promotingInstructor, setPromotingInstructor] = useState(false);

  // Promote Super Admin State
  const [promoteSuperAdminEmail, setPromoteSuperAdminEmail] = useState('');
  const [promoteSuperAdminStatus, setPromoteSuperAdminStatus] = useState({ type: '', msg: '' });
  const [promotingSuperAdmin, setPromotingSuperAdmin] = useState(false);

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

  // Debounced Search
  useEffect(() => {
    if (activeTab !== 'users') return;
    const delay = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
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

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!promoteEmail) return;
    setPromoting(true);
    setPromoteStatus({ type: '', msg: '' });
    
    try {
      await api.patch('/auth/promote', { email: promoteEmail });
      setPromoteStatus({ type: 'success', msg: `Successfully promoted ${promoteEmail} to admin!` });
      setPromoteEmail('');
      if (activeTab.startsWith('users')) fetchUsers(searchQuery);
      
      setTimeout(() => {
        setPromoteStatus({ type: '', msg: '' });
      }, 3000);
    } catch (err) {
      setPromoteStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to promote user' });
    } finally {
      setPromoting(false);
    }
  };

  const handlePromoteInstructor = async (e) => {
    e.preventDefault();
    if (!promoteInstructorEmail) return;
    setPromotingInstructor(true);
    setPromoteInstructorStatus({ type: '', msg: '' });
    
    try {
      await api.patch('/auth/promote-instructor', { email: promoteInstructorEmail });
      setPromoteInstructorStatus({ type: 'success', msg: `Successfully promoted ${promoteInstructorEmail} to instructor!` });
      setPromoteInstructorEmail('');
      if (activeTab.startsWith('users')) fetchUsers(searchQuery);
      
      setTimeout(() => {
        setPromoteInstructorStatus({ type: '', msg: '' });
      }, 3000);
    } catch (err) {
      setPromoteInstructorStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to promote user to instructor' });
    } finally {
      setPromotingInstructor(false);
    }
  };

  const handlePromoteSuperAdmin = async (e) => {
    e.preventDefault();
    if (!promoteSuperAdminEmail) return;
    setPromotingSuperAdmin(true);
    setPromoteSuperAdminStatus({ type: '', msg: '' });
    
    try {
      await api.patch('/auth/promote-superadmin', { email: promoteSuperAdminEmail });
      setPromoteSuperAdminStatus({ type: 'success', msg: `Successfully promoted ${promoteSuperAdminEmail} to superadmin!` });
      setPromoteSuperAdminEmail('');
      if (activeTab.startsWith('users')) fetchUsers(searchQuery);
      
      setTimeout(() => {
        setPromoteSuperAdminStatus({ type: '', msg: '' });
      }, 3000);
    } catch (err) {
      setPromoteSuperAdminStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to promote user to superadmin' });
    } finally {
      setPromotingSuperAdmin(false);
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
    if(!window.confirm('Are you sure you want to demote this user to student?')) return;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/student')} className="nav-icon-btn" style={{ borderLeft:'1px solid rgba(255, 255, 255, 0.15)' , borderTop:'1px solid rgba(255, 255, 255, 0.15)', width: 'auto', padding: '0 12px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '8px'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span>Back to Student View</span>
          </button>
        </div>
        <div className="nav-logo">
          <h1 style={{ fontSize: '1.2rem', margin: '0' }}>{user?.role === 'superadmin' ? 'Super Admin Portal' : 'Admin Portal'}</h1>
        </div>
        <div className="nav-controls">
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
              <div style={{ padding: '0 12px 8px', fontSize: '0.8rem', color: 'var(--c-sub)' }}>Role: {user?.role}</div>
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
        <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {activeTab === 'dashboard_overview' && stats && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Overview</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div className="glass-card stat-card">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value" style={{ color: '#10B981', background: 'none', WebkitTextFillColor: 'initial' }}>
                      EGP <AnimatedNumber value={stats.totalRevenue} />
                    </div>
                  </div>
                  <div className="glass-card stat-card">
                    <div className="stat-label">Total Students</div>
                    <div className="stat-value"><AnimatedNumber value={stats.totalStudents} /></div>
                  </div>
                  <div className="glass-card stat-card">
                    <div className="stat-label">Total Instructors</div>
                    <div className="stat-value"><AnimatedNumber value={stats.totalInstructors} /></div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Enrollments by Category</h3>
                  {Object.keys(stats.categoryCounts).length === 0 ? (
                    <p style={{ color: 'var(--c-sub)' }}>No enrollments yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.entries(stats.categoryCounts).map(([cat, count]) => (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.8rem', margin: 0 }}>User Management</h2>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'superadmin' ? 'repeat(3, 1fr)' : '1fr 1fr', gap: '24px' }}>
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0' }}>Assign an Admin</h2>
                    <form onSubmit={handlePromote} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div className="input-group">
                          <input 
                            type="email" 
                            placeholder="User's email address" 
                            value={promoteEmail}
                            onChange={(e) => setPromoteEmail(e.target.value)}
                            required
                          />
                        </div>
                        {promoteStatus.msg && (
                          <div style={{ marginTop: '8px', fontSize: '0.9rem', color: promoteStatus.type === 'success' ? '#10B981' : '#ef4444' }}>
                            {promoteStatus.msg}
                          </div>
                        )}
                      </div>
                      <button type="submit" disabled={promoting} className="glass-btn auth-submit-btn" style={{ width: '100%', margin: 0 }}>
                        {promoting ? 'Promoting...' : 'Promote'}
                      </button>
                    </form>
                  </div>

                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0' }}>Assign an Instructor</h2>
                    <form onSubmit={handlePromoteInstructor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div className="input-group">
                          <input 
                            type="email" 
                            placeholder="User's email address" 
                            value={promoteInstructorEmail}
                            onChange={(e) => setPromoteInstructorEmail(e.target.value)}
                            required
                          />
                        </div>
                        {promoteInstructorStatus.msg && (
                          <div style={{ marginTop: '8px', fontSize: '0.9rem', color: promoteInstructorStatus.type === 'success' ? '#10B981' : '#ef4444' }}>
                            {promoteInstructorStatus.msg}
                          </div>
                        )}
                      </div>
                      <button type="submit" disabled={promotingInstructor} className="glass-btn auth-submit-btn" style={{ background: 'linear-gradient(135deg, var(--c-yellow), var(--c-orange))', width: '100%', margin: 0 }}>
                        {promotingInstructor ? 'Assigning...' : 'Assign'}
                      </button>
                    </form>
                  </div>

                  {user?.role === 'superadmin' && (
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0' }}>Assign a Super Admin</h2>
                      <form onSubmit={handlePromoteSuperAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div className="input-group">
                            <input 
                              type="email" 
                              placeholder="User's email address" 
                              value={promoteSuperAdminEmail}
                              onChange={(e) => setPromoteSuperAdminEmail(e.target.value)}
                              required
                            />
                          </div>
                          {promoteSuperAdminStatus.msg && (
                            <div style={{ marginTop: '8px', fontSize: '0.9rem', color: promoteSuperAdminStatus.type === 'success' ? '#10B981' : '#ef4444' }}>
                              {promoteSuperAdminStatus.msg}
                            </div>
                          )}
                        </div>
                        <button type="submit" disabled={promotingSuperAdmin} className="glass-btn auth-submit-btn" style={{ background: 'var(--c-orange)', boxShadow: '0 4px 15px rgba(251, 146, 60, 0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', width: '100%', margin: 0 }}>
                          {promotingSuperAdmin ? 'Assigning...' : 'Assign Super Admin'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Search users by name, email, or phone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ background: 'var(--c-card)' }}
                  />
                </div>

                <div className="glass-card" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
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
                      {users.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>No users found</td></tr>
                      ) : (
                        users.map(u => (
                          <tr key={u._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '16px' }}>{u.name}</td>
                            <td style={{ padding: '16px', color: 'var(--c-sub)' }}>{u.email}</td>
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
                            <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {u._id !== user.id && (
                                <>
                                  {u.role !== 'student' && (
                                    <button 
                                      onClick={() => handleDemote(u._id)}
                                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '6px', color: 'var(--c-light)', cursor: 'pointer' }}
                                    >Demote</button>
                                  )}
                                  <button 
                                    onClick={() => handleToggleBlock(u._id)}
                                    style={{ background: u.isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${u.isBlocked ? '#10B981' : '#ef4444'}`, padding: '6px 12px', borderRadius: '6px', color: u.isBlocked ? '#10B981' : '#ef4444', cursor: 'pointer' }}
                                  >
                                    {u.isBlocked ? 'Unblock' : 'Block'}
                                  </button>
                                </>
                              )}
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
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
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
                          <tr key={t._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
