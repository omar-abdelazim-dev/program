import { Link } from "react-router-dom";

export default function TopNav({
  user,
  toggleTheme,
  isLightMode,
  onLogout,
  cartCount,
  notifications,
  searchQuery,
  onSearchChange,
}) {
  // Note: activeTab and setActiveTab props are no longer needed here
  // as the navigation tabs have moved to the Sidebar component.

  return (
    <header className="student-header">
      {/* LEFT: Search Bar */}
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

      {/* RIGHT: Utilities & Profile */}
      <div className="header-right">
        {/* Theme Toggle */}
        <button
          className="utility-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <svg
            className={`theme-toggle-icon ${isLightMode ? "is-active" : ""}`}
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
        </button>

        {/* Cart */}
        <Link to="/checkout/cart" className="utility-icon-btn">
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
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>

        {/* Notifications */}
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
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notifications && notifications.length > 0 && (
              <span className="notification-dot"></span>
            )}
          </button>

          <div className="profile-dropdown" style={{ width: "320px" }}>
            <div className="dropdown-name">Notifications</div>
            <hr className="dropdown-divider" />
            {!notifications || notifications.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                No new notifications
              </div>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {notifications
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((notif, idx) => (
                    <div
                      key={notif.id || idx}
                      style={{
                        padding: "12px 8px",
                        borderBottom:
                          idx !== notifications.length - 1
                            ? "1px solid var(--border-solid)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-primary)",
                          marginBottom: "4px",
                        }}
                      >
                        {notif.text}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          textAlign: "right",
                        }}
                      >
                        {new Date(notif.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* User Profile Avatar */}
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
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
              </svg>
            )}
          </div>
          <div className="profile-dropdown">
            <div className="dropdown-name">{user?.name || "Student"}</div>
            <hr className="dropdown-divider" />

            <Link to="/student/settings" className="dropdown-link">
              Settings
            </Link>

            {user?.role === "instructor" && (
              <Link to="/instructor" className="dropdown-link">
                Instructor Portal
              </Link>
            )}

            {(user?.role === "admin" || user?.role === "superadmin") && (
              <Link to="/admin" className="dropdown-link">
                Admin Portal
              </Link>
            )}

            <hr className="dropdown-divider" />
            <button
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
              className="dropdown-link logout-link"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
