import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import logoDark from "../assets/logo-dark.png";
import logoLight from "../assets/logo-light.png";

const ROLE_OPTIONS = ["student", "instructor", "admin"];
const SIDEBAR_TAB_STEP = 44;

const isSidebarTabActive = (tabId, currentTab) => {
  if (tabId === "users") {
    return currentTab === "users" || currentTab.startsWith("users_");
  }
  return currentTab === tabId;
};

const resolveSidebarTabId = (tabId) =>
  tabId === "users" ? "users_students" : tabId;

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

  // Loading & Processing States
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

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

  // Sidebar Dropdown State
  const [expandedGroup, setExpandedGroup] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const fetchUsers = async (query = "") => {
    try {
      const res = await api.get(
        `/admin/users?search=${encodeURIComponent(query)}`,
      );
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
  }, [user, navigate, activeTab]);

  // Debounced Search — trigger only for users tabs
  useEffect(() => {
    if (!activeTab.startsWith("users")) return;
    const delay = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, activeTab]);

  // Compute visibleUsers based on the active users tab so each tab only shows its role
  const roleMap = {
    users_students: "student",
    users_instructors: "instructor",
    users_admins: "admin",
    users_superadmins: "superadmin",
  };
  const getDesiredRole = (tabId) => roleMap[tabId] || "student";
  const visibleUsers = activeTab.startsWith("users")
    ? users.filter((u) => u.role === getDesiredRole(activeTab))
    : users;

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/courses/${id}/approve`);
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to approve course", err);
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
      setPendingReject(null);
      setRejectReason("");
      fetchDashboardData();
    } catch (err) {
      setRejectReasonError(
        err.response?.data?.message || "Failed to reject course",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBlock = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/block`);
      fetchUsers(searchQuery);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle block");
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

  if (loading && !stats && !users.length && !transactions.length) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading Admin Portal...
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
            items: [
              { id: "users", label: "Users" },
            ],
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
            title: "Certificate Management",
            items: [{ id: "certificates", label: "Certificates" }],
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
          {
            title: "Profile",
            items: [
              { id: "profile_my", label: "My Profile" },
              { id: "profile_password", label: "Change Password" },
            ],
          },
        ]
      : [
          {
            title: "Dashboard",
            items: [
              { id: "dashboard_overview", label: "Overview" },
              { id: "dashboard_stats", label: "Statistics" },
              { id: "dashboard_activity", label: "Recent Activity" },
            ],
          },
          {
            title: "Student Management",
            items: [{ id: "users_students", label: "Students" }],
          },
          {
            title: "Instructor Management",
            items: [{ id: "users_instructors", label: "Instructors" }],
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
            title: "Certificate Management",
            items: [{ id: "certificates", label: "Certificates" }],
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
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Top Navbar using top-nav styling */}
      <nav
        className="top-nav"
        style={{
          position: "relative",
          borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
          zIndex: 10,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px",
          height: "70px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link to="/student" style={{ display: "flex", alignItems: "center" }}>
            <img
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`}
              alt="Program Logo"
              style={{ height: "32px", width: "auto", objectFit: "contain" }}
            />
          </Link>
        </div>
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          className={`glass-card admin-sidebar${sidebarCollapsed ? " collapsed" : ""}`}
        >
          <div className="admin-sidebar-header">
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
                    {activeIndex >= 0 && (
                      <div
                        className="admin-sidebar-indicator"
                        style={{ top: `${activeIndex * SIDEBAR_TAB_STEP}px` }}
                      />
                    )}
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
                          <span className="admin-sidebar-tab-short">
                            {tab.label.charAt(0)}
                          </span>
                          <span className="admin-sidebar-tab-label">
                            {tab.label}
                          </span>
                          {tab.id === "courses_all" &&
                            pendingCourses.length > 0 && (
                              <span
                                className="admin-sidebar-badge"
                                aria-label={`${pendingCourses.length} pending courses`}
                              >
                                {pendingCourses.length}
                              </span>
                            )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto" }}>
          <div
            key={activeTab}
            className="admin-content-panel"
            style={{ maxWidth: "100%", margin: "40px auto" }}
          >
            {activeTab === "dashboard_overview" && stats && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "32px",
                }}
              >
                <h2 style={{ fontSize: "1.8rem", margin: 0 }}>Overview</h2>

                <div className="overview-rows-container">
                  <div className="overview-row first-row">
                    <div className="glass-card stat-card revenue-card">
                      <div className="stat-label">Revenue</div>
                      <div
                        className="stat-value"
                        style={{
                          color: "#10B981",
                          background: "none",
                          WebkitTextFillColor: "initial",
                        }}
                      >
                        EGP <AnimatedNumber value={stats.totalRevenue} />
                      </div>
                    </div>

                    <div className="glass-card stat-card" data-role="student">
                      <div className="stat-label">Students</div>
                      <div className="stat-value role-text">
                        <AnimatedNumber value={stats.totalStudents} />
                      </div>
                    </div>

                    <div
                      className="glass-card stat-card"
                      data-role="instructor"
                    >
                      <div className="stat-label">Instructors</div>
                      <div className="stat-value role-text">
                        <AnimatedNumber value={stats.totalInstructors} />
                      </div>
                    </div>
                  </div>

                  <div className="overview-row second-row">
                    {user?.role === "superadmin" && (
                      <div
                        style={{ width: "100%" }}
                        className="glass-card stat-card"
                        data-role="superadmin"
                      >
                        <div className="stat-label">Super Admins</div>
                        <div
                          className="stat-value role-text"
                          style={{ color: "var(--c-red)" }}
                        >
                          <AnimatedNumber value={stats.totalSuperAdmins} />
                        </div>
                      </div>
                    )}

                    <div className="glass-card stat-card" data-role="admin">
                      <div className="stat-label">Admins</div>
                      <div className="stat-value role-text">
                        <AnimatedNumber value={stats.totalAdmins} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "24px" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "1.2rem" }}>
                    Enrollments by Category
                  </h3>
                  {Object.keys(stats.categoryCounts).length === 0 ? (
                    <p style={{ color: "var(--c-sub)" }}>No enrollments yet.</p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {Object.entries(stats.categoryCounts).map(
                        ([cat, count]) => (
                          <div
                            key={cat}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "12px",
                              background: "var(--c-input-bg)",
                              borderRadius: "8px",
                            }}
                          >
                            <span style={{ fontWeight: "500" }}>{cat}</span>
                            <span
                              style={{
                                color: "var(--c-orange)",
                                fontWeight: "bold",
                              }}
                            >
                              {count} enrolled
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab.startsWith("users") && (
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
                    User Management
                  </h2>

                  <div style={{ marginLeft: "16px", flex: "0 0 420px" }}>
                    <div className="search-bar-glass">
                      <input
                        type="text"
                        placeholder="Search users by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="user-search-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Tabs */}
                <div className="role-tabs" style={{ marginTop: "4px" }}>
                  {[
                    {
                      id: "users_students",
                      label: "Students",
                      role: "student",
                    },
                    {
                      id: "users_instructors",
                      label: "Instructors",
                      role: "instructor",
                    },
                    { id: "users_admins", label: "Admins", role: "admin" },
                    {
                      id: "users_superadmins",
                      label: "Super Admins",
                      role: "superadmin",
                    },
                  ]
                    .filter(
                      (t) =>
                        !(
                          t.role === "superadmin" && user?.role !== "superadmin"
                        ),
                    )
                    .map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={
                          "role-tab-button" +
                          (activeTab === tab.id ? " active" : "")
                        }
                        data-role={tab.role}
                      >
                        {tab.label}
                      </button>
                    ))}
                </div>

                <div className="glass-card user-management-table-card">
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
                            borderTopLeftRadius: "15px",
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Email
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Phone
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Role
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: "16px",
                            fontWeight: "600",
                            color: "var(--c-sub)",
                            textAlign: "right",
                            borderTopRightRadius: "15px",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(visibleUsers || []).length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              maxWidth: "100%",
                              padding: "24px",
                              textAlign: "center",
                              color: "var(--c-sub)",
                            }}
                          >
                            No users found
                          </td>
                        </tr>
                      ) : (
                        (visibleUsers || []).map((u) => (
                          <tr
                            key={u._id}
                            data-role={u.role}
                            className="role-row"
                            style={{
                              borderTop: "1px solid var(--c-border-subtle)",
                            }}
                          >
                            <td style={{ padding: "16px" }}>{u.name}</td>
                            <td
                              style={{ padding: "16px", color: "var(--c-sub)" }}
                            >
                              {u.email}
                            </td>
                            <td
                              style={{ padding: "16px", color: "var(--c-sub)" }}
                            >
                              {u.phone || "-"}
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span className="role-badge">{u.role}</span>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span
                                style={{
                                  color: u.isBlocked ? "#ef4444" : "#10B981",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {u.isBlocked ? "Blocked" : "Active"}
                              </span>
                            </td>
                            <td style={{ padding: "16px", textAlign: "right" }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  justifyContent: "flex-end",
                                  position: "relative",
                                }}
                              >
                                {u._id !== user.id && (
                                  <>
                                    {canChangeRole(u) && (
                                      <div>
                                        <button className="changeRole"
                                          ref={(el) => {
                                            roleButtonRefs.current[u._id] = el;
                                          }}
                                          onClick={() =>
                                            setRoleMenuUserId(
                                              roleMenuUserId === u._id
                                                ? null
                                                : u._id,
                                            )
                                          }
                                          style={{
                                            background: "transparent",
                                            border:
                                              "1px solid var(--c-border-active)",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            color: "var(--c-light)",
                                            cursor: "pointer",
                                            background: "rgba(15, 17, 23, 0.7)",
                                            backdropFilter: "blur(20px)",
                                            // -webkitBackdropFilter: "blur(20px)",
                                            border: "var(--c-border)",
                                            borderTop:
                                              "1px solid rgba(255, 255, 255, 0.15)",
                                            borderLeft:
                                              "1px solid rgba(255, 255, 255, 0.15)",
                                            borderRadius: "16px",
                                            boxShadow: "var(--shadow)",
                                          }}
                                          /*
                                          
                                              background: rgba(15, 17, 23, 0.7);
                                              backdrop-filter: blur(20px);
                                              -webkit-backdrop-filter: blur(20px);
                                              border: var(--c-border);
                                              border-top: 1px solid rgba(255, 255, 255, 0.15);
                                              border-left: 1px solid rgba(255, 255, 255, 0.15);
                                              border-radius: 16px;
                                              box-shadow: var(--shadow);

                                          */
                                        >
                                          Change Role
                                        </button>
                                        {roleMenuUserId === u._id && (
                                          <RoleMenu
                                            anchorEl={
                                              roleButtonRefs.current[u._id]
                                            }
                                            onClose={() =>
                                              setRoleMenuUserId(null)
                                            }
                                          >
                                            {ROLE_OPTIONS.filter(
                                              (r) => r !== u.role,
                                            ).map((r) => (
                                              <button
                                                key={r}
                                                data-role={r}
                                                onClick={() =>
                                                  requestRoleChange(u, r)
                                                }
                                                className="role-option"
                                                style={{
                                                  background: "transparent",
                                                  border:
                                                    "1px solid transparent",
                                                  padding: "8px 10px",
                                                  borderRadius: "6px",
                                                  color: "var(--c-light)",
                                                  cursor: "pointer",
                                                  textAlign: "left",
                                                  textTransform: "capitalize",
                                                  borderRadius: "11px",
                                                }}
                                              >
                                                {r}
                                              </button>
                                            ))}
                                          </RoleMenu>
                                        )}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleToggleBlock(u._id)}
                                      style={{
                                        background: u.isBlocked
                                          ? "rgba(16, 185, 129, 0.1)"
                                          : "rgba(239, 68, 68, 0.1)",
                                        border: `1px solid ${u.isBlocked ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}`,
                                        borderTop: `1px solid ${u.isBlocked ? "rgba(16, 185, 129, 0.15)" : "rgb(239, 68, 68, 0.15)"}`,
                                        borderLeft: `1px solid ${u.isBlocked ? "rgba(16, 185, 129, 0.15)" : "rgb(239, 68, 68),0.15"}`,
                                        padding: "6px 12px",
                                        borderRadius: "16px",
                                        color: u.isBlocked
                                          ? "#10B981"
                                          : "#ef4444",
                                        cursor: "pointer",
                                        backdropFilter: "blur(20px)",
                                        boxShadow: "var(--shadow)",
                                      }}
                                    >
                                      {u.isBlocked ? "Unblock" : "Block"}
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
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "24px" }}>
                  Pending Course Approvals
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {pendingCourses.length === 0 ? (
                    <div
                      className="glass-card"
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "var(--c-sub)",
                      }}
                    >
                      No pending courses to review. You're all caught up!
                    </div>
                  ) : (
                    pendingCourses.map((course) => (
                      <div
                        key={course._id}
                        className="glass-card hover-glow"
                        style={{
                          padding: "24px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "20px",
                            alignItems: "center",
                          }}
                        >
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              style={{
                                width: "120px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "120px",
                                height: "80px",
                                background:
                                  "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                                borderRadius: "8px",
                              }}
                            ></div>
                          )}
                          <div>
                            <h3
                              style={{
                                fontSize: "1.3rem",
                                margin: "0 0 8px 0",
                              }}
                            >
                              {course.title}
                            </h3>
                            <div
                              style={{
                                color: "var(--c-sub)",
                                fontSize: "0.95rem",
                              }}
                            >
                              By {course.instructor?.name || "Unknown"} • EGP{" "}
                              {course.price} • {course.category}
                            </div>
                            <div
                              style={{
                                marginTop: "8px",
                                color: "var(--c-sub)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {course.description.substring(0, 80)}...
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                          <button
                            onClick={() => requestReject(course)}
                            disabled={processingId === course._id}
                            className="glass-btn hover-glow"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.95rem",
                              color: "#ef4444",
                              borderColor: "rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(course._id)}
                            disabled={processingId === course._id}
                            className="glass-btn hover-glow"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.95rem",
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "#10B981",
                              borderColor: "rgba(16, 185, 129, 0.5)",
                            }}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
