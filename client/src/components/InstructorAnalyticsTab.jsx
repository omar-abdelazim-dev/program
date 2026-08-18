import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function InstructorAnalyticsTab({ courses = [], stats = [], timeSeries = [] }) {
  const { t } = useTranslation();
  // Use backend stats where available
  const coursePerformanceData = courses.map(course => {
    const courseStat = stats.find(s => s.id === course._id) || {};
    return {
      id: course._id,
      title: course.title,
      enrolled: courseStat.enrolled || 0,
      completionRate: courseStat.completionRate || '0%',
      revenue: `EGP ${courseStat.revenue ? courseStat.revenue.toLocaleString() : '0'}`,
    };
  });

  // Use backend time series data
  const monthMap = {
    'Jan': t('common.months.jan', 'Jan'),
    'Feb': t('common.months.feb', 'Feb'),
    'Mar': t('common.months.mar', 'Mar'),
    'Apr': t('common.months.apr', 'Apr'),
    'May': t('common.months.may', 'May'),
    'Jun': t('common.months.jun', 'Jun'),
    'Jul': t('common.months.jul', 'Jul'),
    'Aug': t('common.months.aug', 'Aug'),
    'Sep': t('common.months.sep', 'Sep'),
    'Oct': t('common.months.oct', 'Oct'),
    'Nov': t('common.months.nov', 'Nov'),
    'Dec': t('common.months.dec', 'Dec')
  };
  const revenueData = timeSeries.map(item => ({ ...item, name: monthMap[item.name] || item.name }));
  const studentGrowthData = revenueData;
  return (
    <div data-role="instructor" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
        
        {/* Revenue over Time */}
        <div className="glass-card no-border animate-entrance" style={{ padding: '24px', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.analytics.revenue_over_time')}</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={revenueData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-sub)" tick={{fill: 'var(--c-sub)'}} tickLine={false} axisLine={false} />
                <YAxis width={80} stroke="var(--c-sub)" tick={{fill: 'var(--c-sub)'}} tickLine={false} axisLine={false} tickFormatter={(value) => `EGP ${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-h)', boxShadow: 'var(--inner-shadow), var(--outer-shadow)' }}
                  itemStyle={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="revenue" name={t('instructor.analytics.revenue', 'revenue')} stroke="url(#line-gradient)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Growth */}
        <div className="glass-card no-border animate-entrance" style={{ padding: '24px', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.analytics.active_students')}</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={studentGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="line-gradient-growth" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--c-sub)" tick={{fill: 'var(--c-sub)'}} tickLine={false} axisLine={false} />
                <YAxis width={80} stroke="var(--c-sub)" tick={{fill: 'var(--c-sub)'}} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-h)', boxShadow: 'var(--inner-shadow), var(--outer-shadow)' }}
                  itemStyle={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="students" name={t('instructor.analytics.students', 'students')} stroke="url(#line-gradient-growth)" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" dot={{ fill: 'var(--bg)', stroke: '#f97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fbbf24' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="glass-card no-border animate-entrance" style={{ padding: '24px', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.analytics.enrollments_by_course')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '16px', fontWeight: '600' }}>{t('instructor.dashboard.table.course')}</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>{t('instructor.analytics.total_enrollments')}</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>{t('instructor.analytics.course_completion_rate')}</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>{t('instructor.analytics.total_revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {coursePerformanceData.length > 0 ? (
                coursePerformanceData.map(course => (
                  <tr key={course.id} className="analytics-row" style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-h)', borderBottom: '1px solid var(--border)', borderStartStartRadius: '16px', borderEndStartRadius: '16px' }}>{course.title}</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>{course.enrolled}</td>
                    <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, maxWidth: '120px', height: '8px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: course.completionRate, height: '100%', backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500', width: '40px' }}>{course.completionRate}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '700', backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', borderBottom: '1px solid var(--border)', borderStartEndRadius: '16px', borderEndEndRadius: '16px' }}>{course.revenue}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    {t('instructor.analytics.no_data', 'No course data available yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}

