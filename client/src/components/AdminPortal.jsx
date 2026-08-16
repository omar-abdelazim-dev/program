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
import AdminAnalyticsTab from "./AdminAnalyticsTab";
import AdminOverviewTab from "./AdminOverviewTab";
import SegmentedControl from "./common/SegmentedControl";
import { formatNotificationTitle, formatNotificationMessage } from "../utils/notificationFormatter";
import AdminUserManagementTab from "./AdminUserManagementTab";
import AdminCourseManagementTab from "./AdminCourseManagementTab";
import AdminLessonsTab from "./AdminLessonsTab";
import GlobalAnnouncementBanner from "./GlobalAnnouncementBanner";
import WebsiteManagement from "./WebsiteManagement/WebsiteManagement";
import SystemManagement from "./SystemManagement";
import AdminLandingPageTab from "./AdminLandingPageTab";
import AdminReportsTab from "./AdminReportsTab";
import FullPageLoader from "./FullPageLoader";
import { useTranslation } from 'react-i18next';

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
  const [activeTab, setActiveTabRaw] = useState("dashboard_overview");
  // Tracks which tabs have been visited at least once — components are only
  // mounted on first visit and kept alive forever after (no re-fetches).
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(["dashboard_overview"]));

  const setActiveTab = (tab) => {
    setVisitedTabs((prev) => { const s = new Set(prev); s.add(tab); return s; });
    setActiveTabRaw(tab);
  };
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    localStorage.setItem("admin_lang", newLang);
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("admin_lang");
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [pendingLessonsCount, setPendingLessonsCount] = useState(0);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [revenueAnalyticsLoading, setRevenueAnalyticsLoading] = useState(true);

  // Loading & Processing States
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [userActionError, setUserActionError] = useState("");

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [processingEnrollmentAction, setProcessingEnrollmentAction] = useState(null);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [pendingEnrollmentReject, setPendingEnrollmentReject] = useState(null);
  const [enrollmentRejectReason, setEnrollmentRejectReason] = useState("");
  const [enrollmentRejectReasonError, setEnrollmentRejectReasonError] = useState("");

  const handleApproveEnrollment = async (id) => {
    setProcessingEnrollmentAction('approving');
    try {
      await api.patch(`/admin/enrollments/${id}/approve`);
      notyf.success('Enrollment request approved successfully');
      setTransactions(prev => prev.map(t => t._id === id ? { ...t, status: 'approved' } : t));
      setSelectedEnrollment(null);
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to approve enrollment');
    } finally {
      setProcessingEnrollmentAction(null);
    }
  };

  const handleRejectEnrollment = async (id, reason) => {
    setProcessingEnrollmentAction('rejecting');
    try {
      await api.patch(`/admin/enrollments/${id}/reject`, { reason });
      notyf.success('Enrollment request rejected successfully');
      setTransactions(prev => prev.map(t => t._id === id ? { ...t, status: 'rejected' } : t));
      setSelectedEnrollment(null);
      setPendingEnrollmentReject(null);
      setEnrollmentRejectReason("");
      setEnrollmentRejectReasonError("");
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to reject enrollment');
    } finally {
      setProcessingEnrollmentAction(null);
    }
  };

  const confirmEnrollmentReject = async () => {
    if (!pendingEnrollmentReject) return;
    if (!enrollmentRejectReason.trim()) {
      setEnrollmentRejectReasonError("Please enter a reason for rejecting this request.");
      return;
    }
    await handleRejectEnrollment(pendingEnrollmentReject._id, enrollmentRejectReason.trim());
  };

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear all notifications', err);
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15s so new enrollment requests appear without refresh
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Nav State
  const [expandedGroup, setExpandedGroup] = useState("Dashboard");
  const [expandedMobileGroup, setExpandedMobileGroup] = useState("Dashboard");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      const [statsRes, pendingRes, lessonsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/courses/pending"),
        api.get("/admin/lessons")
      ]);
      setStats(statsRes.data);
      setPendingCourses(pendingRes.data.courses || []);
      const pLessons = (lessonsRes.data.lessons || []).filter(l => l.status === 'pending');
      setPendingLessonsCount(pLessons.length);
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

  const fetchPayouts = async () => {
    try {
      const res = await api.get("/admin/payouts");
      setPayouts(res.data.payouts || []);
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

  // Guard: redirect non-admins
  useEffect(() => {
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch dashboard stats + pending courses once on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch users once on mount
  useEffect(() => {
    fetchUsers(searchQuery);
  }, []);

  // Fetch transactions & payouts once on mount
  useEffect(() => {
    fetchTransactions();
    fetchPayouts();
  }, []);

  // Fetch recent activity once on mount
  useEffect(() => {
    fetchActivity();
  }, []);

  // Fetch revenue analytics once on mount
  useEffect(() => {
    fetchRevenueAnalytics();
  }, []);

  // Debounced Search — only re-fetches users when search query changes
  useEffect(() => {
    if (!activeTab.startsWith("users")) return;
    const delay = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery, showDeletedUsers]);

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

  if (loading) return (
    <div data-role="admin" style={{ background: 'var(--bg-main)', minHeight: '100vh', width: '100%' }}>
      <FullPageLoader message="Loading Admin Portal..." />
    </div>
  );
  const menuGroups =
    user?.role === "superadmin"
      ? [
          {
            title: "Dashboard",
            items: [
              { id: "dashboard_overview", label: "Overview" },
              { id: "dashboard_analytics", label: "Analytics & Statistics" },
              { id: "dashboard_activity", label: "Recent Activity" },
            ],
          },
          {
            title: "Users",
            items: [{ id: "users", label: "Users" }],
          },
          {
            title: "Courses",
            items: [
              { id: "courses", label: "Course Management" },
            ],
          },
          {
            title: "Financials",
            items: [
              { id: "enrollment", label: "Enrollments" },
              { id: "financial_payouts", label: "Payout Requests" },
            ],
          },
          {
            title: "Website",
            items: [
              { id: "web_landing_cms", label: "Landing Page CMS" },
              { id: "web_home", label: "Homepage" },
              { id: "web_about", label: "About Us" },
              { id: "web_faq", label: "FAQ" },
              { id: "web_testimonials", label: "Testimonials" },
              { id: "web_contact", label: "Contact Us" },
            ],
          },
          {
            title: "Announcements",
            items: [{ id: "announcements", label: "Announcements" }],
          },
          {
            title: "Reports",
            items: [
              { id: "reports_financial", label: "Financial Reports" },
              { id: "reports_students", label: "Student Progress" },
              { id: "reports_instructors", label: "Instructor Performance" },
              { id: "reports_export", label: "Export Data" },
            ],
          },
          {
            title: "Settings",
            items: [{ id: "settings", label: "System Settings" }],
          },
        ]
      : [
          {
            title: "Dashboard",
            items: [
              { id: "dashboard_overview", label: "Overview" },
              { id: "dashboard_analytics", label: "Analytics & Statistics" },
              { id: "dashboard_activity", label: "Recent Activity" },
            ],
          },
          {
            title: "Users",
            items: [{ id: "users", label: "Users" }],
          },
          {
            title: "Courses",
            items: [
              { id: "courses", label: "Course Management" },
            ],
          },
          {
            title: "Financials",
            items: [
              { id: "enrollment", label: "Enrollments" },
              { id: "financial_payouts", label: "Payout Requests" },
            ],
          },
          {
            title: "Announcements",
            items: [{ id: "announcements", label: "Announcements" }],
          },
          {
            title: "Reports",
            items: [
              { id: "reports_financial", label: "Financial Reports" },
              { id: "reports_students", label: "Student Progress" },
              { id: "reports_instructors", label: "Instructor Performance" },
              { id: "reports_export", label: "Export Data" },
            ],
          },
        ];

  const displayedTransactions = transactions.slice((enrollmentPage - 1) * 10, enrollmentPage * 10);

  return (
    <div
      data-role={user?.role}
      className="student-layout-wrapper student-layout-topnav"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: "var(--bg-main)",
        minHeight: "100vh",
      }}
    >
      <header className="student-header student-topnav-header" style={{ position: "relative", zIndex: 1000, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", height: "70px", backgroundColor: "var(--bg-surface)", borderBottom: isLightMode ? "1px solid rgba(0,0,0,0.1)" : "none" }}>
        <div className="topnav-left">
          <Link to="/student" className="topnav-logo">
            <img
              src={isLightMode ? logoLight : logoDark}
              alt="Program Logo"
              style={{ height: "32px", width: "auto", objectFit: "contain" }}
            />
          </Link>
        </div>
        
        {/* Desktop Navigation Links */}
        <div className="topnav-center" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <nav className="topnav-links" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {menuGroups.map((group, idx) => {
              const hasDropdown = group.items.length > 1;
              return (
              <div 
                key={idx} 
                style={{ position: 'relative' }} 
                onMouseEnter={() => hasDropdown && setActiveDropdown(group.title)}
                onMouseLeave={() => hasDropdown && setActiveDropdown(null)}
              >
                <button 
                  className={`topnav-link ${group.items.some(t => isSidebarTabActive(t.id, activeTab)) ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: '8px 12px', fontSize: '0.9rem' }}
                  onClick={() => {
                    if (hasDropdown) {
                      setActiveDropdown(activeDropdown === group.title ? null : group.title);
                    } else {
                      handleSidebarTabClick(group.items[0].id, group.title);
                      setActiveDropdown(null);
                    }
                  }}
                >
                  {group.title}
                  {hasDropdown && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ 
                      transform: activeDropdown === group.title ? "rotate(180deg)" : "rotate(0deg)", 
                      transition: "transform 0.2s" 
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  )}
                </button>
                {hasDropdown && (
                  <div 
                    className="profile-dropdown"
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: '50%', 
                      transformOrigin: 'top center',
                      transform: activeDropdown === group.title ? 'translateX(-50%) scaleY(1)' : 'translateX(-50%) scaleY(0)',
                      opacity: activeDropdown === group.title ? 1 : 0,
                      visibility: activeDropdown === group.title ? 'visible' : 'hidden',
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease, visibility 0.4s',
                      width: 'max-content',
                      minWidth: '200px',
                      padding: '8px 0', 
                      marginTop: '4px',
                      display: 'flex', 
                      flexDirection: 'column', 
                      zIndex: 1000 
                    }}
                  >
                    {group.items.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          handleSidebarTabClick(tab.id, group.title);
                          setActiveDropdown(null);
                        }}
                        style={{
                          padding: '10px 16px',
                          background: 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          color: isSidebarTabActive(tab.id, activeTab) ? 'var(--color-accent)' : 'var(--text-main)',
                          fontWeight: isSidebarTabActive(tab.id, activeTab) ? '600' : '400',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        className="hover-bg"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )})}
          </nav>
        </div>

        <div className="topnav-right header-right" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Hamburger Toggle (Mobile) */}
            <button
              className={`topnav-hamburger ${mobileNavOpen ? "active" : ""}`}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={t('admin.nav.toggle_navigation', 'Toggle navigation')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-h)', cursor: 'pointer' }}
            >
              {mobileNavOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Notifications Bell & Popover */}
            <div className="profile-wrapper" ref={notificationsRef} style={{ position: 'relative' }}>
              <button 
                type="button"
                className="nav-icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ position: 'relative' }}
                aria-label="Notifications"
              >
                {notifications && notifications.some(n => !n.read) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 005 14h14a1 1 0 00.707-1.707L19 11.586V8a6 6 0 00-6-6zM10 18a2 2 0 004 0h-4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                )}
                {notifications && notifications.some(n => !n.read) && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '8px', height: '8px', backgroundColor: '#ef4444',
                    borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg-main)'
                  }}></span>
                )}
              </button>
              {showNotifications && (
                <div className="profile-dropdown" style={{ width: '360px', right: isRTL ? 'auto' : 0, left: isRTL ? 0 : 'auto', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-border-subtle, rgba(255,255,255,0.08))', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                    <span style={{ color: 'var(--color-accent, #f97316)', fontSize: '1.05rem' }}>{t('nav.notifications', 'Notifications')}</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={clearAllNotifications}
                        style={{ background: 'none', border: 'none', color: 'var(--c-sub)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {t('nav.clear_all', 'Clear All')}
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map(notif => (
                      <div key={notif._id} style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--c-border-subtle, rgba(255,255,255,0.05))',
                        backgroundColor: notif.read ? 'transparent' : 'rgba(249, 115, 22, 0.08)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s'
                      }} onClick={async () => {
                        if (!notif.read) {
                          try {
                            await api.patch(`/notifications/${notif._id}/read`);
                            fetchNotifications();
                          } catch (err) {
                            console.error('Failed to mark notification as read', err);
                          }
                        }
                        const title = (notif.title || '').toLowerCase();
                        const msg = (notif.message || '').toLowerCase();
                        if (title.includes('enroll') || msg.includes('enroll')) {
                          setActiveTab('enrollment');
                          setExpandedGroup('Financial Management');
                        } else if (title.includes('course') || msg.includes('course')) {
                          setActiveTab('courses');
                          setExpandedGroup('Course Management');
                        } else if (title.includes('payout') || msg.includes('payout')) {
                          setActiveTab('financial_payouts');
                          setExpandedGroup('Financial Management');
                        }
                        setShowNotifications(false);
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-h)', marginBottom: '4px' }}>
                          {formatNotificationTitle(notif.title || notif.text, t)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', lineHeight: '1.4' }}>
                          {formatNotificationMessage(notif.message, t)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--c-sub)', marginTop: '6px', textAlign: 'right', opacity: 0.8 }}>
                          {new Date(notif.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)', fontSize: '0.9rem' }}>
                        {t('nav.no_notifications', 'No new notifications')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="nav-icon-btn"
              onClick={toggleTheme}
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
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
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
      </header>

      {/* Mobile Nav Dropdown */}
      <nav className={`topnav-mobile-dropdown ${mobileNavOpen ? 'open' : 'closed'}`}>
        <div className="topnav-mobile-dropdown-inner" style={{ padding: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {menuGroups.map((group, idx) => {
            // If the group only has one item, render it directly as a top-level button
            if (group.items.length === 1) {
              const tab = group.items[0];
              const isActive = isSidebarTabActive(tab.id, activeTab);
              return (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => {
                      handleSidebarTabClick(tab.id, group.title);
                      setMobileNavOpen(false);
                    }}
                    style={{ 
                      width: '100%', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      fontSize: '0.85rem', 
                      color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)', 
                      textTransform: 'uppercase', 
                      padding: '12px 8px', 
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? 'var(--color-accent-transparent, rgba(249,115,22,0.1))' : 'transparent',
                      textAlign: 'left',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    {group.title}
                  </button>
                </div>
              );
            }

            // Otherwise, render as a collapsible accordion
            return (
              <div key={idx} style={{ marginBottom: '16px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    marginBottom: '8px', 
                    padding: '12px 8px', 
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: expandedMobileGroup === group.title ? 'rgba(0,0,0,0.05)' : 'transparent',
                    transition: 'background 0.2s ease'
                  }}
                  onClick={() => setExpandedMobileGroup(prev => prev === group.title ? null : group.title)}
                >
                  {group.title}
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    style={{
                      transform: expandedMobileGroup === group.title ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {expandedMobileGroup === group.title && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {group.items.map(tab => (
                      <button
                        key={tab.id}
                        className={`topnav-mobile-link ${isSidebarTabActive(tab.id, activeTab) ? 'active' : ''}`}
                        onClick={() => {
                          handleSidebarTabClick(tab.id, group.title);
                          setMobileNavOpen(false);
                        }}
                        style={{ textAlign: 'left', padding: '10px 16px', borderRadius: '8px', border: 'none', background: isSidebarTabActive(tab.id, activeTab) ? 'var(--color-accent-transparent, rgba(249,115,22,0.1))' : 'transparent', color: isSidebarTabActive(tab.id, activeTab) ? 'var(--color-accent)' : 'var(--text-h)', cursor: 'pointer', fontSize: '0.95rem' }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

        <GlobalAnnouncementBanner />

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: "32px 48px", overflowY: "auto", minHeight: 0 }}>
          <div
            className="admin-content-panel"
            style={{
              width: "100%",
            }}
          >
            {visitedTabs.has("dashboard_overview") && stats && (
              <div style={{ display: activeTab === "dashboard_overview" ? "block" : "none" }}>
                <AdminOverviewTab
                  stats={stats}
                  user={user}
                  setActiveTab={setActiveTab}
                />
              </div>
            )}

            <div style={{ display: activeTab === "dashboard_activity" ? "block" : "none" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}>

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
                  {/* Segmented Control for Activity Filters */}
                  <SegmentedControl
                    tabs={[
                      { id: "All", label: "All" },
                      { id: "Approved", label: "Approved" },
                      { id: "Submitted", label: "Submitted" },
                      { id: "Enrolled", label: "Enrolled" },
                      { id: "Admin", label: "Admin/Super Admin" },
                    ]}
                    activeTab={activityFilter}
                    onChange={setActivityFilter}
                  />
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
                                ? "var(--inner-shadow)"
                                : "var(--inner-shadow)",
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
            </div>

            {visitedTabs.has("dashboard_analytics") && (
              <div style={{ display: activeTab === "dashboard_analytics" ? "block" : "none" }}>
                <AdminAnalyticsTab
                  stats={stats}
                  revenueAnalytics={revenueAnalytics}
                  revenueAnalyticsLoading={revenueAnalyticsLoading}
                />
              </div>
            )}

            {visitedTabs.has("users") || [...visitedTabs].some(t => t.startsWith("users")) ? (
              <div style={{ display: activeTab.startsWith("users") ? "block" : "none" }}>
                <AdminUserManagementTab
                  users={users}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  fetchUsers={fetchUsers}
                  currentUser={user}
                />
              </div>
            ) : null}

            <div style={{ display: activeTab === "enrollment" ? "block" : "none" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <h2 style={{ fontSize: "1.8rem", margin: 0 }}>
                  Enrollment Requests
                </h2>
                <div className="glass-card" style={{ width: "100%", padding: "16px", borderRadius: "20px", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table" style={{ width: "100%", minWidth: "750px", borderCollapse: "separate", borderSpacing: "0", textAlign: "left" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "18px 24px 18px 32px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          DATE
                        </th>
                        <th style={{ padding: "18px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          STUDENT
                        </th>
                        <th style={{ padding: "18px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          COURSE
                        </th>
                        <th style={{ padding: "18px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          INSTRUCTOR
                        </th>
                        <th style={{ padding: "18px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", textAlign: "center", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          STATUS
                        </th>
                        <th style={{ padding: "18px 32px 18px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.8rem", letterSpacing: "0.05em", textAlign: "right", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))" }}>
                          REVENUE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "var(--c-sub)" }}>
                            No requests found
                          </td>
                        </tr>
                      ) : (
                        displayedTransactions.map((t) => {
                          const norm = (t.status || 'pending').toLowerCase().replace(/\s+/g, '_');
                          const statusConfig = {
                            pending: { label: 'Pending', bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
                            under_review: { label: 'Under Review', bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
                            approved: { label: 'Approved', bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399' },
                            rejected: { label: 'Rejected', bg: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5' },
                            refunded: { label: 'Refunded', bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' },
                          };
                          const st = statusConfig[norm] || statusConfig.pending;

                          return (
                            <tr 
                              key={t._id} 
                              style={{ 
                                cursor: "pointer", 
                                transition: "background 0.2s",
                                borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.05))"
                              }}
                              className="hover-row"
                              onClick={() => setSelectedEnrollment(t)}
                            >
                              <td style={{ padding: "18px 24px 18px 32px", verticalAlign: "middle" }}>
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                                <div style={{ color: "var(--text-h)", fontWeight: "500" }}>
                                  {t.student?.name || "Unknown Student"}
                                </div>
                              </td>
                              <td style={{ padding: "18px 24px", verticalAlign: "middle" }}>
                                <div style={{ color: "var(--text-h)", fontWeight: "500" }}>
                                  {t.course?.title || "Unknown Course"}
                                </div>
                              </td>
                              <td style={{ padding: "18px 24px", verticalAlign: "middle", color: "var(--c-sub)" }}>
                                {t.course?.instructor?.name || "Unknown Instructor"}
                              </td>
                              <td style={{ padding: "18px 24px", textAlign: "center", verticalAlign: "middle" }}>
                                <span
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                    background: st.bg,
                                    color: st.color,
                                    border: "none",
                                    boxShadow: "var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))",
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
                                      backgroundColor: st.color,
                                    }}
                                  />
                                  {st.label}
                                </span>
                              </td>
                              <td style={{ padding: "18px 32px 18px 24px", textAlign: "right", verticalAlign: "middle", color: "#10B981", fontWeight: "600" }}>
                                EGP {t.amountPaid}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  </div>
                  
                  {transactions.length > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', margin: '20px 0 12px 0', alignItems: 'center' }}>
                      <button 
                        disabled={enrollmentPage === 1} 
                        onClick={() => setEnrollmentPage(prev => prev - 1)}
                        className="glass-btn hover-glow"
                        style={{ padding: '8px 20px', fontSize: '0.85rem', cursor: enrollmentPage === 1 ? 'not-allowed' : 'pointer', opacity: enrollmentPage === 1 ? 0.5 : 1 }}
                      >
                        Previous
                      </button>
                      <span style={{ color: 'var(--c-sub)', fontSize: '0.9rem', fontWeight: '500' }}>
                        Page {enrollmentPage} of {Math.ceil(transactions.length / 10)}
                      </span>
                      <button 
                        disabled={enrollmentPage >= Math.ceil(transactions.length / 10)} 
                        onClick={() => setEnrollmentPage(prev => prev + 1)}
                        className="glass-btn hover-glow"
                        style={{ padding: '8px 20px', fontSize: '0.85rem', cursor: enrollmentPage >= Math.ceil(transactions.length / 10) ? 'not-allowed' : 'pointer', opacity: enrollmentPage >= Math.ceil(transactions.length / 10) ? 0.5 : 1 }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {visitedTabs.has("courses") && (
              <div style={{ display: activeTab === "courses" ? "block" : "none" }}>
                <AdminCourseManagementTab currentUser={user} onDashboardUpdate={fetchDashboardData} />
              </div>
            )}

            {visitedTabs.has("financial_payouts") && (
              <div style={{ display: activeTab === "financial_payouts" ? "block" : "none" }}>
                <AdminPayoutsTab />
              </div>
            )}

            {visitedTabs.has("web_landing_cms") && (
              <div style={{ display: activeTab === "web_landing_cms" ? "block" : "none" }}>
                <AdminLandingPageTab />
              </div>
            )}

            {visitedTabs.has("web_home") && (
              <div style={{ display: activeTab === "web_home" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="home" />
              </div>
            )}
            {visitedTabs.has("web_about") && (
              <div style={{ display: activeTab === "web_about" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="about" />
              </div>
            )}
            {visitedTabs.has("web_faq") && (
              <div style={{ display: activeTab === "web_faq" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="faq" />
              </div>
            )}
            {visitedTabs.has("web_contact") && (
              <div style={{ display: activeTab === "web_contact" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="contact" />
              </div>
            )}
            {visitedTabs.has("web_testimonials") && (
              <div style={{ display: activeTab === "web_testimonials" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="testimonials" />
              </div>
            )}
            {visitedTabs.has("announcements") && (
              <div style={{ display: activeTab === "announcements" ? "block" : "none" }}>
                <WebsiteManagement user={user} subTab="announcements" />
              </div>
            )}

            {visitedTabs.has("settings") && (
              <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
                <SystemManagement user={user} />
              </div>
            )}

            {/* Reports sub-tabs */}
            {visitedTabs.has("reports_financial") && (
              <div style={{ display: activeTab === "reports_financial" ? "block" : "none" }}>
                <AdminReportsTab user={user} subTab="financial" />
              </div>
            )}
            {visitedTabs.has("reports_students") && (
              <div style={{ display: activeTab === "reports_students" ? "block" : "none" }}>
                <AdminReportsTab user={user} subTab="students" />
              </div>
            )}
            {visitedTabs.has("reports_instructors") && (
              <div style={{ display: activeTab === "reports_instructors" ? "block" : "none" }}>
                <AdminReportsTab user={user} subTab="instructors" />
              </div>
            )}
            {visitedTabs.has("reports_export") && (
              <div style={{ display: activeTab === "reports_export" ? "block" : "none" }}>
                <AdminReportsTab user={user} subTab="export" />
              </div>
            )}

            {/* Permissions tab (superadmin only) */}
            {visitedTabs.has("roles_permissions") && (
              <div style={{ display: activeTab === "roles_permissions" ? "block" : "none" }}>
                <AdminRolePermissionsTab user={user} />
              </div>
            )}
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

      {/* Selected Enrollment details modal */}
      {selectedEnrollment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "20px",
          }}
        >
          <div
            className="glass-card animate-entrance"
            style={{ width: "100%", maxWidth: "500px", padding: "32px" }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: "0", fontSize: "1.3rem", textTransform: 'uppercase', letterSpacing: '1px' }}>
                Enrollment Request Details
              </h2>
              <button 
                onClick={() => setSelectedEnrollment(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--c-sub)', fontSize: '1.5rem', cursor: 'pointer' }}
              >×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Course Name:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{selectedEnrollment.course?.title || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Instructor Name:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{selectedEnrollment.course?.instructor?.name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Course Price:</span>
                <span style={{ fontWeight: '600', color: '#10B981' }}>{selectedEnrollment.amountPaid || selectedEnrollment.course?.price || 0} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Fees (1%):</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>
                  {(((selectedEnrollment.amountPaid || selectedEnrollment.course?.price || 0) * 0.01)).toFixed(2)} EGP
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Phone Number Used:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{selectedEnrollment.paymentAccount || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Transaction ID:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{selectedEnrollment.transactionId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Invoice ID:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)', fontSize: '0.85rem' }}>{selectedEnrollment.invoiceId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Payment Method:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{selectedEnrollment.paymentMethod || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Transaction Date & Time:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>
                  {selectedEnrollment.createdAt ? new Date(selectedEnrollment.createdAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-sub)' }}>Status:</span>
                <span style={{ fontWeight: '700', textTransform: 'uppercase', color: selectedEnrollment.status === 'approved' ? '#34d399' : selectedEnrollment.status === 'rejected' ? '#fca5a5' : '#f59e0b' }}>
                  {selectedEnrollment.status || 'pending'}
                </span>
              </div>
            </div>

            {selectedEnrollment.screenshot && (
              <div style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowScreenshotModal(true)}
                  className="glass-btn hover-glow"
                  style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }}
                >
                  View Payment Screenshot
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "16px" }}>
              {selectedEnrollment.status === 'pending' || !selectedEnrollment.status ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPendingEnrollmentReject(selectedEnrollment)}
                    disabled={processingEnrollmentAction !== null}
                    className="glass-btn auth-submit-btn"
                    style={{ 
                      flex: 1, 
                      background: 'var(--bg-main)', 
                      color: '#ef4444', 
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--inner-shadow)',
                      marginTop: '0px'
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveEnrollment(selectedEnrollment._id)}
                    disabled={processingEnrollmentAction !== null}
                    className="glass-btn auth-submit-btn"
                    style={{ 
                      flex: 1, 
                      background: 'var(--bg-main)', 
                      color: '#10b981', 
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--inner-shadow)',
                      marginTop: '0px' 
                    }}
                  >
                    {processingEnrollmentAction === 'approving' ? "Approving..." : "Approve"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedEnrollment(null)}
                  className="glass-btn hover-glow"
                  style={{ flex: 1 }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nested Modal to view Screenshot */}
      {showScreenshotModal && selectedEnrollment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
            padding: "20px",
          }}
          onClick={() => setShowScreenshotModal(false)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowScreenshotModal(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '2rem',
                cursor: 'pointer'
              }}
            >×</button>
            <img
              src={selectedEnrollment.screenshot}
              alt="Payment Screenshot"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <a 
                href={selectedEnrollment.screenshot} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontSize: '0.9rem' }}
              >
                Open image in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Reject Reason Modal */}
      {pendingEnrollmentReject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2200,
            padding: "20px",
          }}
        >
          <div
            className="glass-card animate-entrance"
            style={{ width: "100%", maxWidth: "500px", padding: "32px" }}
          >
            <h2 style={{ margin: "0 0 24px 0", fontSize: "1.3rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              Enrollment Rejection Reason
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>
                Course: {pendingEnrollmentReject.course?.title}
              </label>
              <label style={{ color: "var(--c-sub)", fontSize: "0.85rem", marginBottom: '12px' }}>
                Student: {pendingEnrollmentReject.student?.name}
              </label>
              <textarea
                value={enrollmentRejectReason}
                onChange={(e) => setEnrollmentRejectReason(e.target.value)}
                placeholder="e.g. Transaction ID does not match, screenshot is blurry, phone number is incorrect..."
                style={{
                  minHeight: "100px",
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-main)",
                  border: "none",
                  borderRadius: "12px",
                  color: "var(--text-h)",
                  fontFamily: "inherit",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  resize: "vertical",
                  boxShadow: "var(--inner-shadow, inset 0 2px 4px rgba(0, 0, 0, 0.4))",
                }}
              />
            </div>
            {enrollmentRejectReasonError && (
              <div
                style={{
                  color: "#ef4444",
                  margin: "8px 0 0 0",
                  fontSize: "0.9rem",
                }}
              >
                {enrollmentRejectReasonError}
              </div>
            )}
            <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => {
                  setPendingEnrollmentReject(null);
                  setEnrollmentRejectReason("");
                  setEnrollmentRejectReasonError("");
                }}
                disabled={processingEnrollmentAction === 'rejecting'}
                className="glass-btn auth-submit-btn"
                style={{ flex: 1, marginTop: '0px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEnrollmentReject}
                disabled={processingEnrollmentAction === 'rejecting'}
                className="glass-btn auth-submit-btn"
                style={{ 
                  flex: 1, 
                  background: 'var(--bg-main)', 
                  color: '#ef4444', 
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--inner-shadow)',
                  marginTop: '0px'
                }}
              >
                {processingEnrollmentAction === 'rejecting'
                  ? "Rejecting..."
                  : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
