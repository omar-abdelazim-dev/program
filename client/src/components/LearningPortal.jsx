import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import FullPageLoader from './FullPageLoader';
import '../styles/content.css';

export default function LearningPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [completedLessons, setCompletedLessons] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCourseContentOpen, setIsCourseContentOpen] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPortalData = async () => {
      try {
        const courseRes = await api.get(`/courses/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCourse(courseRes.data.course);
        setLessons(courseRes.data.lessons);

        try {
          const enrollRes = await api.get(`/enrollments/${id}`, { signal: controller.signal });
          if (enrollRes.data && enrollRes.data.enrolled) {
            setCompletedLessons(enrollRes.data.completedLessonIds || []);
            setProgressPercent(enrollRes.data.progressPercent || 0);
          }
        } catch(e) {
          // If not enrolled or error, just continue
        }

        if (courseRes.data.lessons.length > 0 && !controller.signal.aborted) {
          handleSelectLesson(courseRes.data.lessons[0]._id, courseRes.data.lessons[0].title);
        }
      } catch(err) {
        if (err.code === 'ERR_CANCELED') return;
        setError('Failed to load learning portal.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPortalData();
    return () => controller.abort();
  }, [id]);

  const handleSelectLesson = async (lessonId, lessonTitle) => {
    setActiveLesson({ _id: lessonId, title: lessonTitle });
    setVideoLoading(true);
    setActiveVideoUrl('');
    try {
      const { data } = await api.get(`/courses/${id}/lessons/${lessonId}`);
      setActiveVideoUrl(data.lesson?.videoUrl || '');
    } catch(err) {
      console.error('Failed to load video URL', err);
    } finally {
      setVideoLoading(false);
    }
  };

  const toggleComplete = async (lessonId) => {
    try {
      // Opt out of optimistic UI for simplicity, rely on backend state
      const { data } = await api.patch(`/enrollments/${id}/lessons/${lessonId}/complete`);
      setCompletedLessons(data.completedLessonIds || []);
      setProgressPercent(data.progressPercent || 0);
    } catch(err) {
      console.error('Failed to mark complete', err);
    }
  };

  if (loading) return <FullPageLoader message="Loading Learning Portal..." />;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top Navbar specifically for Learning Portal */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: "16px 24px",
          borderBottom: "1px solid var(--c-border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="back-arrow-btn"
            onClick={() => navigate(`/course/${id}`)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--c-sub)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px 0" }}>
              {course?.title}
            </h1>
            <div style={{ color: "var(--c-sub)", fontSize: "0.9rem" }}>
              {progressPercent}% Complete
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              color: "var(--c-light)",
              fontSize: "0.95rem",
              fontWeight: "500",
            }}
          >
            {progressPercent}%
          </div>
          <div
            style={{
              width: "200px",
              height: "6px",
              background: "var(--c-bg-hover)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--c-orange), var(--c-yellow))",
                transition: "width 0.3s",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Video Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "#000",
              aspectRatio: "16/9",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {videoLoading ? (
              <div className="spinner-wrapper" style={{ color: "white" }}>
                <svg
                  className="spinner"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
              </div>
            ) : activeVideoUrl ? (
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ color: "white" }}>Video not available</div>
            )}
          </div>

          <div
            style={{
              padding: "32px",
              maxWidth: "900px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <h2 style={{ fontSize: "2rem", marginBottom: "16px" }}>
              {activeLesson?.title}
            </h2>
            <div
              style={{
                display: "flex",
                gap: "24px",
                borderBottom: "1px solid var(--c-border-medium)",
                paddingBottom: "24px",
                marginBottom: "24px",
              }}
            >
              <button
                className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
                style={{ padding: 0, paddingBottom: "8px" }}
              >
                Overview
              </button>
              <button
                className={`nav-tab ${activeTab === "qa" ? "active" : ""}`}
                onClick={() => setActiveTab("qa")}
                style={{ padding: 0, paddingBottom: "8px" }}
              >
                Q&A
              </button>
              <button
                className={`nav-tab ${activeTab === "notes" ? "active" : ""}`}
                onClick={() => setActiveTab("notes")}
                style={{ padding: 0, paddingBottom: "8px" }}
              >
                Notes
              </button>
            </div>

            {activeTab === "overview" && (
              <div>
                <p
                  style={{
                    color: "var(--c-sub)",
                    lineHeight: "1.6",
                    marginBottom: "32px",
                  }}
                >
                  In this lesson, we will dive deep into the core concepts of
                  Enterprise Architecture. You will learn how to structure
                  large-scale applications so that they are maintainable,
                  scalable, and easy for new developers to onboard onto. Make
                  sure to download the attached cheat sheet before proceeding!
                </p>

                <h3 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>
                  Resources
                </h3>
                <div
                  className="saas-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    maxWidth: "400px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div>
                      <div style={{ fontWeight: "600" }}>
                        Architecture_Cheat_Sheet.pdf
                      </div>
                      <div
                        style={{ fontSize: "0.85rem", color: "var(--c-sub)" }}
                      >
                        2.4 MB PDF
                      </div>
                    </div>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </div>
              </div>
            )}

            {activeTab === "qa" && (
              <div>
                <p style={{ color: "var(--c-sub)" }}>
                  No questions have been asked yet. Be the first to start a
                  discussion!
                </p>
                <button
                  className="saas-btn-secondary"
                  onClick={() => setIsCourseContentOpen(true)}
                  style={{  marginTop: "16px",
                    padding: "8px 16px",
                    fontSize: "0.9rem",
                  }}
                >
                  Ask a Question
                </button>
              </div>
            )}

            {activeTab === "notes" && (
              <div>
                <textarea
                  placeholder="Type your notes here... They will be saved automatically."
                  style={{
                    border: "var(--c-border)",
                    borderTop: "var(--c-border-top)",
                    borderLeft: "var(--c-border-left)",
                    width: "100%",
                    height: "150px",
                    background: "rgba(15, 17, 23, 0.7)",
                    border: "1px solid var(--c-border-medium)",
                    borderRadius: "8px",
                    padding: "16px",
                    color: "#fff",
                    fontSize: "1rem",
                    resize: "vertical",
                  }}
                ></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div
          style={{ backgroundColor: 'var(--bg-surface)', width: '350px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
              <div
                onClick={() => setIsCourseContentOpen(!isCourseContentOpen)}
                style={{
                  padding: "16px 24px",
                  background: "var(--c-bg-subtle)",
                  fontWeight: "600",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                Course Content
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: isCourseContentOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.3s" }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>

              <div style={{ display: 'grid', gridTemplateRows: isCourseContentOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease-out' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ position: "relative" }}>

                {lessons.map((lesson) => {
                  const isCompleted = completedLessons.includes(lesson._id);
                  const isCurrent = activeLesson?._id === lesson._id;

                  return (
                    <div
                      key={lesson._id}
                      className={`saas-card interactive ${isCurrent ? 'active-lesson' : ''}`}
                      onClick={() => handleSelectLesson(lesson._id, lesson.title)}
                      style={{
                        height: "72px",
                        boxSizing: "border-box",
                        padding: "16px 24px",
                        display: "flex",
                        gap: "16px",
                        cursor: "pointer",
                        position: "relative",
                        zIndex: 1,
                        borderLeft: "3px solid transparent",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(lesson._id);
                        }}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          border: isCompleted
                            ? "none"
                            : "2px solid var(--c-border-active)",
                          background: isCompleted ? "#10B981" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {isCompleted && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isActive ? "600" : "400",
                            color: isActive ? "var(--c-light)" : "var(--c-sub)",
                            marginBottom: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lesson.order}. {lesson.title}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.85rem",
                            color: "var(--c-sub)",
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          Video
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
  );
}
