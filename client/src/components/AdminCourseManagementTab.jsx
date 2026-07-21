import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import { createPortal } from "react-dom";

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
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
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
          background: "#15171e", // Dark solid background
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          padding: "8px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
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
                background: "transparent",
                border: "none",
                color: value === opt ? "var(--c-light)" : "var(--c-sub)",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "8px",
                fontSize: "0.95rem",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(255,255,255,0.05)";
                e.target.style.color = "var(--c-light)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
                if (value !== opt) {
                  e.target.style.color = "var(--c-sub)";
                }
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminCourseManagementTab({ currentUser }) {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [difficultyFilter, setDifficultyFilter] = useState("All Difficulties");
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sidePanelCourseId, setSidePanelCourseId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Future backend pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        // We fetch from both /courses and /courses/pending to gather real data as per requirements
        const [publishedRes, pendingRes] = await Promise.all([
          api.get("/courses").catch(() => ({ data: { courses: [] } })),
          api.get("/courses/pending").catch(() => ({ data: { courses: [] } }))
        ]);
        
        let allCourses = [];
        
        const published = publishedRes.data.data || publishedRes.data.courses || [];
        // Ensure they have a status
        const publishedWithStatus = published.map(c => ({ ...c, status: c.status || 'published' }));
        allCourses = [...allCourses, ...publishedWithStatus];
        
        if (pendingRes.data?.courses) {
            const pendingWithStatus = pendingRes.data.courses.map(c => ({ ...c, status: 'pending' }));
            // Avoid duplicates if backend is weird
            const existingIds = new Set(allCourses.map(c => c._id));
            pendingWithStatus.forEach(c => {
                if (!existingIds.has(c._id)) {
                    allCourses.push(c);
                }
            });
        }
        
        setCourses(allCourses);
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
    setDifficultyFilter("All Difficulties");
    setSearchQuery("");
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "published": return { text: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
      case "draft": return { text: "#9ca3af", bg: "rgba(156, 163, 175, 0.1)", border: "rgba(156, 163, 175, 0.25)" };
      case "pending review": 
      case "pending": return { text: "#f5a623", bg: "rgba(245, 166, 35, 0.1)", border: "rgba(245, 166, 35, 0.25)" };
      case "archived": return { text: "#6b7280", bg: "rgba(107, 114, 128, 0.1)", border: "rgba(107, 114, 128, 0.25)" };
      case "hidden": return { text: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", border: "rgba(139, 92, 246, 0.25)" };
      case "rejected": return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.25)" };
      default: return { text: "var(--c-sub)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(visibleCourses.map(c => c._id)));
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

  const handleBulkAction = async (actionStr) => {
    setIsProcessing(true);
    notyf.success(`Processing bulk action: ${actionStr}...`);
    // Placeholder for real bulk actions
    setTimeout(() => {
        setIsProcessing(false);
        setSelectedIds(new Set());
        notyf.success(`Bulk action completed.`);
    }, 1000);
  };

  const handleApprove = async (id) => {
    try {
        setIsProcessing(true);
        await api.patch(`/courses/${id}/approve`);
        notyf.success('Course approved');
        setCourses(courses.map(c => c._id === id ? { ...c, status: 'published' } : c));
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
        await api.patch(`/courses/${id}/reject`, { reason: "Rejected by admin from bulk UI" });
        notyf.success('Course rejected');
        setCourses(courses.map(c => c._id === id ? { ...c, status: 'rejected' } : c));
    } catch (err) {
        notyf.error('Failed to reject course');
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
    if (activeStatus !== "all") {
        if (activeStatus === "pending") {
            if (c.status !== "pending" && c.status !== "pending review") return false;
        } else {
            if (c.status?.toLowerCase() !== activeStatus) return false;
        }
    }
    
    // Category Filter
    if (categoryFilter !== "All Categories" && c.category !== categoryFilter) return false;
    
    // Difficulty Filter
    if (difficultyFilter !== "All Difficulties" && c.difficulty !== difficultyFilter) return false;

    return true;
  });

  // Calculate metrics
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === "published").length;
  const pendingCourses = courses.filter(c => c.status === "pending" || c.status === "pending review").length;
  const draftCourses = courses.filter(c => c.status === "draft").length;

  const sidePanelCourse = courses.find(c => c._id === sidePanelCourseId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animate-entrance">
      {/* Header and Metrics */}
      <div>
        <h2 style={{ fontSize: "1.8rem", margin: "0 0 8px 0", color: "var(--text-h)" }}>Course Management</h2>
        <div style={{ fontSize: "0.95rem", color: "var(--c-sub)", marginBottom: "24px" }}>Manage, review, and organize platform courses.</div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {/* KPI Cards (Reusing existing glass-card stat-card styles) */}
            <div className="glass-card stat-card overview-stat-purple" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
                <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Courses</div>
                <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{totalCourses}</div>
            </div>
            <div className="glass-card stat-card overview-stat-green" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
                <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Published</div>
                <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{publishedCourses}</div>
            </div>
            <div className="glass-card stat-card overview-stat-orange" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
                <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Review</div>
                <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{pendingCourses}</div>
            </div>
            <div className="glass-card stat-card overview-stat-white" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
                <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Drafts</div>
                <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{draftCourses}</div>
            </div>
        </div>
      </div>

      {/* Search and Filter Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginLeft: "auto" }}>
          <div className="nav-search" style={{ width: "320px", position: "relative" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="custom-search-input"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              background: showFilters ? "rgba(255,255,255,0.08)" : "rgba(255, 255, 255, 0.03)", 
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderTop: "1px solid rgba(255, 255, 255, 0.15)", borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
              color: "var(--c-light)", padding: "10px 20px", borderRadius: "20px",
              cursor: "pointer", fontSize: "0.9rem", transition: "all 0.3s ease",
              boxShadow: showFilters ? "0 0 0 2px rgba(139, 92, 246, 0.3)" : "none"
            }}
            onMouseEnter={e => { if(!showFilters) e.target.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { if(!showFilters) e.target.style.background = "rgba(255,255,255,0.03)"; }}
          >
            Filters
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div style={{ 
          background: "rgba(15,17,23,0.95)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "12px", padding: "20px 24px", display: "flex", alignItems: "flex-end", gap: "24px",
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "220px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--c-sub)", letterSpacing: "0.5px" }}>CATEGORY</label>
            <CustomDropdown 
              value={categoryFilter}
              options={["All Categories", "Development", "Business", "Design", "Data"]}
              onChange={setCategoryFilter}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "220px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--c-sub)", letterSpacing: "0.5px" }}>DIFFICULTY</label>
            <CustomDropdown 
              value={difficultyFilter}
              options={["All Difficulties", "Beginner", "Intermediate", "Advanced"]}
              onChange={setDifficultyFilter}
            />
          </div>

          <button 
            onClick={clearFilters}
            style={{ 
              background: "rgba(239, 68, 68, 0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(239, 68, 68, 0.2)", borderTop: "1px solid rgba(239, 68, 68, 0.4)", borderLeft: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ef4444", padding: "12px 20px", borderRadius: "10px",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: "500", transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.15)"; }}
            onMouseLeave={e => { e.target.style.background = "rgba(239,68,68,0.05)"; }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
        {[
          { id: "all", label: "All Courses" },
          { id: "published", label: "Published" },
          { id: "pending", label: "Pending Review" },
          { id: "draft", label: "Draft" },
          { id: "archived", label: "Archived" },
          { id: "rejected", label: "Rejected" }
        ].map(tab => {
          const isActive = activeStatus === tab.id;
          const statusStyle = getStatusColor(tab.id);
          return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveStatus(tab.id);
              setSelectedIds(new Set());
            }}
            style={{
              padding: "10px 24px", borderRadius: "99px", fontSize: "0.9rem", fontWeight: "500", cursor: "pointer", transition: "all 0.2s",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${isActive ? statusStyle.border : "rgba(255,255,255,0.05)"}`,
              borderTop: `1px solid ${isActive ? statusStyle.border : "rgba(255,255,255,0.15)"}`,
              borderLeft: `1px solid ${isActive ? statusStyle.border : "rgba(255,255,255,0.15)"}`,
              background: isActive ? statusStyle.bg : "rgba(255,255,255,0.03)",
              color: isActive ? statusStyle.text : "var(--c-sub)",
              boxShadow: isActive ? `0 0 10px ${statusStyle.bg}` : "none",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={e => { if(!isActive) e.target.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { if(!isActive) e.target.style.background = "rgba(255,255,255,0.03)"; }}
          >
            {tab.label}
          </button>
        )})}
      </div>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div style={{ 
          background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)",
          borderRadius: "12px", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          animation: "fadeIn 0.2s ease"
        }}>
          <div style={{ fontWeight: "600", color: "var(--text-h)" }}>
            {selectedIds.size} courses selected
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={() => handleBulkAction("publish")} disabled={isProcessing}
              style={{
                background: "rgba(16,185,129,0.1)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(16,185,129,0.2)", borderTop: "1px solid rgba(16,185,129,0.4)", borderLeft: "1px solid rgba(16,185,129,0.4)",
                color: "#10b981", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
              }}>Publish</button>
            <button 
              onClick={() => handleBulkAction("archive")} disabled={isProcessing}
              style={{
                background: "rgba(107,114,128,0.1)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(107,114,128,0.2)", borderTop: "1px solid rgba(107,114,128,0.4)", borderLeft: "1px solid rgba(107,114,128,0.4)",
                color: "#9ca3af", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
              }}>Archive</button>
            <button 
              onClick={() => handleBulkAction("delete")} disabled={isProcessing}
              style={{
                background: "rgba(239,68,68,0.1)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(239,68,68,0.2)", borderTop: "1px solid rgba(239,68,68,0.4)", borderLeft: "1px solid rgba(239,68,68,0.4)",
                color: "#ef4444", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
              }}>Delete</button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="glass-card" style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", overflow: "hidden", marginTop: selectedIds.size > 0 ? "0px" : "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <th style={{ padding: "16px 24px", width: "50px" }}>
                <input 
                  type="checkbox" 
                  checked={visibleCourses.length > 0 && selectedIds.size === visibleCourses.length}
                  onChange={handleSelectAll}
                  style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#4f46e5" }}
                />
              </th>
              <th style={{ padding: "16px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem" }}>Course</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem" }}>Category</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem" }}>Price</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem" }}>Status</th>
              <th style={{ padding: "16px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem" }}>Last Updated</th>
              <th style={{ padding: "16px 24px", fontWeight: "600", color: "var(--c-sub)", fontSize: "0.85rem", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
                <tr>
                    <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
                        Loading courses...
                    </td>
                </tr>
            ) : visibleCourses.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "var(--c-sub)" }}>
                  No courses found matching criteria.
                </td>
              </tr>
            ) : (
              visibleCourses.map(c => (
                <tr 
                  key={c._id} 
                  style={{ 
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    background: selectedIds.has(c._id) ? "rgba(255,255,255,0.02)" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  <td style={{ padding: "16px 24px" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(c._id)}
                      onChange={() => handleSelectOne(c._id)}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#4f46e5" }}
                    />
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {/* Thumbnail Placeholder if no real image */}
                      {c.thumbnailUrl ? (
                          <img src={c.thumbnailUrl} alt="Thumbnail" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                      ) : (
                          <div style={{ 
                            width: "48px", height: "48px", borderRadius: "8px", 
                            background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          </div>
                      )}
                      <div>
                        <div style={{ fontWeight: "600", color: "var(--text-h)", fontSize: "0.95rem" }}>{c.title}</div>
                        <div style={{ color: "var(--c-sub)", fontSize: "0.8rem" }}>{c.instructor?.name || "Unknown Instructor"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--c-sub)", fontSize: "0.9rem" }}>{c.category}</td>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontSize: "0.9rem" }}>${c.price || "0.00"}</td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      background: getStatusColor(c.status).bg, border: `1px solid ${getStatusColor(c.status).border}`,
                      color: getStatusColor(c.status).text, padding: "4px 10px", borderRadius: "99px",
                      fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px"
                    }}>
                      {c.status || 'unknown'}
                    </span>
                  </td>
                  <td style={{ padding: "16px", color: "var(--c-sub)", fontSize: "0.9rem" }}>
                    {new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <button 
                      onClick={() => setSidePanelCourseId(c._id)}
                      style={{ 
                        background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.15)", borderLeft: "1px solid rgba(255,255,255,0.15)",
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

      {/* Side Panel Overlay */}
      {sidePanelCourse && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end" }}>
          <div 
            onClick={() => setSidePanelCourseId(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          <div style={{ 
            position: "relative", width: "450px", height: "100%", 
            background: "#15171e", borderLeft: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.5)", padding: "24px", display: "flex", flexDirection: "column", gap: "24px",
            overflowY: "auto", animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <button 
              onClick={() => setSidePanelCourseId(null)}
              style={{
                background: "rgba(255,255,255,0.05)", border: "none", color: "var(--c-sub)",
                padding: "6px 12px", borderRadius: "99px", width: "fit-content",
                display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.8rem", transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "var(--c-light)"; }}
              onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "var(--c-sub)"; }}
            >
              ✕ Close
            </button>

            {/* Course Header */}
            <div>
              {sidePanelCourse.thumbnailUrl ? (
                  <img src={sidePanelCourse.thumbnailUrl} alt="Cover" style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "12px", marginBottom: "16px" }} />
              ) : (
                  <div style={{ width: "100%", height: "180px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
              )}
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.4rem", color: "var(--text-h)" }}>{sidePanelCourse.title}</h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ 
                    background: getStatusColor(sidePanelCourse.status).bg, border: `1px solid ${getStatusColor(sidePanelCourse.status).border}`,
                    color: getStatusColor(sidePanelCourse.status).text, padding: "2px 8px", borderRadius: "99px",
                    fontSize: "0.7rem", fontWeight: "600", textTransform: "uppercase"
                  }}>
                    {sidePanelCourse.status}
                  </span>
                  <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>
                    Created by {sidePanelCourse.instructor?.name || 'Unknown'}
                  </span>
              </div>
              <p style={{ color: "var(--c-sub)", fontSize: "0.9rem", lineHeight: "1.5", margin: 0 }}>
                  {sidePanelCourse.description}
              </p>
            </div>

            {/* Course Info */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "12px" }}>DETAILS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Category</span>
                  <span style={{ color: "var(--c-light)" }}>{sidePanelCourse.category}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Difficulty</span>
                  <span style={{ color: "var(--c-light)" }}>{sidePanelCourse.difficulty || "All Levels"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Price</span>
                  <span style={{ color: "var(--c-light)" }}>${sidePanelCourse.price || "0.00"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--c-sub)" }}>Created On</span>
                  <span style={{ color: "var(--c-light)" }}>{new Date(sidePanelCourse.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {/* Analytics Preview Placeholder */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "12px" }}>ANALYTICS PREVIEW</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>Enrollments</span>
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>{sidePanelCourse.enrollments || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>Revenue</span>
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>${(sidePanelCourse.enrollments || 0) * (sidePanelCourse.price || 0)}</span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: "auto" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--c-sub)", letterSpacing: "1px", marginBottom: "16px" }}>ACTIONS</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {sidePanelCourse.status === "pending" || sidePanelCourse.status === "pending review" ? (
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button 
                            onClick={() => handleApprove(sidePanelCourse._id)}
                            disabled={isProcessing}
                            style={{
                            flex: 1, background: "rgba(16,185,129,0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(16,185,129,0.2)", borderTop: "1px solid rgba(16,185,129,0.4)", borderLeft: "1px solid rgba(16,185,129,0.4)",
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
                            flex: 1, background: "rgba(239,68,68,0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(239,68,68,0.1)", borderTop: "1px solid rgba(239,68,68,0.3)", borderLeft: "1px solid rgba(239,68,68,0.3)",
                            color: "#ef4444", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                            transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.15)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.05)"; }}
                        >
                            Reject
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button 
                            disabled={isProcessing}
                            style={{
                            flex: 1, background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.15)", borderLeft: "1px solid rgba(255,255,255,0.15)",
                            color: "var(--c-light)", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                            transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(255,255,255,0.08)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(255,255,255,0.03)"; }}
                        >
                            Archive Course
                        </button>
                        <button 
                            disabled={isProcessing}
                            style={{
                            flex: 1, background: "rgba(239,68,68,0.05)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(239,68,68,0.1)", borderTop: "1px solid rgba(239,68,68,0.3)", borderLeft: "1px solid rgba(239,68,68,0.3)",
                            color: "#ef4444", padding: "12px", borderRadius: "10px", cursor: isProcessing ? "not-allowed" : "pointer", fontSize: "0.9rem",
                            transition: "all 0.2s", opacity: isProcessing ? 0.5 : 1
                            }}
                            onMouseEnter={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.15)"; }}
                            onMouseLeave={e => { if(!isProcessing) e.target.style.background = "rgba(239,68,68,0.05)"; }}
                        >
                            Soft Delete
                        </button>
                    </div>
                )}
              </div>
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
        .custom-search-input:focus {
          border-color: rgba(139, 92, 246, 0.6) !important;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
