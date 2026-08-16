import { useState, useEffect } from "react";
import api from "../api/axios";

const S = {
  page: { padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" },
  card: { borderRadius: "12px", padding: "24px", background: "var(--bg-surface)", boxShadow: "var(--outer-shadow)" },
  sectionTitle: { fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-sub)", marginBottom: "16px", marginTop: "0" },
  statLabel: { fontSize: "12px", color: "var(--c-sub)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" },
  statValue: { fontSize: "28px", fontWeight: 800, color: "var(--text-h)", lineHeight: 1.1, margin: 0 },
  tableWrap: { borderRadius: "12px", background: "var(--bg-surface)", overflow: "hidden", marginBottom: "32px", boxShadow: "var(--outer-shadow)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--c-sub)", borderBottom: "1px solid var(--c-border)", background: "rgba(0,0,0,0.02)" },
  td: { padding: "13px 16px", fontSize: "14px", color: "var(--text-main)", borderBottom: "1px solid var(--c-border)" },
  tdAlt: { padding: "13px 16px", fontSize: "14px", color: "var(--text-main)", borderBottom: "1px solid var(--c-border)", background: "rgba(0,0,0,0.01)" },
};

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", flexDirection: "column", gap: "16px", color: "var(--c-sub)" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <path d="M18 3a15 15 0 0 1 15 15" stroke="var(--color-accent, #f97316)" strokeWidth="3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
      <span style={{ fontSize: "14px" }}>Loading...</span>
    </div>
  );
}

const IconRevenue = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconEnroll = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function StatCard({ label, value, icon, loading }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={S.statLabel}>{label}</p>
          {loading
            ? <div style={{ height: "32px", width: "70%", borderRadius: "6px", background: "var(--c-border)", animation: "pulse 1.4s ease-in-out infinite" }} />
            : <p style={S.statValue}>{value ?? "—"}</p>}
        </div>
        {icon && (
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(249,115,22,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "var(--inner-shadow)" }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReportFinancialTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/revenue-analytics")
      .then(r => setData(r.data))
      .catch((err) => {
        console.error("Failed to load revenue analytics:", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => n != null ? `EGP ${Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2 })}` : "—";
  
  const totalRevenue = data?.totalRevenue ?? 0;
  const platformRevenue = totalRevenue * 0.15;
  const instructorPayouts = totalRevenue * 0.85;
  const totalEnrollments = data?.totalEnrollments ?? 0;
  
  const monthly = data?.series || [];

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <p style={S.sectionTitle}>Revenue Overview</p>
      <div style={S.grid4}>
        <StatCard loading={loading} label="Total Revenue" value={fmt(totalRevenue)} icon={<IconRevenue />} />
        <StatCard loading={loading} label="Platform Revenue" value={fmt(platformRevenue)} icon={<IconRevenue />} />
        <StatCard loading={loading} label="Instructor Payouts" value={fmt(instructorPayouts)} icon={<IconRevenue />} />
        <StatCard loading={loading} label="Total Enrollments" value={loading ? null : totalEnrollments} icon={<IconEnroll />} />
      </div>

      <p style={S.sectionTitle}>Monthly Revenue Breakdown</p>
      <div style={S.tableWrap}>
        {loading ? <Spinner /> : (
          <table style={S.table}>
            <thead>
              <tr>{["Month","Total Revenue","Platform Cut","Instructor Payouts","Enrollments"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!data && !loading
                ? <tr>
                    <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
                      No data available or failed to load.
                    </td>
                  </tr>
                : monthly.length === 0
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} style={i % 2 === 0 ? S.td : S.tdAlt}>
                        <div style={{ height: "14px", width: j === 0 ? "80px" : "100px", borderRadius: "4px", background: "var(--c-border)" }} />
                      </td>
                    ))}</tr>
                  ))
                : monthly.map((row, i) => (
                    <tr key={i}>
                      <td style={i % 2 === 0 ? S.td : S.tdAlt}>{row.label}</td>
                      <td style={{ ...(i % 2 === 0 ? S.td : S.tdAlt), color: "var(--color-accent,#f97316)", fontWeight: 700 }}>{fmt(row.revenue)}</td>
                      <td style={i % 2 === 0 ? S.td : S.tdAlt}>{fmt(row.revenue * 0.15)}</td>
                      <td style={i % 2 === 0 ? S.td : S.tdAlt}>{fmt(row.revenue * 0.85)}</td>
                      <td style={i % 2 === 0 ? S.td : S.tdAlt}>{row.enrollments ?? "—"}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
