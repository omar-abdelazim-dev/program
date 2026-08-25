import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import CardSkeleton from './common/CardSkeleton';

const AnimatedNumber = ({ value }) => {
  return <span>{value.toLocaleString()}</span>;
};

const formatUptime = (seconds) => {
  if (!seconds || seconds <= 0) return "0m";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
};

const GrowthBadge = ({ growth }) => {
  const { t } = useTranslation();
  
  if (growth === undefined || growth === null) return null;
  const isPositive = growth >= 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderRadius: "12px",
        background: "var(--bg-main)",
        boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
        color: isPositive ? "#10B981" : "#ef4444",
        fontSize: "0.75rem",
        fontWeight: "600",
        marginTop: "16px",
        width: "fit-content",
        whiteSpace: "nowrap"
      }}
    >
      <span>{isPositive ? "▲" : "▼"}</span>
      <span>
        {isPositive ? "+" : ""}
        {growth}% {t('admin.this_month', 'this month')}
      </span>
    </div>
  );
};

const AdminOverviewTab = ({ stats, user, setActiveTab, loading }) => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(false);
    try {
      const res = await api.get('/admin/health');
      setHealthData(res.data);
    } catch {
      try {
        const [hRes, rRes] = await Promise.all([
          api.get('/health').catch(() => ({ data: { status: 'ok', uptimeSeconds: 0 } })),
          api.get('/ready').catch(() => ({ data: { status: 'ready', database: 'connected' } })),
        ]);
        setHealthData({
          status: rRes.data?.database === 'connected' ? 'healthy' : 'degraded',
          uptimeSeconds: hRes.data?.uptimeSeconds || 0,
          database: { status: rRes.data?.database || 'connected', latencyMs: null },
          memory: null,
          environment: 'production',
        });
      } catch {
        setHealthError(true);
      }
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    if (user?.role !== 'superadmin') {
      setActivitiesLoading(false);
      return;
    }
    setActivitiesLoading(true);
    try {
      const res = await api.get('/admin/activity');
      setRecentActivities(res.data?.activities?.slice(0, 4) || []);
    } catch (err) {
      console.error('Failed to fetch recent activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    // Keep the refresh timestamp stable for the lifetime of this mount.
    setTime(new Date());
    fetchHealth();
    fetchActivities();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchActivities]);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return t('admin.just_now', 'Just now');
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading || !stats) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-entrance">
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-pulse" style={{ height: '32px', width: '220px', borderRadius: '8px' }} />
            <div className="skeleton-pulse" style={{ height: '16px', width: '320px', borderRadius: '6px' }} />
          </div>
          <div className="skeleton-pulse" style={{ height: '24px', width: '100px', borderRadius: '6px' }} />
        </div>

        {/* Top Row Stat Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card" style={{ padding: '24px', minHeight: '160px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="skeleton-pulse" style={{ height: '14px', width: '45%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '36px', width: '65%', borderRadius: '8px' }} />
              <div className="skeleton-pulse" style={{ height: '14px', width: '35%', borderRadius: '4px', marginTop: 'auto' }} />
            </div>
          ))}
        </div>

        {/* Second Row Admin Stat Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
          {[1, 2].map((i) => (
            <div key={i} className="glass-card" style={{ padding: '24px', minHeight: '130px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton-pulse" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '32px', width: '50%', borderRadius: '8px' }} />
              <div className="skeleton-pulse" style={{ height: '12px', width: '30%', borderRadius: '4px', marginTop: 'auto' }} />
            </div>
          ))}
        </div>

        {/* Middle Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton-pulse" style={{ height: '18px', width: '180px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '14px', width: '60px', borderRadius: '4px' }} />
            </div>
            {[1, 2, 3].map((k) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="skeleton-pulse" style={{ height: '14px', width: '100px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '14px', width: '40px', borderRadius: '4px' }} />
                </div>
                <div className="skeleton-pulse" style={{ height: '8px', width: '100%', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
          <div className="glass-card" style={{ padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="skeleton-pulse" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
            {[1, 2].map((k) => (
              <div key={k} className="skeleton-pulse" style={{ height: '56px', width: '100%', borderRadius: '10px' }} />
            ))}
          </div>
        </div>

        {/* Bottom Row Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="skeleton-pulse" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '50px', width: '100%', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ height: '50px', width: '100%', borderRadius: '10px' }} />
          </div>
          <div className="glass-card" style={{ padding: '24px', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="skeleton-pulse" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '50px', width: '100%', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ height: '50px', width: '100%', borderRadius: '10px' }} />
          </div>
        </div>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('admin.good_morning', 'Good morning');
    if (hour < 18) return t('admin.good_afternoon', 'Good afternoon');
    return t('admin.good_evening', 'Good evening');
  };

  const safeTotalRevenue = stats?.totalRevenue || 0;
  const safeStudents = stats?.totalStudents || 0;
  const safeInstructors = stats?.totalInstructors || 0;
  const safeSuperAdmins = stats?.totalSuperAdmins || 0;
  const safeAdmins = stats?.totalAdmins || 0;

  const categoryCounts = stats?.categoryCounts && Object.keys(stats.categoryCounts).length > 0 
    ? stats.categoryCounts 
    : {};
  
  const totalEnrollments = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const colors = ["#f97316", "#8b5cf6", "#ea580c", "#ec4899", "#10b981", "#eab308"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-entrance">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", margin: "0 0 4px 0", color: "var(--text-h)" }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h2>
          <div style={{ fontSize: "0.9rem", color: "var(--c-sub)" }}>{t('admin.whats_happening', "Here's what's happening on your platform today.")}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--c-sub)' }}>
          <div>{t('admin.last_refreshed', 'Last refreshed')}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
        {/* Total Revenue */}
        <div className="glass-card stat-card overview-stat-green" style={{ display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative', transition: 'all 0.2s ease' }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--c-sub)', fontSize: '0.9rem' }}>→</div>
          <div className="stat-label" style={{ marginBottom: '4px' }}>{t('admin.total_revenue', 'Total Revenue')}</div>
          <div style={{ color: "#10B981", fontSize: '1.8rem', fontWeight: '800', lineHeight: '1.1' }}>
            EGP <AnimatedNumber value={safeTotalRevenue} />
          </div>
          <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', marginTop: '8px' }}>{t('admin.growth_unavailable', 'Growth data unavailable')}</div>

          <div style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}></div>

          <div style={{ fontSize: '0.75rem', letterSpacing: '1px', color: 'var(--c-sub)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
            {t('admin.company_share_percent', 'COMPANY SHARE (30%)')}
          </div>
          <div style={{ color: '#10B981', fontSize: '1.3rem', fontWeight: '700' }}>
            EGP <AnimatedNumber value={safeTotalRevenue * 0.3} />
          </div>

          <div style={{ color: 'var(--c-sub)', fontSize: '0.8rem', marginTop: '16px' }}>{t('admin.updated_just_now', 'Updated just now')}</div>
        </div>

        {/* Students */}
        <div className="glass-card stat-card overview-stat-white" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">{t('admin.students', 'Students')}</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-h)', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeStudents} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.students} />
          </div>
        </div>

        {/* Instructors */}
        <div className="glass-card stat-card overview-stat-orange" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">{t('admin.instructors', 'Instructors')}</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f97316', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeInstructors} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.instructors} />
          </div>
        </div>
      </div>

      {/* Second Row Cards (Admin counts) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
        {user?.role === "superadmin" && (
          <div className="glass-card stat-card overview-stat-red" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div className="stat-label">{t('admin.superadmins', 'Super Admins')}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444', lineHeight: '1.1', marginTop: '4px' }}>
              <AnimatedNumber value={safeSuperAdmins} />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <GrowthBadge growth={stats?.growth?.superAdmins} />
            </div>
          </div>
        )}
        <div className="glass-card stat-card overview-stat-purple" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
          <div className="stat-label">{t('admin.admins', 'Admins')}</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#8b5cf6', lineHeight: '1.1', marginTop: '4px' }}>
            <AnimatedNumber value={safeAdmins} />
          </div>
          <div style={{ marginTop: 'auto' }}>
            <GrowthBadge growth={stats?.growth?.admins} />
          </div>
        </div>
      </div>

      {/* Middle Grid (Enrollments & Pending Actions) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Enrollments by Category */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>{t('admin.enrollments_by_category', 'Enrollments by Category')}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{totalEnrollments} {t('admin.total', 'total')}</span>
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
                  <div style={{ 
                    width: '100%', height: '6px', 
                    background: 'var(--bg-main)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)', 
                    borderRadius: '3px', overflow: 'hidden' 
                  }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: '1.1rem', color: 'var(--text-h)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('admin.pending_actions', 'Pending Actions')}</span>
            {( (stats?.pendingCourses || 0) + (stats?.pendingEnrollments || 0) + (stats?.pendingPayouts || 0) + (stats?.pendingLessons || 0) + (stats?.pendingQuizzes || 0) ) > 0 && (
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'rgba(249,115,22,0.12)', color: '#f97316', borderRadius: '12px', fontWeight: 'bold', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15)' }}>
                {(stats?.pendingCourses || 0) + (stats?.pendingEnrollments || 0) + (stats?.pendingPayouts || 0) + (stats?.pendingLessons || 0) + (stats?.pendingQuizzes || 0)} Attention
              </span>
            )}
          </h3>

          {( (stats?.pendingCourses || 0) + (stats?.pendingEnrollments || 0) + (stats?.pendingPayouts || 0) + (stats?.pendingLessons || 0) + (stats?.pendingQuizzes || 0) ) > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(stats?.pendingCourses || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📚</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>{stats.pendingCourses} Course(s) Awaiting Review</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>Submitted for admin approval</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('courses')}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Review
                  </button>
                </div>
              )}

              {(stats?.pendingEnrollments || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎓</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>{stats.pendingEnrollments} Enrollment Request(s)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>Student course access approvals</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('enrollment')}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', color: '#f97316', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Review
                  </button>
                </div>
              )}

              {(stats?.pendingPayouts || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>💳</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>{stats.pendingPayouts} Payout Request(s)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>Instructor earnings withdrawal requests</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('financial_payouts')}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Review
                  </button>
                </div>
              )}

              {((stats?.pendingLessons || 0) + (stats?.pendingQuizzes || 0)) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📝</span>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>{(stats?.pendingLessons || 0) + (stats?.pendingQuizzes || 0)} Lesson/Quiz Update(s)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>Content revisions needing verification</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('courses')}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Review
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: 'var(--bg-main)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>{t('admin.up_to_date', 'Everything is up to date.')}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{t('admin.no_actions_attention', 'No actions require attention.')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Platform Health & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
        {/* Platform Health */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>
                {t('admin.platform_health', 'Platform Health')}
              </h3>
              {!healthLoading && !healthError && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: healthData?.status === 'healthy' ? 'rgba(16,185,129,0.12)' : 'rgba(245,166,35,0.12)',
                    color: healthData?.status === 'healthy' ? '#10b981' : '#f5a623',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: healthData?.status === 'healthy' ? '#10b981' : '#f5a623',
                      boxShadow: healthData?.status === 'healthy' ? '0 0 6px #10b981' : '0 0 6px #f5a623',
                    }}
                  />
                  {healthData?.status === 'healthy' ? t('admin.healthy', 'Healthy') : t('admin.degraded', 'Degraded')}
                </span>
              )}
            </div>
            <button
              onClick={fetchHealth}
              title={t('admin.refresh_health', 'Refresh health metrics')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--c-sub)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              className="hover-bg"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: healthLoading ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.5s ease',
                }}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{healthLoading ? t('admin.checking', 'Checking...') : t('admin.refresh', 'Refresh')}</span>
            </button>
          </div>

          {healthLoading && !healthData ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', marginTop: '12px' }}>{t('admin.checking_system_health', 'Checking system metrics...')}</div>
            </div>
          ) : healthError ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px 0' }}>
              <div style={{ color: '#ef4444', fontSize: '1.2rem', marginBottom: '8px' }}>⚠️</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: '600' }}>{t('admin.health_check_failed', 'System check failed')}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '4px' }}>{t('admin.unable_to_reach_health', 'Unable to reach the health monitoring service.')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {/* API Server Metric */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '0.9rem' }}>
                    ⚡
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>{t('admin.api_server', 'API Server')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>
                      {t('admin.uptime', 'Uptime')}: <span style={{ color: 'var(--text-h)', fontWeight: '500' }}>{formatUptime(healthData?.uptimeSeconds)}</span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  {t('admin.operational', 'Operational')}
                </span>
              </div>

              {/* Database Metric */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: healthData?.database?.status === 'connected' ? 'rgba(249,115,22,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: healthData?.database?.status === 'connected' ? '#f97316' : '#ef4444', fontSize: '0.9rem' }}>
                    🗄️
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-h)' }}>MongoDB Database</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)' }}>
                      {healthData?.database?.latencyMs != null ? `${t('admin.latency', 'Latency')}: ${healthData.database.latencyMs}ms` : t('admin.db_connected', 'Connected & Synchronized')}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 8px', borderRadius: '8px', background: healthData?.database?.status === 'connected' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: healthData?.database?.status === 'connected' ? '#10b981' : '#ef4444' }}>
                  {healthData?.database?.status === 'connected' ? t('admin.connected', 'Connected') : t('admin.disconnected', 'Disconnected')}
                </span>
              </div>

              {/* Memory & Environment summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '10px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--c-sub)', marginBottom: '2px' }}>{t('admin.memory_heap', 'Memory Heap')}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-h)' }}>
                    {healthData?.memory?.heapUsedMb ? `${healthData.memory.heapUsedMb} MB` : 'Normal'}
                    {healthData?.memory?.heapTotalMb && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--c-sub)', fontWeight: '400' }}> / {healthData.memory.heapTotalMb}MB</span>
                    )}
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '10px', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--c-sub)', marginBottom: '2px' }}>{t('admin.environment', 'Environment')}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-h)', textTransform: 'capitalize' }}>
                    {healthData?.environment || 'Production'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity Mini */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>{t('admin.recent_activity', 'Recent Activity')}</h3>
            <button 
              onClick={() => setActiveTab('dashboard_activity')}
              style={{ background: 'none', border: 'none', color: 'var(--c-orange)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
            >
              {t('admin.view_all', 'View All')} →
            </button>
          </div>

          {activitiesLoading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid rgba(249,115,22,0.2)', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', marginTop: '12px' }}>{t('admin.loading_activity', 'Loading activity...')}</div>
            </div>
          ) : recentActivities.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: 'var(--bg-main)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' 
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: '600', marginBottom: '4px' }}>
                {t('admin.no_recent_activity', 'No recent activity')}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>
                {t('admin.platform_running_smoothly', 'Platform is running smoothly.')}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {recentActivities.map((act) => {
                const getActIcon = (type) => {
                  if (type === 'course') return '📚';
                  if (type === 'enrollment') return '🎓';
                  if (type === 'user') return '👤';
                  return '⚡';
                };

                return (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--bg-main)',
                      borderRadius: '10px',
                      boxShadow: 'var(--inner-shadow)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getActIcon(act.type)}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--c-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.description}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-sub)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatTimeAgo(act.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewTab;
