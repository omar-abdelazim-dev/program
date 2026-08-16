import { useState, useEffect } from "react";
import api from "../api/axios";

const S = {
  page: { padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" },
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
        <circle cx="18" cy="18" r="15" stroke="var(--c-border)" strokeWidth="3" />
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
const IconStar = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);
const IconInstructor = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

function StatCard({ label, value, icon, loading }) {
  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ flex: 1 }}>
          <p style={S.statLabel}>{label}</p>
          {loading ? (
            <div style={{ height: "32px", width: "70%", borderRadius: "6px", background: "var(--c-border)", animation: "pulse 1.4s ease-in-out infinite" }} />
          ) : (
            <p style={S.statValue}>{value ?? "—"}</p>
          )}
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

export default function AdminReportInstructorsTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get("/admin/instructor-analytics")
      .then((r) => {
        if (isMounted) setData(r.data);
      })
      .catch((err) => {
        console.error("Failed to load instructor analytics:", err);
        if (isMounted) setData(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const instructors = data?.instructorPerformance || data?.instructors || (Array.isArray(data) ? data : []);
  const totalInstructors = instructors.length || data?.overview?.totalInstructors || "—";
  const topEarner = instructors.length > 0 ? instructors.reduce((best, ins) => {
    const rev = Number(ins.totalRevenue ?? ins.revenue ?? 0);
    const bestRev = Number(best?.totalRevenue ?? best?.revenue ?? 0);
    return rev > bestRev ? ins : best;
  }, instructors[0]) : null;

  const validRatings = instructors
    .map((ins) => ins.avgRating ?? ins.rating)
    .filter((r) => r != null && !isNaN(Number(r)) && Number(r) > 0);
  const avgRating = validRatings.length
    ? (validRatings.reduce((s, r) => s + Number(r), 0) / validRatings.length).toFixed(2)
    : null;

  const fmt = (n) => n != null ? `EGP ${Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <p style={S.sectionTitle}>Instructor Overview</p>
      <div style={S.grid3}>
        <StatCard loading={loading} label="Total Instructors" value={loading ? null : totalInstructors} icon={<IconInstructor />} />
        <StatCard loading={loading} label="Top Earner Revenue" value={loading ? null : fmt(topEarner?.totalRevenue ?? topEarner?.revenue)} icon={<IconRevenue />} />
        <StatCard loading={loading} label="Avg Rating" value={loading ? null : (avgRating ? `${avgRating} ★` : "N/A")} icon={<IconStar />} />
      </div>

      <p style={S.sectionTitle}>Instructor Performance</p>
      <div style={S.tableWrap}>
        {loading ? <Spinner /> : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Instructor", "Courses", "Total Students", "Total Revenue", "Avg Rating"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data || instructors.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "var(--c-sub)", padding: "40px" }}>
                    No data available or failed to load.
                  </td>
                </tr>
              ) : (
                instructors.map((ins, i) => {
                  const rating = ins.avgRating ?? ins.rating;
                  const displayName = [ins.name, ins.lastName].filter(Boolean).join(" ") || ins.instructorName || "—";
                  const coursesCount = ins.coursesCount ?? ins.courseCount ?? ins.courses ?? "—";
                  const studentsCount = ins.totalStudents ?? ins.students ?? "—";
                  const rev = ins.totalRevenue ?? ins.revenue;
                  const rowStyle = i % 2 === 0 ? S.td : S.tdAlt;

                  return (
                    <tr key={ins._id ?? ins.id ?? i}>
                      <td style={rowStyle}>
                        <div style={{ fontWeight: 600, color: "var(--text-h)" }}>{displayName}</div>
                        {ins.email && <div style={{ fontSize: "12px", color: "var(--c-sub)" }}>{ins.email}</div>}
                      </td>
                      <td style={rowStyle}>{coursesCount}</td>
                      <td style={rowStyle}>{studentsCount}</td>
                      <td style={{ ...rowStyle, color: "var(--color-accent,#f97316)", fontWeight: 700 }}>
                        {fmt(rev)}
                      </td>
                      <td style={rowStyle}>
                        {rating != null && !isNaN(Number(rating)) && Number(rating) > 0 ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "#facc15" }}>★</span>
                            {Number(rating).toFixed(1)}
                          </span>
                        ) : (
                          <span style={{ color: "var(--c-sub)" }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
