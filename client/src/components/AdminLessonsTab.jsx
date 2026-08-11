import React, { useState, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import Spinner from "./Spinner";
import SegmentedControl from "./common/SegmentedControl";

export function AdminLessonsTab({ currentUser, onDashboardUpdate }) {
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const lessonsPerPage = 10;

  const statusOptions = [
    { label: "All Statuses", value: "All" },
    { label: "Pending", value: "pending" },
    { label: "Approved / Published", value: "approved" },
    { label: "Rejected / Archived", value: "rejected" },
    { label: "Draft", value: "draft" },
  ];

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        if (lessons.length === 0) {
          setIsLoading(true);
        }
        const res = await api.get("/admin/lessons");
        setLessons(res.data.lessons || []);
      } catch (error) {
        console.error("Failed to fetch lessons:", error);
        notyf.error("Failed to load lessons");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/admin/lessons/${id}/approve`);
      notyf.success("Lesson approved");
      setLessons(
        lessons.map((l) => (l._id === id ? { ...l, status: "approved" } : l)),
      );
      if (activeLesson?._id === id)
        setActiveLesson({ ...activeLesson, status: "approved" });
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (error) {
      console.error(error);
      notyf.error("Failed to approve lesson");
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/admin/lessons/${id}/reject`);
      notyf.success("Lesson rejected");
      setLessons(
        lessons.map((l) => (l._id === id ? { ...l, status: "rejected" } : l)),
      );
      if (activeLesson?._id === id)
        setActiveLesson({ ...activeLesson, status: "rejected" });
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (error) {
      console.error(error);
      notyf.error("Failed to reject lesson");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "published":
      case "approved":
        return {
          text: "#10b981",
          bg: "rgba(16, 185, 129, 0.1)",
          border: "rgba(16, 185, 129, 0.25)",
        };
      case "pending":
      case "draft":
        return {
          text: "#f5a623",
          bg: "rgba(245, 166, 35, 0.1)",
          border: "rgba(245, 166, 35, 0.25)",
        };
      case "hidden":
        return {
          text: "#6b7280",
          bg: "rgba(107, 114, 128, 0.1)",
          border: "rgba(107, 114, 128, 0.25)",
        };
      case "rejected":
      case "archived":
        return {
          text: "#ef4444",
          bg: "rgba(239, 68, 68, 0.1)",
          border: "rgba(239, 68, 68, 0.25)",
        };
      default:
        return {
          text: "var(--c-sub)",
          bg: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.1)",
        };
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = lesson.title?.toLowerCase().includes(q);
    const courseMatch = lesson.module?.course?.title
      ?.toLowerCase()
      .includes(q);
    const instructorMatch = lesson.module?.course?.instructor?.name
      ?.toLowerCase()
      .includes(q);
    const matchesSearch = titleMatch || courseMatch || instructorMatch;

    let matchesStatus = true;
    if (statusFilter !== "All") {
      const s = lesson.status?.toLowerCase() || "draft";
      if (statusFilter === "pending") matchesStatus = s === "pending";
      else if (statusFilter === "approved")
        matchesStatus = s === "approved" || s === "published";
      else if (statusFilter === "rejected")
        matchesStatus = s === "rejected" || s === "archived";
      else if (statusFilter === "draft") matchesStatus = s === "draft";
    }

    return matchesSearch && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination Logic
  const indexOfLastLesson = currentPage * lessonsPerPage;
  const indexOfFirstLesson = indexOfLastLesson - lessonsPerPage;
  const currentLessons = filteredLessons.slice(
    indexOfFirstLesson,
    indexOfLastLesson,
  );
  const totalPages = Math.ceil(filteredLessons.length / lessonsPerPage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Controls Row: Status Bar on LEFT, Search & Filter on RIGHT */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
          {/* Left: Status Filter Bar */}
          <SegmentedControl
            tabs={[
              { id: "All", label: "All Lessons" },
              { id: "approved", label: "Approved" },
              { id: "pending", label: "Pending Review" }
            ]}
            activeTab={statusFilter}
            onChange={setStatusFilter}
          />

          {/* Right: Search & Filters */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
          {/* Merged Search & Status Filter Control Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg-surface)",
              borderRadius: "99px",
              boxShadow: isSearchFocused || isDropdownOpen
                ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
                : "var(--outer-shadow)",
              border: isSearchFocused || isDropdownOpen
                ? "1px solid #f97316"
                : "1px solid transparent",
              transition: "all 0.3s ease",
              padding: "4px 8px 4px 16px",
              position: "relative",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--c-sub)", flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--c-light)",
                padding: "8px 12px",
                fontSize: "0.95rem",
                width: "200px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Datatable */}
      <div
        className="glass-card"
        style={{
          padding: "24px",
          background: "var(--bg-surface)",
          border: "none",
          flex: 1,
          minHeight: "500px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <Spinner />
          </div>
        ) : filteredLessons.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--c-sub)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📚</div>
            <h3 style={{ color: "var(--text-h)", marginBottom: "8px" }}>
              No Lessons Found
            </h3>
            <p>We couldn't find any lessons matching your criteria.</p>
          </div>
        ) : (
          <div
            className="table-responsive"
            style={{ overflowX: "auto", margin: "-24px", padding: "24px" }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    LESSON
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    COURSE
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    INSTRUCTOR
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      textAlign: "center",
                    }}
                  >
                    TYPE
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      textAlign: "center",
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontWeight: "600",
                      borderBottom: "1px solid var(--c-border-subtle)",
                      textAlign: "center",
                    }}
                  >
                    DATE ADDED
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentLessons.map((lesson) => (
                  <tr
                    key={lesson._id}
                    style={{
                      borderBottom: "1px solid var(--c-border-subtle)",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                    className="hover-row"
                    onClick={() => setActiveLesson(lesson)}
                  >
                    <td style={{ padding: "16px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "8px",
                            background: "var(--bg-main) !important",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            boxShadow: "var(--inner-shadow) !important",
                            flexShrink: 0,
                          }}
                        >
                          ▶
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "var(--c-light)",
                            }}
                          >
                            {lesson.title}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--c-sub)",
                              marginTop: "4px",
                            }}
                          >
                            Section:{" "}
                            {lesson.module?.title || "Unknown Module"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                      <div
                        style={{ color: "var(--text-h)", fontWeight: "500" }}
                      >
                        {lesson.module?.course?.title || "Unknown Course"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--c-sub)",
                          marginTop: "4px",
                        }}
                      >
                        {lesson.module?.course?.category || "Uncategorized"}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "var(--text-h)",
                      }}
                    >
                      {lesson.module?.course?.instructor?.name || "Unknown"}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                      <span
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          background: "var(--c-bg-subtle)",
                          color: "var(--c-light)",
                          border: "none",
                          boxShadow:
                            "var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))",
                          textTransform: "capitalize",
                        }}
                      >
                        {lesson.lessonType || "Video"}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                      {(() => {
                        const style = getStatusColor(lesson.status);
                        return (
                          <span
                            style={{
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              background: style.bg,
                              color: style.text,
                              border: "none",
                              boxShadow:
                                "var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              textTransform: "capitalize",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "currentColor",
                              }}
                            />
                            {lesson.status || "Draft"}
                          </span>
                        );
                      })()}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "var(--c-sub)",
                        fontSize: "0.9rem",
                      }}
                    >
                      {new Date(lesson.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid var(--c-border-subtle)",
            }}
          >
            <span style={{ color: "var(--c-sub)", fontSize: "0.9rem" }}>
              Showing {indexOfFirstLesson + 1} to{" "}
              {Math.min(indexOfLastLesson, filteredLessons.length)} of{" "}
              {filteredLessons.length} lessons
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background:
                    currentPage === 1 ? "transparent" : "var(--c-bg-subtle)",
                  color:
                    currentPage === 1
                      ? "var(--c-border-subtle)"
                      : "var(--c-light)",
                  border: "1px solid var(--c-border-subtle)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                Previous
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 12px",
                  color: "var(--text-h)",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                }}
              >
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background:
                    currentPage === totalPages
                      ? "transparent"
                      : "var(--c-bg-subtle)",
                  color:
                    currentPage === totalPages
                      ? "var(--c-border-subtle)"
                      : "var(--c-light)",
                  border: "1px solid var(--c-border-subtle)",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {activeLesson && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "24px",
          }}
          onClick={() => setActiveLesson(null)}
        >
          <div
            style={{
              background: "var(--bg-main)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "900px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--c-border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: "var(--text-h)",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                  }}
                >
                  {activeLesson.title}
                </h3>

                {/* Status Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {activeLesson.status !== "approved" &&
                    activeLesson.status !== "published" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(activeLesson._id);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          boxShadow:
                            "var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))",
                          fontWeight: "600",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        Approve
                      </button>
                    )}
                  {activeLesson.status !== "rejected" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(activeLesson._id);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        border: "none",
                        boxShadow:
                          "var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLesson(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--c-sub)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                &times;
              </button>
            </div>
            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "#000",
                position: "relative",
              }}
            >
              {activeLesson.videoUrl ? (
                <video
                  src={activeLesson.videoUrl}
                  controls
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#fff",
                  }}
                >
                  No video URL available for this lesson.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-row:hover {
          background: var(--c-bg-subtle);
        }
      `}</style>
    </div>
  );
};

export default AdminLessonsTab;
