import notyf from "../utils/notyf";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import logoDark from "../assets/logo-dark.png";
import logoLight from "../assets/logo-light.png";
import AdminPayoutsTab from "./AdminPayoutsTab";
import AdminStatisticsTab from "./AdminStatisticsTab";
import AdminAnalyticsTab from "./AdminAnalyticsTab";
import AdminOverviewTab from "./AdminOverviewTab";
import AdminUserManagementTab from "./AdminUserManagementTab";
import AdminCourseManagementTab from "./AdminCourseManagementTab";
import WebsiteManagement from "./WebsiteManagement/WebsiteManagement";
import SystemManagement from "./SystemManagement";
import FullPageLoader from "./FullPageLoader";

const ROLE_OPTIONS = ["student", "instructor", "admin"];
const SIDEBAR_TAB_STEP = 44;

// Custom tooltip for the revenue analytics chart — mirrors the glass-card
// look used everywhere else in this portal rather than recharts' default box.
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        background: "rgba(15,17,23,0.95)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "0.82rem",
        minWidth: "160px",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: "6px",
          color: "var(--c-light)",
        }}
      >
        {label}
      </div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: "var(--c-sub)" }}>{entry.name}: </span>
          <span style={{ color: entry.color, fontWeight: 700 }}>
            {entry.dataKey === "revenue"
              ? `EGP ${entry.value.toLocaleString()}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const isSidebarTabActive = (tabId, currentTab) => {
  if (tabId === "users") {
    return currentTab === "users" || currentTab.startsWith("users_");
  }
  return currentTab === tabId;
};

const resolveSidebarTabId = (tabId) => tabId;

// Renders its content into document.body and positions it with `fixed`
// coordinates measured from the trigger element. This is required because the
// dropdown's trigger lives inside table/card containers that use `overflow`
// for their own layout (scroll panes, rounded-corner clipping, etc.) — any
// CSS `overflow` other than `visible` on an ancestor clips absolutely
// positioned descendants regardless of z-index, so no z-index value can make
// an in-place dropdown escape that clipping. Rendering outside the DOM
// subtree via a portal is the only robust fix.
const RoleMenu = ({ anchorEl, onClose, children }) => {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!anchorEl) return;
    const updateCoords = () => {
      const rect = anchorEl.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    };
    updateCoords();
    // capture: true catches scroll events from any scrollable ancestor
    // (e.g. the dashboard's scrollable content pane), not just window scroll.
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        anchorEl &&
        !anchorEl.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl, onClose]);

  if (!coords) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="glass-card animate-entrance"
      style={{
        position: "fixed",
        top: coords.top,
        right: coords.right,
        minWidth: "160px",
        padding: "6px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1500;
    const endValue = parseInt(value, 10) || 0;
    const startValue = displayValue;

    if (startValue === endValue) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(
        Math.floor(startValue + (endValue - startValue) * easeProgress),
      );

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{displayValue}</span>;
};

// 30-day signup growth badge, e.g. "+12.5% this month".
const GrowthBadge = ({ growth }) => {
  if (growth == null) return null;
  const positive = growth >= 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "99px",
        background: positive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${positive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        fontSize: "0.78rem",
        fontWeight: 700,
        color: positive ? "#10B981" : "#ef4444",
        marginTop: "10px",
        width: "fit-content",
      }}
    >
      {positive ? "+" : ""}
      {growth}% this month
    </div>
  );
};

export default function AdminPortal({
  user,
  onLogout,
  toggleTheme,
  isLightMode,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard_overview");

  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [revenueAnalyticsLoading, setRevenueAnalyticsLoading] = useState(true);

  // Loading & Processing States
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [userActionError, setUserActionError] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  // Change Role State
  const [roleMenuUserId, setRoleMenuUserId] = useState(null);
  const roleButtonRefs = useRef({});

  // Reject-course-with-reason modal state
  const [pendingReject, setPendingReject] = useState(null); // { id, title } | null
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { id, name, newRole } | null
  const [changingRole, setChangingRole] = useState(false);
  const [roleChangeError, setRoleChangeError] = useState("");
  const [blockError, setBlockError] = useState("");

  // Sidebar Dropdown State
  const [expandedGroup, setExpandedGroup] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Recent Activity Filter
  const [activityFilter, setActivityFilter] = useState("All");

  const toggleGroup = (title) => {
    setExpandedGroup((prev) => (prev === title ? null : title));
  };

  const handleSidebarTabClick = (tabId, groupTitle) => {
    setActiveTab(resolveSidebarTabId(tabId));
    setExpandedGroup(groupTitle);
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/courses/pending"),
      ]);
      setStats(statsRes.data);
      setPendingCourses(pendingRes.data.courses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (query = "", includeDeleted = showDeletedUsers) => {
    try {
      const params = new URLSearchParams({ search: query });
      if (includeDeleted) params.set("includeDeleted", "true");
      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/admin/transactions");
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await api.get("/admin/activity");
      setActivity(res.data.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchRevenueAnalytics = async () => {
    setRevenueAnalyticsLoading(true);
    try {
      const res = await api.get("/admin/revenue-analytics");
      setRevenueAnalytics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setRevenueAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      navigate("/");
      return;
    }

    setLoading(true);
    if (activeTab.startsWith("dashboard") || activeTab.startsWith("courses")) {
      fetchDashboardData();
    } else if (activeTab.startsWith("users")) {
      fetchUsers(searchQuery);
    } else if (activeTab === "enrollment") {
      fetchTransactions();
    } else {
      setLoading(false);
    }

    if (activeTab === "dashboard_activity") {
      fetchActivity();
    }

    if (
      activeTab === "dashboard_stats" ||
      activeTab === "dashboard_analytics"
    ) {
      fetchRevenueAnalytics();
    }
  }, [user, navigate, activeTab]);

  // Debounced Search — trigger only for users tabs
  useEffect(() => {
    if (!activeTab.startsWith("users")) return;
    const delay = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, activeTab, showDeletedUsers]);

  // No longer needed: visibleUsers is handled by AdminUserManagementTab
  const visibleUsers = users;

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/courses/${id}/approve`);
      notyf.success("Course approved");
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to approve course", err);
      notyf.error("Failed to approve course");
    } finally {
      setProcessingId(null);
    }
  };

  // Opens the reason modal — rejection doesn't actually happen until confirmed.
  const requestReject = (course) => {
    setRejectReasonError("");
    setRejectReason("");
    setPendingReject({ id: course._id, title: course.title });
  };

  const cancelReject = () => {
    setPendingReject(null);
    setRejectReason("");
    setRejectReasonError("");
  };

  const confirmReject = async () => {
    if (!pendingReject) return;
    if (!rejectReason.trim()) {
      setRejectReasonError(
        "Let the instructor know why, so they can fix and resubmit.",
      );
      return;
    }
    setProcessingId(pendingReject.id);
    try {
      await api.patch(`/courses/${pendingReject.id}/reject`, {
        reason: rejectReason.trim(),
      });
      notyf.success("Course rejected");
      setPendingReject(null);
      setRejectReason("");
      fetchDashboardData();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to reject course";
      setRejectReasonError(errMsg);
      notyf.error(errMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBlock = async (id) => {
    setBlockError("");
    try {
      await api.patch(`/admin/users/${id}/block`);
      fetchUsers(searchQuery);
    } catch (err) {
      setBlockError(err.response?.data?.message || "Failed to toggle block");
    }
  };

  const handleSoftDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this user? They'll be hidden from lists and unable to log in — this can be reversed with Restore.",
      )
    ) {
      return;
    }
    setUserActionError("");
    try {
      await api.delete(`/admin/users/${id}/soft-delete`);
      fetchUsers(searchQuery);
    } catch (err) {
      setUserActionError(
        err.response?.data?.message || "Failed to delete user",
      );
    }
  };

  const handleRestore = async (id) => {
    setUserActionError("");
    try {
      await api.patch(`/admin/users/${id}/restore`);
      fetchUsers(searchQuery);
    } catch (err) {
      setUserActionError(
        err.response?.data?.message || "Failed to restore user",
      );
    }
  };

  // Opens the confirm modal — no request is sent until the user confirms.
  const requestRoleChange = (u, newRole) => {
    setRoleMenuUserId(null);
    setRoleChangeError("");
    setPendingRoleChange({ id: u._id, name: u.name, newRole });
  };

  const cancelRoleChange = () => {
    setPendingRoleChange(null);
    setRoleChangeError("");
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setChangingRole(true);
    setRoleChangeError("");
    try {
      await api.patch(`/admin/users/${pendingRoleChange.id}/role`, {
        role: pendingRoleChange.newRole,
      });
      setPendingRoleChange(null);
      fetchUsers(searchQuery);
    } catch (err) {
      setRoleChangeError(
        err.response?.data?.message || "Failed to change role",
      );
    } finally {
      setChangingRole(false);
    }
  };

  // A row can have its role changed unless it's the acting user themselves,
  // it's already a superadmin (untouchable via this UI), or it's an admin
  // being acted on by anyone other than a superadmin.
  const canChangeRole = (u) => {
    if (u._id === user.id) return false;
    if (u.role === "superadmin") return false;
    if (u.role === "admin" && user.role !== "superadmin") return false;
    return true;
  };

  // Only a superadmin can block/unblock another admin or superadmin —
  // mirrors the backend check in adminController.toggleBlockUser.
  const canToggleBlock = (u) => {
    if (u._id === user.id) return false;
    if (
      (u.role === "admin" || u.role === "superadmin") &&
      user.role !== "superadmin"
    )
      return false;
    return true;
  };

  // Mirrors the backend's canModerate guard for soft-delete/restore.
  const canDelete = (u) => {
    if (u._id === user.id) return false;
    if (u.role === "superadmin") return false;
    if (u.role === "admin" && user.role !== "superadmin") return false;
    return true;
  };

  // Guard the real UI render, not just the redirect effect above — otherwise
  // a wrong-role user briefly sees the full portal before the effect fires.
  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Redirecting...
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <FullPageLoader message="Loading Admin Portal..." />
      </div>
    );
  }

  const menuGroups =
    user?.role === "superadmin"
      ? [
          {
            title: "Dashboard",
            items: [
              { id: "dashboard_overview", label: "Overview" },
              { id: "dashboard_stats", label: "Statistics" },
              { id: "dashboard_analytics", label: "Analytics" },
              { id: "dashboard_activity", label: "Recent Activity" },
            ],
          },
          {
            title: "User Management",
            items: [{ id: "users", label: "Users" }],
          },

          {
            title: "Course Management",
            items: [
              { id: "courses_all", label: "Courses" },
              { id: "courses_lessons", label: "Lessons" },
              { id: "courses_categories", label: "Categories" },
            ],
          },
          {
            title: "Financial Management",
            items: [
              { id: "enrollment", label: "Enrollments" },
              { id: "financial_payouts", label: "Payout Requests" },
            ],
          },
          {
            title: "Website Management",
            items: [
              { id: "web_home", label: "Homepage" },
              { id: "web_about", label: "About" },
              { id: "web_faq", label: "FAQ" },
              { id: "web_contact", label: "Contact" },
              { id: "web_testimonials", label: "Testimonials" },
            ],
          },
          {
            title: "Announcement Management",
            items: [{ id: "announcements", label: "Announcements" }],
          },
          {
            title: "Reports & Analytics",
            items: [{ id: "reports", label: "Reports & Analytics" }],
          },
          {
            title: "Role & Permission",
            items: [{ id: "roles", label: "Role & Permission Management" }],
          },
          {
            title: "System Settings",
            items: [{ id: "settings", label: "System Settings" }],
          },
        ]
      : [
          {
            title: "Dashboard",
            items: [
              { id: "dashboard_overview", label: "Overview" },
              { id: "dashboard_stats", label: "Statistics" },
              { id: "dashboard_analytics", label: "Analytics" },
              { id: "dashboard_activity", label: "Recent Activity" },
            ],
          },
          {
            title: "User Management",
            items: [{ id: "users", label: "Users" }],
          },
          {
            title: "Course Management",
            items: [
              { id: "courses_all", label: "Courses" },
              { id: "courses_lessons", label: "Lessons" },
              { id: "courses_categories", label: "Categories" },
            ],
          },
          {
            title: "Enrollment Management",
            items: [{ id: "enrollment", label: "Enrollments" }],
          },
          {
            title: "Financial Management",
            items: [{ id: "financial_payouts", label: "Payout Requests" }],
          },
          {
            title: "Announcement Management",
            items: [{ id: "announcements", label: "Announcements" }],
          },
          {
            title: "Reports",
            items: [{ id: "reports", label: "Reports" }],
          },
          {
            title: "Profile",
            items: [
              { id: "profile_my", label: "My Profile" },
              { id: "profile_password", label: "Change Password" },
            ],
          },
        ];

  return (
    <div
      data-role={user?.role}
      className="page-wrapper"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        backgroundColor: isLightMode ? undefined : "var(--bg-main)",
      }}
    >
      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
        <div
          className="admin-sidebar-header"
          style={{ display: "flex", flexDirection: "column", padding: "16px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <Link
              to="/student"
              style={{ display: "flex", alignItems: "center" }}
            >
              <img
                src={isLightMode ? logoLight : logoDark}
                alt="Program Logo"
                style={{
                  height: "100%",
                  width: "100%",
                  transition: "opacity 0.2s ease",
                }}
              />
            </Link>
          </div>

          {/* <button
            type="button"
            className="admin-sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button> */}
        </div>

        {menuGroups.map((group, idx) => {
          const isGroupExpanded = expandedGroup === group.title;
          const activeIndex = group.items.findIndex((t) =>
            isSidebarTabActive(t.id, activeTab),
          );

          return (
            <div key={idx} className="admin-sidebar-group">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="admin-sidebar-group-title hover-glow"
              >
                <span className="admin-sidebar-group-icon" aria-hidden="true">
                  {group.title.charAt(0)}
                </span>
                <span className="admin-sidebar-group-label">{group.title}</span>
                {group.title === "Course Management" &&
                  pendingCourses.length > 0 && (
                    <span
                      className="admin-sidebar-badge"
                      style={{ marginLeft: "8px", marginRight: "8px" }}
                      aria-label={`${pendingCourses.length} pending courses`}
                    >
                      {pendingCourses.length}
                    </span>
                  )}
                <svg
                  className="admin-sidebar-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isGroupExpanded
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div
                className={`admin-sidebar-items${
                  isGroupExpanded ? " expanded-group" : " collapsed-group"
                }`}
              >
                <div className="admin-sidebar-items-inner">
                  {/* The Sliding Pill Background */}
                  <div
                    className="admin-sidebar-pill"
                    style={{
                      position: "absolute",
                      left: sidebarCollapsed ? "4px" : "14px",
                      right: sidebarCollapsed ? "4px" : "14px",
                      height: "40px",
                      top: `${activeIndex * 44}px`, // 40px tab height + 4px gap
                      opacity: activeIndex >= 0 ? 1 : 0,
                      backgroundColor: "var(--bg-main)",
                      borderRadius: "12px",
                      transition:
                        "top 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
                      zIndex: 0,
                      pointerEvents: "none",
                      boxShadow: "inset 0 4px 12px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  {group.items.map((tab) => {
                    const isActive = isSidebarTabActive(tab.id, activeTab);

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          handleSidebarTabClick(tab.id, group.title)
                        }
                        className={`admin-sidebar-tab ${
                          isActive ? " active" : ""
                        }`}
                        data-tooltip={tab.label}
                        title={sidebarCollapsed ? tab.label : undefined}
                      >
                        <span className="admin-sidebar-tab-label">
                          {tab.label}
                        </span>
                        <span className="admin-sidebar-tab-short">
                          {tab.short}
                        </span>
                        {/* {tab.id === "courses_pending" && pendingCourses.length > 0 && (
                          <span className="admin-sidebar-badge">
                            {pendingCourses.length}
                          </span>
                        )} */}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </aside>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Top Navbar using top-nav styling */}
        <nav
          className="top-nav"
          style={{
            position: "relative",
            borderBottom: isLightMode ? "1px solid rgba(0, 0, 0, 0.1)" : "none",
            zIndex: 10,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 24px",
            height: "70px",
            backgroundColor: isLightMode ? undefined : "var(--bg-main)",
          }}
        >
          <div className="nav-logo">
            <h1 style={{ fontSize: "1.2rem", margin: "0" }}>
              {user?.role === "superadmin"
                ? "Super Admin Portal"
                : "Admin Portal"}
            </h1>
          </div>
          <div
            className="nav-controls"
            style={{ display: "flex", alignItems: "center" }}
          >
            <button
              className="nav-icon-btn"
              onClick={toggleTheme}
              style={{ marginRight: "16px" }}
            >
              {isLightMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <line x1="12" y1="2" x2="12" y2="4"></line>
                  <line x1="12" y1="20" x2="12" y2="22"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="2" y1="12" x2="4" y2="12"></line>
                  <line x1="20" y1="12" x2="22" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
            <div className="profile-wrapper">
              <div className="nav-avatar">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "Profile"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
                  </svg>
                )}
              </div>
              <div className="profile-tooltip">
                <div className="tooltip-name">{user?.name}</div>
                <hr className="tooltip-divider" />
                <a href="#" className="tooltip-link">
                  Profile
                </a>
                <a href="#" className="tooltip-link">
                  Settings
                </a>
                <hr className="tooltip-divider" />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onLogout();
                  }}
                  className="tooltip-link logout-link"
                >
                  Log out
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto" }}>
          <div
            key={activeTab}
            className="admin-content-panel"
            style={{
              maxWidth: "100%",
              margin: "40px auto",
            }}
          >
            {activeTab === "dashboard_overview" && stats && (
              <AdminOverviewTab
                stats={stats}
                user={user}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "dashboard_activity" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
                    Recent Activity
                  </h2>
                  <div
                    className="role-tabs"
                    style={{ display: "flex", gap: "12px" }}
                  >
                    {[
                      { id: "All", label: "All", role: "student" },
                      { id: "Approved", label: "Approved", role: "student" },
                      { id: "Submitted", label: "Submitted", role: "student" },
                      { id: "Enrolled", label: "Enrolled", role: "student" },
                      {
                        id: "Admin",
                        label: "Admin/Super Admin",
                        role: "superadmin",
                      },
                    ].map((tab) => {
                      const isActive = activityFilter === tab.id;

                      const getRoleColor = (role) => {
                        switch (role?.toLowerCase()) {
                          case "student":
                            return {
                              text: "#e5e7eb",
                              bg: "rgba(156, 163, 175, 0.2)",
                              border: "none",
                            };
                          case "instructor":
                            return {
                              text: "#fb923c",
                              bg: "rgba(249, 115, 22, 0.2)",
                              border: "none",
                            };
                          case "admin":
                            return {
                              text: "#c084fc",
                              bg: "rgba(168, 85, 247, 0.2)",
                              border: "none",
                            };
                          case "superadmin":
                            return {
                              text: "#f87171",
                              bg: "rgba(239, 68, 68, 0.2)",
                              border: "none",
                            };
                          default:
                            return {
                              text: "var(--c-sub)",
                              bg: "rgba(255,255,255,0.1)",
                              border: "none",
                            };
                        }
                      };

                      const roleStyle = getRoleColor(tab.role);

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActivityFilter(tab.id)}
                          style={{
                            padding: "10px 24px",
                            borderRadius: "99px",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: "none",
                            background: isActive
                              ? roleStyle.bg
                              : "var(--bg-surface)",
                            color: isActive ? roleStyle.text : "var(--c-sub)",
                            boxShadow: isActive
                              ? `inset 0 4px 12px rgba(0,0,0,0.5)`
                              : "0 4px 12px rgba(0,0,0,0.15)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.target.style.background =
                                "rgba(255,255,255,0.05)";
                              e.target.style.color = "var(--c-light)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.target.style.background = "var(--bg-surface)";
                              e.target.style.color = "var(--c-sub)";
                            }
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "24px" }}>
                  {activityLoading ? (
                    <p style={{ color: "var(--c-sub)" }}>Loading activity...</p>
                  ) : activity.length === 0 ? (
                    <p style={{ color: "var(--c-sub)" }}>
                      No recent activity to display.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      {(() => {
                        const filtered = activity.filter((item) => {
                          if (activityFilter === "All") return true;
                          if (activityFilter === "Approved")
                            return item.title === "Course Approved";
                          if (activityFilter === "Submitted")
                            return item.title === "Course Submitted";
                          if (activityFilter === "Enrolled")
                            return item.title === "New Student Enrollment";
                          if (activityFilter === "Admin")
                            return item.title.includes("Admin");
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <p
                              style={{
                                color: "var(--c-sub)",
                                textAlign: "center",
                                padding: "16px 0",
                              }}
                            >
                              No activity found for this category.
                            </p>
                          );
                        }

                        return filtered.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              gap: "16px",
                              padding: "12px",
                              background: "var(--bg-main)",
                              boxShadow: isLightMode
                                ? "inset 0 4px 12px rgba(0, 0, 0, 0.05)"
                                : "inset 0 4px 12px rgba(0, 0, 0, 0.5)",
                              borderRadius: "8px",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {item.title}
                              </div>
                              <div
                                style={{
                                  color: "var(--c-sub)",
                                  fontSize: "0.88rem",
                                  marginTop: "2px",
                                }}
                              >
                                {item.description}
                              </div>
                            </div>
                            <div
                              style={{
                                color: "var(--c-sub)",
                                fontSize: "0.8rem",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {new Date(item.date).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "dashboard_stats" && (
              <AdminStatisticsTab
                stats={stats}
                revenueAnalytics={revenueAnalytics}
                revenueAnalyticsLoading={revenueAnalyticsLoading}
              />
            )}

            {activeTab === "dashboard_analytics" && (
              <AdminAnalyticsTab
                revenueAnalytics={revenueAnalytics}
                revenueAnalyticsLoading={revenueAnalyticsLoading}
              />
            )}

            {activeTab.startsWith("users") && (
              <AdminUserManagementTab
                users={users}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                fetchUsers={fetchUsers}
                currentUser={user}
              />
            )}

            {activeTab === "enrollment" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
                  Financial Transactions
                </h2>
                <div className="glass-card" style={{ overflow: "hidden" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                    }}
                  >
                    <thead style={{ background: "var(--c-border-subtle)" }}>
                      <tr>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Student
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Course
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                            textAlign: "right",
                          }}
                        >
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: "var(--c-sub)",
                            }}
                          >
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr
                            key={t._id}
                            style={{
                              borderTop: "1px solid var(--c-border-subtle)",
                            }}
                          >
                            <td
                              style={{ padding: "16px", color: "var(--c-sub)" }}
                            >
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "16px" }}>
                              {t.student?.name || "Unknown User"}
                            </td>
                            <td style={{ padding: "16px" }}>
                              {t.course?.title || "Unknown Course"}
                            </td>
                            <td
                              style={{
                                padding: "16px",
                                textAlign: "right",
                                color: "#10B981",
                                fontWeight: "600",
                              }}
                            >
                              EGP {t.amountPaid}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "courses_all" && (
              <AdminCourseManagementTab currentUser={user} />
            )}

            {activeTab === "financial_payouts" && <AdminPayoutsTab />}

            {activeTab === "web_home" && (
              <WebsiteManagement user={user} subTab="home" />
            )}
            {activeTab === "web_about" && (
              <WebsiteManagement user={user} subTab="about" />
            )}
            {activeTab === "web_faq" && (
              <WebsiteManagement user={user} subTab="faq" />
            )}
            {activeTab === "web_contact" && (
              <WebsiteManagement user={user} subTab="contact" />
            )}
            {activeTab === "web_testimonials" && (
              <WebsiteManagement user={user} subTab="testimonials" />
            )}
            {activeTab === "announcements" && (
              <WebsiteManagement user={user} subTab="announcements" />
            )}

            {activeTab === "settings" && <SystemManagement user={user} />}
          </div>
        </div>
      </div>

      {/* Change Role confirmation modal */}
      {pendingRoleChange && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            className="glass-card animate-entrance"
            style={{ width: "100%", maxWidth: "420px", padding: "32px" }}
          >
            <h2 style={{ margin: "0 0 12px 0", fontSize: "1.3rem" }}>
              Change role?
            </h2>
            <p style={{ color: "var(--c-sub)", margin: "0 0 24px 0" }}>
              Change{" "}
              <strong style={{ color: "var(--c-light)" }}>
                {pendingRoleChange.name}
              </strong>
              's role to{" "}
              <strong
                data-role={pendingRoleChange.newRole}
                className="role-text"
                style={{ textTransform: "capitalize" }}
              >
                {pendingRoleChange.newRole}
              </strong>
              ?
            </p>
            {roleChangeError && (
              <div
                style={{
                  color: "#ef4444",
                  marginBottom: "16px",
                  fontSize: "0.9rem",
                }}
              >
                {roleChangeError}
              </div>
            )}
            <div style={{ display: "flex", gap: "16px" }}>
              <button
                type="button"
                onClick={cancelRoleChange}
                disabled={changingRole}
                className="glass-btn hover-glow"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={changingRole}
                className="glass-btn auth-submit-btn"
                style={{ flex: 1 }}
              >
                {changingRole ? "Changing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject course confirmation modal — requires a reason the instructor will see */}
      {pendingReject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            className="glass-card animate-entrance"
            style={{ width: "100%", maxWidth: "480px", padding: "32px" }}
          >
            <h2 style={{ margin: "0 0 12px 0", fontSize: "1.3rem" }}>
              Reject course?
            </h2>
            <p style={{ color: "var(--c-sub)", margin: "0 0 16px 0" }}>
              Rejecting{" "}
              <strong style={{ color: "var(--c-light)" }}>
                {pendingReject.title}
              </strong>
              . This reason is shown to the instructor so they can fix and
              resubmit.
            </p>
            <div className="input-group">
              <label>Reason for rejection *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Description is too short, thumbnail is missing, pricing seems off..."
                style={{
                  minHeight: "100px",
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--c-input-bg)",
                  border: "var(--c-border)",
                  borderRadius: "12px",
                  color: "var(--text-h)",
                  fontFamily: "inherit",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
            {rejectReasonError && (
              <div
                style={{
                  color: "#ef4444",
                  margin: "8px 0 0 0",
                  fontSize: "0.9rem",
                }}
              >
                {rejectReasonError}
              </div>
            )}
            <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={cancelReject}
                disabled={processingId === pendingReject.id}
                className="glass-btn hover-glow"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={processingId === pendingReject.id}
                className="glass-btn auth-submit-btn"
                style={{ flex: 1 }}
              >
                {processingId === pendingReject.id
                  ? "Rejecting..."
                  : "Reject Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
