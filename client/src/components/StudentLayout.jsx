import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoDark from "../assets/logo-dark.png";
import logoLight from "../assets/logo-light.png";
import studentLogo from "../assets/logo.png";
import Footer from "./Footer";
import "../styles/student-layout.css";
import "../styles/static-pages.css";
import { useTranslation } from 'react-i18next';
import { INSTRUCTORS_TAB, ALL_TAB } from "../data/exploreCategories";
import { COLLEGES } from "../data/colleges";
import CustomSelect from "./CustomSelect";
import ThreeDotMenu from "./common/ThreeDotMenu";
import { formatNotificationTitle, formatNotificationMessage } from "../utils/notificationFormatter";
import api from "../api/axios";

export default function StudentLayout({
  user,
  children,
  toggleTheme,
  isLightMode,
  onLogout,
  cartCount,
  notifications,
  setNotifications,
  searchQuery,
  onSearchChange,
  exploreCollege,
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
  }, []);
  
  const showSearch = location.pathname === '/student/explore';

  // Derive active tab from pathname
  let activeTab = "home";
  if (location.pathname === "/student/explore") activeTab = "explore";
  if (location.pathname.includes("/my-courses")) activeTab = "my-courses";
  if (location.pathname.includes("/dashboard")) activeTab = "dashboard";
  if (location.pathname.includes("/settings")) activeTab = "settings";

  
  const mobileMenuOptions = [
    {
      label: i18n.language === "ar" ? "English" : "عربي",
      action: toggleLanguage,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
    },
    {
      label: isLightMode ? t('settings.appearance.dark', 'Dark Mode') : t('settings.appearance.light', 'Light Mode'),
      action: toggleTheme,
      icon: isLightMode ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
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
      )
    },
    {
      label: t('nav.cart', 'Cart') + (cartCount > 0 ? " (" + cartCount + ")" : ""),
      action: () => navigate('/checkout/cart'),
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path strokeLinecap="round" strokeLinejoin="round" d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
    },
    {
      label: t('nav.settings', 'Settings'),
      action: () => navigate('/student/settings'),
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    {
      label: t('nav.logout', 'Logout'),
      action: onLogout,
      danger: true,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
    }
  ];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="student-layout-wrapper student-layout-topnav">
      {/* MAIN CONTENT AREA */}
      <main className="student-main-area">
        {/* TOP NAVIGATION HEADER */}
        <header className="student-header student-topnav-header">
          {/* Logo */}
          <Link to="/student" className="topnav-logo">
            <img
              src={studentLogo}
              alt="Program Logo"
              style={{
                scale: "3.1",
                height: "36px",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          {/* Horizontal Nav Links (Desktop) */}
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
                <button
                  className={`topnav-link ${activeTab === "explore" ? "active" : ""}`}
                  onClick={() => navigate("/student/explore")}
                >
                  {t("student.nav.explore", "Explore")}
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

          {/* Hamburger Toggle (Mobile) */}
          <button
            className="topnav-hamburger"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle navigation"
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

          <div
            className="header-left"
            style={{ display: "flex", alignItems: "center", gap: "16px" }}
          >
            {showSearch && (
              <div
                className={`search-expandable-pill ${isSearchExpanded ? "expanded" : "collapsed"}`}
                onClick={() => {
                  if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                  }
                }}
              >
                <button
                  type="button"
                  className="search-icon-btn"
                  onClick={(e) => {
                    if (!isSearchExpanded) {
                      e.stopPropagation();
                      setIsSearchExpanded(true);
                      setTimeout(() => searchInputRef.current?.focus(), 150);
                    }
                  }}
                  title={t("student.nav.search_placeholder", "Search")}
                  aria-label="Search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <input
                  ref={searchInputRef}
                  className="search-expandable-input"
                  type="text"
                  placeholder={t(
                    "student.nav.search_placeholder",
                    "Search courses, lessons, topics...",
                  )}
                  value={searchQuery ?? ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      if (!searchQuery) setIsSearchExpanded(false);
                    }
                  }}
                  tabIndex={isSearchExpanded ? 0 : -1}
                />
                {isSearchExpanded && (
                  <button
                    type="button"
                    className="search-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSearchChange?.("");
                      setIsSearchExpanded(false);
                    }}
                    title="Close search"
                    aria-label="Close search"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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
            )}

            {location.pathname === "/student/explore" && (
              <div
                style={{
                  position: "relative",
                  flexShrink: 0,
                  marginInlineEnd: "12px",
                }}
              >
                <CustomSelect
                  options={[ALL_TAB, ...COLLEGES.map((c) => c.id)].map(
                    (cat) => {
                      let label = cat;
                      if (cat === ALL_TAB)
                        label = t("student.explore.all", "All");
                      else {
                        const college = COLLEGES.find((c) => c.id === cat);
                        label = college ? t(college.key, cat) : cat;
                      }
                      return { label, value: cat };
                    },
                  )}
                  value={exploreCollege || ALL_TAB}
                  onChange={(val) => {
                    onCollegeChange?.(val);
                    if (location.pathname !== "/student/explore") {
                      navigate("/student/explore");
                    }
                  }}
                  placeholder={t(
                    "student.explore.select_college",
                    "Select College",
                  )}
                  triggerClassName="search-pill"
                  triggerStyle={{
                    width: "auto",
                    minWidth: "180px",
                    margin: 0,
                    paddingInlineStart: "24px",
                    paddingInlineEnd: "44px",
                    textAlign: "start",
                  }}
                />
              </div>
            )}
          </div>

          <div className="header-right">
            {!isSettingsPage && (
              <div className="mobile-only-menu">
                <ThreeDotMenu
                  options={mobileMenuOptions}
                  placement="bottom-end"
                />
              </div>
            )}

            <Link
              to="/checkout/cart"
              className="utility-icon-btn desktop-only-icon"
              style={{ position: "relative" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                ></path>
              </svg>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            <div className="profile-wrapper desktop-only-icon">
              <button className="utility-icon-btn">
                {notifications && notifications.length > 0 ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 14h14a1 1 0 0 0 .707-1.707L19 11.586V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 4 0h-4z" />
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
                        color: "var(--color-accent, #f97316)",
                        fontSize: "1.05rem",
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

            {!isSettingsPage && (
              <div className="profile-wrapper desktop-only-icon">
                <div
                  className="avatar-btn"
                  data-tooltip={t("student.nav.account", "Account")}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user?.name || "Profile"} />
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                      ></path>
                    </svg>
                  )}
                </div>
              </div>
            )}
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
                <button
                  className={`topnav-mobile-link ${activeTab === "explore" ? "active" : ""}`}
                  onClick={() => {
                    navigate("/student/explore");
                    setMobileNavOpen(false);
                  }}
                >
                  {t("student.nav.explore", "Explore")}
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



