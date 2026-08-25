import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import notyf from "../utils/notyf";
import ConfirmModal from "./ConfirmModal";
import Pagination from "./common/Pagination";
import { createPortal } from "react-dom";
import SegmentedControl from "./common/SegmentedControl";
import Spinner from "./Spinner";
import { useTranslation } from 'react-i18next';

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

export default function AdminCourseManagementTab({ currentUser, onDashboardUpdate, activeStatusFilter }) {
  const { t } = useTranslation();

  
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeStatus, setActiveStatus] = useState(activeStatusFilter || "all");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (activeStatusFilter) {
      setActiveStatus(activeStatusFilter);
    }
  }, [activeStatusFilter]);

  const [sidePanelCourseId, setSidePanelCourseId] = useState(null);
  const sidePanelCourse = courses.find(c => c._id === sidePanelCourseId);
  const [processingLessonId, setProcessingLessonId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [suspendModal, setSuspendModal] = useState({ isOpen: false, courseId: null, reason: "" });
  const [previewLesson, setPreviewLesson] = useState(null);
  const [courseLessonsModal, setCourseLessonsModal] = useState({
    isOpen: false,
    course: null,
    modules: [],
    standaloneLessons: [],
    isLoading: false,
  });
  const [coursesWithPendingLessons, setCoursesWithPendingLessons] = useState(new Set());
  const [coursesWithPendingQuizzes, setCoursesWithPendingQuizzes] = useState(new Set());

  const updatePendingCourseSet = (courseId, updatedModules, updatedStandalone) => {
    if (!courseId) return;
    const hasRemainingPending =
      (updatedModules || []).some((m) =>
        (m.lessons || []).some((l) => l.status === "pending" || l.status === "draft"),
      ) ||
      (updatedStandalone || []).some((l) => l.status === "pending");

    const hasRemainingPendingQuiz =
      (updatedModules || []).some((m) =>
        (m.lessons || []).some((l) => (l.status === "pending" || l.status === "draft") && l.lessonType === "quiz"),
      ) ||
      (updatedStandalone || []).some((l) => l.status === "pending" && l.lessonType === "quiz");

    setCoursesWithPendingLessons((prev) => {
      const next = new Set(prev);
      if (hasRemainingPending) {
        next.add(courseId.toString());
      } else {
        next.delete(courseId.toString());
      }
      return next;
    });

    setCoursesWithPendingQuizzes((prev) => {
      const next = new Set(prev);
      if (hasRemainingPendingQuiz) {
        next.add(courseId.toString());
      } else {
        next.delete(courseId.toString());
      }
      return next;
    });
  };

  const handleOpenCourseLessons = async (e, course) => {
    e.stopPropagation();
    setCourseLessonsModal({
      isOpen: true,
      course,
      modules: [],
      standaloneLessons: [],
      isLoading: true,
    });
    try {
      const [courseRes, standaloneRes] = await Promise.all([
        api.get(`/courses/${course._id}`).catch(() => ({ data: { modules: [] } })),
        api.get(`/standalone-lessons?relatedCourseId=${course._id}`).catch(() => ({ data: { lessons: [] } })),
      ]);
      const hasPending =
        (courseRes.data.modules || []).some((m) =>
          (m.lessons || []).some((l) => l.status === "pending" || l.status === "draft"),
        ) ||
        (standaloneRes.data.lessons || []).some((l) => l.status === "pending");
      setCoursesWithPendingLessons((prev) => {
        const next = new Set(prev);
        if (hasPending) next.add(course._id.toString());
        else next.delete(course._id.toString());
        return next;
      });
      setCourseLessonsModal({
        isOpen: true,
        course,
        modules: courseRes.data.modules || [],
        standaloneLessons: standaloneRes.data.lessons || [],
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load course lessons:", err);
      notyf.error("Failed to load course lessons");
      setCourseLessonsModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleApproveLessonInModal = async (lessonId, isStandalone = false, lessonType = "video") => {
    setProcessingLessonId(lessonId);
    try {
      if (isStandalone) {
        await api.patch(`/standalone-lessons/${lessonId}/approve`);
      } else {
        await api.patch(`/admin/lessons/${lessonId}/approve`);
      }
      notyf.success("Lesson approved");
      const nextModules = courseLessonsModal.modules.map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((l) =>
          l._id === lessonId ? { ...l, status: "approved" } : l,
        ),
      }));
      const nextStandalone = courseLessonsModal.standaloneLessons.map((l) =>
        l._id === lessonId ? { ...l, status: "approved" } : l,
      );
      setCourseLessonsModal((prev) => ({
        ...prev,
        modules: nextModules,
        standaloneLessons: nextStandalone,
      }));
      updatePendingCourseSet(courseLessonsModal.course?._id, nextModules, nextStandalone);
      if (previewLesson?._id === lessonId) {
        setPreviewLesson((prev) =>
          prev ? { ...prev, status: "approved" } : null,
        );
      }
      const isQuiz = lessonType === "quiz";
      setStats((prev) => ({
        ...prev,
        pendingLessonsCount: isQuiz ? (prev.pendingLessonsCount ?? 0) : Math.max(0, (prev.pendingLessonsCount ?? 1) - 1),
        pendingQuizzesCount: isQuiz ? Math.max(0, (prev.pendingQuizzesCount ?? 1) - 1) : (prev.pendingQuizzesCount ?? 0),
      }));
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to approve lesson");
    } finally {
      setProcessingLessonId(null);
    }
  };

  const handleRejectLessonInModal = async (lessonId, isStandalone = false, lessonType = "video") => {
    setProcessingLessonId(lessonId);
    try {
      if (isStandalone) {
        await api.patch(`/standalone-lessons/${lessonId}/reject`, {
          reason: "Rejected by admin",
        });
      } else {
        await api.patch(`/admin/lessons/${lessonId}/reject`);
      }
      notyf.success("Lesson rejected");
      const nextModules = courseLessonsModal.modules.map((m) => ({
        ...m,
        lessons: (m.lessons || []).map((l) =>
          l._id === lessonId ? { ...l, status: "rejected" } : l,
        ),
      }));
      const nextStandalone = courseLessonsModal.standaloneLessons.map((l) =>
        l._id === lessonId ? { ...l, status: "rejected" } : l,
      );
      setCourseLessonsModal((prev) => ({
        ...prev,
        modules: nextModules,
        standaloneLessons: nextStandalone,
      }));
      updatePendingCourseSet(courseLessonsModal.course?._id, nextModules, nextStandalone);
      if (previewLesson?._id === lessonId) {
        setPreviewLesson((prev) =>
          prev ? { ...prev, status: "rejected" } : null,
        );
      }
      const isQuiz = lessonType === "quiz";
      setStats((prev) => ({
        ...prev,
        pendingLessonsCount: isQuiz ? (prev.pendingLessonsCount ?? 0) : Math.max(0, (prev.pendingLessonsCount ?? 1) - 1),
        pendingQuizzesCount: isQuiz ? Math.max(0, (prev.pendingQuizzesCount ?? 1) - 1) : (prev.pendingQuizzesCount ?? 0),
      }));
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to reject lesson");
    } finally {
      setProcessingLessonId(null);
    }
  };

  const handleDeleteLessonInModal = async (lessonId, isStandalone = false) => {
    if (!window.confirm("Are you sure you want to permanently delete this lesson?")) return;
    setProcessingLessonId(lessonId);
    try {
      if (isStandalone) {
        await api.delete(`/standalone-lessons/${lessonId}`);
      } else {
        await api.delete(`/admin/lessons/${lessonId}`);
      }
      notyf.success("Lesson deleted");
      const nextModules = courseLessonsModal.modules.map((m) => ({
        ...m,
        lessons: (m.lessons || []).filter((l) => l._id !== lessonId),
      }));
      const nextStandalone = courseLessonsModal.standaloneLessons.filter((l) => l._id !== lessonId);
      setCourseLessonsModal((prev) => ({
        ...prev,
        modules: nextModules,
        standaloneLessons: nextStandalone,
      }));
      updatePendingCourseSet(courseLessonsModal.course?._id, nextModules, nextStandalone);
      if (previewLesson?._id === lessonId) {
        setPreviewLesson(null);
      }
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error(err.response?.data?.message || "Failed to delete lesson");
    } finally {
      setProcessingLessonId(null);
    }
  };

  const handlePreviewLessonInModal = async (lesson, courseId, isStandalone = false) => {
    try {
      let videoUrl = lesson.videoUrl;
      if (!videoUrl && courseId && !isStandalone) {
        const res = await api
          .get(`/courses/${courseId}/lessons/${lesson._id}`)
          .catch(() => null);
        if (res?.data?.lesson?.videoUrl) videoUrl = res.data.lesson.videoUrl;
      }
      setPreviewLesson({ ...lesson, videoUrl, courseId, isStandalone });
    } catch (e) {
      setPreviewLesson({ ...lesson, courseId, isStandalone });
    }
  };

  const handleApproveAllPendingInModal = async () => {
    const allPendingModuleLessons = (courseLessonsModal.modules || [])
      .flatMap((m) => m.lessons || [])
      .filter((l) => l.status === "pending" || l.status === "draft");
    const allPendingStandalone = (
      courseLessonsModal.standaloneLessons || []
    ).filter((l) => l.status === "pending");

    if (
      allPendingModuleLessons.length === 0 &&
      allPendingStandalone.length === 0
    ) {
      notyf.open({ type: "info", message: "No pending lessons to approve" });
      return;
    }

    setIsProcessing(true);
    try {
      await Promise.all([
        ...allPendingModuleLessons.map((l) =>
          api.patch(`/admin/lessons/${l._id}/approve`).catch(() => null),
        ),
        ...allPendingStandalone.map((l) =>
          api.patch(`/standalone-lessons/${l._id}/approve`).catch(() => null),
        ),
      ]);
      notyf.success("All pending lessons approved");
      setCourseLessonsModal((prev) => ({
        ...prev,
        modules: prev.modules.map((m) => ({
          ...m,
          lessons: (m.lessons || []).map((l) =>
            l.status === "pending" || l.status === "draft"
              ? { ...l, status: "approved" }
              : l,
          ),
        })),
        standaloneLessons: prev.standaloneLessons.map((l) =>
          l.status === "pending" ? { ...l, status: "approved" } : l,
        ),
      }));
      updatePendingCourseSet(courseLessonsModal.course?._id, [], []);
      const pendingQuizzesInModal = allPendingModuleLessons.filter((l) => l.lessonType === "quiz").length;
      const pendingRegularInModal = allPendingModuleLessons.length - pendingQuizzesInModal + allPendingStandalone.length;
      setStats((prev) => ({
        ...prev,
        pendingLessonsCount: Math.max(0, (prev.pendingLessonsCount ?? 0) - pendingRegularInModal),
        pendingQuizzesCount: Math.max(0, (prev.pendingQuizzesCount ?? 0) - pendingQuizzesInModal),
      }));
      if (onDashboardUpdate) onDashboardUpdate();
    } catch (err) {
      notyf.error("Failed to approve all pending lessons");
    } finally {
      setIsProcessing(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "updatedAt" || field === "createdAt" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  const [stats, setStats] = useState({ totalCourses: 0, pendingCourses: 0, pendingLessonsCount: 0, pendingQuizzesCount: 0 });

  const [standaloneLessonsForPanel, setStandaloneLessonsForPanel] = useState([]);
  const [sidePanelModuleLessonsCount, setSidePanelModuleLessonsCount] = useState(0);
  const [sidePanelCourseAnalytics, setSidePanelCourseAnalytics] = useState({ enrollments: 0, revenue: 0 });

  useEffect(() => {
    if (!sidePanelCourseId) { 
      setStandaloneLessonsForPanel([]); 
      setSidePanelModuleLessonsCount(0);
      setSidePanelCourseAnalytics({ enrollments: 0, revenue: 0 });
      return; 
    }
    let cancelled = false;
    // The public endpoint only returns approved lessons — pull pending ones
    // in separately (admins need to see and act on those too) and merge.
    Promise.all([
      api.get(`/standalone-lessons?relatedCourseId=${sidePanelCourseId}`).then(r => r.data.lessons || []).catch(() => []),
      api.get('/standalone-lessons/pending').then(r => (r.data.lessons || []).filter(l => (l.relatedCourse?._id || l.relatedCourse) === sidePanelCourseId)).catch(() => []),
      api.get(`/courses/${sidePanelCourseId}`).catch(() => ({ data: { modules: [] } })),
      api.get(`/courses/${sidePanelCourseId}/enrollments`).catch(() => ({ data: { enrollments: [] } }))
    ]).then(([approved, pending, courseRes, enrollmentsRes]) => {
      if (cancelled) return;
      const byId = new Map([...approved, ...pending].map(l => [l._id, l]));
      setStandaloneLessonsForPanel([...byId.values()]);
      
      const modules = courseRes.data.modules || courseRes.data.data?.modules || [];
      const mCount = modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);
      setSidePanelModuleLessonsCount(mCount);
      
      const enrollments = enrollmentsRes.data.enrollments || [];
      const currentCourse = courses.find(c => c._id === sidePanelCourseId);
      const coursePrice = currentCourse?.price || courseRes.data?.course?.price || 0;
      // Calculate revenue based on amountPaid, fallback to course price if not recorded
      const revenue = enrollments.reduce((sum, en) => {
          if (typeof en.amountPaid === 'number') return sum + en.amountPaid;
          return sum + coursePrice;
      }, 0);
      setSidePanelCourseAnalytics({ enrollments: enrollments.length, revenue });
    });
    return () => { cancelled = true; };
  }, [sidePanelCourseId, courses]);

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
        setIsLoading(true);
        // Fetch published courses, pending courses, admin stats, and pending lessons
        const [publishedRes, pendingRes, statsRes, adminLessonsRes, pendingStandaloneRes] = await Promise.all([
          api.get("/courses").catch(() => ({ data: { courses: [] } })),
          api.get("/courses/pending").catch(() => ({ data: { courses: [] } })),
          api.get("/admin/stats").catch(() => ({ data: {} })),
          api.get("/admin/lessons").catch(() => ({ data: { lessons: [] } })),
          api.get("/standalone-lessons/pending").catch(() => ({ data: { lessons: [] } })),
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
        
        allCourses.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setCourses(allCourses);

        const pendingCourseIdSet = new Set();
        const pendingQuizCourseIdSet = new Set();
        const allModuleLessons = adminLessonsRes.data?.lessons || [];
        allModuleLessons.forEach((l) => {
          if ((l.status === 'pending' || l.status === 'draft') && l.module?.course?._id) {
            const cId = l.module.course._id.toString();
            pendingCourseIdSet.add(cId);
            if (l.lessonType === 'quiz') {
              pendingQuizCourseIdSet.add(cId);
            }
          }
        });

        const allPendingStandalone = pendingStandaloneRes.data?.lessons || [];
        allPendingStandalone.forEach((l) => {
          const cId = l.relatedCourse?._id || l.relatedCourse;
          if (cId) {
            const courseIdStr = cId.toString();
            pendingCourseIdSet.add(courseIdStr);
            if (l.lessonType === 'quiz') {
              pendingQuizCourseIdSet.add(courseIdStr);
            }
          }
        });

        setCoursesWithPendingLessons(pendingCourseIdSet);
        setCoursesWithPendingQuizzes(pendingQuizCourseIdSet);

        if (statsRes.data) {
          setStats({
            totalCourses: statsRes.data.totalCourses ?? 0,
            pendingCourses: statsRes.data.pendingCourses ?? 0,
            pendingLessonsCount: statsRes.data.pendingLessonsCount ?? statsRes.data.pendingLessons ?? 0,
            pendingQuizzesCount: statsRes.data.pendingQuizzesCount ?? statsRes.data.pendingQuizzes ?? 0,
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
      case "published":
      case "approved": return { text: "#10b981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.25)" };
      case "pending":
      case "draft": return { text: "#f5a623", bg: "rgba(245, 166, 35, 0.1)", border: "rgba(245, 166, 35, 0.25)" };
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

  // Filtering & Sorting (defaults to latest updated first)
  let visibleCourses = courses
    .filter(c => {
      // Basic search: title, ID, category
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesId = c._id?.toLowerCase().includes(q);
        const matchesCategory = c.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesCategory) return false;
      }
      
      // Status Filter
      if (activeStatus === "pending_lessons") {
        if (!coursesWithPendingLessons.has(c._id?.toString())) return false;
      } else if (activeStatus === "pending_quizzes") {
        if (!coursesWithPendingQuizzes.has(c._id?.toString())) return false;
      } else if (activeStatus !== "all" && c.status?.toLowerCase() !== activeStatus) {
        return false;
      }

      // Category Filter
      if (categoryFilter !== "All Categories" && c.category !== categoryFilter) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "updatedAt") {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        comparison = timeA - timeB;
      } else if (sortBy === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortBy === "category") {
        comparison = (a.category || "").localeCompare(b.category || "");
      } else if (sortBy === "price") {
        comparison = (Number(a.price) || 0) - (Number(b.price) || 0);
      } else if (sortBy === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else if (sortBy === "courseType") {
        comparison = (a.courseType || "").localeCompare(b.courseType || "");
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeStatus, categoryFilter, sortBy, sortOrder]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCourses = visibleCourses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visibleCourses.length / itemsPerPage);

  // Calculate metrics (matches Course.status's real enum)
  const totalCourses = courses.length;
  const approvedCourses = courses.filter(c => c.status === "approved").length;
  const pendingCourses = courses.filter(c => c.status === "pending").length;

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
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{totalCourses}</div>
          </div>
          <div className="glass-card stat-card overview-stat-orange" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Courses</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{pendingCourses}</div>
          </div>
          <div className="glass-card stat-card overview-stat-green" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Lessons</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{stats.pendingLessonsCount ?? stats.pendingLessons ?? 0}</div>
          </div>
          <div className="glass-card stat-card overview-stat-yellow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Pending Quizzes</div>
            <div style={{ color: 'var(--text-h)', fontSize: '2rem', fontWeight: '700', margin: '0' }}>{stats.pendingQuizzesCount ?? stats.pendingQuizzes ?? 0}</div>
          </div>
        </div>
      </div>

          {/* Controls Row: Status Bar & Search Pill in same row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            {/* Left: Status Bar */}
            <SegmentedControl
              tabs={[
                { id: "all", label: "All Courses" },
                { id: "approved", label: "Approved" },
                { id: "pending", label: "Pending Courses" },
                { id: "pending_lessons", label: "Pending Lessons" },
                { id: "pending_quizzes", label: "Pending Quizzes" },
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
                borderRadius: "12px",
                boxShadow:
                  isSearchFocused || showFilters
                    ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
                    : "var(--outer-shadow)",
                border:
                  isSearchFocused || showFilters
                    ? "1px solid #f97316"
                    : "1px solid transparent",
                transition: "all 0.3s ease",
                padding: "4px 8px 4px 12px",
                position: "relative",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
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
                placeholder={t("admin.search_courses", "Search courses...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--c-light)",
                  padding: "6px 8px",
                  fontSize: "0.92rem",
                  width: "140px",
                }}
              />

              {/* Divider */}
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  margin: "0 2px",
                }}
              />

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
                    gap: "6px",
                    padding: "6px 8px",
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
                          borderRadius: "12px",
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
                <th 
                  onClick={() => handleSort("title")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("title");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "title" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 16px", 
                    color: sortBy === "title" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Course Name"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>COURSE</span>
                    {sortBy === "title" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("category")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("category");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "category" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 8px", 
                    color: sortBy === "category" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    textAlign: "center", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Category"
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>CATEGORY</span>
                    {sortBy === "category" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("price")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("price");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "price" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 8px", 
                    color: sortBy === "price" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    textAlign: "center", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Price"
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>PRICE</span>
                    {sortBy === "price" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("status")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("status");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "status" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 8px", 
                    color: sortBy === "status" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    textAlign: "center", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Status"
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>STATUS</span>
                    {sortBy === "status" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("courseType")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("courseType");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "courseType" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 8px", 
                    color: sortBy === "courseType" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    textAlign: "center", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Type"
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>TYPE</span>
                    {sortBy === "courseType" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
                <th style={{ padding: "12px 8px", color: "var(--c-sub)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)", textAlign: "center", whiteSpace: "nowrap" }}>LESSONS</th>
                <th 
                  onClick={() => handleSort("updatedAt")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSort("updatedAt");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === "updatedAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                  style={{ 
                    padding: "12px 16px", 
                    color: sortBy === "updatedAt" ? "#f97316" : "var(--c-sub)", 
                    fontWeight: "600", 
                    borderBottom: "1px solid var(--c-border-subtle)", 
                    textAlign: "center", 
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  title="Sort by Last Updated"
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <span>LAST UPDATED</span>
                    {sortBy === "updatedAt" && (
                      <span style={{ fontSize: "0.75rem" }}>{sortOrder === "desc" ? "▼" : "▲"}</span>
                    )}
                  </div>
                </th>
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
                  <tr key={c._id} className="analytics-row" style={{ borderBottom: "1px solid var(--c-border-subtle)", transition: "background 0.2s", cursor: "pointer" }} onClick={() => setSidePanelCourseId(c._id)}>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Thumbnail Placeholder if no real image */}
                        {c.thumbnailUrl ? (
                            <img src={c.thumbnailUrl} alt="Thumbnail" style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
                        ) : (
                            <div style={{ 
                              width: "36px", height: "36px", borderRadius: "8px", 
                              background: "var(--bg-main) !important", boxShadow: "var(--inner-shadow) !important", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-sub)"
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                        )}
                        <div>
                          <div style={{ fontWeight: "600", color: "var(--text-h)", fontSize: "0.92rem" }}>{c.title}</div>
                          <div style={{ color: "var(--c-sub)", fontSize: "0.8rem", marginTop: "2px" }}>{c.instructor?.name || "Unknown Instructor"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", color: "var(--c-sub)", fontSize: "0.88rem", textAlign: "center", verticalAlign: "middle" }}>{c.category || "—"}</td>
                    <td style={{ padding: "12px 8px", color: "var(--text-h)", fontSize: "0.88rem", textAlign: "center", verticalAlign: "middle" }}>{c.price ? `${c.price} EGP` : "0 EGP"}</td>
                    <td style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>
                      {(() => {
                        const style = getStatusColor(c.status);
                        const statusLabel = c.status ? (c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase()) : "Draft";
                        return (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
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
                    <td style={{ padding: "12px 8px", color: "var(--c-sub)", fontSize: "0.85rem", textAlign: "center", verticalAlign: "middle" }}>
                      {c.courseType ? (c.courseType === "full" ? "Full" : "Ongoing") : "—"}
                      {c.courseType === "ongoing" && c.status === "draft" && c.draftStartedAt && (
                        <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "2px" }}>
                          {Math.max(0, 90 - Math.floor((Date.now() - new Date(c.draftStartedAt).getTime()) / (24 * 60 * 60 * 1000)))}d to archive
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>
                      {(() => {
                        const hasPending = coursesWithPendingLessons.has(c._id?.toString());
                        return (
                          <button
                            type="button"
                            onClick={(e) => handleOpenCourseLessons(e, c)}
                            title={hasPending ? "Course has pending lessons waiting for review" : "View lessons and stats for this course"}
                            style={{
                              background: "var(--bg-main)",
                              border: hasPending ? "1.5px solid #f59e0b" : "1.5px solid transparent",
                              boxShadow: "var(--inner-shadow)",
                              color: "#f97316",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              transition: "background 0.2s ease, border-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(249, 115, 22, 0.12)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "var(--bg-main)";
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                            <span>Lessons</span>
                          </button>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--c-sub)", fontSize: "0.88rem", textAlign: "center", verticalAlign: "middle" }}>
                      {new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            totalItems={visibleCourses.length} 
            itemsPerPage={itemsPerPage} 
            label="courses" 
          />
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
                padding: "6px 12px", borderRadius: "12px", width: "fit-content",
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
                    <div style={{ width: "120px", height: "80px", background: "var(--bg-main)", boxShadow: "var(--inner-shadow)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-sub)", flexShrink: 0 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h3 style={{ margin: "0", fontSize: "1.2rem", color: "var(--text-h)", lineHeight: "1.2" }}>{sidePanelCourse.title}</h3>
                  <span style={{ 
                    width: "fit-content",
                    background: getStatusColor(sidePanelCourse.status).bg, border: "none",
                    color: getStatusColor(sidePanelCourse.status).text, padding: "2px 8px", borderRadius: "12px",
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
                  <span style={{ color: "var(--c-sub)" }}>Total Lessons</span>
                  <span style={{ color: "var(--c-light)", fontWeight: "600" }}>{sidePanelModuleLessonsCount + standaloneLessonsForPanel.length}</span>
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
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>{sidePanelCourseAnalytics.enrollments}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--c-sub)", fontSize: "0.85rem" }}>Revenue</span>
                    <span style={{ color: "var(--c-light)", fontSize: "0.85rem", fontWeight: "600" }}>{sidePanelCourseAnalytics.revenue.toLocaleString()} EGP</span>
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
      


      {/* Course Lessons & Stats Modal */}
      {courseLessonsModal.isOpen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setCourseLessonsModal({ isOpen: false, course: null, modules: [], standaloneLessons: [], isLoading: false })} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative",
            width: "680px",
            maxWidth: "92vw",
            maxHeight: "85vh",
            background: "var(--bg-surface)",
            border: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))",
            borderRadius: "16px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3), var(--outer-shadow)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "fadeSlideUp 0.3s ease-out forwards",
          }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#f97316", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                  Course Lessons & Statistics
                </div>
                <h3 style={{ margin: 0, color: "var(--text-h)", fontSize: "1.2rem", fontWeight: "700" }}>
                  {courseLessonsModal.course?.title}
                </h3>
                <div style={{ color: "var(--c-sub)", fontSize: "0.82rem", marginTop: "4px" }}>
                  Instructor: {courseLessonsModal.course?.instructor?.name || "Unknown"} · Category: {courseLessonsModal.course?.category || "General"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {(() => {
                  const allLessons = (courseLessonsModal.modules || []).flatMap(m => m.lessons || []);
                  const hasPending = allLessons.some(l => l.status === "pending" || l.status === "draft") || (courseLessonsModal.standaloneLessons || []).some(l => l.status === "pending");
                  if (!hasPending) return null;
                  return (
                    <button
                      onClick={handleApproveAllPendingInModal}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "12px",
                        background: "var(--bg-main)",
                        border: "none",
                        boxShadow: "var(--inner-shadow)",
                        color: "#10b981",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Approve All Pending
                    </button>
                  );
                })()}
                <button
                  onClick={() => setCourseLessonsModal({ isOpen: false, course: null, modules: [], standaloneLessons: [], isLoading: false })}
                  style={{ background: "transparent", border: "none", color: "var(--c-sub)", fontSize: "1.4rem", cursor: "pointer", padding: "4px 8px", borderRadius: "8px", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "var(--text-h)"}
                  onMouseLeave={e => e.target.style.color = "var(--c-sub)"}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {courseLessonsModal.isLoading ? (
                <div style={{ padding: "50px 0", textAlign: "center" }}>
                  <Spinner size="small" label="Loading lessons and statistics..." />
                </div>
              ) : (() => {
                const allModuleLessons = (courseLessonsModal.modules || []).flatMap(m => m.lessons || []);
                const totalLessonsCount = allModuleLessons.length + (courseLessonsModal.standaloneLessons || []).length;
                const approvedCount = allModuleLessons.filter(l => l.status === "approved" || l.status === "published").length + (courseLessonsModal.standaloneLessons || []).filter(l => l.status === "approved").length;
                const pendingCount = allModuleLessons.filter(l => l.status === "pending" || l.status === "draft").length + (courseLessonsModal.standaloneLessons || []).filter(l => l.status === "pending").length;

                return (
                  <>
                    {/* Quick Stats Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                      <div style={{ background: "var(--bg-main)", padding: "14px 16px", borderRadius: "12px", boxShadow: "var(--inner-shadow)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--c-sub)", fontWeight: "600", textTransform: "uppercase" }}>Total Lessons</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--text-h)", marginTop: "4px" }}>{totalLessonsCount}</div>
                      </div>
                      <div style={{ background: "var(--bg-main)", padding: "14px 16px", borderRadius: "12px", boxShadow: "var(--inner-shadow)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--c-sub)", fontWeight: "600", textTransform: "uppercase" }}>Modules</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "#f97316", marginTop: "4px" }}>{courseLessonsModal.modules.length}</div>
                      </div>
                      <div style={{ background: "var(--bg-main)", padding: "14px 16px", borderRadius: "12px", boxShadow: "var(--inner-shadow)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--c-sub)", fontWeight: "600", textTransform: "uppercase" }}>Approved</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "#10b981", marginTop: "4px" }}>{approvedCount}</div>
                      </div>
                      <div style={{ background: "var(--bg-main)", padding: "14px 16px", borderRadius: "12px", boxShadow: "var(--inner-shadow)" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--c-sub)", fontWeight: "600", textTransform: "uppercase" }}>Pending / Draft</div>
                        <div style={{ fontSize: "1.4rem", fontWeight: "700", color: "#f59e0b", marginTop: "4px" }}>{pendingCount}</div>
                      </div>
                    </div>

                    {/* Modules & Lessons List */}
                    {courseLessonsModal.modules.length === 0 && courseLessonsModal.standaloneLessons.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 0", color: "var(--c-sub)", fontSize: "0.95rem" }}>
                        No lessons have been created for this course yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {courseLessonsModal.modules.map((mod, modIdx) => (
                          <div key={mod._id || modIdx} style={{ background: "var(--bg-main)", borderRadius: "14px", padding: "16px", boxShadow: "var(--inner-shadow)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.06))", paddingBottom: "8px" }}>
                              <div style={{ fontWeight: "700", color: "var(--text-h)", fontSize: "0.95rem" }}>
                                Module {modIdx + 1}: {mod.title}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--c-sub)" }}>
                                {mod.lessons?.length || 0} {(mod.lessons?.length === 1) ? "lesson" : "lessons"}
                              </span>
                            </div>

                            {(!mod.lessons || mod.lessons.length === 0) ? (
                              <div style={{ color: "var(--c-sub)", fontSize: "0.82rem", fontStyle: "italic" }}>No lessons in this module.</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {mod.lessons.map((lesson, lessonIdx) => {
                                  const statusColor = getStatusColor(lesson.status || "approved");
                                  const isApproved = lesson.status === "approved" || lesson.status === "published";
                                  const isRejected = lesson.status === "rejected" || lesson.status === "archived";

                                  return (
                                    <div
                                      key={lesson._id || lessonIdx}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "10px 14px",
                                        background: "var(--bg-surface)",
                                        boxShadow: "var(--outer-shadow)",
                                        borderRadius: "12px",
                                        fontSize: "0.88rem",
                                        gap: "12px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "200px" }}>
                                        <span style={{ color: "var(--c-sub)", fontSize: "0.75rem", width: "16px" }}>
                                          {lesson.order !== undefined ? lesson.order + 1 : lessonIdx + 1}.
                                        </span>
                                        <span style={{ color: "var(--text-h)", fontWeight: "500" }}>
                                          {lesson.title}
                                        </span>
                                        {lesson.lessonType && (
                                          <span style={{ fontSize: "0.68rem", textTransform: "uppercase", padding: "3px 8px", borderRadius: "8px", background: "var(--bg-main)", boxShadow: "var(--inner-shadow)", color: "var(--c-sub)" }}>
                                            {lesson.lessonType}
                                          </span>
                                        )}
                                      </div>

                                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {/* Status Label */}
                                        <span
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            fontSize: "0.78rem",
                                            fontWeight: "600",
                                            background: "var(--bg-main)",
                                            boxShadow: "var(--inner-shadow)",
                                            color: statusColor.text,
                                            textTransform: "capitalize",
                                          }}
                                        >
                                          {lesson.status || "Approved"}
                                        </span>

                                        {/* Preview Button */}
                                        <button
                                          type="button"
                                          onClick={() => handlePreviewLessonInModal(lesson, courseLessonsModal.course?._id, false)}
                                          title="Preview Lesson Video / Content"
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            border: "none",
                                            background: "var(--bg-main)",
                                            boxShadow: "var(--inner-shadow)",
                                            color: "var(--c-light)",
                                            fontSize: "0.78rem",
                                            fontWeight: "600",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          Preview
                                        </button>

                                        {/* Approve Button */}
                                        {!isApproved && (
                                          <button
                                            type="button"
                                            disabled={processingLessonId === lesson._id}
                                            onClick={() => handleApproveLessonInModal(lesson._id, false, lesson.lessonType)}
                                            style={{
                                              padding: "4px 10px",
                                              borderRadius: "12px",
                                              border: "none",
                                              background: "var(--bg-main)",
                                              boxShadow: "var(--inner-shadow)",
                                              color: "#10b981",
                                              fontSize: "0.78rem",
                                              fontWeight: "600",
                                              cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                              opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                            }}
                                          >
                                            {processingLessonId === lesson._id ? "..." : "Approve"}
                                          </button>
                                        )}

                                        {/* Delete Button when approved/published, Reject Button when pending */}
                                        {isApproved ? (
                                          <button
                                            type="button"
                                            disabled={processingLessonId === lesson._id}
                                            onClick={() => handleDeleteLessonInModal(lesson._id, false)}
                                            title="Delete Lesson"
                                            style={{
                                              padding: "4px 10px",
                                              borderRadius: "12px",
                                              border: "none",
                                              background: "var(--bg-main)",
                                              boxShadow: "var(--inner-shadow)",
                                              color: "#ef4444",
                                              fontSize: "0.78rem",
                                              fontWeight: "600",
                                              cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                              opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            }}
                                          >
                                            {processingLessonId === lesson._id ? "..." : "Delete"}
                                          </button>
                                        ) : (
                                          !isRejected && (
                                            <button
                                              type="button"
                                              disabled={processingLessonId === lesson._id}
                                              onClick={() => handleRejectLessonInModal(lesson._id, false, lesson.lessonType)}
                                              title="Reject Lesson"
                                              style={{
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                border: "none",
                                                background: "var(--bg-main)",
                                                boxShadow: "var(--inner-shadow)",
                                                color: "#ef4444",
                                                fontSize: "0.78rem",
                                                fontWeight: "600",
                                                cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                                opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                              }}
                                            >
                                              {processingLessonId === lesson._id ? "..." : "Reject"}
                                            </button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Standalone Lessons */}
                        {courseLessonsModal.standaloneLessons.length > 0 && (
                          <div style={{ background: "var(--bg-main)", borderRadius: "14px", padding: "16px", boxShadow: "var(--inner-shadow)" }}>
                            <div style={{ fontWeight: "700", color: "var(--text-h)", fontSize: "0.95rem", marginBottom: "12px", borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.06))", paddingBottom: "8px" }}>
                              Standalone Related Lessons ({courseLessonsModal.standaloneLessons.length})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {courseLessonsModal.standaloneLessons.map((lesson) => {
                                const statusColor = getStatusColor(lesson.status);
                                const isApproved = lesson.status === "approved" || lesson.status === "published";
                                const isRejected = lesson.status === "rejected" || lesson.status === "archived";

                                return (
                                  <div
                                    key={lesson._id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "10px 14px",
                                      background: "var(--bg-surface)",
                                      boxShadow: "var(--outer-shadow)",
                                      borderRadius: "12px",
                                      fontSize: "0.88rem",
                                      gap: "12px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div>
                                      <span style={{ color: "var(--text-h)", fontWeight: "500" }}>{lesson.title}</span>
                                      <span style={{ color: "var(--c-sub)", fontSize: "0.78rem", marginLeft: "8px" }}>({lesson.price} EGP)</span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      {/* Status Label */}
                                      <span
                                        style={{
                                          padding: "4px 10px",
                                          borderRadius: "12px",
                                          fontSize: "0.78rem",
                                          fontWeight: "600",
                                          background: "var(--bg-main)",
                                          boxShadow: "var(--inner-shadow)",
                                          color: statusColor.text,
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {lesson.status}
                                      </span>

                                      {/* Preview Button */}
                                      <button
                                        type="button"
                                        onClick={() => handlePreviewLessonInModal(lesson, courseLessonsModal.course?._id, true)}
                                        style={{
                                          padding: "4px 10px",
                                          borderRadius: "12px",
                                          border: "none",
                                          background: "var(--bg-main)",
                                          boxShadow: "var(--inner-shadow)",
                                          color: "var(--c-light)",
                                          fontSize: "0.78rem",
                                          fontWeight: "600",
                                          cursor: "pointer",
                                        }}
                                      >
                                        Preview
                                      </button>

                                      {!isApproved && (
                                        <button
                                          type="button"
                                          disabled={processingLessonId === lesson._id}
                                          onClick={() => handleApproveLessonInModal(lesson._id, true, lesson.lessonType)}
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            border: "none",
                                            background: "var(--bg-main)",
                                            boxShadow: "var(--inner-shadow)",
                                            color: "#10b981",
                                            fontSize: "0.78rem",
                                            fontWeight: "600",
                                            cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                            opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                          }}
                                        >
                                          {processingLessonId === lesson._id ? "..." : "Approve"}
                                        </button>
                                      )}

                                      {isApproved ? (
                                        <button
                                          type="button"
                                          disabled={processingLessonId === lesson._id}
                                          onClick={() => handleDeleteLessonInModal(lesson._id, true)}
                                          title="Delete Lesson"
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            border: "none",
                                            background: "var(--bg-main)",
                                            boxShadow: "var(--inner-shadow)",
                                            color: "#ef4444",
                                            fontSize: "0.78rem",
                                            fontWeight: "600",
                                            cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                            opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          {processingLessonId === lesson._id ? "..." : "Delete"}
                                        </button>
                                      ) : (
                                        !isRejected && (
                                          <button
                                            type="button"
                                            disabled={processingLessonId === lesson._id}
                                            onClick={() => handleRejectLessonInModal(lesson._id, true, lesson.lessonType)}
                                            style={{
                                              padding: "4px 10px",
                                              borderRadius: "12px",
                                              border: "none",
                                              background: "var(--bg-main)",
                                              boxShadow: "var(--inner-shadow)",
                                              color: "#ef4444",
                                              fontSize: "0.78rem",
                                              fontWeight: "600",
                                              cursor: processingLessonId === lesson._id ? "not-allowed" : "pointer",
                                              opacity: processingLessonId === lesson._id ? 0.5 : 1,
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            }}
                                          >
                                            {processingLessonId === lesson._id ? "..." : "Reject"}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      , document.body)}

      {/* Lesson Video Preview Modal */}
      {previewLesson && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "24px",
          }}
          onClick={() => setPreviewLesson(null)}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "850px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid var(--c-border-subtle, rgba(255,255,255,0.1))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--c-border-subtle, rgba(255,255,255,0.08))",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h4 style={{ margin: 0, color: "var(--text-h)", fontSize: "1.1rem", fontWeight: "600" }}>
                  {previewLesson.title}
                </h4>
                {previewLesson.status && (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      background: "var(--bg-main)",
                      boxShadow: "var(--inner-shadow)",
                      color: getStatusColor(previewLesson.status).text,
                      textTransform: "capitalize",
                    }}
                  >
                    {previewLesson.status}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {previewLesson.status !== "approved" && previewLesson.status !== "published" && (
                  <button
                    disabled={processingLessonId === previewLesson._id}
                    onClick={() => handleApproveLessonInModal(previewLesson._id, previewLesson.isStandalone, previewLesson.lessonType)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "12px",
                      background: "var(--bg-main)",
                      boxShadow: "var(--inner-shadow)",
                      color: "#10b981",
                      border: "none",
                      fontWeight: "600",
                      cursor: processingLessonId === previewLesson._id ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      opacity: processingLessonId === previewLesson._id ? 0.5 : 1,
                    }}
                  >
                    {processingLessonId === previewLesson._id ? "..." : "Approve"}
                  </button>
                )}
                {previewLesson.status === "approved" || previewLesson.status === "published" ? (
                  <button
                    disabled={processingLessonId === previewLesson._id}
                    onClick={() => handleDeleteLessonInModal(previewLesson._id, previewLesson.isStandalone)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "12px",
                      background: "var(--bg-main)",
                      boxShadow: "var(--inner-shadow)",
                      color: "#ef4444",
                      border: "none",
                      fontWeight: "600",
                      cursor: processingLessonId === previewLesson._id ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      opacity: processingLessonId === previewLesson._id ? 0.5 : 1,
                    }}
                  >
                    {processingLessonId === previewLesson._id ? "..." : "Delete"}
                  </button>
                ) : (
                  previewLesson.status !== "rejected" && (
                    <button
                      disabled={processingLessonId === previewLesson._id}
                      onClick={() => handleRejectLessonInModal(previewLesson._id, previewLesson.isStandalone, previewLesson.lessonType)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "12px",
                        background: "var(--bg-main)",
                        boxShadow: "var(--inner-shadow)",
                        color: "#ef4444",
                        border: "none",
                        fontWeight: "600",
                        cursor: processingLessonId === previewLesson._id ? "not-allowed" : "pointer",
                        fontSize: "0.8rem",
                        opacity: processingLessonId === previewLesson._id ? 0.5 : 1,
                      }}
                    >
                      {processingLessonId === previewLesson._id ? "..." : "Reject"}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPreviewLesson(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--c-sub)",
                    fontSize: "1.4rem",
                    cursor: "pointer",
                    padding: "0 6px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", position: "relative" }}>
              {previewLesson.videoUrl ? (
                <video
                  src={previewLesson.videoUrl}
                  controls
                  autoPlay
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "var(--c-sub)", gap: "8px" }}>
                  <div style={{ fontSize: "2rem" }}>🎥</div>
                  <div>No video file attached to this lesson.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}

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
