import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Bar, Line
} from 'recharts';

const AdminAnalyticsTab = ({ revenueAnalytics, revenueAnalyticsLoading }) => {
  const [timeFilter, setTimeFilter] = useState('Last Year');
  
  const rawSeries = revenueAnalytics?.series || [];
  
  // Create full series with calculated fields
  const fullSeries = useMemo(() => {
    return rawSeries.map((item, index) => {
      const companyShare = item.revenue * 0.3;
      const instructorEarnings = item.revenue * 0.7;
      
      let growth = 0;
      if (index > 0 && rawSeries[index - 1].revenue > 0) {
        growth = ((item.revenue - rawSeries[index - 1].revenue) / rawSeries[index - 1].revenue) * 100;
      }

      return {
        ...item,
        companyShare,
        instructorEarnings,
        growth: parseFloat(growth.toFixed(1))
      };
    });
  }, [rawSeries]);

  // Apply time filter
  const filteredSeries = useMemo(() => {
    if (timeFilter === 'Last 7 Days') {
      return fullSeries.slice(-2); // Show last 2 months to ensure we have a line instead of a dot
    } else if (timeFilter === 'Last 30 Days') {
      return fullSeries.slice(-2);
    } else if (timeFilter === 'Last 6 Months') {
      return fullSeries.slice(-6);
    }
    return fullSeries;
  }, [fullSeries, timeFilter]);

  // Aggregate for Pie Chart
  const totalCompany = filteredSeries.reduce((sum, item) => sum + item.companyShare, 0);
  const totalInstructor = filteredSeries.reduce((sum, item) => sum + item.instructorEarnings, 0);
  
  const pieData = [
    { name: 'Company Share', value: totalCompany, color: '#8b5cf6' }, // Purple
    { name: 'Instructor Earnings', value: totalInstructor, color: '#f97316' } // Orange
  ];

  if (revenueAnalyticsLoading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>Loading analytics...</div>;
  }

  // Custom tooltips
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', minWidth: '200px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#fff' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.9rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
              <span style={{ color: 'var(--c-sub)' }}>{entry.name}:</span>
              <span style={{ color: entry.color, fontWeight: '600' }}>
                EGP {entry.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomComposedTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', minWidth: '180px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#fff' }}>{label}</div>
          {payload.map((entry, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.9rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
              <span style={{ color: 'var(--c-sub)' }}>{entry.name}:</span>
              <span style={{ color: entry.color, fontWeight: '600' }}>
                {entry.name === 'Growth' ? `${entry.value > 0 ? '+' : ''}${entry.value}%` : `EGP ${entry.value.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-entrance">
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", margin: "0 0 4px 0", color: "var(--text-h)" }}>Analytics</h2>
          <div style={{ fontSize: "0.9rem", color: "var(--c-sub)" }}>Financial performance over time.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Last 7 Days', 'Last 30 Days', 'Last 6 Months', 'Last Year'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              style={{
                background: timeFilter === filter ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${timeFilter === filter ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: timeFilter === filter ? '#ef4444' : 'var(--c-sub)',
                padding: '6px 16px',
                borderRadius: '99px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Revenue vs Company Share Area Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", color: "var(--text-h)" }}>Monthly Revenue vs Company Share</h3>
            <div style={{ fontSize: "0.85rem", color: "var(--c-sub)" }}>Comparing total platform revenue with company earnings month over month.</div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '2px', background: '#10b981' }}></div>
              <span style={{ color: 'var(--c-sub)' }}>Total Revenue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '2px', background: '#8b5cf6', borderBottom: '2px dashed #8b5cf6' }}></div>
              <span style={{ color: 'var(--c-sub)' }}>Company Share</span>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompanyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--c-sub)", fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--c-sub)", fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={45} />
              <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "4 3" }} />
              
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenueFill)" activeDot={{ r: 5, fill: "#10B981", stroke: "#11131a", strokeWidth: 2 }} />
              <Area type="monotone" dataKey="companyShare" name="Company Share" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorCompanyFill)" activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#11131a", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Revenue Distribution Pie Chart */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", color: "var(--text-h)" }}>Revenue Distribution</h3>
            <div style={{ fontSize: "0.85rem", color: "var(--c-sub)" }}>How revenue is split between the company (30%) and instructors.</div>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '20px' }}>
            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `EGP ${value.toLocaleString()}`}
                    contentStyle={{ background: '#11131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-h)' }}>30%</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>company</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-h)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#8b5cf6' }}></div>
                  Company Share
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#8b5cf6', margin: '4px 0 0 20px' }}>
                  EGP {totalCompany.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', margin: '2px 0 0 20px' }}>30.0% of total revenue</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-h)' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f97316' }}></div>
                  Instructor Earnings
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f97316', margin: '4px 0 0 20px' }}>
                  EGP {totalInstructor.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', margin: '2px 0 0 20px' }}>70.0% of total revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Growth Composed Chart */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", color: "var(--text-h)" }}>Financial Growth</h3>
              <div style={{ fontSize: "0.85rem", color: "var(--c-sub)" }}>Monthly revenue (bars) and month-over-month growth percentage (line).</div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid rgba(16, 185, 129, 0.5)' }}></div>
                <span style={{ color: 'var(--c-sub)' }}>Monthly Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '2px', background: '#facc15' }}></div>
                <span style={{ color: 'var(--c-sub)' }}>Growth %</span>
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: 260, flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--c-sub)", fontSize: 11 }} dy={10} />
                
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "var(--c-sub)", fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} width={45} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "var(--c-sub)", fontSize: 11 }} tickFormatter={(v) => `${v}%`} width={45} />
                
                <Tooltip content={<CustomComposedTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="rgba(16, 185, 129, 0.25)" stroke="rgba(16, 185, 129, 0.5)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="growth" name="Growth" stroke="#facc15" strokeWidth={2} dot={{ r: 4, fill: "#11131a", stroke: "#facc15", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#facc15", stroke: "#11131a", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsTab;
