import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import { createPortal } from "react-dom";
import SegmentedControl from "./common/SegmentedControl";
import Spinner from "./Spinner";
import { useTranslation } from 'react-i18next';
import AdminLessonsTab from "./AdminLessonsTab";

// Generic custom dropdown component to match the system's dark theme
const CustomDropdown = ({ value, options, onChange, disabled, width = "100%" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width }}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-main)",
          border: isOpen ? "1px solid #f97316" : "1px solid transparent",
          borderRadius: "10px",
          boxShadow: isOpen 
            ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
            : "var(--inner-shadow)",
          color: "var(--c-light)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          fontSize: "0.95rem"
        }}
      >
        <span>{value}</span>
        <span style={{ fontSize: "0.8rem", color: "var(--c-sub)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </button>
      
      {isOpen && !disabled && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "8px",
          background: "var(--bg-surface)",
          border: "none",
          borderRadius: "12px",
          padding: "8px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden",
          animation: "smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformOrigin: "top"
        }}>
          <div className="custom-select-options" style={{
            padding: 0, paddingRight: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxHeight: "250px",
            overflowY: "auto"
          }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              style={{
                padding: "10px 12px",
                background: value === opt ? "var(--bg-main)" : "transparent",
                boxShadow: value === opt ? "var(--inner-shadow)" : "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "8px",
                fontSize: "0.95rem",
                transition: "all 0.2s ease",
                color: value === opt ? "transparent" : "var(--c-sub)",
                ...(value === opt ? {
                  backgroundImage: "linear-gradient(90deg, #f97316, #fbad41)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "600"
                } : {})
              }}
              onMouseEnter={(e) => {
                if (value !== opt) {
                  e.target.style.background = "var(--bg-main)";
                  e.target.style.boxShadow = "var(--inner-shadow)";
                  e.target.style.color = "var(--c-light)";
                  e.target.style.WebkitTextFillColor = "var(--c-light)";
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt) {
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
          </div>
        </div>
      )}
    </div>
  );
};

export default function AdminCourseManagementTab({ currentUser, onDashboardUpdate }) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("courses");
  
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [showFilters, setShowFilters] = useState(false);

  const [sidePanelCourseId, setSidePanelCourseId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [suspendModal, setSuspendModal] = useState({ isOpen: false, courseId: null, reason: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [stats, setStats] = useState({ totalCourses: 0, pendingCourses: 0, pendingLessonsCount: 0 });

  // Standalone related lessons (spec §11) for the course currently open in the side panel
  const [standaloneLessonsForPanel, setStandaloneLessonsForPanel] = useState([]);
  useEffect(() => {
    if (!sidePanelCourseId) { setStandaloneLessonsForPanel([]); return; }
    let cancelled = false;
    // The public endpoint only returns approved lessons — pull pending ones
    // in separately (admins need to see and act on those too) and merge.
    Promise.all([
      api.get(`/standalone-lessons?relatedCourseId=${sidePanelCourseId}`).then(r => r.data.lessons || []).catch(() => []),
      api.get('/standalone-lessons/pending').then(r => (r.data.lessons || []).filter(l => (l.relatedCourse?._id || l.relatedCourse) === sidePanelCourseId)).catch(() => []),
    ]).then(([approved, pending]) => {
      if (cancelled) return;
      const byId = new Map([...approved, ...pending].map(l => [l._id, l]));
      setStandaloneLessonsForPanel([...byId.values()]);
    });
    return () => { cancelled = true; };
  }, [sidePanelCourseId]);

  const handleApproveStandaloneLesson = async (lessonId) => {
    try {
      await api.patch(`/standalone-lessons/${lessonId}/approve`);
      notyf.success('Standalone lesson approved');
      setStandaloneLessonsForPanel(prev => prev.map(l => l._id === lessonId ? { ...l, status: 'approved' } : l));
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to approve standalone lesson');
    }
  };

  const handleRejectStandaloneLesson = async (lessonId) => {
    try {
      await api.patch(`/standalone-lessons/${lessonId}/reject`, { reason: 'Rejected by admin' });
      notyf.success('Standalone lesson rejected');
      setStandaloneLessonsForPanel(prev => prev.map(l => l._id === lessonId ? { ...l, status: 'rejected' } : l));
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to reject standalone lesson');
    }
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (courses.length === 0) {
          setIsLoading(true);
        }
        // Fetch published courses, pending courses, and admin stats
        const [publishedRes, pendingRes, statsRes] = await Promise.all([
          api.get("/courses").catch(() => ({ data: { courses: [] } })),
          api.get("/courses/pending").catch(() => ({ data: { courses: [] } })),
          api.get("/admin/stats").catch(() => ({ data: {} }))
        ]);
        
        let allCourses = [];
        const approved = publishedRes.data.data || publishedRes.data.courses || [];
        allCourses = [...allCourses, ...approved];
        
        if (pendingRes.data?.courses) {
            const pendingWithStatus = pendingRes.data.courses.map(c => ({ ...c, status: 'pending' }));
            const existingIds = new Set(allCourses.map(c => c._id));
            pendingWithStatus.forEach(c => {
                if (!existingIds.has(c._id)) {
                    allCourses.push(c);
                }
            });
        }
        
        setCourses(allCourses);

        if (statsRes.data) {
          setStats({
            totalCourses: statsRes.data.totalCourses ?? 0,
            pendingCourses: statsRes.data.pendingCourses ?? 0,
            pendingLessonsCount: statsRes.data.pendingLessonsCount ?? statsRes.data.pendingLessons ?? 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
        notyf.error("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const clearFilters = () => {
    setCategoryFilter("All Categories");
    setSearchQuery("");
  };

  // Matches Course.status's real enum (pending/approved/rejected) - no
  // published/draft/archived/hidden states exist in the backend.
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": return { text: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
      case "pending": return { text: "#f5a623", bg: "rgba(245, 166, 35, 0.1)", border: "rgba(245, 166, 35, 0.25)" };
      case "rejected": return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)" };
      case "archived": return { text: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)", border: "rgba(148, 163, 184, 0.25)" };
      default: return { text: "var(--c-sub)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
    }
  };

  const handleApprove = async (id) => {
    try {
        setIsProcessing(true);
        await api.patch(`/courses/${id}/approve`);
        notyf.success('Course approved');
        setCourses(courses.map(c => c._id === id ? { ...c, status: 'approved' } : c));
        if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
        notyf.error('Failed to approve course');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleReject = async (id) => {
    try {
        setIsProcessing(true);
        // Note: original reject required a reason, using a hardcoded string as fallback for now
        await api.patch(`/courses/${id}/reject`, { reason: "Rejected by admin from" });
        notyf.success('Course rejected');
        setCourses(courses.map(c => c._id === id ? { ...c, status: 'rejected' } : c));
        if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
        notyf.error('Failed to reject course');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleApprovePriceChange = async (id) => {
    try {
      setIsProcessing(true);
      const { data } = await api.patch(`/courses/${id}/price-change/approve`);
      notyf.success('Price change approved');
      setCourses(courses.map(c => c._id === id ? { ...c, price: data.course.price, pendingPriceChange: null } : c));
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to approve price change');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPriceChange = async (id) => {
    try {
      setIsProcessing(true);
      await api.patch(`/courses/${id}/price-change/reject`, { reason: 'Rejected by admin' });
      notyf.success('Price change rejected');
      setCourses(courses.map(c => c._id === id ? { ...c, pendingPriceChange: null } : c));
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to reject price change');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async () => {
    const { courseId, reason } = suspendModal;
    if (!reason.trim()) {
        notyf.error('Please provide a reason for suspension');
        return;
    }
    try {
        setIsProcessing(true);
        await api.patch(`/courses/${courseId}/suspend`, { reason });
        notyf.success('Course suspended successfully');
        setCourses(courses.map(c => c._id === courseId ? { ...c, status: 'suspended' } : c));
        setSuspendModal({ isOpen: false, courseId: null, reason: "" });
        if (sidePanelCourseId === courseId) {
            setSidePanelCourseId(null);
        }
        if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
        notyf.error('Failed to suspend course');
    } finally {
        setIsProcessing(false);
    }
  };

  // Filtering
  let visibleCourses = courses.filter(c => {
    // Basic search: title, ID, category
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = c.title?.toLowerCase().includes(q);
      const matchesId = c._id?.toLowerCase().includes(q);
      const matchesCategory = c.category?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesId && !matchesCategory) return false;
    }
    
    // Status Filter
    if (activeStatus !== "all" && c.status?.toLowerCase() !== activeStatus) return false;

    // Category Filter
    if (categoryFilter !== "All Categories" && c.category !== categoryFilter) return false;

    return true;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeStatus, categoryFilter]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCourses = visibleCourses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visibleCourses.length / itemsPerPage);

  // Calculate metrics (matches Course.status's real enum)
  const totalCourses = courses.length;
  const approvedCourses = courses.filter(c => c.status === "approved").length;
  const pendingCourses = courses.filter(c => c.status === "pending").length;

  const sidePanelCourse = courses.find(c => c._id === sidePanelCourseId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-entrance">
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.8rem", margin: "0 0 8px 0", color: "var(--text-h)" }}>{t('admin.course_management', 'Course Management')}</h2>
        <div style={{ fontSize: "0.95rem", color: "var(--c-sub)", marginBottom: "24px" }}>{t('admin.manage_courses_desc', 'Manage, review, and organize platform courses.')}</div>
      </div>

      {/* Metrics Stat Cards (Preserved for both Courses and Lessons tabs) */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "16px" }}>
          {/* KPI Cards (Total Courses, Pending Courses, Pending Lessons) */}
          <div className="glass-card stat-card overview-stat-purple" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Courses</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{stats.totalCourses || totalCourses}</div>
          </div>
          <div className="glass-card stat-card overview-stat-orange" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Courses</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{stats.pendingCourses !== undefined ? stats.pendingCourses : pendingCourses}</div>
          </div>
          <div className="glass-card stat-card overview-stat-green" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Lessons</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{stats.pendingLessonsCount ?? stats.pendingLessons ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Courses / Lessons Top Tab Bar */}
      <SegmentedControl
        tabs={[
          { id: "courses", label: "Courses" },
          { id: "lessons", label: "Lessons" }
        ]}
        activeTab={activeSubTab}
        onChange={setActiveSubTab}
        style={{ marginBottom: "0px" }}
      />

      <div style={{ display: activeSubTab === "courses" ? "flex" : "none", flexDirection: "column", gap: "24px" }}>
          {/* Controls Row: Status Bar on LEFT, Search & Filter on RIGHT */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            {/* Left: Status Bar */}
            <SegmentedControl
              tabs={[
                { id: "all", label: "All Courses" },
                { id: "approved", label: "Approved" },
                { id: "pending", label: "Pending Review" }
              ]}
              activeTab={activeStatus}
              onChange={setActiveStatus}
            />

            {/* Merged Search & Filters Control Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-surface)",
                borderRadius: "99px",
                boxShadow: isSearchFocused || showFilters
                  ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
                  : "var(--outer-shadow)",
                border: isSearchFocused || showFilters
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
                placeholder={t('admin.search_courses', 'Search courses...')}
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

              {/* Divider */}
              <div style={{ width: "1px", height: "22px", background: "rgba(255, 255, 255, 0.1)", margin: "0 4px" }} />

              {/* Category Dropdown Trigger */}
              <div
                style={{ position: "relative" }}
                tabIndex={0}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setShowFilters(false);
                  }
                }}
              >
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--c-light)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    fontWeight: "500",
                  }}
                >
                  {categoryFilter}
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: showFilters ? "#f97316" : "var(--c-sub)",
                      transition: "transform 0.2s, color 0.2s",
                      transform: showFilters ? "rotate(180deg)" : "rotate(0)",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {showFilters && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 12px)",
                      right: 0,
                      width: "200px",
                      background: "var(--bg-surface)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1), var(--outer-shadow)",
                      padding: "8px",
                      zIndex: 999,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {["All Categories", "Development", "Business", "Design", "Data", "Computer Science"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategoryFilter(cat);
                          setShowFilters(false);
                        }}
                        style={{
                          padding: "10px 12px",
                          background: categoryFilter === cat ? "var(--bg-main)" : "transparent",
                          boxShadow: categoryFilter === cat ? "var(--inner-shadow)" : "none",
                          border: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          borderRadius: "50px",
                          fontSize: "0.95rem",
                          transition: "all 0.2s ease",
                          color: categoryFilter === cat ? "transparent" : "var(--c-sub)",
                          ...(categoryFilter === cat
                            ? {
                                backgroundImage: "linear-gradient(90deg, #f97316, #fbad41)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                fontWeight: "600",
                              }
                            : {}),
                        }}
                        onMouseEnter={(e) => {
                          if (categoryFilter !== cat) {
                            e.target.style.background = "var(--bg-main)";
                            e.target.style.boxShadow = "var(--inner-shadow)";
                            e.target.style.color = "var(--c-light)";
                            e.target.style.WebkitTextFillColor = "var(--c-light)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (categoryFilter !== cat) {
                            e.target.style.background = "transparent";
                            e.target.style.boxShadow = "none";
                            e.target.style.color = "var(--c-sub)";
                            e.target.style.WebkitTextFillColor = "var(--c-sub)";
                          }
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* Data Table */}
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
        <div className="table-responsive" style={{ overflowX: "auto", margin: "-24px", padding: "24px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ padding: "16px 24px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", whiteSpace: "nowrap" }}>COURSE</th>
                <th style={{ padding: "16px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>CATEGORY</th>
                <th style={{ padding: "16px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>PRICE</th>
                <th style={{ padding: "16px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>STATUS</th>
                <th style={{ padding: "16px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>TYPE</th>
                <th style={{ padding: "16px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>LAST UPDATED</th>
                <th style={{ padding: "16px 24px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "right", whiteSpace: "nowrap" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                  <tr>
                      <td colSpan="7" style={{ padding: "40px", textAlign: "center" }}>
                          <Spinner size="small" label="Loading courses..." />
                      </td>
                  </tr>
              ) : currentCourses.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
                    No courses found matching criteria.
                  </td>
                </tr>
              ) : (
                currentCourses.map(c => (
                  <tr key={c._id} className="hover-row" style={{ borderBottom: "1px solid var(--c-border-subtle)", transition: "background 0.2s", cursor: "pointer" }} onClick={() => setSidePanelCourseId(c._id)}>
                    <td style={{ padding: "16px 24px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Thumbnail Placeholder if no real image */}
                        {c.thumbnailUrl ? (
                            <img src={c.thumbnailUrl} alt="Thumbnail" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
                        ) : (
                            <div style={{ 
                              width: "40px", height: "40px", borderRadius: "8px", 
                              background: "var(--bg-main) !important", boxShadow: "var(--inner-shadow) !important", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-sub)"
                            }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                        )}
                        <div>
                          <div style={{ fontWeight: "600", color: "var(--text-h)", fontSize: "0.95rem" }}>{c.title}</div>
                          <div style={{ color: "var(--c-sub)", fontSize: "0.85rem", marginTop: "4px" }}>{c.instructor?.name || "Unknown Instructor"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px", color: "var(--c-sub)", fontSize: "0.9rem", textAlign: "center", verticalAlign: "middle" }}>{c.category}</td>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontSize: "0.9rem", textAlign: "center", verticalAlign: "middle" }}>{c.price ? `${c.price} EGP` : "0 EGP"}</td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                      {(() => {
                        const style = getStatusColor(c.status);
                        const statusLabel = c.status ? (c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase()) : "Draft";
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
                                background: "currentColor",
                              }}
                            />
                            {statusLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "16px", color: "var(--c-sub)", fontSize: "0.85rem", textAlign: "center", verticalAlign: "middle" }}>
                      {c.courseType ? (c.courseType === "full" ? "Full" : "Ongoing") : "—"}
                      {c.courseType === "ongoing" && c.status === "draft" && c.draftStartedAt && (
                        <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "2px" }}>
                          {Math.max(0, 90 - Math.floor((Date.now() - new Date(c.draftStartedAt).getTime()) / (24 * 60 * 60 * 1000)))}d to archive
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px", color: "var(--c-sub)", fontSize: "0.9rem", textAlign: "center", verticalAlign: "middle" }}>
                      {new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", verticalAlign: "middle" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSidePanelCourseId(c._id); }}
                        style={{ 
                          background: "rgba(255,255,255,0.03)", border: "none",
                          boxShadow: "var(--inner-shadow)",
                          color: "var(--c-light)", padding: "6px 14px", borderRadius: "8px",
                          fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s"
                        }}
                        onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.08)"}
                        onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.03)"}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, visibleCourses.length)} of{" "}
              {visibleCourses.length} courses
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
      {sidePanelCourse && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
          <div 
            onClick={() => setSidePanelCourseId(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          <div style={{ 
            position: "relative", width: "450px", height: "100%", 
            background: "var(--bg-surface)", borderLeft: "1px solid rgba(255,255,255,0.05)",
            boxShadow: "var(--outer-shadow)", padding: "24px", display: "flex", flexDirection: "column", gap: "24px",
            overflowY: "auto", animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <button 
              onClick={() => setSidePanelCourseId(null)}
              style={{
                background: "rgba(255,255,255,0.05)", border: "none", color: "var(--c-sub)",
                boxShadow: "var(--inner-shadow)",
                padding: "6px 12px", borderRadius: "99px", width: "fit-content",
                display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "var(--c-light)"; }}
              onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "var(--c-sub)"; }}
            >
              ✕ Close
            </button>

            {/* Course Header & Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                {sidePanelCourse.thumbnailUrl ? (
                    <img src={sidePanelCourse.thumbnailUrl} alt="Cover" style={{ width: "120px", height: "80px", objectFit: "cover", borderRadius: "12px", flexShrink: 0 }} />
                ) : (
                    <div style={{ width: "120px", height: "80px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h3 style={{ margin: "0", fontSize: "1.2rem", color: "var(--text-h)", lineHeight: "1.2" }}>{sidePanelCourse.title}</h3>
                  <span style={{ 
                    width: "fit-content",
                    background: getStatusColor(sidePanelCourse.status).bg, border: "none",
                    color: getStatusColor(sidePanelCourse.status).text, padding: "2px 8px", borderRadius: "99px",
                    boxShadow: "var(--inner-shadow)",
                    fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase"
                  }}>
                    {sidePanelCourse.status}
                  </span>
                  {sidePanelCourse.rejectionReason && (
                    <span style={{ color: "var(--c-sub)", fontSize: "0.8rem", marginTop: "-4px" }}>
                      <strong>Reason:</strong> {sidePanelCourse.rejectionReason}
                    </span>
                  )}
                  <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>
                    Created by {sidePanelCourse.instructor?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              <p style={{ color: "var(--c-sub)", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>
                  {sidePanelCourse.description}
              </p>
            </div>

            {/* Course Info */}
            <div style={{ background: "var(--bg-main)", border: "none", boxShadow: "var(--inner-shadow)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "12px" }}>DETAILS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Category</span>
                  <span style={{ color: "var(--c-light)" }}>{t(`categories.${sidePanelCourse.category.replace(/\s+/g, '_').toLowerCase()}`, sidePanelCourse.category)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Difficulty</span>
                  <span style={{ color: "var(--c-light)" }}>{sidePanelCourse.difficulty || "All Levels"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Price</span>
                  <span style={{ color: "var(--c-light)" }}>{sidePanelCourse.price ? `${sidePanelCourse.price} EGP` : "0 EGP"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Created On</span>
                  <span style={{ color: "var(--c-light)" }}>{new Date(sidePanelCourse.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Pending Price-Change Request (spec §5) */}
            {sidePanelCourse.pendingPriceChange?.status === "pending" && (
              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "none", boxShadow: "var(--inner-shadow)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#f59e0b", letterSpacing: "1px", marginBottom: "12px" }}>PENDING PRICE CHANGE</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "12px" }}>
                  <span style={{ color: "var(--c-sub)" }}>Current Price: {sidePanelCourse.price} EGP</span>
                  <span style={{ color: "var(--c-light)", fontWeight: "600" }}>Requested: {sidePanelCourse.pendingPriceChange.requestedPrice} EGP</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleApprovePriceChange(sidePanelCourse._id)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", fontWeight: "600", cursor: "pointer" }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleRejectPriceChange(sidePanelCourse._id)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", fontWeight: "600", cursor: "pointer" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Standalone Related Lessons (spec §11 / §20) */}
            {standaloneLessonsForPanel.length > 0 && (
              <div style={{ background: "var(--bg-main)", border: "none", boxShadow: "var(--inner-shadow)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "12px" }}>STANDALONE LESSONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {standaloneLessonsForPanel.map((lesson) => (
                    <div key={lesson._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                      <div>
                        <div style={{ color: "var(--c-light)", fontWeight: 600 }}>{lesson.title}</div>
                        <div style={{ color: "var(--c-sub)", fontSize: "0.75rem" }}>{lesson.price} EGP · {lesson.status}</div>
                      </div>
                      {lesson.status === "pending" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => handleApproveStandaloneLesson(lesson._id)} style={{ padding: "4px 10px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Approve</button>
                          <button onClick={() => handleRejectStandaloneLesson(lesson._id)} style={{ padding: "4px 10px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Preview Placeholder */}
            <div style={{ background: "var(--bg-main)", border: "none", boxShadow: "var(--inner-shadow)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "12px" }}>ANALYTICS PREVIEW</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>Enrollments</span>
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>{sidePanelCourse.enrollments || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>Revenue</span>
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>{((sidePanelCourse.enrollments || 0) * (sidePanelCourse.price || 0)).toLocaleString()} EGP</span>
                </div>
            </div>

            {/* Actions */}
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "16px" }}>ACTIONS</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sidePanelCourse.status === "pending" ? (
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button 
                            onClick={() => handleApprove(sidePanelCourse._id)}
                            disabled={isProcessing}
                            style={{
                            flex: 1, background: "rgba(16,185,129,0.1)", border: "none", boxShadow: "var(--inner-shadow)",
                            color: "#10b981", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                            transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(16,185,129,0.15)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(16,185,129,0.05)"; }}
                        >
                            Approve Course
                        </button>
                        <button 
                            onClick={() => handleReject(sidePanelCourse._id)}
                            disabled={isProcessing}
                            style={{
                            flex: 1, background: "rgba(239,68,68,0.1)", border: "none", boxShadow: "var(--inner-shadow)",
                            color: "#ef4444", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                            transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.15)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.05)"; }}
                        >
                            Reject
                        </button>
                    </div>
                ) : sidePanelCourse.status === "approved" ? (
                    <div style={{ display: "flex", flexDirection: "row", gap: "12px" }}>
                        <a 
                          href={`/course/${sidePanelCourse._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, display: "block", textAlign: "center", textDecoration: "none",
                            background: "var(--bg-main)", border: "none", boxShadow: "var(--inner-shadow)",
                            color: "var(--text-h)", padding: "12px", borderRadius: "10px", fontSize: "0.9rem",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={e => e.target.style.background = "var(--bg-surface)"}
                          onMouseLeave={e => e.target.style.background = "var(--bg-main)"}
                        >
                            View Public Course Page
                        </a>
                        <button 
                            onClick={() => setSuspendModal({ isOpen: true, courseId: sidePanelCourse._id, reason: "" })}
                            disabled={isProcessing}
                            style={{
                              flex: 1, background: "rgba(239,68,68,0.1)", border: "none", boxShadow: "var(--inner-shadow)",
                              color: "#ef4444", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                              transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.15)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.05)"; }}
                        >
                            Suspend Course
                        </button>
                    </div>
                ) : (
                    <div style={{ color: "var(--c-sub)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>
                        This course is not visible to students.
                    </div>
                )}
              </div>
            </div>

          </div>
        </div>
      , document.body)}
      
      </div>

      <div style={{ display: activeSubTab === "lessons" ? "block" : "none" }} className="animate-entrance">
        <AdminLessonsTab currentUser={currentUser} onDashboardUpdate={onDashboardUpdate} />
      </div>

      {activeSubTab === "categories" && (
        <div className="animate-entrance glass-card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🚧</div>
          <h3 style={{ color: "var(--text-h)", fontSize: "1.5rem", marginBottom: "8px" }}>Categories Management</h3>
          <p style={{ color: "var(--c-sub)" }}>This feature is currently under construction.</p>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModal.isOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={() => setSuspendModal({ isOpen: false, courseId: null, reason: "" })} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", width: "400px", background: "var(--bg-surface)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "24px", boxShadow: "var(--outer-shadow)" }}>
                <h3 style={{ color: "var(--text-h)", marginTop: 0, marginBottom: "16px" }}>Suspend Course</h3>
                <p style={{ color: "var(--c-sub)", fontSize: "0.9rem", marginBottom: "16px", lineHeight: "1.5" }}>
                    Suspending this course will remove it from the public catalog. The instructor will receive a notification with the reason below.
                </p>
                <textarea 
                    value={suspendModal.reason}
                    onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Provide a reason for suspension..."
                    rows={4}
                    style={{
                        width: "100%", background: "var(--bg-main)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-light)",
                        padding: "12px", borderRadius: "8px", fontSize: "0.9rem", resize: "none", marginBottom: "24px", boxShadow: "var(--inner-shadow)"
                    }}
                />
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button 
                        onClick={() => setSuspendModal({ isOpen: false, courseId: null, reason: "" })}
                        style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-light)", borderRadius: "8px", cursor: "pointer" }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSuspend}
                        disabled={isProcessing}
                        style={{ padding: "8px 16px", background: "#ef4444", border: "none", color: "#fff", borderRadius: "8px", cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.7 : 1 }}
                    >
                        Confirm Suspend
                    </button>
                </div>
            </div>
        </div>
      , document.body)}

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

