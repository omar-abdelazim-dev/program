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
  pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderTop: "1px solid var(--c-border)", background: "var(--bg-surface)" },
  btn: { padding: "6px 14px", fontSize: "13px", fontWeight: 600, background: "var(--bg-body)", color: "var(--text-main)", border: "1px solid var(--c-border)", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s" },
  btnDisabled: { padding: "6px 14px", fontSize: "13px", fontWeight: 600, background: "var(--bg-body)", color: "var(--c-sub)", border: "1px solid var(--c-border)", borderRadius: "6px", cursor: "not-allowed", opacity: 0.5 },
  pageInfo: { fontSize: "13px", color: "var(--c-sub)", fontWeight: 500 }
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

const IconEnroll = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconBook = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const IconQuiz = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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

export default function AdminReportStudentsTab({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    let isMounted = true;
    api.get("/admin/analytics")
      .then(r => {
        if (isMounted) setData(r.data);
      })
      .catch(async () => {
        try {
          const statsRes = await api.get("/admin/stats");
          if (isMounted) setData(statsRes.data);
        } catch (err) {
          if (isMounted) setData(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const overview = data?.overview || data || {};
  const courses = data?.coursePerformance || data?.courses || [];
  const topCourses = [...courses].sort((a, b) => (b.enrolledStudents ?? b.students ?? 0) - (a.enrolledStudents ?? a.students ?? 0)).slice(0, 5);

  const totalPages = Math.ceil(courses.length / limit) || 1;
  const paginatedCourses = courses.slice((page - 1) * limit, page * limit);

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <p style={S.sectionTitle}>Student Overview</p>
      <div style={S.grid3}>
        <StatCard loading={loading} label="Total Students" value={loading ? null : (overview.totalStudents ?? overview.total_students ?? "—")} icon={<IconEnroll />} />
        <StatCard loading={loading} label="Avg Completion Rate" value={loading ? null : (overview.avgCompletionRate != null ? `${Number(overview.avgCompletionRate).toFixed(1)}%` : "—")} icon={<IconBook />} />
        <StatCard loading={loading} label="Total Quiz Attempts" value={loading ? null : (overview.totalQuizAttempts ?? overview.quiz_attempts ?? "—")} icon={<IconQuiz />} />
      </div>

      <p style={S.sectionTitle}>Course Performance</p>
      <div style={S.tableWrap}>
        {loading ? <Spinner /> : (
          <table style={S.table}>
            <thead>
              <tr>{["Course Name","Enrolled Students","Completion Rate","Avg Score"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!data || courses.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
                    No data available or failed to load.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((c, i) => (
                  <tr key={c._id ?? i}>
                    <td style={i % 2 === 0 ? S.td : S.tdAlt}>{c.title ?? c.courseName ?? c.name ?? "—"}</td>
                    <td style={{ ...(i % 2 === 0 ? S.td : S.tdAlt), fontWeight: 600 }}>{c.enrolledStudents ?? c.students ?? "—"}</td>
                    <td style={i % 2 === 0 ? S.td : S.tdAlt}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "var(--c-border)", overflow: "hidden", boxShadow: "var(--inner-shadow)" }}>
                          <div style={{ height: "100%", width: `${Math.min(c.completionRate ?? c.completion_rate ?? 0, 100)}%`, background: "var(--color-accent,#f97316)", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "13px", minWidth: "38px", textAlign: "right" }}>
                          {c.completionRate != null ? `${Number(c.completionRate).toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    </td>
                    <td style={i % 2 === 0 ? S.td : S.tdAlt}>{c.avgScore != null ? Number(c.avgScore).toFixed(1) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        {!loading && courses.length > limit && (
          <div style={S.pagination}>
            <button 
              style={page === 1 ? S.btnDisabled : S.btn} 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={S.pageInfo}>Page {page} of {totalPages}</span>
            <button 
              style={page === totalPages ? S.btnDisabled : S.btn} 
              disabled={page === totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {!loading && topCourses.length > 0 && (
        <>
          <p style={S.sectionTitle}>Top 5 Most Enrolled Courses</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topCourses.map((c, i) => {
              const max = Math.max(topCourses[0].enrolledStudents ?? topCourses[0].students ?? 1, 1);
              const val = c.enrolledStudents ?? c.students ?? 0;
              return (
                <div key={c._id ?? i} style={{ ...S.card, display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-accent,#f97316)", minWidth: "28px" }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-h)", marginBottom: "6px" }}>{c.title ?? c.courseName ?? c.name ?? "—"}</div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "var(--c-border)", overflow: "hidden", boxShadow: "var(--inner-shadow)" }}>
                      <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: "var(--color-accent,#f97316)", borderRadius: "3px", transition: "width 0.5s" }} />
                    </div>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", minWidth: "72px", textAlign: "right" }}>{val.toLocaleString()} students</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
