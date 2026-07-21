import notyf from '../utils/notyf';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import ConfirmModal from './ConfirmModal';
import ReportIssueModal from './ReportIssueModal';


const ThreeDotMenu = ({ options }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="menu-container course-menu-container" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        className="menu-trigger course-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Menu"
      >
        ⋮
      </button>
      {open && (
        <div className="dropdown-menu course-dropdown glass-card">
          {options.map((opt, i) => (
            <button
              key={i}
              className="dropdown-item course-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                opt.action();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const InProgressCard = ({ enrollment, onOpen, onViewCourse, openConfirm, openReportModal }) => {
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div 
      className="course-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer" }}
    >
      <div className="course-left">
        <div
          className="course-thumbnail course-image"
          style={
            course.thumbnailUrl
              ? { backgroundImage: `url(${course.thumbnailUrl})` }
              : { background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }
          }
        />
        <div className="course-content">
          <h3 className="course-title">{course.title}</h3>
          <p className="course-instructor">{instructor?.name || "Instructor"}</p>
          <div className="course-progress">
            <div className="progress-bar-container course-progress-bar">
              <div
                className="progress-bar course-progress-fill"
                style={{ width: `${enrollment.progressPercent}%` }}
              ></div>
            </div>
            <div className="progress-text-row course-progress-meta">
              <span>{enrollment.progressPercent}% Complete</span>
            </div>
          </div>
        </div>
      </div>
      <div className="course-right">
        <div className="lesson-card">
          <span className="lesson-label">Current Lesson</span>
          <h4 className="lesson-title">{enrollment.currentLesson?.title || "Up Next"}</h4>
          <span className="lesson-duration">
            {enrollment.currentLesson?.duration ? `${enrollment.currentLesson.duration} min` : ""}
          </span>
        </div>
        <div className="course-actions">
          <button
            className="glass-btn primary-action continue-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(course._id);
            }}
          >
            Continue Learning
          </button>
          <ThreeDotMenu
            options={[
              { label: "Notes", action: () => notyf.open({ type: 'info', message: "Notes coming soon" }) },
              { label: "Report issue", action: () => openReportModal(course) },
              { label: "Leave course", action: () => openConfirm({
                  title: "Leave Course",
                  message: `Are you sure you want to leave ${course.title}? You will lose your progress.`,
                  onConfirm: () => {
                    notyf.success("Course removed from your dashboard");
                    // Here you would typically call an API to leave the course
                  }
              }) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const CompletedCard = ({ enrollment, onOpen, onViewCourse, openConfirm, openReportModal }) => {
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div 
      className="course-card completed-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer" }}
    >
      <div className="course-left">
        <div className="completed-check completion-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div
          className="course-thumbnail course-image"
          style={
            course.thumbnailUrl
              ? {
                  backgroundImage: `url(${course.thumbnailUrl})`
                }
              : { background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }
          }
        />
        <div className="course-content">
          <h3 className="course-title">{course.title}</h3>
          <p className="course-instructor">{instructor?.name || "Instructor"}</p>
          <div className="completion-badge">100% Complete</div>
        </div>
      </div>
      <div className="course-right">
        <div className="course-actions certificate-actions">
          <ThreeDotMenu
            options={[
              {
                label: "Download Certificate",
                action: () => notyf.success("Downloading certificate..."),
              },
              { label: "Share", action: () => notyf.open({ type: 'info', message: "Share link copied to clipboard" }) },
              { label: "Report issue", action: () => openReportModal(course) }
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default function DashboardTab() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null
  });

  const openConfirm = (config) => {
    setConfirmState({
      isOpen: true,
      title: config.title,
      message: config.message,
      onConfirm: () => {
        if(config.onConfirm) config.onConfirm();
        closeConfirm();
      }
    });
  };

  const closeConfirm = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  // Report Modal State
  const [reportModalState, setReportModalState] = useState({
    isOpen: false,
    course: null
  });

  const openReportModal = (course) => {
    setReportModalState({ isOpen: true, course });
  };

  const closeReportModal = () => {
    setReportModalState({ isOpen: false, course: null });
  };

  const handleReportSubmit = (data) => {
    // API Call goes here
    console.log("Report submitted:", data);
    notyf.success("Report submitted successfully! Thank you.");
    closeReportModal();
  };

  // Tab state: 'in_progress' or 'completed'
  const [activeSubTab, setActiveSubTab] = useState("in_progress");
  const tabsContainerRef = useRef(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    const fetchEnrollments = async () => {
      try {
        const { data } = await api.get("/enrollments/mine", {
          signal: controller.signal,
        });
        setEnrollments(data.enrollments || []);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Failed to load your courses");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchEnrollments();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsContainerRef.current) {
        const activeBtn =
          tabsContainerRef.current.querySelector(".dashboard-tab.active");
        if (activeBtn) {
          setTabIndicatorStyle({
            left: activeBtn.offsetLeft,
            width: activeBtn.offsetWidth,
            opacity: 1,
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSubTab, loading, enrollments]);

  if (loading)
    return <p style={{ color: "var(--c-sub)" }}>Loading your courses...</p>;
  if (error) return <p style={{ color: "#ef4444" }}>{error}</p>;

  const completedLessonCount = enrollments.reduce(
    (sum, e) => sum + e.completedLessons.length,
    0,
  );
  const inProgress = enrollments.filter((e) => e.progressPercent < 100);
  const completed = enrollments.filter((e) => e.progressPercent === 100);

  return (
    <>
      <div
        className="stats-grid dashboard-stats animate-entrance"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="stat-card dashboard-stat-card glass-card">
          <div className="stat-value dashboard-stat-value">
            {enrollments.length}
          </div>
          <div className="stat-label dashboard-stat-labell dashboard-stat-label">
            Enrolled Courses
          </div>
        </div>
        <div className="stat-card dashboard-stat-card glass-card">
          <div className="stat-value dashboard-stat-value">
            {completedLessonCount}
          </div>
          <div className="stat-label dashboard-stat-labell dashboard-stat-label">
            Completed Lessons
          </div>
        </div>
        <div className="stat-card dashboard-stat-card glass-card">
          <div className="stat-value dashboard-stat-value">
            {completed.length}
          </div>
          <div className="stat-label dashboard-stat-labell dashboard-stat-label">
            Courses Completed
          </div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-layout">
        <div className="main-column dashboard main dashboard-main" style={{ width: "100%" }}>
          <div
            className="course-tabs"
            style={{ position: "relative", marginBottom: "24px" }}
            ref={tabsContainerRef}
          >
            <div
              className="dashboard-tab-indicator"
              style={{
                left: `${tabIndicatorStyle.left}px`,
                width: `${tabIndicatorStyle.width}px`,
                opacity: tabIndicatorStyle.opacity,
              }}
            />
            <button
              className={`dashboard-tab ${activeSubTab === "in_progress" ? "active" : ""}`}
              onClick={() => setActiveSubTab("in_progress")}
              data-text={`In Progress (${inProgress.length})`}
            >
              In Progress ({inProgress.length})
            </button>
            <button
              className={`dashboard-tab ${activeSubTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveSubTab("completed")}
              data-text={`Completed (${completed.length})`}
            >
              Completed ({completed.length})
            </button>
          </div>

          <section
            className="dashboard-section dashboard-content animate-entrance"
            style={{ animationDelay: "0.2s" }}
          >
            {activeSubTab === "in_progress" && (
              <>
                {inProgress.length === 0 ? (
                  <div
                    className="glass-card"
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--c-sub)",
                    }}
                  >
                    <p>
                      {enrollments.length === 0
                        ? "You haven't enrolled in any courses yet."
                        : "Nothing in progress right now — nice work keeping up!"}
                    </p>
                    {enrollments.length === 0 && (
                      <button
                        className="glass-btn"
                        style={{ marginTop: "16px" }}
                        onClick={() => navigate("/student")}
                      >
                        Explore Catalog
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="dash-row course-list">
                    {inProgress.map((enrollment) => (
                      <InProgressCard
                        key={enrollment._id}
                        enrollment={enrollment}
                        onOpen={(courseId) => navigate(`/learn/${courseId}`)}
                        onViewCourse={() => navigate(`/course/${enrollment.course._id}`)}
                        openConfirm={openConfirm}
                        openReportModal={openReportModal}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSubTab === "completed" && (
              <>
                {completed.length === 0 ? (
                  <div
                    className="glass-card"
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--c-sub)",
                    }}
                  >
                    <p>You haven't completed any courses yet. Keep learning!</p>
                  </div>
                ) : (
                  <div className="dash-row">
                    {completed.map((enrollment) => (
                      <CompletedCard
                        key={enrollment._id}
                        enrollment={enrollment}
                        onOpen={(courseId) => navigate(`/learn/${courseId}`)}
                        onViewCourse={() => navigate(`/course/${enrollment.course._id}`)}
                        openConfirm={openConfirm}
                        openReportModal={openReportModal}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
        confirmText="Leave Course"
      />

      <ReportIssueModal
        isOpen={reportModalState.isOpen}
        course={reportModalState.course}
        onClose={closeReportModal}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}
