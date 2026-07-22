import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function InstructorAnalyticsTab({ courses = [], stats = [], timeSeries = [] }) {
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
  const revenueData = timeSeries;
  const studentGrowthData = timeSeries;
  return (
    <div data-role="instructor" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Revenue over Time */}
        <div className="glass-card no-border animate-entrance" style={{ padding: '24px', background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Revenue over Time</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={revenueData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
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
                  contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-h)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), 0 8px 32px rgba(0, 0, 0, 0.3)' }}
                  itemStyle={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="url(#line-gradient)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" filter="url(#glow-orange)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Growth */}
        <div className="glass-card no-border animate-entrance" style={{ padding: '24px', background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Student Growth</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer>
              <AreaChart data={studentGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
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
                  contentStyle={{ backgroundColor: 'var(--bg-main)', border: 'none', borderRadius: '8px', color: 'var(--text-h)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5), 0 8px 32px rgba(0, 0, 0, 0.3)' }}
                  itemStyle={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="students" stroke="url(#line-gradient-growth)" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" dot={{ fill: 'var(--bg)', stroke: '#f97316', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#fbbf24' }} filter="url(#glow-line)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="glass-card no-border animate-entrance" style={{ padding: '24px', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Per-Course Performance</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '16px', fontWeight: '600' }}>Course Title</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Total Enrolled</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Completion Rate</th>
                <th style={{ padding: '16px', fontWeight: '600' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {coursePerformanceData.map(course => (
                <tr key={course.id} className="analytics-row" style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-h)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>{course.title}</td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>{course.enrolled}</td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, maxWidth: '120px', height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: course.completionRate, height: '100%', backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)' }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500', width: '40px' }}>{course.completionRate}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: '700', backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>{course.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
