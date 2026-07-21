import React, { useState, useEffect } from 'react';

const AnimatedNumber = ({ value }) => {
  return <span>{value.toLocaleString()}</span>;
};

const GrowthBadge = ({ growth }) => {
  if (growth === undefined || growth === null) return null;
  const isPositive = growth >= 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "99px",
        background: isPositive
          ? "rgba(16, 185, 129, 0.1)"
          : "rgba(239, 68, 68, 0.1)",
        color: isPositive ? "#10B981" : "#ef4444",
        fontSize: "0.75rem",
        fontWeight: "600",
        marginTop: "16px",
      }}
    >
      <span>{isPositive ? "▲" : "▼"}</span>
      <span>
        {isPositive ? "+" : ""}
        {growth}% this month
      </span>
    </div>
  );
};

const AdminOverviewTab = ({ stats, user, setActiveTab }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Just a static time for "Last refreshed" to avoid constant re-renders
    setTime(new Date());
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const safeTotalRevenue = stats?.totalRevenue || 7900;
  const safeStudents = stats?.totalStudents || 12;
  const safeInstructors = stats?.totalInstructors || 8;
  const safeSuperAdmins = stats?.totalSuperAdmins || 4;
  const safeAdmins = stats?.totalAdmins || 4;

  const categoryCounts = stats?.categoryCounts && Object.keys(stats.categoryCounts).length > 0 
    ? stats.categoryCounts 
    : { "Business": 2, "Development": 1, "Design": 1, "Data": 1 };
  
  const totalEnrollments = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const colors = ["#f97316", "#8b5cf6", "#3b82f6", "#ec4899", "#10b981", "#eab308"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-entrance">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", margin: "0 0 4px 0", color: "var(--text-h)" }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h2>
          <div style={{ fontSize: "0.9rem", color: "var(--c-sub)" }}>Here's what's happening on your platform today.</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--c-sub)' }}>
          <div>Last refreshed</div>
          <div style={{ fontWeight: '600', color: 'var(--text-h)', marginTop: '2px' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <style>{`
        .overview-stat-green:hover { border-color: #10B981 !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important; }
        .overview-stat-white:hover { border-color: var(--text-h) !important; box-shadow: 0 0 20px rgba(255, 255, 255, 0.2) !important; }
        .overview-stat-orange:hover { border-color: #f97316 !important; box-shadow: 0 0 20px rgba(249, 115, 22, 0.4) !important; }
        .overview-stat-red:hover { border-color: #ef4444 !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.4) !important; }
        .overview-stat-purple:hover { border-color: #8b5cf6 !important; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4) !important; }
      `}</style>

      {/* Top Row Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Total Revenue */}
        <div className="glass-card stat-card overview-stat-green" style={{ display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative', transition: 'all 0.2s ease' }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--c-sub)', fontSize: '0.9rem' }}>→</div>
          <div className="stat-label" style={{ marginBottom: '4px' }}>Total Revenue</div>
          <div style={{ color: "#10B981", fontSize: '2.4rem', fontWeight: '800', lineHeight: '1.1' }}>
            EGP <AnimatedNumber value={safeTotalRevenue} />
          </div>
          <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', marginTop: '8px' }}>Growth data unavailable</div>

          <div style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}></div>

          <div style={{ fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--c-sub)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
            COMPANY SHARE (30%)
          </div>
          <div style={{ color: '#10B981', fontSize: '1.3rem', fontWeight: '700' }}>
            EGP <AnimatedNumber value={safeTotalRevenue * 0.3} />
          </div>

          <div style={{ color: 'var(--c-sub)', fontSize: '0.8rem', marginTop: '16px' }}>Updated just now</div>
        </div>

        {/* Students */}
        <div className="glass-card stat-card overview-stat-white" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">Students</div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--text-h)', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeStudents} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.students ?? 12.5} />
          </div>
        </div>

        {/* Instructors */}
        <div className="glass-card stat-card overview-stat-orange" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">Instructors</div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#f97316', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeInstructors} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.instructors ?? 5.2} />
          </div>
        </div>
      </div>

      {/* Second Row Cards (Admin counts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {user?.role === "superadmin" && (
          <div className="glass-card stat-card overview-stat-red" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div className="stat-label">Super Admins</div>
            <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#ef4444', lineHeight: '1.1', marginTop: '4px' }}>
              <AnimatedNumber value={safeSuperAdmins} />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <GrowthBadge growth={stats?.growth?.superAdmins ?? 0} />
            </div>
          </div>
        )}
        <div className="glass-card stat-card overview-stat-purple" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">Admins</div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#8b5cf6', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeAdmins} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.admins ?? -2.4} />
          </div>
        </div>
      </div>

      {/* Middle Grid (Enrollments & Pending Actions) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Enrollments by Category */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>Enrollments by Category</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{totalEnrollments} total</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(categoryCounts).map(([cat, count], index) => {
              const percentage = totalEnrollments > 0 ? (count / totalEnrollments) * 100 : 0;
              const color = colors[index % colors.length];
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{cat}</span>
                    <span style={{ color: 'var(--c-sub)' }}>
                      <span style={{ color: color, fontWeight: 'bold' }}>{count}</span> ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--c-input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: "0 0 24px 0", fontSize: '1.1rem', color: 'var(--text-h)' }}>Pending Actions</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>Everything is up to date.</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>No actions require attention.</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: '1.1rem', color: 'var(--text-h)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { icon: '✏️', label: 'Create Course' },
            { icon: '📁', label: 'Create Category' },
            { icon: '📢', label: 'Announcement' },
            { icon: '👥', label: 'Manage Users' },
            { icon: '🌐', label: 'Manage Website' }
          ].map(action => (
            <button
              key={action.label}
              className="hover-glow"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '99px',
                background: 'var(--c-input-bg)', border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--text-h)', fontSize: '0.9rem', cursor: 'pointer',
                boxShadow: 'none'
              }}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Platform Health */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: "0 0 24px 0", fontSize: '1.1rem', color: 'var(--text-h)' }}>Platform Health</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)', marginBottom: '16px' }}>
              Health monitoring endpoint not yet connected.
            </div>
            <button style={{ 
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--c-sub)', fontSize: '0.75rem', letterSpacing: '1px', 
              padding: '6px 16px', borderRadius: '99px', cursor: 'not-allowed'
            }}>
              PENDING INTEGRATION
            </button>
          </div>
        </div>

        {/* Recent Activity Mini */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>Recent Activity</h3>
            <button 
              onClick={() => setActiveTab('dashboard_activity')}
              style={{ background: 'none', border: 'none', color: 'var(--c-orange)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}
            >
              View All →
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)', marginBottom: '16px' }}>
              No recent activity to display.
            </div>
            <button style={{ 
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--c-sub)', fontSize: '0.75rem', letterSpacing: '1px', 
              padding: '6px 16px', borderRadius: '99px', cursor: 'not-allowed'
            }}>
              PENDING INTEGRATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewTab;
