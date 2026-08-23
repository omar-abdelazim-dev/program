import notyf from "../utils/notyf";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import FullPageLoader from './FullPageLoader';
import ReportIssueModal from "./ReportIssueModal";
import ThreeDotMenu from "./common/ThreeDotMenu";
import CardSkeleton from "./common/CardSkeleton";

const InProgressCard = ({
  enrollment,
  onOpen,
  onViewCourse,
  openReportModal,
}) => {
  const { t } = useTranslation();
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div
      className="coursera-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer" }}
    >
      <div className="coursera-info-col">
        <div className="provider-header">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} className="provider-logo" alt={course.title} />
          ) : (
            <div className="provider-logo" style={{ background: "var(--bg-main)" }} />
          )}
          <div className="provider-info">
            <span className="provider-name">{instructor?.name || t('common.instructor', 'Instructor')}</span>
            {instructor?.isProgramInstructor && (
              <span className="provider-offered">{course.college ? `Offered by ${course.college}` : t('student.offered_by_program', 'Offered by Program Platform')}</span>
            )}
          </div>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <div className="course-meta">
          {t('student.completed', 'Completed')} &bull; {enrollment.progressPercent}%
        </div>
      </div>
      <div className="coursera-action-col">
        <div className="next-lesson-info">
          <h4 className="next-lesson-title">
            {enrollment.currentLesson?.title || t('student.learning.up_next', 'Course Introduction')}
          </h4>
          <span className="next-lesson-duration">
            <svg style={{marginRight:'4px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg> 
            {t('student.learning.video', 'فيديو')} ({enrollment.currentLesson?.duration || 5} {t('student.learning.min', 'minutes')})
          </span>
        </div>
        {enrollment.status === 'pending' ? (
          <button
            className="continue-btn"
            disabled
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
              cursor: "not-allowed",
              boxShadow: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {t('admin.pending_approval', 'Pending Approval')}
          </button>
        ) : (
          <button
            className="continue-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(course._id);
            }}
          >
            {t('student.get_started', 'Get started')}
          </button>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu
            options={[
              { label: t('student.learning.report_issue', 'Report issue'), action: () => openReportModal(course) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const CompletedCard = ({
  enrollment,
  onOpen,
  onViewCourse,
  openReportModal,
}) => {
  const { t } = useTranslation();
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div
      className="coursera-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer", borderColor: "var(--color-accent)" }}
    >
      <div className="coursera-info-col">
        <div className="provider-header">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} className="provider-logo" alt={course.title} />
          ) : (
            <div className="provider-logo" style={{ background: "var(--bg-main)" }} />
          )}
          <div className="provider-info">
            <span className="provider-name">{instructor?.name || t('common.instructor', 'Instructor')}</span>
            {instructor?.isProgramInstructor && (
              <span className="provider-offered">{course.college ? `Offered by ${course.college}` : t('student.offered_by_program', 'Offered by Program Platform')}</span>
            )}
          </div>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <div className="course-meta">
          {t('student.completed', 'Completed')} &bull; 100% &bull; {t('student.learning.completed_on', 'Completed on')} {new Date(enrollment.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <div className="coursera-action-col" style={{ justifyContent: 'flex-end' }}>
        <button
          className="continue-btn"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(course._id);
          }}
        >
          {t('student.learning.review', 'Review Course')}
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu
            options={[
              {
                label: t('student.learning.share', 'Share'),
                action: () =>
                  notyf.open({
                    type: "info",
                    message: t('student.learning.share_copied', 'Share link copied to clipboard'),
                  }),
              },
              { label: t('student.learning.report_issue', 'Report issue'), action: () => openReportModal(course) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default function DashboardTab() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportModalState, setReportModalState] = useState({
    isOpen: false,
    course: null,
  });

  const openReportModal = (course) =>
    setReportModalState({ isOpen: true, course });
  const closeReportModal = () =>
    setReportModalState({ isOpen: false, course: null });

  const handleReportSubmit = (data) => {
    console.log("Report submitted:", data);
    notyf.success("Report submitted successfully! Thank you.");
    closeReportModal();
  };

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

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsContainerRef.current) {
        const activeBtn = tabsContainerRef.current.querySelector(
          ".dashboard-tab.active",
        );
        if (activeBtn) {
          const parentWidth = tabsContainerRef.current.offsetWidth;
          const childLeft = activeBtn.offsetLeft;
          const childWidth = activeBtn.offsetWidth;
          
          setTabIndicatorStyle({
            insetInlineStart: isRTL ? (parentWidth - (childLeft + childWidth)) : childLeft,
            width: childWidth,
            opacity: 1,
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeSubTab, loading, enrollments, isRTL]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <CardSkeleton type="stat" count={3} />
      <CardSkeleton type="horizontal" count={3} />
    </div>
  );
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
        className="stats-grid animate-entrance"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="stat-card dashboard-stat-card solid-card">
          <div className="stat-value dashboard-stat-value">
            {enrollments.length}
          </div>
          <div className="stat-label dashboard-stat-label">
            {t('student.enrolled_courses', 'Enrolled Courses')}
          </div>
        </div>
        <div className="stat-card dashboard-stat-card solid-card">
          <div className="stat-value dashboard-stat-value">
            {completedLessonCount}
          </div>
          <div className="stat-label dashboard-stat-label">
            {t('student.completed_lessons', 'Completed Lessons')}
          </div>
        </div>
        <div className="stat-card dashboard-stat-card solid-card">
          <div className="stat-value dashboard-stat-value">
            {completed.length}
          </div>
          <div className="stat-label dashboard-stat-label">
            {t('student.courses_completed', 'Courses Completed')}
          </div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-layout">
        <div
          className="main-column dashboard main dashboard-main"
          style={{ width: "100%" }}
        >
          <div
            className="course-tabs"
            style={{ position: "relative", marginBottom: "24px" }}
            ref={tabsContainerRef}
          >
            <div
              className="dashboard-tab-indicator"
              style={{
                insetInlineStart: `${tabIndicatorStyle.insetInlineStart}px`,
                width: `${tabIndicatorStyle.width}px`,
                opacity: tabIndicatorStyle.opacity,
                background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
              }}
            />
            <button
              className={`dashboard-tab ${activeSubTab === "in_progress" ? "active" : ""}`}
              onClick={() => setActiveSubTab("in_progress")}
              data-text={`${t('student.in_progress', 'In Progress')} (${inProgress.length})`}
            >
              {t('student.in_progress', 'In Progress')} ({inProgress.length})
            </button>
            <button
              className={`dashboard-tab ${activeSubTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveSubTab("completed")}
              data-text={`${t('student.completed', 'Completed')} (${completed.length})`}
            >
              {t('student.completed', 'Completed')} ({completed.length})
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
                    className="solid-card"
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <p>
                      {enrollments.length === 0
                        ? t('student.no_enrolled_courses', "You haven't enrolled in any courses yet.")
                        : t('student.nothing_in_progress', "Nothing in progress right now — nice work keeping up!")}
                    </p>
                    {enrollments.length === 0 && (
                      <button
                        className="solid-btn"
                        style={{ marginTop: "16px" }}
                        onClick={() => navigate("/student")}
                      >
                        {t('student.explore_catalog', 'Explore Catalog')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="dash-row course-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '24px' }}>
                    {inProgress.map((enrollment) => (
                      <InProgressCard
                        key={enrollment._id}
                        enrollment={enrollment}
                        onOpen={(courseId) => navigate(`/learn/${courseId}`)}
                        onViewCourse={() =>
                          navigate(`/course/${enrollment.course._id}`, { state: { from: 'dashboard' } })
                        }
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
                    className="solid-card"
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <p>{t('student.no_completed_courses', "You haven't completed any courses yet. Keep learning!")}</p>
                  </div>
                ) : (
                  <div className="dash-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '24px' }}>
                    {completed.map((enrollment) => (
                      <CompletedCard
                        key={enrollment._id}
                        enrollment={enrollment}
                        onOpen={(courseId) => navigate(`/learn/${courseId}`)}
                        onViewCourse={() =>
                          navigate(`/course/${enrollment.course._id}`, { state: { from: 'dashboard' } })
                        }
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

      <ReportIssueModal
        isOpen={reportModalState.isOpen}
        course={reportModalState.course}
        onClose={closeReportModal}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}
