import { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axios';
import FullPageLoader from './FullPageLoader';
import '../styles/content.css';
import { useTranslation } from 'react-i18next';
import notyf from '../utils/notyf';
import ConfirmModal from './ConfirmModal';
import QuizPlayer from './QuizPlayer';
import CourseAnnouncementsTab from './CourseAnnouncementsTab';

export default function LearningPortal({ user }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [moduleProgress, setModuleProgress] = useState([]);

  // Flattened, module-order-then-lesson-order list — powers "select first
  // lesson on load" and Previous/Next navigation across module boundaries.
  const flatLessons = modules.flatMap((m) =>
    (m.lessons || []).map((lesson) => ({ ...lesson, moduleId: m._id, moduleTitle: m.title }))
  );
  const activeLessonFlatIndex = activeLesson
    ? flatLessons.findIndex((l) => l._id === activeLesson._id)
    : -1;
  const previousLesson = activeLessonFlatIndex > 0 ? flatLessons[activeLessonFlatIndex - 1] : null;
  const nextLesson =
    activeLessonFlatIndex >= 0 && activeLessonFlatIndex < flatLessons.length - 1
      ? flatLessons[activeLessonFlatIndex + 1]
      : null;
  
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState('');
  // Default the course-content sidebar closed on narrow viewports so it doesn't
  // eat the whole screen on first load — still just a manual toggle either way.
  const [isCourseContentOpen, setIsCourseContentOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 768
  );
  
  const [questionToDelete, setQuestionToDelete] = useState(null);
  
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

  // Q&A Pagination and Tabs state
  const [qaMainTab, setQaMainTab] = useState('my_questions'); // 'my_questions' | 'student_questions'
  const [qaSubTab, setQaSubTab] = useState('pending'); // 'pending' | 'replied'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const userId = user?._id || user?.id;
  const userRole = user?.role;

  const handleSelectLesson = useCallback(async (lessonId, lessonTitle) => {
    setActiveLesson({ _id: lessonId, title: lessonTitle });
    setVideoLoading(true);
    setActiveVideoUrl('');
    setVideoError(false);
    try {
      const { data } = await api.get(`/courses/${id}/lessons/${lessonId}`);
      setActiveVideoUrl(data.lesson?.videoUrl || '');
      if (data.lesson) setActiveLesson(data.lesson);
    } catch(err) {
      console.error('Failed to load video URL', err);
    } finally {
      setVideoLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPortalData = async () => {
      try {
        const courseRes = await api.get(`/courses/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCourse(courseRes.data.course);
        const loadedModules = courseRes.data.modules || [];
        setModules(loadedModules);

        try {
          const enrollRes = await api.get(`/enrollments/${id}`, { signal: controller.signal });
          
          const isStaff = userId && (
            userRole === 'admin' ||
            userRole === 'superadmin' ||
            (courseRes.data.course.instructor?._id || courseRes.data.course.instructor) === userId
          );

          if (!isStaff && (!enrollRes.data?.enrolled || enrollRes.data?.status !== 'approved')) {
            navigate(`/course/${id}`, { replace: true });
            return;
          }

          if (enrollRes.data && enrollRes.data.enrolled) {
            setCompletedLessons(enrollRes.data.completedLessonIds || []);
            setProgressPercent(enrollRes.data.progressPercent || 0);
            setModuleProgress(enrollRes.data.moduleProgress || []);
          }
        } catch(e) {
          const isStaff = userId && (
            userRole === 'admin' ||
            userRole === 'superadmin' ||
            (courseRes.data.course.instructor?._id || courseRes.data.course.instructor) === userId
          );
          if (!isStaff) {
            navigate(`/course/${id}`, { replace: true });
            return;
          }
        }

        const firstLesson = loadedModules.flatMap((m) => m.lessons || [])[0];
        if (firstLesson && !controller.signal.aborted) {
          handleSelectLesson(firstLesson._id, firstLesson.title);
        }
      } catch(err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message || 'Failed to load learning portal.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPortalData();
    return () => controller.abort();
  }, [handleSelectLesson, id, navigate, userId, userRole]);

  const toggleComplete = async (lessonId) => {
    try {
      // Opt out of optimistic UI for simplicity, rely on backend state
      const { data } = await api.patch(`/enrollments/${id}/lessons/${lessonId}/complete`);
      setCompletedLessons(data.completedLessonIds || []);
      setProgressPercent(data.progressPercent || 0);
      setModuleProgress(data.moduleProgress || []);
    } catch(err) {
      console.error('Failed to mark complete', err);
    }
  };

  const fetchQuestions = useCallback(async () => {
    try {
      setQuestionsLoading(true);
      const res = await api.get(`/engagement/course/${id}/questions`);
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setQuestionsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'qa') {
      fetchQuestions();
    }
  }, [activeTab, fetchQuestions]);

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    
    // Save locally for optimistic UI and instant clear
    const optimisticText = newQuestionText;
    setNewQuestionText('');
    notyf.success(t('student.learning.question_sent', 'Question sent successfully'));
    
    setSubmittingQuestion(true);
    try {
      const res = await api.post('/engagement/questions', { courseId: id, question: optimisticText });
      
      // Optimistically add to UI
      if (res.data.question) {
        const createdQuestion = res.data.question;
        createdQuestion.student = { _id: user?._id || user?.id, name: user?.name, avatarUrl: user?.avatarUrl };
        setQuestions(prev => [createdQuestion, ...prev]);
      }
      
      // Still fetch questions in the background to ensure consistency
      fetchQuestions();
      setQaMainTab('my_questions');
      setQaSubTab('pending');
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to submit question', err);
      notyf.error(t('student.learning.question_failed', 'Failed to send question'));
      setNewQuestionText(optimisticText); // Restore text on failure
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleEditSubmit = async (e, questionId) => {
    e.preventDefault();
    if (!editingQuestionText.trim()) return;
    try {
      await api.patch(`/engagement/questions/${questionId}`, { question: editingQuestionText });
      
      // Update local state instead of full refetch
      setQuestions(prev => prev.map(q => 
        q._id === questionId ? { ...q, question: editingQuestionText } : q
      ));
      
      notyf.success(t('student.learning.question_saved', 'Question saved successfully'));
      setEditingQuestionId(null);
      setEditingQuestionText('');
    } catch (err) {
      console.error('Failed to edit question', err);
      notyf.error(t('student.learning.generic_error', 'Something went wrong'));
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    setQuestionToDelete(questionId);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    try {
      await api.delete(`/engagement/questions/${questionToDelete}`);
      notyf.success(t('student.learning.question_deleted', 'Question deleted successfully'));
      setQuestions(prev => prev.filter(q => q._id !== questionToDelete));
      setQuestionToDelete(null);
    } catch (err) {
      console.error('Failed to delete question', err);
      notyf.error(t('student.learning.delete_failed', 'Failed to delete question'));
    }
  };

  if (loading) return (
    <div data-role="student" style={{ background: 'var(--bg-main)', minHeight: '100vh', width: '100%' }}>
      <FullPageLoader message={t('student.learning.loading_portal', 'Loading Learning Portal...')} />
    </div>
  );
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: 'red' }}>{t('student.learning.load_error', 'Failed to load learning portal.')}</div>;

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-main)" }}>
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
              style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px 0" }}>
              {course?.title}
            </h1>
            <div style={{ color: "var(--c-sub)", fontSize: "0.9rem" }}>
              {progressPercent}% {t('student.learning.complete', 'Complete')}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
          <div style={{ width: "1px", height: "24px", background: "var(--c-border-subtle)" }}></div>
          <button
            onClick={() => setIsCourseContentOpen(!isCourseContentOpen)}
            className={`sidebar-toggle-btn ${isCourseContentOpen ? 'active' : ''}`}
            title={t('student.learning.course_content', 'Course Content')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </button>
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
          {activeLesson?.lessonType === 'quiz' ? (
            <QuizPlayer
              courseId={id}
              lesson={activeLesson}
              onSubmitted={(data) => {
                setCompletedLessons(data.completedLessonIds || []);
                setProgressPercent(data.progressPercent || 0);
                setModuleProgress(data.moduleProgress || []);
              }}
            />
          ) : (
          <div
            style={{
              width: "100%",
              maxWidth: "960px",
              margin: "0 auto",
              background: "var(--bg-main)",
              aspectRatio: "16/9",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid var(--c-border-medium)",
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
            ) : activeVideoUrl && !videoError ? (
              <video
                key={activeVideoUrl}
                src={activeVideoUrl}
                controls
                autoPlay
                onError={() => setVideoError(true)}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ color: "white" }}>
                {videoError
                  ? t('student.learning.video_unsupported', "This video format isn't supported by your browser.")
                  : t('student.learning.video_unavailable', 'Video not available')}
              </div>
            )}
          </div>
          )}

          <div
            style={{
              padding: "32px",
              maxWidth: "900px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {activeLessonFlatIndex >= 0 && (
              <div style={{ color: "var(--c-sub)", fontSize: "0.9rem", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                {flatLessons[activeLessonFlatIndex].moduleTitle}
                {" • "}
                {t('student.learning.lesson_position', 'Lesson {{n}} of {{total}}', { n: activeLessonFlatIndex + 1, total: flatLessons.length })}
              </div>
            )}
            <h2 style={{ fontSize: "2rem", marginBottom: "16px" }}>
              {activeLesson?.title}
            </h2>
            <div
              style={{
                display: "flex",
                gap: "24px",
                borderBottom: "1px solid var(--c-border-medium)",
                paddingBottom: "12px",
                marginBottom: "24px",
                position: "relative"
              }}
            >
              <div style={{
                position: 'absolute',
                bottom: '-1px',
                insetInlineStart: activeTab === 'overview' ? '0' : activeTab === 'qa' ? '124px' : '208px',
                width: activeTab === 'overview' ? '100px' : activeTab === 'qa' ? '60px' : '120px',
                height: '2px',
                background: 'var(--text-primary)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 10
              }} />
              <button
                className={`nav-tab ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
                style={{ padding: 0, paddingBottom: "8px", width: "100px", justifyContent: "center", transition: 'color 0.3s ease', color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--c-sub)' }}
              >
                {t('student.learning.overview', 'Overview')}
              </button>
              <button
                className={`nav-tab ${activeTab === "qa" ? "active" : ""}`}
                onClick={() => setActiveTab("qa")}
                style={{ padding: 0, paddingBottom: "8px", width: "60px", justifyContent: "center", transition: 'color 0.3s ease', color: activeTab === 'qa' ? 'var(--text-primary)' : 'var(--c-sub)' }}
              >
                {t('student.learning.qa', 'Q&A')}
              </button>
              <button
                className={`nav-tab ${activeTab === "attachments" ? "active" : ""}`}
                onClick={() => setActiveTab("attachments")}
                style={{ padding: 0, paddingBottom: "8px", width: "120px", justifyContent: "center", transition: 'color 0.3s ease', color: activeTab === 'attachments' ? 'var(--text-primary)' : 'var(--c-sub)' }}
              >
                {t('student.learning.attachments', 'Attachments')}
              </button>
              <button
                className={`nav-tab ${activeTab === "announcements" ? "active" : ""}`}
                onClick={() => setActiveTab("announcements")}
                style={{ padding: 0, paddingBottom: "8px", width: "140px", justifyContent: "center", transition: 'color 0.3s ease', color: activeTab === 'announcements' ? 'var(--text-primary)' : 'var(--c-sub)' }}
              >
                {t('course.learning.announcements', 'Announcements')}
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
                  {activeLesson?.description || t('student.learning.lesson_placeholder', 'In this lesson, we will dive deep into the core concepts of Enterprise Architecture. You will learn how to structure large-scale applications so that they are maintainable, scalable, and easy for new developers to onboard onto. Make sure to download the attached cheat sheet before proceeding!')}
                </p>
              </div>
            )}

            {activeTab === "qa" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <form onSubmit={submitQuestion} style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
                  <textarea
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder={t('student.learning.ask_question_placeholder', 'Ask a question about this course...')}
                    className="ask-question-textarea"
                    required
                  />
                  <button
                    type="submit"
                    className="sys-btn-primary"
                    disabled={submittingQuestion}
                    style={{ alignSelf: "flex-end", padding: "8px 24px" }}
                  >
                    {submittingQuestion ? t('common.submitting', 'Submitting...') : t('student.learning.ask_question', 'Ask a Question')}
                  </button>
                </form>

                {/* Main QA Tabs */}
                <div style={{ display: 'flex', position: 'relative', borderBottom: '1px solid var(--c-border-subtle)', paddingBottom: '12px' }}>
                  <div style={{
                    position: 'absolute',
                    bottom: '-1px',
                    insetInlineStart: qaMainTab === 'my_questions' ? '0' : '135px',
                    width: qaMainTab === 'my_questions' ? '135px' : '185px',
                    height: '2px',
                    background: 'var(--text-primary)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 10
                  }} />
                  <button
                    onClick={() => { setQaMainTab('my_questions'); setCurrentPage(1); }}
                    style={{
                      width: '135px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 12px', fontSize: '1rem', fontWeight: qaMainTab === 'my_questions' ? '600' : '400',
                      color: qaMainTab === 'my_questions' ? 'var(--text-primary)' : 'var(--c-sub)',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {t('student.learning.my_questions', 'My Questions')}
                  </button>
                  <button
                    onClick={() => { setQaMainTab('student_questions'); setCurrentPage(1); }}
                    style={{
                      width: '185px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 12px', fontSize: '1rem', fontWeight: qaMainTab === 'student_questions' ? '600' : '400',
                      color: qaMainTab === 'student_questions' ? 'var(--text-primary)' : 'var(--c-sub)',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {t('student.learning.student_questions', "Students' Questions")}
                  </button>
                </div>

                {/* Sub QA Tabs (Only for My Questions) */}
                {qaMainTab === 'my_questions' && (
                  <div style={{ display: 'flex', position: 'relative', background: 'var(--bg-main)', padding: '6px', borderRadius: '12px', boxShadow: 'var(--inner-shadow)', width: '260px', marginBottom: '8px' }}>
                    <div style={{
                      position: 'absolute',
                      top: '6px', bottom: '6px',
                      insetInlineStart: qaSubTab === 'pending' ? '6px' : '130px',
                      width: '124px',
                      background: 'var(--bg-surface)',
                      borderRadius: '12px',
                      boxShadow: 'var(--outer-shadow)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                    <button
                      onClick={() => { setQaSubTab('pending'); setCurrentPage(1); }}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: '12px', border: 'none',
                        background: 'transparent', position: 'relative', zIndex: 1,
                        color: qaSubTab === 'pending' ? 'var(--text-h)' : 'var(--c-sub)',
                        cursor: 'pointer', fontWeight: qaSubTab === 'pending' ? '600' : '400',
                        transition: 'color 0.2s'
                      }}
                    >
                      {t('student.learning.pending_reply', 'Pending Reply')}
                    </button>
                    <button
                      onClick={() => { setQaSubTab('replied'); setCurrentPage(1); }}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: '12px', border: 'none',
                        background: 'transparent', position: 'relative', zIndex: 1,
                        color: qaSubTab === 'replied' ? 'var(--text-h)' : 'var(--c-sub)',
                        cursor: 'pointer', fontWeight: qaSubTab === 'replied' ? '600' : '400',
                        transition: 'color 0.2s'
                      }}
                    >
                      {t('student.learning.replied', 'Replied')}
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {(() => {
                    // Filter questions based on tabs
                    let filteredQuestions = [];
                    if (qaMainTab === 'my_questions') {
                      const myQuestions = questions.filter(q => q.student?._id === user?._id || q.student?._id === user?.id);
                      if (qaSubTab === 'pending') {
                        filteredQuestions = myQuestions.filter(q => q.status === 'pending');
                      } else {
                        filteredQuestions = myQuestions.filter(q => q.status === 'approved' || q.reply);
                      }
                    } else {
                      // Student questions (all approved)
                      filteredQuestions = questions.filter(q => q.status === 'approved' || q.reply);
                    }

                    // Pagination
                    const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                    const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                    return (
                      <>
                        {questionsLoading ? (
                          <div style={{ color: "var(--c-sub)", textAlign: "center", padding: "20px" }}>{t('student.learning.loading_questions', 'Loading questions...')}</div>
                        ) : filteredQuestions.length === 0 ? (
                          <div style={{ color: "var(--c-sub)", textAlign: "center", padding: "20px" }}>
                            {t('student.learning.no_questions', 'No questions found.')}
                          </div>
                        ) : (
                          paginatedQuestions.map(q => (
                            <div key={q._id} style={{
                        background: "var(--bg-surface)",
                        border: "none",
                        borderRadius: "12px",
                        padding: "25px",
                        boxShadow: "var(--inner-shadow)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                          <Link
                            to={`/student/${q.student?._id}`}
                            style={{ display: "inline-flex", borderRadius: "50%", flexShrink: 0 }}
                            aria-label={q.student?.name}
                          >
                            <img 
                              src={q.student?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(q.student?.name || 'User')}&background=random`}
                              alt={q.student?.name}
                              style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                            />
                          </Link>
                          <div>
                            <Link
                              to={`/student/${q.student?._id}`}
                              style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--c-light)", textDecoration: "none" }}
                            >
                              {q.student?.name || 'Unknown User'}
                            </Link>
                            <div style={{ fontSize: "0.75rem", color: "var(--c-sub)" }}>
                              {new Date(q.createdAt).toLocaleString(undefined, {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                          
                          {/* Edit / Delete Buttons for Student's own questions */}
                          {user && (q.student?._id === user._id || q.student?._id === user.id) && (
                            <div style={{ marginInlineStart: "auto", display: "flex", gap: "8px" }}>
                              {q.status === 'pending' && (
                                <button
                                  onClick={() => {
                                    setEditingQuestionId(q._id);
                                    setEditingQuestionText(q.question);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--color-accent)",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    padding: "4px"
                                  }}
                                >
                                  {t('common.edit', 'Edit')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteQuestion(q._id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--error, #ef4444)",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  padding: "4px"
                                }}
                              >
                                {t('common.delete', 'Delete')}
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {editingQuestionId === q._id ? (
                          <form onSubmit={(e) => handleEditSubmit(e, q._id)}>
                            <textarea
                              value={editingQuestionText}
                              onChange={(e) => setEditingQuestionText(e.target.value)}
                              rows="3"
                              required
                              className="ask-question-textarea"
                              style={{ 
                                marginTop: "12px",
                                background: "var(--bg-main)"
                              }}
                            />
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                              <button 
                                type="button"
                                onClick={() => { setEditingQuestionId(null); setEditingQuestionText(''); }}
                                style={{
                                  background: "none", border: "none", color: "var(--c-light)",
                                  padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem"
                                }}
                              >
                                {t('common.cancel', 'Cancel')}
                              </button>
                              <button 
                                type="submit"
                                style={{
                                  background: "none", border: "none", color: "#10B981",
                                  padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem"
                                }}
                              >
                                {t('common.save', 'Save')}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ color: "var(--c-light)", fontSize: "0.95rem", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                            {q.question}
                          </div>
                        )}
                        
                        {q.reply && (
                          <div style={{
                            marginTop: "16px",
                            padding: "16px 25px",
                            background: "rgba(16, 185, 129, 0.05)",
                            borderLeft: isRTL ? "none" : "3px solid #10B981",
                            borderRight: isRTL ? "3px solid #10B981" : "none",
                            borderRadius: isRTL ? "25px 0 25px 25px" : "0 25px 25px 25px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <img 
                                src={course?.instructor?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(course?.instructor?.name || 'Instructor')}&background=random`} 
                                alt={`${course?.instructor?.name || 'Instructor'}'s profile picture`}
                                style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} 
                              />
                              <Link
                                to={`/instructor/${course?.instructor?._id || course?.instructor?.id}`}
                                style={{ fontWeight: "600", fontSize: "0.85rem", color: "#10B981", textDecoration: "none" }}
                              >
                                {course?.instructor?.name ? `${course.instructor.name}` : 'Instructor Reply'}
                              </Link>
                              {q.repliedAt && (
                                <div style={{ fontSize: "0.75rem", color: "var(--c-sub)" }}>
                                  • {new Date(q.repliedAt).toLocaleString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>
                            <div style={{ color: "var(--c-light)", fontSize: "0.9rem", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                              {q.reply}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                
                {/* Pagination Controls */}
                {filteredQuestions.length > ITEMS_PER_PAGE && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--c-border-subtle)',
                        background: currentPage === 1 ? 'var(--bg-main)' : 'var(--bg-surface)',
                        color: currentPage === 1 ? 'var(--c-sub)' : 'var(--c-light)',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--c-border-subtle)',
                        background: currentPage === totalPages ? 'var(--bg-main)' : 'var(--bg-surface)',
                        color: currentPage === totalPages ? 'var(--c-sub)' : 'var(--c-light)',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    )}

            {activeTab === "attachments" && (
              <div>
                {activeLesson?.attachmentUrl ? (
                  <>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>
                      {t('student.learning.resources', 'Resources')}
                    </h3>
                    <div
                      className="saas-card"
                      onClick={() => window.open(activeLesson.attachmentUrl, "_blank")}
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
                            {activeLesson.attachmentTitle || 'Attachment'}
                          </div>
                          <div
                            style={{ fontSize: "0.85rem", color: "var(--c-sub)" }}
                          >
                            {t('student.learning.document', 'Document')}
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
                  </>
                ) : (
                  <p style={{ color: "var(--c-sub)" }}>
                    {t('student.learning.no_attachments', 'No attachments are available for this lesson.')}
                  </p>
                )}
              </div>
            )}

            {activeTab === "announcements" && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <CourseAnnouncementsTab courseId={id} user={user} />
              </div>
            )}

            {/* Previous / Next lesson navigation — crosses module boundaries */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "40px",
                paddingTop: "24px",
                borderTop: "1px solid var(--c-border-medium)",
              }}
            >
              <button
                onClick={() => previousLesson && handleSelectLesson(previousLesson._id, previousLesson.title)}
                disabled={!previousLesson}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: previousLesson ? "var(--bg-surface)" : "transparent",
                  color: previousLesson ? "var(--text-h)" : "var(--c-border-subtle)",
                  boxShadow: previousLesson ? "var(--outer-shadow)" : "none",
                  cursor: previousLesson ? "pointer" : "default",
                  visibility: previousLesson ? "visible" : "hidden",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}><polyline points="15 18 9 12 15 6" /></svg>
                {t('student.learning.previous_lesson', 'Previous Lesson')}
              </button>
              <button
                onClick={() => nextLesson && handleSelectLesson(nextLesson._id, nextLesson.title)}
                disabled={!nextLesson}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  border: "none",
                  background: nextLesson ? "linear-gradient(135deg, var(--c-orange), var(--c-yellow))" : "transparent",
                  color: nextLesson ? "#1a1a1a" : "var(--c-border-subtle)",
                  fontWeight: "600",
                  cursor: nextLesson ? "pointer" : "default",
                  visibility: nextLesson ? "visible" : "hidden",
                }}
              >
                {t('student.learning.next_lesson', 'Next Lesson')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ 
          width: isCourseContentOpen ? "280px" : "0px", 
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s", 
          overflow: "hidden", 
          borderLeft: isCourseContentOpen ? "1px solid var(--c-border-subtle)" : "0px solid transparent", 
          display: "flex", 
          flexDirection: "column", 
          backgroundColor: 'var(--bg-surface)' 
        }}>
          <div style={{ width: "280px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "16px 24px", background: "var(--c-bg-subtle)", fontWeight: "600", borderBottom: "1px solid var(--c-border-subtle)" }}>
                {t('student.learning.course_content', 'Course Content')}
              </div>

              {modules.map((module) => {
                const isModuleCollapsed = collapsedModules[module._id] !== false;
                const moduleLessons = module.lessons || [];
                const progress = moduleProgress.find((mp) => String(mp.moduleId) === String(module._id));

                return (
                  <div key={module._id} style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
                    <button
                      onClick={() => setCollapsedModules((prev) => ({ ...prev, [module._id]: !prev[module._id] }))}
                      style={{
                        width: "100%",
                        padding: "14px 24px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        textAlign: "start",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                        <span style={{ fontWeight: "600", color: "var(--text-h)", fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {module.title}
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transition: "transform 0.25s", transform: isModuleCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0, color: "var(--c-sub)" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                      {progress && progress.totalCount > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "4px", background: "var(--c-bg-hover)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${progress.percent}%`, height: "100%", background: "linear-gradient(90deg, var(--c-orange), var(--c-yellow))" }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--c-sub)" }}>{progress.percent}%</span>
                        </div>
                      )}
                    </button>

                    <div className={`expandable-section ${!isModuleCollapsed ? 'expanded' : ''}`}>
                      <div style={{ overflow: "hidden", position: "relative" }}>
                        {moduleLessons.map((lesson) => {
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
                                  // Quiz completion is only ever set by actually
                                  // submitting the quiz (see QuizPlayer) — this
                                  // checkmark is a status indicator for quizzes,
                                  // not a manual override, so grading can't be skipped.
                                  if (lesson.lessonType !== 'quiz') toggleComplete(lesson._id);
                                }}
                                title={lesson.lessonType === 'quiz' && !isCompleted ? t('student.learning.complete_via_quiz', 'Submit the quiz to complete this lesson') : undefined}
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
                                  cursor: lesson.lessonType === 'quiz' ? "default" : "pointer",
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
                                    fontWeight: isCurrent ? "600" : "400",
                                    color: isCurrent ? "var(--c-light)" : "var(--c-sub)",
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
                                  {lesson.lessonType === 'quiz' ? t('student.learning.quiz', 'Quiz') : t('student.learning.video', 'Video')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

  <ConfirmModal
        isOpen={!!questionToDelete}
        title={t('student.learning.delete_question_title', 'Delete Question')}
        message={t('student.learning.delete_question_msg', 'Are you sure you want to delete this question? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        intent="danger"
        onConfirm={confirmDelete}
        onCancel={() => setQuestionToDelete(null)}
      />
    </>
  );
}
