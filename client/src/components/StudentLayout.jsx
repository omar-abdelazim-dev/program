import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoDark from "../assets/logo-dark.png";
import logoLight from "../assets/logo-light.png";
import studentLogo from "../assets/logo.png";
import Footer from "./Footer";
import "../styles/student-layout.css";
import "../styles/static-pages.css";

// The Course model's category field is freeform text; these are the only
// values actually in use in the database today (see Course.category).
const COURSE_CATEGORIES = ["Business", "Data", "Design", "Development"];

export default function StudentLayout({
  user,
  children,
  toggleTheme,
  isLightMode,
  onLogout,
  cartCount,
  notifications,
  searchQuery,
  onSearchChange,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab from pathname
  let activeTab = "explore";
  if (location.pathname.includes("/my-courses")) activeTab = "my-courses";
  if (location.pathname.includes("/dashboard")) activeTab = "dashboard";
  if (location.pathname.includes("/settings")) activeTab = "settings";

  return (
    <div className="student-layout-wrapper">
      {/* SIDEBAR */}
      <aside className="student-sidebar">
        <div className="sidebar-logo">
          <Link
            to="/student"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <img
              src={studentLogo}
              alt="Student Logo"
              style={{
                marginTop: "10px",
                width: "100%",
                scale:'1.5',
                marginBottom: "0",
                objectFit: "contain",
                display: "block",
                transform: "scale(1.2)",
              }}
            />
          </Link>
        </div>

        <nav className="sidebar-nav-top">
          <button
            className={`sidebar-icon-btn ${activeTab === "explore" ? "active" : ""}`}
            onClick={() => navigate("/student")}
            title="Explore"
          >
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {user?.role === "student" && (
            <>
              <button
                className={`sidebar-icon-btn ${activeTab === "my-courses" ? "active" : ""}`}
                onClick={() => navigate("/student/my-courses")}
                title="My Courses"
              >
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </button>

              <button
                className={`sidebar-icon-btn ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => navigate("/student/dashboard")}
                title="Dashboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>

              <div className="courses-nav-wrapper">
                <button
                  className={`sidebar-icon-btn ${activeTab === "explore" && location.search.includes("category=") ? "active" : ""}`}
                  onClick={() => navigate("/student")}
                  title="Courses"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </button>
                <div className="courses-nav-dropdown">
                  <div className="courses-nav-dropdown-title">Browse by category</div>
                  {COURSE_CATEGORIES.map((cat) => (
                    <Link key={cat} to={`/student?category=${encodeURIComponent(cat)}`} className="courses-nav-dropdown-link">
                      {cat}
                    </Link>
                  ))}
                  <hr className="dropdown-divider" />
                  <Link to="/student" className="courses-nav-dropdown-link">All Courses</Link>
                </div>
              </div>
            </>
          )}
        </nav>

        <nav className="sidebar-nav-bottom">
          <button
            className={`sidebar-icon-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => navigate("/student/settings")}
            title="Settings"
          >
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="student-main-area">
        {/* HEADER */}
        <header className="student-header">
          <div className="header-left">
            <div className="search-pill">
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
              <input
                type="text"
                placeholder="Search courses, lessons, topics..."
                value={searchQuery ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          </div>

          <div className="header-right">
            <button
              className="utility-icon-btn theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  ></path>
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

            <Link
              to="/checkout/cart"
              className="utility-icon-btn"
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

            <div className="profile-wrapper">
              <button className="utility-icon-btn">
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
                {notifications && notifications.length > 0 && (
                  <span className="notification-dot"></span>
                )}
              </button>
            </div>

            <div className="profile-wrapper">
              <div className="avatar-btn">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user?.name || "Profile"} />
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                    ></path>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="student-content-scroll">
          {children}
          <Footer />
        </div>
      </main>
    </div>
  );
}
