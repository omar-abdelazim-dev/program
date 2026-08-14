import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import { createPortal } from "react-dom";
import SegmentedControl from "./common/SegmentedControl";
import { useTranslation } from "react-i18next";

// Generic custom dropdown component to match the system's dark theme
const CustomDropdown = ({
  value,
  options,
  onChange,
  disabled,
  width = "100%",
  inline = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);

      const updatePosition = () => {
        if (dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect();
          setDropdownPos({
            top: rect.bottom + 8 + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width }}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          height: inline ? "auto" : "42px",
          padding: inline ? "8px 12px" : "0 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: inline ? "transparent" : "var(--bg-main)",
          border: isOpen && !inline ? "1px solid #f97316" : "none",
          borderRadius: inline ? "0" : "50px",
          boxShadow: inline ? "none" : (isOpen
            ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
            : "var(--inner-shadow)"),
          color: "var(--c-light)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontSize: "0.9rem",
          fontWeight: inline ? "500" : "normal",
        }}
      >
        <span>{value.charAt(0).toUpperCase() + value.slice(1)}</span>
        <span
          style={{
            fontSize: "0.8rem",
            color: isOpen ? "#f97316" : "var(--c-sub)",
            transition: "transform 0.2s, color 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              background: "var(--bg-surface)",
              border: "none",
              borderRadius: "12px",
              padding: "8px",
              zIndex: 999999,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1), var(--outer-shadow)",
            }}
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: "10px 8px",
                  background:
                    value.toLowerCase() === opt.toLowerCase()
                      ? "var(--bg-main)"
                      : "transparent",
                  boxShadow:
                    value.toLowerCase() === opt.toLowerCase()
                      ? "var(--inner-shadow)"
                      : "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: "50px",
                  fontSize: "0.95rem",
                  transition: "all 0.2s ease",
                  color:
                    value.toLowerCase() === opt.toLowerCase()
                      ? "#f97316"
                      : "var(--c-sub)",
                  fontWeight:
                    value.toLowerCase() === opt.toLowerCase() ? "600" : "400",
                }}
                onMouseEnter={(e) => {
                  if (value.toLowerCase() !== opt.toLowerCase()) {
                    e.target.style.background = "var(--bg-main)";
                    e.target.style.boxShadow = "none";
                    e.target.style.color = "var(--c-light)";
                    e.target.style.WebkitTextFillColor = "var(--c-light)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (value.toLowerCase() !== opt.toLowerCase()) {
                    e.target.style.background = "transparent";
                    e.target.style.boxShadow = "none";
                    e.target.style.color = "var(--c-sub)";
                    e.target.style.WebkitTextFillColor = "var(--c-sub)";
                  }
                }}
              >
                {opt}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default function AdminUserManagementTab({
  users = [],
  searchQuery,
  setSearchQuery,
  fetchUsers,
  currentUser,
}) {
  const { t } = useTranslation();
  const [activeRole, setActiveRole] = useState("student");
  const [accountStatus, setAccountStatus] = useState("All Statuses");
  const [verification, setVerification] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sidePanelUserId, setSidePanelUserId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Instructor discipline (spec §10) — a map of instructorId -> { count, latestStage }
  // for the small violation badge next to an instructor's role pill.
  const [violationSummary, setViolationSummary] = useState({});
  useEffect(() => {
    if (activeRole !== 'instructor') return;
    api.get('/admin/instructor-violations/summary')
      .then(({ data }) => {
        const map = {};
        (data.summary || []).forEach((s) => { map[s.instructorId] = s; });
        setViolationSummary(map);
      })
      .catch(() => {}); // non-critical — badge just won't show
  }, [activeRole]);

  // Derived state
  const visibleUsers = users.filter((u) => {
    // Role filter
    if (u.role !== activeRole) return false;

    // Status filter
    if (accountStatus === "Active" && (u.isBlocked || u.isDeleted))
      return false;
    if (accountStatus === "Suspended" && (!u.isBlocked || u.isDeleted))
      return false;
    if (accountStatus === "Deleted" && !u.isDeleted) return false;

    // Verification filter
    if (verification === "Verified" && !u.isVerified) return false;
    if (verification === "Unverified" && u.isVerified) return false;

    return true;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeRole, accountStatus, verification]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = visibleUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visibleUsers.length / itemsPerPage);

  const sidePanelUser = users.find((u) => u._id === sidePanelUserId);

  const clearFilters = () => {
    setAccountStatus("All Statuses");
    setVerification("All");
    setSearchQuery("");
  };

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(visibleUsers.map((u) => u._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Bulk Actions
  const handleBulkAction = async (actionType) => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to ${actionType} ${selectedIds.size} user(s)?`,
      )
    )
      return;

    setIsProcessing(true);
    let successCount = 0;

    try {
      for (const id of selectedIds) {
        try {
          if (actionType === "activate") {
            const u = users.find((user) => user._id === id);
            if (u?.isDeleted) await api.patch(`/admin/users/${id}/restore`);
            if (u?.isBlocked) await api.patch(`/admin/users/${id}/block`); // block toggles
          } else if (actionType === "suspend") {
            const u = users.find((user) => user._id === id);
            if (!u?.isBlocked) await api.patch(`/admin/users/${id}/block`);
          } else if (actionType === "delete") {
            const u = users.find((user) => user._id === id);
            if (!u?.isDeleted)
              await api.delete(`/admin/users/${id}/soft-delete`);
          }
          successCount++;
        } catch (e) {
          console.error(`Failed to ${actionType} user ${id}`, e);
        }
      }

      if (successCount > 0) {
        notyf.success(`Successfully ${actionType}d ${successCount} user(s)`);
        setSelectedIds(new Set());
        fetchUsers(
          searchQuery,
          accountStatus === "Deleted" || accountStatus === "All Statuses",
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Side panel actions
  const handleToggleBlock = async (user) => {
    setIsProcessing(true);
    try {
      await api.patch(`/admin/users/${user._id}/block`);
      notyf.success(
        `User ${user.isBlocked ? "unblocked" : "blocked"} successfully`,
      );
      fetchUsers(searchQuery, true);
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to toggle block");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleDelete = async (user) => {
    if (
      !user.isDeleted &&
      !window.confirm("Are you sure you want to soft delete this user?")
    )
      return;

    setIsProcessing(true);
    try {
      if (user.isDeleted) {
        await api.patch(`/admin/users/${user._id}/restore`);
        notyf.success("User restored successfully");
      } else {
        await api.delete(`/admin/users/${user._id}/soft-delete`);
        notyf.success("User deleted successfully");
      }
      fetchUsers(searchQuery, true);
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to modify user");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleProgramInstructor = async (user) => {
    setIsProcessing(true);
    try {
      const res = await api.patch(
        `/admin/users/${user._id}/program-instructor`,
      );
      notyf.success(res.data.message || "Toggled program instructor status");
      fetchUsers(searchQuery, true);
    } catch (err) {
      notyf.error(
        err.response?.data?.message || "Failed to toggle program instructor",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (user, newRole) => {
    setIsProcessing(true);
    try {
      await api.patch(`/admin/users/${user._id}/role`, { role: newRole });
      notyf.success(`Role changed to ${newRole}`);
      fetchUsers(searchQuery, true);
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to change role");
    } finally {
      setIsProcessing(false);
    }
  };

  const canModifyRole = (u) => {
    if (!u) return false;
    if (u._id === currentUser.id) return false;
    if (u.role === "superadmin") return false;
    if (u.role === "admin" && currentUser.role !== "superadmin") return false;
    return true;
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      className="animate-entrance"
    >
      {/* Header and Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.8rem",
              margin: "0 0 8px 0",
              color: "var(--text-h)",
            }}
          >
            {t("admin.user_management", "User Management")}
          </h2>
          <div style={{ fontSize: "0.95rem", color: "var(--c-sub)" }}>
            {t(
              "admin.manage_accounts_roles",
              "Manage platform accounts, roles, and statuses.",
            )}
          </div>
        </div>
      </div>

      {/* Role Tabs and Search Pill Row */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "20px" 
      }}>
        {/* Role Tabs (Segmented Control) */}
        <SegmentedControl
          tabs={[
            { id: "student", label: t("admin.students", "Students") },
            { id: "instructor", label: t("admin.instructors", "Instructors") },
            { id: "admin", label: t("admin.admins", "Admins") },
            ...(currentUser?.role === "superadmin"
              ? [{ id: "superadmin", label: t("admin.superadmins", "Super Admins") }]
              : []),
          ]}
          activeTab={activeRole}
          onChange={(id) => {
            setActiveRole(id);
            setSelectedIds(new Set());
          }}
          style={{ marginBottom: "0px" }}
        />

        <div 
          style={{ 
            display: "flex", 
            alignItems: "center",
            background: "var(--bg-surface)",
            borderRadius: "99px",
            boxShadow: isSearchFocused 
              ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
              : "var(--outer-shadow)",
            padding: "4px 8px 4px 16px",
            transition: "all 0.3s ease",
            border: isSearchFocused ? "1px solid #f97316" : "1px solid transparent",
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
            placeholder={t("admin.search_placeholder", "Search...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "8px 12px",
              color: "var(--c-light)",
              width: "180px",
              fontSize: "0.95rem"
            }}
          />

          <div style={{ width: "1px", height: "22px", background: "rgba(255, 255, 255, 0.1)", margin: "0 4px" }} />

          <div style={{ width: "135px", position: "relative" }}>
            <CustomDropdown
              value={accountStatus}
              options={["All Statuses", "Active", "Suspended", "Deleted"]}
              onChange={setAccountStatus}
              inline={true}
            />
          </div>

          <div style={{ width: "1px", height: "22px", background: "rgba(255, 255, 255, 0.1)", margin: "0 4px" }} />

          <div style={{ width: "110px", position: "relative" }}>
            <CustomDropdown
              value={verification}
              options={["All", "Verified", "Unverified"]}
              onChange={setVerification}
              inline={true}
            />
          </div>
        </div>
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "none",
            boxShadow: "var(--outer-shadow)",
            borderRadius: "12px",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ fontWeight: "600", color: "var(--text-h)" }}>
            {t("admin.selected_count", "{{count}} users selected", {
              count: selectedIds.size,
            })}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => handleBulkAction("activate")}
              disabled={isProcessing}
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "none",
                boxShadow: "var(--inner-shadow)",
                color: "#10b981",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "rgba(16,185,129,0.2)")
              }
              onMouseLeave={(e) =>
                (e.target.style.background = "rgba(16,185,129,0.1)")
              }
            >
              {t("admin.activate", "Activate")}
            </button>
            <button
              onClick={() => handleBulkAction("suspend")}
              disabled={isProcessing}
              style={{
                background: "rgba(249,115,22,0.1)",
                border: "none",
                boxShadow: "var(--inner-shadow)",
                color: "#f97316",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "rgba(249,115,22,0.2)")
              }
              onMouseLeave={(e) =>
                (e.target.style.background = "rgba(249,115,22,0.1)")
              }
            >
              {t("admin.suspend", "Suspend")}
            </button>
            <button
              onClick={() => notyf.success("Exporting CSV...")}
              style={{
                background: "var(--bg-surface)",
                border: "none",
                boxShadow: "var(--inner-shadow)",
                color: "var(--text-h)",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "var(--c-bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.target.style.background = "var(--bg-surface)")
              }
            >
              {t("admin.export_csv", "Export CSV")}
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={isProcessing}
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "none",
                boxShadow: "var(--inner-shadow)",
                color: "#ef4444",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "rgba(239,68,68,0.2)")
              }
              onMouseLeave={(e) =>
                (e.target.style.background = "rgba(239,68,68,0.1)")
              }
            >
              {t("admin.delete", "Delete")}
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div
        className="glass-card"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--outer-shadow)",
          border: "none",
          borderRadius: "12px",
          overflow: "hidden",
          marginTop: selectedIds.size > 0 ? "0px" : "4px",
          width: "100%",
        }}
      >
        <table
          className="admin-table"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 4px",
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              <th style={{ width: "50px", padding: "16px 24px" }}>
                <input
                  type="checkbox"
                  checked={
                    visibleUsers.length > 0 &&
                    selectedIds.size === visibleUsers.length
                  }
                  onChange={handleSelectAll}
                  style={{
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                    accentColor: "#4f46e5",
                  }}
                />
              </th>
              <th
                style={{
                  padding: "16px",
                  fontWeight: "600",
                  color: "var(--c-sub)",
                  fontSize: "0.85rem",
                }}
              >
                {t("admin.name", "User")}
              </th>
              <th
                style={{
                  padding: "16px",
                  fontWeight: "600",
                  color: "var(--c-sub)",
                  fontSize: "0.85rem",
                }}
              >
                {t("admin.role", "Role")}
              </th>
              <th
                style={{
                  padding: "16px",
                  fontWeight: "600",
                  color: "var(--c-sub)",
                  fontSize: "0.85rem",
                }}
              >
                {t("common.status", "Status")}
              </th>
              <th
                style={{
                  padding: "16px",
                  fontWeight: "600",
                  color: "var(--c-sub)",
                  fontSize: "0.85rem",
                }}
              >
                {t("admin.registered", "Registered")}
              </th>
              <th
                style={{
                  padding: "16px 24px",
                  fontWeight: "600",
                  color: "var(--c-sub)",
                  fontSize: "0.85rem",
                  textAlign: "right",
                }}
              >
                {t("admin.action", "Action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--c-sub)",
                  }}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              currentUsers.map((u) => (
                <tr
                  key={u._id}
                  className={selectedIds.has(u._id) ? "selected" : ""}
                >
                  <td style={{ padding: "16px 24px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u._id)}
                      onChange={() => handleSelectOne(u._id)}
                      style={{
                        cursor: "pointer",
                        width: "16px",
                        height: "16px",
                        accentColor: "#4f46e5",
                      }}
                    />
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "var(--bg-main)",
                          color: "var(--c-light)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                          flexShrink: 0,
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "var(--text-h)",
                            fontSize: "0.95rem",
                          }}
                        >
                          {u.name}
                        </div>
                        <div
                          style={{ color: "var(--c-sub)", fontSize: "0.8rem" }}
                        >
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        background: "var(--bg-surface)",
                        border: "none",
                        boxShadow: "var(--inner-shadow)",
                        color: "var(--text-h)",
                        padding: "4px 10px",
                        borderRadius: "99px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginRight: u.isProgramInstructor ? "8px" : "0",
                      }}
                    >
                      {u.role}
                    </span>
                    {u.role === "instructor" && violationSummary[u._id] && (
                      <span
                        title="Abandoned Ongoing Course violations"
                        style={{
                          background: violationSummary[u._id].latestStage === "final_warning" ? "rgba(239, 68, 68, 0.15)" : violationSummary[u._id].latestStage === "admin_review" ? "rgba(245, 158, 11, 0.15)" : "rgba(148, 163, 184, 0.15)",
                          color: violationSummary[u._id].latestStage === "final_warning" ? "#ef4444" : violationSummary[u._id].latestStage === "admin_review" ? "#f59e0b" : "var(--text-h)",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: "99px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          marginRight: "8px",
                        }}
                      >
                        ⚠ {violationSummary[u._id].count}
                      </span>
                    )}
                    {u.role === "instructor" && u.isProgramInstructor && (
                      <span
                        style={{
                          background: "var(--bg-surface)",
                          border: "none",
                          boxShadow: "var(--inner-shadow)",
                          padding: "4px 10px",
                          borderRadius: "99px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        <span
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, #f97316, #fbad41)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          Program
                        </span>
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    {u.isDeleted ? (
                      <span
                        style={{
                          color: "var(--c-sub)",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          letterSpacing: "0.5px",
                          background: "var(--bg-surface)",
                          border: "none",
                          boxShadow: "var(--inner-shadow)",
                          padding: "4px 10px",
                          borderRadius: "99px",
                        }}
                      >
                        DELETED
                      </span>
                    ) : u.isBlocked ? (
                      <span
                        style={{
                          color: "#f87171",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          letterSpacing: "0.5px",
                          background: "rgba(239,68,68,0.15)",
                          border: "none",
                          boxShadow: "var(--inner-shadow)",
                          padding: "4px 10px",
                          borderRadius: "99px",
                        }}
                      >
                        SUSPENDED
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#34d399",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          letterSpacing: "0.5px",
                          background: "rgba(16,185,129,0.15)",
                          border: "none",
                          boxShadow: "var(--inner-shadow)",
                          padding: "4px 10px",
                          borderRadius: "99px",
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      color: "var(--c-sub)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {new Date(u.createdAt || Date.now()).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <button
                      onClick={() => setSidePanelUserId(u._id)}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.8rem",
                        width: "fit-content",
                        marginLeft: "auto",
                        display: "block",
                        whiteSpace: "nowrap",
                        background: "var(--bg-main)",
                        color: "var(--c-sub)",
                        border: "none",
                        borderRadius: "999px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: "var(--inner-shadow)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--c-bg-hover)";
                        e.currentTarget.style.color = "var(--text-h)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg-main)";
                        e.currentTarget.style.color = "var(--c-sub)";
                      }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "24px",
              paddingRight: "24px",
              borderTop: "1px solid var(--c-border-subtle)",
            }}
          >
            <span style={{ color: "var(--c-sub)", fontSize: "0.9rem" }}>
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, visibleUsers.length)} of{" "}
              {visibleUsers.length} users
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

      {/* Side Panel Overlay */}
      {sidePanelUser &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            {/* Backdrop */}
            <div
              onClick={() => setSidePanelUserId(null)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Panel */}
            <div
              style={{
                position: "relative",
                width: "400px",
                height: "100%",
                background: "var(--bg-surface)",
                borderLeft: "1px solid rgba(255,255,255,0.05)",
                boxShadow: "var(--outer-shadow)",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "32px",
                overflowY: "auto",
                animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <button
                onClick={() => setSidePanelUserId(null)}
                style={{
                  background: "var(--bg-surface)",
                  border: "none",
                  color: "var(--c-sub)",
                  padding: "6px 12px",
                  borderRadius: "99px",
                  width: "fit-content",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  transition: "all 0.2s",
                  boxShadow: "var(--inner-shadow)",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--c-bg-hover)";
                  e.target.style.color = "var(--text-h)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--bg-surface)";
                  e.target.style.color = "var(--c-sub)";
                }}
              >
                ✕ Close
              </button>

              {/* Profile Header */}
              <div
                style={{ display: "flex", gap: "16px", alignItems: "center" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--bg-main)",
                    color: "var(--c-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "1.2rem",
                    flexShrink: 0,
                  }}
                >
                  {sidePanelUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "1.3rem",
                      color: "var(--text-h)",
                    }}
                  >
                    {sidePanelUser.name}
                  </h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span
                      style={{
                        background: "var(--bg-surface)",
                        border: "none",
                        color: "var(--text-h)",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        fontSize: "0.7rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        boxShadow: "var(--inner-shadow)",
                      }}
                    >
                      {sidePanelUser.role}
                    </span>
                    {sidePanelUser.isDeleted ? (
                      <span
                        style={{
                          color: "var(--c-sub)",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          background: "var(--bg-surface)",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          boxShadow: "var(--inner-shadow)",
                        }}
                      >
                        DELETED
                      </span>
                    ) : sidePanelUser.isBlocked ? (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          background: "rgba(239,68,68,0.1)",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          boxShadow: "var(--inner-shadow)",
                        }}
                      >
                        SUSPENDED
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#10b981",
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          background: "rgba(16,185,129,0.1)",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          boxShadow: "var(--inner-shadow)",
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "var(--c-sub)",
                    letterSpacing: "1px",
                    marginBottom: "16px",
                  }}
                >
                  PERSONAL INFORMATION
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Email
                    </div>
                    <div
                      style={{
                        color: "var(--c-light)",
                        fontSize: "0.95rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {sidePanelUser.email}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Phone
                    </div>
                    <div
                      style={{ color: "var(--c-light)", fontSize: "0.95rem" }}
                    >
                      {sidePanelUser.phone || "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      University
                    </div>
                    <div
                      style={{ color: "var(--c-light)", fontSize: "0.95rem" }}
                    >
                      {sidePanelUser.university || "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Student ID
                    </div>
                    <div
                      style={{ color: "var(--c-light)", fontSize: "0.95rem" }}
                    >
                      {sidePanelUser.studentId || "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      College
                    </div>
                    <div
                      style={{ color: "var(--c-light)", fontSize: "0.95rem" }}
                    >
                      {sidePanelUser.college || "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Major
                    </div>
                    <div
                      style={{ color: "var(--c-light)", fontSize: "0.95rem" }}
                    >
                      {sidePanelUser.major || "—"}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Bio / Goals
                    </div>
                    <div
                      style={{
                        color: "var(--c-light)",
                        fontSize: "0.9rem",
                        background: "var(--bg-main)",
                        padding: "12px",
                        borderRadius: "50px",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                        maxHeight: "120px",
                        overflowY: "auto",
                        boxShadow: "var(--inner-shadow)",
                      }}
                    >
                      {sidePanelUser.goalsText || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "var(--c-sub)",
                    letterSpacing: "1px",
                    marginBottom: "16px",
                  }}
                >
                  ACCOUNT INFORMATION
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Registration Date
                    </div>
                    <div
                      style={{
                        color: "var(--c-light)",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      {new Date(
                        sidePanelUser.createdAt || Date.now(),
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Last Login
                    </div>
                    <div
                      style={{
                        color: "var(--c-light)",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      {sidePanelUser.lastLogin
                        ? new Date(sidePanelUser.lastLogin).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--c-sub)",
                        fontSize: "0.8rem",
                        marginBottom: "4px",
                      }}
                    >
                      Email Verified
                    </div>
                    <div
                      style={{
                        color: sidePanelUser.isVerified
                          ? "#10b981"
                          : "#ef4444",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      {sidePanelUser.isVerified ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: "24px" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    color: "var(--c-sub)",
                    letterSpacing: "1px",
                    marginBottom: "16px",
                  }}
                >
                  ACTIONS
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <CustomDropdown
                    value={sidePanelUser.role}
                    options={["Student", "Instructor", "Admin"]}
                    onChange={(newRole) =>
                      handleRoleChange(sidePanelUser, newRole.toLowerCase())
                    }
                    disabled={isProcessing || !canModifyRole(sidePanelUser)}
                  />

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => handleToggleBlock(sidePanelUser)}
                      disabled={isProcessing || !canModifyRole(sidePanelUser)}
                      style={{
                        flex: 1,
                        background: "rgba(249,115,22,0.1)",
                        border: "none",
                        boxShadow: "var(--inner-shadow)",
                        color: "#f97316",
                        padding: "12px",
                        borderRadius: "10px",
                        cursor:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "0.9rem",
                        opacity:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? 0.5
                            : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background = "rgba(249,115,22,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background = "rgba(249,115,22,0.1)";
                      }}
                    >
                      {sidePanelUser.isBlocked
                        ? "Unsuspend Account"
                        : "Suspend Account"}
                    </button>

                    <button
                      onClick={() => handleToggleDelete(sidePanelUser)}
                      disabled={isProcessing || !canModifyRole(sidePanelUser)}
                      style={{
                        flex: 1,
                        background: "rgba(239,68,68,0.1)",
                        border: "none",
                        boxShadow: "var(--inner-shadow)",
                        color: "#ef4444",
                        padding: "12px",
                        borderRadius: "10px",
                        cursor:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "0.9rem",
                        opacity:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? 0.5
                            : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background = "rgba(239,68,68,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background = "rgba(239,68,68,0.1)";
                      }}
                    >
                      {sidePanelUser.isDeleted
                        ? "Restore Account"
                        : "Soft Delete Account"}
                    </button>
                  </div>
                  {sidePanelUser.role === "instructor" && (
                    <button
                      onClick={() =>
                        handleToggleProgramInstructor(sidePanelUser)
                      }
                      disabled={isProcessing || !canModifyRole(sidePanelUser)}
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        background: sidePanelUser.isProgramInstructor
                          ? "rgba(239, 68, 68, 0.1)"
                          : "rgba(16, 185, 129, 0.1)",
                        border: "none",
                        boxShadow: "var(--inner-shadow)",
                        color: sidePanelUser.isProgramInstructor
                          ? "#ef4444"
                          : "#10B981",
                        padding: "12px",
                        borderRadius: "10px",
                        cursor:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        opacity:
                          isProcessing || !canModifyRole(sidePanelUser)
                            ? 0.5
                            : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background =
                            sidePanelUser.isProgramInstructor
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(16, 185, 129, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isProcessing && canModifyRole(sidePanelUser))
                          e.target.style.background =
                            sidePanelUser.isProgramInstructor
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(16, 185, 129, 0.1)";
                      }}
                    >
                      {sidePanelUser.isProgramInstructor
                        ? "Remove Program Badge"
                        : "Grant Program Badge"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <style>{`
        .animate-entrance {
          animation: fadeSlideUp 0.4s ease-out forwards;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
