import { useState, useEffect } from "react";
import api from "../api/axios";

const S = {
  page: { padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" },
  sectionTitle: { fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--c-sub)", marginBottom: "16px", marginTop: "0" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" },
  gridCards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px", marginBottom: "36px" },
  card: { borderRadius: "12px", padding: "24px", background: "var(--bg-surface)", boxShadow: "var(--outer-shadow)" },
  tableWrap: { borderRadius: "12px", background: "var(--bg-surface)", overflow: "hidden", marginBottom: "32px", boxShadow: "var(--outer-shadow)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--c-sub)", borderBottom: "1px solid var(--c-border)", background: "rgba(0,0,0,0.02)" },
  td: { padding: "13px 16px", fontSize: "14px", color: "var(--text-main)", borderBottom: "1px solid var(--c-border)" },
  tdAlt: { padding: "13px 16px", fontSize: "14px", color: "var(--text-main)", borderBottom: "1px solid var(--c-border)", background: "rgba(0,0,0,0.01)" },
  statLabel: { fontSize: "12px", color: "var(--c-sub)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" },
  statValue: { fontSize: "28px", fontWeight: 800, color: "var(--text-h)", lineHeight: 1.1, margin: 0 },
};

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0", flexDirection: "column", gap: "16px", color: "var(--c-sub)" }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="15" stroke="var(--c-border)" strokeWidth="3" />
        <path d="M18 3a15 15 0 0 1 15 15" stroke="var(--color-accent, #f97316)" strokeWidth="3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite" />
        </path>
      </svg>
      <span style={{ fontSize: "14px" }}>Loading data...</span>
    </div>
  );
}

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

const IconUsers = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCsv = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconRevenue = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCourse = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const IconInstructor = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconActivity = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-accent,#f97316)" strokeWidth="1.75">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconDownload = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

function convertToCSV(data, columns) {
  if (!data || !data.length) return "";
  const header = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const rows = data.map(row => {
    return columns.map(col => {
      let val = col.accessor(row);
      if (val === null || val === undefined) val = "";
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(",");
  });
  return [header, ...rows].join("\r\n");
}

function triggerBrowserDownload(blob, filename) {
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

const EXPORTS = [
  {
    id: "users",
    icon: <IconUsers />,
    title: "Users Directory",
    description: "Export registered users including roles, account status, contact info, and registration dates.",
    apiUrl: "/admin/users",
    exportUrl: "/admin/users/export",
    filename: "users.csv",
    extractData: res => res.data?.users || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "User ID", accessor: u => u._id },
      { header: "Name", accessor: u => u.name || "N/A" },
      { header: "Email", accessor: u => u.email || "N/A" },
      { header: "Role", accessor: u => u.role || "student" },
      { header: "Phone", accessor: u => u.phone || "" },
      { header: "Is Program Instructor", accessor: u => (u.isProgramInstructor ? "Yes" : "No") },
      { header: "Status", accessor: u => (u.isBlocked ? "Blocked" : "Active") },
      { header: "Joined Date", accessor: u => (u.createdAt ? new Date(u.createdAt).toISOString() : "") },
    ],
  },
  {
    id: "enrollments",
    icon: <IconCsv />,
    title: "Transactions & Enrollments",
    description: "Export enrollment and transaction logs including student info, courses, amount paid, and status.",
    apiUrl: "/admin/transactions",
    exportUrl: "/admin/enrollments/export",
    filename: "enrollments.csv",
    extractData: res => res.data?.transactions || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "Transaction ID", accessor: t => t.transactionId || t._id },
      { header: "Student Name", accessor: t => t.student?.name || t.studentName || "N/A" },
      { header: "Student Email", accessor: t => t.student?.email || t.studentEmail || "N/A" },
      { header: "Course Title", accessor: t => t.course?.title || t.courseTitle || "N/A" },
      { header: "Amount Paid", accessor: t => t.amount ?? 0 },
      { header: "Currency", accessor: t => t.currency || "EGP" },
      { header: "Status", accessor: t => t.status || "completed" },
      { header: "Date", accessor: t => (t.createdAt ? new Date(t.createdAt).toISOString() : "") },
    ],
  },
  {
    id: "revenue",
    icon: <IconRevenue />,
    title: "Revenue & Financials",
    description: "Export aggregated monthly revenue reports with platform share, instructor splits, and orders.",
    apiUrl: "/admin/revenue-analytics",
    exportUrl: "/admin/financials/export",
    filename: "revenue_report.csv",
    extractData: res => res.data?.series || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "Month", accessor: r => r.label || r.month || "N/A" },
      { header: "Total Revenue (EGP)", accessor: r => r.revenue ?? 0 },
      { header: "Platform Fee 15% (EGP)", accessor: r => ((r.revenue ?? 0) * 0.15).toFixed(2) },
      { header: "Instructor Payouts 85% (EGP)", accessor: r => ((r.revenue ?? 0) * 0.85).toFixed(2) },
      { header: "Total Enrollments", accessor: r => r.enrollments ?? 0 },
    ],
  },
  {
    id: "courses",
    icon: <IconCourse />,
    title: "Course Catalog",
    description: "Export full course listings with category tags, pricing, difficulty levels, and student ratings.",
    apiUrl: "/courses",
    exportUrl: "/admin/courses/export",
    filename: "course_catalog.csv",
    extractData: res => res.data?.courses || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "Course ID", accessor: c => c._id },
      { header: "Course Title", accessor: c => c.title || "Untitled" },
      { header: "Category", accessor: c => c.category || "General" },
      { header: "Price (EGP)", accessor: c => c.price ?? 0 },
      { header: "Level", accessor: c => c.level || "all" },
      { header: "Instructor", accessor: c => c.instructor?.name || (typeof c.instructor === "string" ? c.instructor : "N/A") },
      { header: "Status", accessor: c => c.status || "approved" },
      { header: "Total Lessons", accessor: c => c.lessonsCount || c.lessons?.length || 0 },
      { header: "Average Rating", accessor: c => c.avgRating || c.rating || 0 },
      { header: "Creation Date", accessor: c => (c.createdAt ? new Date(c.createdAt).toISOString() : "") },
    ],
  },
  {
    id: "instructors",
    icon: <IconInstructor />,
    title: "Instructors Roster",
    description: "Export instructor accounts, program instructor status, verification, and contact records.",
    apiUrl: "/admin/users?role=instructor",
    exportUrl: "/admin/instructors/export",
    filename: "instructors.csv",
    extractData: res => res.data?.users || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "Instructor ID", accessor: i => i._id },
      { header: "Name", accessor: i => i.name || "N/A" },
      { header: "Email", accessor: i => i.email || "N/A" },
      { header: "Phone", accessor: i => i.phone || "" },
      { header: "Program Instructor", accessor: i => (i.isProgramInstructor ? "Yes" : "No") },
      { header: "Status", accessor: i => (i.isBlocked ? "Blocked" : "Active") },
      { header: "Join Date", accessor: i => (i.createdAt ? new Date(i.createdAt).toISOString() : "") },
    ],
  },
  {
    id: "activity",
    icon: <IconActivity />,
    title: "Activity & Audit Logs",
    description: "Export administrative activity log feed, user registrations, course reviews, and updates.",
    apiUrl: "/admin/activity",
    exportUrl: "/admin/activity/export",
    filename: "activity_logs.csv",
    extractData: res => res.data?.activities || (Array.isArray(res.data) ? res.data : []),
    columns: [
      { header: "Event ID", accessor: a => a.id || a._id },
      { header: "Type", accessor: a => a.type || "system" },
      { header: "Title", accessor: a => a.title || "N/A" },
      { header: "Details", accessor: a => a.description || "" },
      { header: "Timestamp", accessor: a => (a.date ? new Date(a.date).toISOString() : "") },
    ],
  },
];

export default function AdminReportExportTab({ user }) {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingExport, setLoadingExport] = useState({});
  const [notification, setNotification] = useState(null);
  const [recentExports, setRecentExports] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.get("/admin/stats")
      .then(res => {
        if (isMounted) setStats(res.data);
      })
      .catch(err => {
        console.error("Failed to load export metrics:", err);
        if (isMounted) setStats(null);
      })
      .finally(() => {
        if (isMounted) setLoadingStats(false);
      });
    return () => { isMounted = false; };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleExportClick = async (exp, idx) => {
    setLoadingExport(prev => ({ ...prev, [idx]: true }));
    setNotification(null);

    try {
      let csvBlob = null;
      let count = 0;

      // 1. Attempt direct backend export endpoint
      try {
        const directRes = await api.get(exp.exportUrl, { responseType: "blob" });
        if (directRes.data && (directRes.data.type?.includes("csv") || directRes.data.size > 0)) {
          csvBlob = new Blob([directRes.data], { type: "text/csv;charset=utf-8;" });
        }
      } catch {
        // Direct endpoint not available, fallback to data mapping from live API
      }

      // 2. Fallback to querying the mapped API endpoint and formatting CSV
      if (!csvBlob) {
        const apiRes = await api.get(exp.apiUrl);
        const dataRows = exp.extractData(apiRes);

        if (!dataRows || dataRows.length === 0) {
          showNotification("error", "No data available or failed to load.");
          setLoadingExport(prev => ({ ...prev, [idx]: false }));
          return;
        }

        const csvContent = convertToCSV(dataRows, exp.columns);
        if (!csvContent) {
          showNotification("error", "No data available or failed to load.");
          setLoadingExport(prev => ({ ...prev, [idx]: false }));
          return;
        }

        csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        count = dataRows.length;
      }

      triggerBrowserDownload(csvBlob, exp.filename);
      showNotification("success", `Successfully exported ${exp.filename}${count > 0 ? ` (${count} records)` : ""}.`);

      setRecentExports(prev => [
        {
          id: Date.now(),
          title: exp.title,
          filename: exp.filename,
          records: count || "—",
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      console.error("Export operation failed:", err);
      showNotification("error", "No data available or failed to load.");
    } finally {
      setLoadingExport(prev => ({ ...prev, [idx]: false }));
    }
  };

  const totalUsers = stats ? (stats.totalStudents || 0) + (stats.totalInstructors || 0) + (stats.totalAdmins || 0) : null;
  const totalCourses = stats?.totalCourses ?? null;
  const totalRevenue = stats?.totalRevenue != null ? `EGP ${Number(stats.totalRevenue).toLocaleString("en-EG", { minimumFractionDigits: 2 })}` : null;

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      
      {/* Top Section */}
      <p style={S.sectionTitle}>Platform Metrics Summary</p>
      <div style={S.grid4}>
        <StatCard loading={loadingStats} label="Total Users" value={totalUsers} icon={<IconUsers />} />
        <StatCard loading={loadingStats} label="Course Catalog" value={totalCourses} icon={<IconCourse />} />
        <StatCard loading={loadingStats} label="Platform Revenue" value={totalRevenue} icon={<IconRevenue />} />
        <StatCard loading={loadingStats} label="Instructors" value={stats?.totalInstructors} icon={<IconInstructor />} />
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: "10px",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "fit-content",
            background: notification.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: notification.type === "success" ? "#22c55e" : "#ef4444",
            border: "none",
            boxShadow: "var(--inner-shadow)",
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Data Export Cards Section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={S.sectionTitle}>Available Data Exports</p>
          <p style={{ color: "var(--c-sub)", fontSize: "14px", margin: "-8px 0 0 0" }}>
            Generate and download standard CSV reports directly from live platform records.
          </p>
        </div>
      </div>

      <div style={S.gridCards}>
        {EXPORTS.map((exp, idx) => {
          const isDownloading = loadingExport[idx];
          return (
            <div
              key={exp.id}
              style={{
                ...S.card,
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.18)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "rgba(249,115,22,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {exp.icon}
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-h)" }}>{exp.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--c-sub)", marginTop: "2px" }}>{exp.filename}</div>
                </div>
              </div>

              <div style={{ flex: 1, fontSize: "13px", color: "var(--c-sub)", lineHeight: 1.55 }}>
                {exp.description}
              </div>

              <button
                type="button"
                onClick={() => handleExportClick(exp, idx)}
                disabled={isDownloading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  background: isDownloading ? "rgba(249,115,22,0.4)" : "var(--color-accent,#f97316)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "14px",
                  border: "none",
                  cursor: isDownloading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s ease",
                  opacity: isDownloading ? 0.7 : 1,
                  width: "100%",
                }}
                onMouseEnter={e => {
                  if (!isDownloading) e.currentTarget.style.opacity = "0.88";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <IconDownload />
                {isDownloading ? "Exporting..." : "Download CSV"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Recent Exports History Table */}
      <p style={S.sectionTitle}>Recent Session Exports</p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Report Name", "Filename", "Records Exported", "Generated At"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentExports.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: "36px 16px", textAlign: "center", color: "var(--c-sub)", fontSize: "14px" }}>
                  No export history yet. Select a dataset above to generate a CSV export.
                </td>
              </tr>
            ) : (
              recentExports.map((row, i) => (
                <tr key={row.id}>
                  <td style={{ ...(i % 2 === 0 ? S.td : S.tdAlt), fontWeight: 600, color: "var(--text-h)" }}>{row.title}</td>
                  <td style={i % 2 === 0 ? S.td : S.tdAlt}>{row.filename}</td>
                  <td style={{ ...(i % 2 === 0 ? S.td : S.tdAlt), color: "var(--color-accent,#f97316)", fontWeight: 700 }}>{row.records}</td>
                  <td style={i % 2 === 0 ? S.td : S.tdAlt}>{row.timestamp}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
