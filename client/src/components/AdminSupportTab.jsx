import React, { useState, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import Spinner from "./Spinner";
import CustomSelect from "./CustomSelect";

export default function AdminSupportTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports${filter !== 'all' ? `?status=${filter}` : ''}`);
      setReports(res.data.reports || []);
    } catch (err) {
      notyf.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleResolve = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/resolve`, { status });
      notyf.success("Report updated successfully");
      fetchReports();
    } catch (err) {
      notyf.error("Failed to update report");
    }
  };

  return (
    <div className="admin-tab-content animate-entrance">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: 0, color: "var(--text-h)" }}>
          Student Issue Reports
        </h2>
        <style>{`
          .admin-filter-select {
            background-color: var(--bg-surface) !important;
            box-shadow: var(--outer-shadow) !important;
          }
          .admin-filter-select.focus {
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2), var(--outer-shadow) !important;
          }
        `}</style>
        <div style={{ width: "200px" }}>
          <CustomSelect
            triggerClassName="admin-filter-select"
            value={filter}
            onChange={(val) => setFilter(val)}
            options={[
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
              { value: "all", label: "All" }
            ]}
          />
        </div>
      </div>

      <div className="glass-card animate-entrance" style={{ padding: '24px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)' }}>
                <th style={{ padding: '16px', fontWeight: 600 }}>Student</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Course</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>
                    <Spinner size="small" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--text-secondary)" }}>
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report._id} style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                      <div style={{ fontWeight: "500", color: "var(--text-h)" }}>
                        {report.student?.name || "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {report.student?.email}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: "var(--bg-main)", boxShadow: "var(--inner-shadow)", color: "var(--text-primary)", padding: "6px 16px", borderRadius: "100px", display: "inline-block", fontSize: "0.85rem", fontWeight: "600", letterSpacing: "0.3px" }}>
                        {report.category}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                      {report.course?.title ? (
                        <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", background: "var(--bg-main)", padding: "8px 16px", borderRadius: "12px", boxShadow: "var(--inner-shadow)", display: "inline-block", fontWeight: "500" }}>{report.course.title}</span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', maxWidth: '300px' }}>
                      <div style={{ 
                        whiteSpace: "pre-wrap", 
                        fontSize: "0.9rem", 
                        color: "var(--text)",
                        background: "var(--bg-main)",
                        padding: "12px",
                        borderRadius: "12px",
                        boxShadow: "var(--inner-shadow)"
                      }}>
                        {report.description}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>
                      <span
                        style={{
                          background: "var(--bg-main)",
                          boxShadow: "var(--inner-shadow)",
                          padding: "6px 16px",
                          borderRadius: "100px",
                          display: "inline-block",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          letterSpacing: "0.3px",
                          color:
                            report.status === "open"
                              ? "#f97316"
                              : report.status === "resolved"
                              ? "#10b981"
                              : "#6b7280",
                        }}
                      >
                        {report.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {report.status === "open" && (
                          <>
                            <button
                              onClick={() => handleResolve(report._id, "resolved")}
                              className="sys-btn-primary"
                              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleResolve(report._id, "dismissed")}
                              className="sys-btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
