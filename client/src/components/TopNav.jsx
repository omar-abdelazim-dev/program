import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TopNav({
  user,
  toggleTheme,
  isLightMode,
  onLogout,
  cartCount,
  notifications,
  setNotifications,
  searchQuery,
  onSearchChange,
}) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
  };

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
        {/* Language Toggle */}
        <button
          className="utility-icon-btn"
          onClick={toggleLanguage}
          aria-label="Toggle language"
          style={{
            fontWeight: '600',
            fontSize: '0.9rem',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {i18n.language === "ar" ? "EN" : "AR"}
        </button>

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
            {notifications && notifications.length > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 005 14h14a1 1 0 00.707-1.707L19 11.586V8a6 6 0 00-6-6zM10 18a2 2 0 044 0h-4z" />
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            )}
            {notifications && notifications.length > 0 && (
              <span className="notification-dot"></span>
            )}
          </button>

          <div className="profile-dropdown" style={{ width: '360px', right: 0, left: 'auto', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--c-border-subtle, rgba(255,255,255,0.08))', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <span style={{ color: 'var(--color-accent, #f97316)', fontSize: '1.05rem' }}>Notifications</span>
                {notifications && notifications.length > 0 && (
                  <button 
                    onClick={() => setNotifications([])}
                    style={{ background: 'none', border: 'none', color: 'var(--c-sub)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear all
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
                  No new notifications
                </div>
              ) : (
                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {notifications
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map((notif, idx) => {
                      const content = (
                        <>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-h)', marginBottom: '4px' }}>
                            {notif.text}
                          </div>
                          {notif.message && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', lineHeight: '1.4', marginBottom: '4px' }}>
                              {notif.message}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--c-sub)', marginTop: '6px', textAlign: 'right', opacity: 0.8 }}>
                            {new Date(notif.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      );

                      const itemStyle = {
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--c-border-subtle, rgba(255,255,255,0.05))',
                        backgroundColor: notif.read ? 'transparent' : 'rgba(249, 115, 22, 0.08)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit'
                      };

                      if (notif.link) {
                        return (
                          <Link 
                            key={notif.id || idx}
                            to={notif.link} 
                            style={itemStyle} 
                            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                          >
                            {content}
                          </Link>
                        );
                      }

                      return (
                        <div 
                          key={notif.id || idx}
                          style={itemStyle}
                        >
                          {content}
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
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
        </div>
      </div>
    </header>
  );
}
