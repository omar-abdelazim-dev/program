import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoDark from "../assets/logo-dark.png";
import logoLight from "../assets/logo-light.png";
import Footer from "./Footer";
import "../styles/student-layout.css";
import "../styles/static-pages.css";
import { useTranslation } from 'react-i18next';
import { formatNotificationTitle, formatNotificationMessage } from "../utils/notificationFormatter";
import api from "../api/axios";
import CustomSelect from "./CustomSelect";
import { MAJORS } from "../data/majors";

export default function StudentLayout({
  user,
  children,
  toggleTheme,
  isLightMode,
  onLogout,
  notifications,
  setNotifications,
  searchQuery,
  onSearchChange,
  selectedMajor,
  selectedCollege,
  exploreCollege,
  onMajorChange,
  onCollegeChange,
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
  const searchInputRef = useRef(null);
  const location = useLocation();
  const isSettingsPage = location.pathname.includes('/settings');
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const handleClearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      if (setNotifications) setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
      if (setNotifications) setNotifications([]);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    localStorage.setItem("student_lang", newLang);
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("student_lang");
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n, i18n.language]);
  
  const showSearch = false;

  // Derive active tab from pathname
  let activeTab = "home";
  if (location.pathname.includes("/my-courses")) activeTab = "my-courses";
  if (location.pathname.includes("/dashboard")) activeTab = "dashboard";
  if (location.pathname.includes("/settings")) activeTab = "settings";

  
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="student-layout-wrapper student-layout-topnav">
      {/* MAIN CONTENT AREA */}
      <main className="student-main-area">
        {/* TOP NAVIGATION HEADER */}
        <header className="student-header student-topnav-header">
          {/* Very Left: Logo */}
          <div className="topnav-left">
            <Link to="/student" className="topnav-logo">
              <img
                src={isLightMode ? logoLight : logoDark}
                alt={t('student.nav.program_logo', 'Program Logo')}
                style={{
                  height: "32px",
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            </Link>
          </div>

          {/* Center: Tabs in Floating Pill Capsule */}
          <div className="topnav-center">
            <div className="topnav-pill-capsule">
              <nav className="topnav-links">
                <button
                  className={`topnav-link ${activeTab === "home" ? "active" : ""}`}
                  onClick={() => navigate("/student")}
                >
                  {t("student.nav.home", "Home")}
                </button>
                {user?.role === "student" && (
                  <>
                    <button
                      className={`topnav-link ${activeTab === "dashboard" ? "active" : ""}`}
                      onClick={() => navigate("/student/dashboard")}
                    >
                      {t("student.nav.dashboard", "Dashboard")}
                    </button>
                  </>
                )}
                <button
                  className={`topnav-link ${activeTab === "settings" ? "active" : ""}`}
                  onClick={() => navigate("/student/settings")}
                >
                  {t("student.nav.settings", "Settings")}
                </button>
              </nav>
            </div>
          </div>

          {/* Very Right: Search Bar + Utility Icons */}
          <div className="topnav-right header-right">
            {location.pathname === "/student" && (
              <div className="merged-search-filter-group home-course-search">
                <div className={`merged-search-part ${searchQuery ? "has-value" : ""}`}>
                  <span className="search-pill-icon" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    ref={searchInputRef}
                    className="search-expandable-input"
                    type="text"
                    placeholder={t(
                      "student.nav.search_placeholder",
                      "Search courses...",
                    )}
                    value={searchQuery ?? ""}
                    onChange={(e) => onSearchChange?.(e.target.value.replace(/[<>]/g, ""))}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-close-btn"
                      onClick={() => onSearchChange?.("")}
                      title={t('student.nav.clear_search', 'Clear search')}
                      aria-label={t('student.nav.clear_search', 'Clear search')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="merged-filter-divider" />

                <div className="merged-select-part">
                  <CustomSelect
                    value={selectedMajor ?? selectedCollege ?? exploreCollege ?? ""}
                    onChange={(val) => (onMajorChange || onCollegeChange)?.(val)}
                    placeholder={t("student.explore.filter_by_major", "Filter by major")}
                    triggerClassName="merged-custom-select-trigger"
                    options={[
                      { value: "", label: t("student.explore.all_majors", "All Majors") },
                      ...MAJORS.map((m) => ({
                        value: m.id,
                        label: t(`majors.${m.id}`, m.label),
                      }))
                    ]}
                  />
                </div>
              </div>
            )}

            {/* Hamburger Toggle (Mobile) */}
            <button
              className={`topnav-hamburger ${mobileNavOpen ? "active" : ""}`}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={t('student.nav.toggle_navigation', 'Toggle navigation')}
            >
              {mobileNavOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>

            <div className="profile-wrapper">
              <button className="utility-icon-btn">
                {notifications && notifications.length > 0 ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 14h14a1 1 0 0 0 .707-1.707L19 11.586V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 4 0h-4z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.73 21a2 2 0 0 1-3.46 0"
                    ></path>
                  </svg>
                )}
                {notifications && notifications.length > 0 && (
                  <span className="notification-dot"></span>
                )}
              </button>

              <div
                className="profile-dropdown"
                style={{
                  width: "360px",
                  right: isRTL ? "auto" : 0,
                  left: isRTL ? 0 : "auto",
                  padding: 0,
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom:
                        "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))",
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "var(--bg-surface)",
                      borderTopLeftRadius: "16px",
                      borderTopRightRadius: "16px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #f97316 0%, #eab308 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {t("nav.notifications", "Notifications")}
                    </span>
                    {notifications && notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--c-sub)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          textDecoration: "underline",
                        }}
                      >
                        {t("nav.clear_all", "Clear all")}
                      </button>
                    )}
                  </div>
                  {!notifications || notifications.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--c-sub)",
                        fontSize: "0.9rem",
                      }}
                    >
                      {t("nav.no_notifications", "No new notifications")}
                    </div>
                  ) : (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                      {notifications
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((notif, idx) => {
                          const content = (
                            <>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  color: "var(--text-h)",
                                  marginBottom: "4px",
                                  textAlign: isRTL ? "right" : "left",
                                }}
                              >
                                {formatNotificationTitle(
                                  notif.text || notif.title,
                                  t,
                                )}
                              </div>
                              {notif.message && (
                                <div
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--c-sub)",
                                    lineHeight: "1.4",
                                    marginBottom: "4px",
                                    textAlign: isRTL ? "right" : "left",
                                  }}
                                >
                                  {formatNotificationMessage(notif.message, t)}
                                </div>
                              )}
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--c-sub)",
                                  marginTop: "6px",
                                  textAlign: isRTL ? "left" : "right",
                                  opacity: 0.8,
                                }}
                              >
                                {new Date(notif.timestamp).toLocaleString(
                                  undefined,
                                  {
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            </>
                          );

                          const itemStyle = {
                            padding: "12px 16px",
                            borderBottom:
                              "1px solid var(--c-border-subtle, rgba(255,255,255,0.05))",
                            backgroundColor: notif.read
                              ? "transparent"
                              : "rgba(249, 115, 22, 0.08)",
                            cursor: "pointer",
                            position: "relative",
                            transition: "background 0.2s",
                            display: "block",
                            textDecoration: "none",
                            color: "inherit",
                          };

                          if (notif.link) {
                            return (
                              <Link
                                key={notif.id || idx}
                                to={notif.link}
                                style={itemStyle}
                                onClick={() =>
                                  setNotifications((prev) =>
                                    prev.filter((n) => n.id !== notif.id),
                                  )
                                }
                              >
                                {content}
                              </Link>
                            );
                          }

                          return (
                            <div key={notif.id || idx} style={itemStyle}>
                              {content}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Avatar Logo / Profile */}
            <div
              className="profile-wrapper hover-glow"
              onClick={() => navigate("/student/settings")}
              style={{ cursor: "pointer" }}
              title={t("settings.nav.profile", "Profile")}
            >
              <div
                className="nav-avatar"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(249, 115, 22, 0.12)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "var(--inner-shadow)"
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "Profile"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-accent, #f97316)" }}>
                    {user?.name?.[0]?.toUpperCase() || "S"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Nav Dropdown */}
        <nav className={`topnav-mobile-dropdown ${mobileNavOpen ? "open" : "closed"}`}>
          <div className="topnav-mobile-dropdown-inner">
            <button
              className={`topnav-mobile-link ${activeTab === "home" ? "active" : ""}`}
              onClick={() => {
                navigate("/student");
                setMobileNavOpen(false);
              }}
            >
              {t("student.nav.home", "Home")}
            </button>
            {user?.role === "student" && (
              <>
                <button
                  className={`topnav-mobile-link ${activeTab === "dashboard" ? "active" : ""}`}
                  onClick={() => {
                    navigate("/student/dashboard");
                    setMobileNavOpen(false);
                  }}
                >
                  {t("student.nav.dashboard", "Dashboard")}
                </button>
              </>
            )}
            <button
              className={`topnav-mobile-link ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                navigate("/student/settings");
                setMobileNavOpen(false);
              }}
            >
              {t("student.nav.settings", "Settings")}
            </button>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        <div className="student-content-scroll">
          <div style={{ flex: "1 0 auto" }}>{children}</div>
          <Footer />
        </div>
      </main>
    </div>
  );
}
