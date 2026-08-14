import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import StudentLayout from './StudentLayout';
import FullPageLoader from './FullPageLoader';
import studentLogo from '../assets/logo.png';
import InstructorAnalyticsTab from './InstructorAnalyticsTab';
import CurriculumBuilderTab from './CurriculumBuilderTab';
import QuizBuilder from './QuizBuilder';
import InstructorEngagementTab from './InstructorEngagementTab';
import InstructorGradingTab from './InstructorGradingTab';
import SettingsPage from './SettingsPage';
import InstructorFinancialsTab from './InstructorFinancialsTab';
import InstructorReviewsTab from './InstructorReviewsTab';
import { notyf } from './WebsiteManagement/SharedUI';
import { EXPLORE_CATEGORIES } from '../data/exploreCategories';
import { MAJORS, getMajor } from '../data/majors';
import { COLLEGES } from '../data/colleges';
import { useTranslation } from 'react-i18next';

export default function InstructorPortal({ user, setUser, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    localStorage.setItem("instructor_lang", newLang);
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("instructor_lang");
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [quizBuilderContext, setQuizBuilderContext] = useState(null); // { courseId, moduleId, lesson } | null

  // Form states
  // INS-03: Replaced category/major with college
  const [formData, setFormData] = useState({ title: '', description: '', price: '', college: '', semester: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonData, setLessonData] = useState({ title: '', attachmentTitle: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [unreadEngagementCount, setUnreadEngagementCount] = useState(0);
  const [pendingGradingCount, setPendingGradingCount] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear all notifications', err);
    }
  };

  const clearNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to clear notification', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const unreadRes = await api.get('/engagement/questions/unread-count');
      setUnreadEngagementCount(unreadRes.data.count || 0);
    } catch (unreadErr) {
      console.error('Failed to load unread questions count', unreadErr);
    }
  };

  const fetchPendingGradingCount = async () => {
    try {
      const res = await api.get('/quiz-submissions?status=pending_review');
      setPendingGradingCount((res.data.submissions || []).length);
    } catch (err) {
      console.error('Failed to load pending grading count', err);
    }
  };

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/courses/mine');
      const myCourses = res.data.courses || [];
      setCourses(myCourses);

      // The owner-gated GET /api/courses/:id already returns { course, modules },
      // but only if the user is the instructor. Let's just do a series of fetches for now.
      const modulesMap = {};
      for (const c of myCourses) {
        try {
          const detail = await api.get(`/courses/${c._id}`);
          modulesMap[c._id] = detail.data.modules || [];
        } catch (err) {
          console.error(`Failed to load modules for course ${c._id}`, err);
        }
      }
      setModulesByCourse(modulesMap);

      try {
        const statsRes = await api.get('/courses/stats');
        setStats(statsRes.data.courseStats || []);
        setTimeSeries(statsRes.data.timeSeries || []);
      } catch (err) {
        console.error('Failed to load instructor stats', err);
      }
      
      fetchUnreadCount();
      fetchPendingGradingCount();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'instructor') {
      navigate('/');
      return;
    }
    fetchMyCourses();
  }, [user, navigate]);

  const handleSaveCourse = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError(t('instructor.create_course.form.title_required', 'Title is required.'));
      return;
    }
    if (!formData.description.trim()) {
      setError(t('instructor.create_course.form.description_required', 'Description is required.'));
      return;
    }
    // INS-05: Price is only settable during creation, skip validation if editing
    if (!editingCourse && (formData.price === '' || formData.price < 0)) {
      setError(t('instructor.create_course.form.price_required', 'A valid price is required.'));
      return;
    }
    if (!formData.college) {
      setError(t('instructor.create_course.form.college_required', 'College is required.'));
      return;
    }
    if (!formData.semester) {
      setError(t('instructor.create_course.form.semester_required', 'Semester is required.'));
      return;
    }
    if (!editingCourse && !thumbnailFile) {
      setError(t('instructor.create_course.form.thumbnail_required', 'Thumbnail image is required for new courses.'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let thumbnailUrl = editingCourse?.thumbnailUrl || '';
      if (thumbnailFile) {
        const fileData = new FormData();
        fileData.append('image', thumbnailFile);
        const uploadRes = await api.post('/uploads/image', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        thumbnailUrl = uploadRes.data.url;
      }

      if (editingCourse) {
        // INS-05: Remove price from the PUT payload entirely
        await api.put(`/courses/${editingCourse._id}`, {
          ...formData,
          thumbnailUrl
        });
        notyf.success(t('instructor.notyf.course_updated'));
      } else {
        await api.post('/courses', {
          ...formData,
          price: Number(formData.price),
          thumbnailUrl
        });
        notyf.success(t('instructor.notyf.course_created'));
      }
      
      setShowCreateModal(false);
      setEditingCourse(null);
      // INS-03: Resetting formData correctly without category/major
      setFormData({ title: '', description: '', price: '', college: '', semester: '' });
      setThumbnailFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepublish = async (courseId) => {
    try {
      await api.patch(`/courses/${courseId}/republish`);
      notyf.success(t('instructor.notyf.course_republished', 'Course submitted for review.'));
      fetchMyCourses();
    } catch (err) {
      console.error('Failed to republish course:', err);
      notyf.error(t('instructor.notyf.error', 'An error occurred.'));
    }
  };

  const handleTogglePublish = async (courseId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.patch(`/courses/${courseId}/publish`);
      if (res.data.course.status === 'approved') {
        notyf.success(t('instructor.notyf.course_live', 'Course is now live!'));
      } else {
        notyf.success(t('instructor.notyf.course_draft', 'Course set to draft.'));
      }
      fetchMyCourses();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
      notyf.error(err.response?.data?.message || 'Failed to update live status.');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await api.delete(`/courses/${courseId}`);
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
      }
      fetchMyCourses();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!lessonData.title) {
      setError('Please enter a lesson title.');
      return;
    }
    if (!videoFile && !editingLessonId) {
      setError('Please select a video file');
      return;
    }
    setSubmitting(true);
    setError('');
    setVideoUploadProgress(0);

    try {
      let videoUrl = undefined;
      if (videoFile) {
        // Video uploads go straight from the browser to Cloudinary — the
        // backend only signs the request, it never buffers the file. Keeps
        // large lecture videos off this server's memory/bandwidth entirely.
        const { data: sig } = await api.get('/uploads/video-signature');

        const cloudinaryForm = new FormData();
        cloudinaryForm.append('file', videoFile);
        cloudinaryForm.append('api_key', sig.apiKey);
        cloudinaryForm.append('timestamp', sig.timestamp);
        cloudinaryForm.append('signature', sig.signature);
        cloudinaryForm.append('folder', sig.folder);

        const uploadRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
          cloudinaryForm,
          {
            onUploadProgress: (evt) => {
              if (evt.total) setVideoUploadProgress(Math.round((evt.loaded / evt.total) * 100));
            },
          }
        );
        videoUrl = uploadRes.data.secure_url;
      }

      let attachmentUrl = undefined;
      if (attachmentFile) {
        const docData = new FormData();
        docData.append('document', attachmentFile);
        const docRes = await api.post('/uploads/document', docData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachmentUrl = docRes.data.url;
      }
      
      const payload = {
        title: lessonData.title,
        attachmentTitle: lessonData.attachmentTitle
      };
      if (videoUrl) payload.videoUrl = videoUrl;
      if (attachmentUrl) payload.attachmentUrl = attachmentUrl;

      if (editingLessonId) {
        await api.put(`/courses/${selectedCourseId}/lessons/${editingLessonId}`, payload);
      } else {
        await api.post(`/courses/${selectedCourseId}/modules/${selectedModuleId}/lessons`, payload);
      }

      setShowLessonModal(false);
      setEditingLessonId(null);
      setSelectedModuleId(null);
      setLessonData({ title: '', attachmentTitle: '' });
      setVideoFile(null);
      setAttachmentFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save lesson');
    } finally {
      setSubmitting(false);
      setVideoUploadProgress(0);
    }
  };

  // Guard the real UI render, not just the redirect effect above — otherwise
  // a wrong-role user briefly sees the full portal before the effect fires.
  if (user?.role !== 'instructor') {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Redirecting...</div>;
  }

  if (loading) return (
    <div data-role="instructor" style={{ background: 'var(--bg-main)', minHeight: '100vh', width: '100%' }}>
      <FullPageLoader message={t('instructor.loading')} />
    </div>
  );

  return (
    <div className="student-layout-wrapper" data-role="instructor">
      {/* SIDEBAR */}
      <aside className="student-sidebar">
        <div className="sidebar-logo">
          <Link
            to="/instructor"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <img
              src={studentLogo}
              alt="Program Logo"
              style={{
                marginTop: "10px",
                width: "100%",
                scale: '1.5',
                marginBottom: "0",
                objectFit: "contain",
                display: "block",
                transform: "scale(1.2)",
              }}
            />
          </Link>
        </div>

        <nav className="sidebar-nav-top">
          <button className={`sidebar-icon-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} data-tooltip={t('instructor.nav.dashboard')}>
            {/* Added i18n to Dashboard tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'curriculum' ? 'active' : ''}`} onClick={() => setActiveTab('curriculum')} data-tooltip={t('instructor.nav.curriculum')}>
            {/* Added i18n to Curriculum tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'engagement' ? 'active' : ''}`} style={{ position: 'relative' }} onClick={() => setActiveTab('engagement')} data-tooltip={t('instructor.nav.engagement')}>
            {/* Added i18n to Engagement tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {unreadEngagementCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {unreadEngagementCount > 99 ? '99+' : unreadEngagementCount}
              </span>
            )}
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'grading' ? 'active' : ''}`} style={{ position: 'relative' }} onClick={() => setActiveTab('grading')} data-tooltip={t('instructor.nav.grading', 'Grading')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {pendingGradingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {pendingGradingCount > 99 ? '99+' : pendingGradingCount}
              </span>
            )}
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')} data-tooltip={t('instructor.nav.reviews')}>
            {/* Added i18n to Reviews tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} data-tooltip={t('instructor.nav.analytics')}>
            {/* Added i18n to Analytics tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')} data-tooltip={t('instructor.nav.financials')}>
            {/* Added i18n to Financials tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </nav>
        
        <nav className="sidebar-nav-bottom">
          <button className={`sidebar-icon-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} data-tooltip={t('instructor.nav.settings')}>
            {/* Added i18n to Settings tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="student-main-area">
        {/* HEADER */}
        <header className="student-header">
          <div className="header-left">
            {/* Translated the Instructor Portal title with optional Program badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--text-h)', fontWeight: 'bold' }}>{t('instructor.header.title')}</span>
              {user?.isProgramInstructor && (
                <span className="program-badge-text" style={{ fontSize: '0.55rem', padding: '2px 8px' }}>PROGRAM</span>
              )}
            </div>
          </div>

          <div className="header-right">


            {/* Notifications */}
            {activeTab !== 'settings' && (
              <div className="profile-wrapper" ref={notificationsRef}>
                <button 
                  className="utility-icon-btn" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ position: 'relative' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                  {notifications.some(n => !n.read) && (
                    <span style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '8px', height: '8px', backgroundColor: '#ef4444',
                      borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg-surface)'
                    }}></span>
                  )}
                </button>
                {showNotifications && (
                  <div className="profile-dropdown" style={{ width: '350px' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)' }}>
                      <span style={{ color: 'var(--color-accent)', fontSize: '1.1rem' }}>{t('nav.notifications', 'Notifications')}</span>
                      {notifications.length > 0 && (
                        <button 
                          onClick={clearAllNotifications}
                          style={{ background: 'none', border: 'none', color: 'var(--c-sub)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {t('nav.clear_all', 'Clear All')}
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notifications.length > 0 ? notifications.map(notif => (
                        <div key={notif._id} style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: notif.read ? 'transparent' : 'rgba(16, 185, 129, 0.05)',
                          cursor: 'pointer',
                          position: 'relative'
                        }} onClick={async () => {
                          if (!notif.read) {
                            await api.patch(`/notifications/${notif._id}/read`);
                            fetchNotifications();
                          }
                        }}>
                          <div style={{
                            fontSize: '0.85rem',
                            marginBottom: '4px',
                            paddingRight: '20px',
                            ...(
                              (() => {
                                const titleLower = (notif.title || '').toLowerCase();
                                const typeLower = (notif.type || '').toLowerCase();

                                // 1. Course Suspended -> keep as is (#f59e0b)
                                if (titleLower.includes('suspended') || typeLower === 'suspended') {
                                  return { color: '#f59e0b', fontWeight: 700 };
                                }
                                // 2. Course Rejected -> red gradient
                                if (titleLower.includes('reject') || typeLower === 'rejected') {
                                  return {
                                    background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 700,
                                    display: 'inline-block'
                                  };
                                }
                                // 3. Course/Lesson Approval -> green gradient
                                if (titleLower.includes('approve') || titleLower.includes('approved') || typeLower.includes('approval')) {
                                  return {
                                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 700,
                                    display: 'inline-block'
                                  };
                                }
                                // 4. New Enroll -> orange gradient
                                if (titleLower.includes('enroll') || titleLower.includes('enrolled') || typeLower === 'enrollment') {
                                  return {
                                    background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 700,
                                    display: 'inline-block'
                                  };
                                }
                                // 5. New Comment -> blue gradient
                                if (titleLower.includes('comment') || titleLower.includes('question') || titleLower.includes('reply') || typeLower.startsWith('qa_')) {
                                  return {
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 700,
                                    display: 'inline-block'
                                  };
                                }
                                return { color: 'var(--text-h)', fontWeight: 600 };
                              })()
                            )
                          }}>
                            {(() => {
                              const title = notif.title || "";
                              if (title === 'Course Suspended') return t('notifications.course_suspended', 'Course Suspended');
                              if (title === 'Course Approved') return t('notifications.course_approved', 'Course Approved');
                              if (title === 'Course Submitted') return t('notifications.course_submitted', 'Course Submitted');
                              if (title === 'Course Rejected') return t('notifications.course_rejected', 'Course Rejected');
                              if (title === 'New Reply') return t('notifications.new_reply', 'New Reply');
                              if (title === 'New Student Enrollment') return t('notifications.new_student_enrollment', 'New Student Enrollment');
                              if (title.startsWith('New Admin Added')) return t('notifications.new_admin_added', 'New Admin Added');
                              if (title.startsWith('New Super Admin Added')) return t('notifications.new_super_admin_added', 'New Super Admin Added');

                              if (title.startsWith('New Question in ')) {
                                const courseTitle = title.replace('New Question in ', '');
                                return `${t('notifications.new_question_in', 'New Question in')} ${courseTitle}`;
                              }
                              if (title.startsWith('New Announcement: ')) {
                                const annTitle = title.replace('New Announcement: ', '');
                                return `${t('notifications.new_announcement', 'New Announcement')}: ${annTitle}`;
                              }

                              if (title.toLowerCase().includes('suspended')) return t('notifications.course_suspended', 'Course Suspended');
                              if (title.toLowerCase().includes('approved')) return t('notifications.course_approved', 'Course Approved');
                              if (title.toLowerCase().includes('rejected')) return t('notifications.course_rejected', 'Course Rejected');
                              if (title.toLowerCase().includes('submitted')) return t('notifications.course_submitted', 'Course Submitted');

                              return title;
                            })()}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                            {(() => {
                              let mainText = notif.message || "";
                              let hasRepublish = false;
                              let reasonText = "";

                              if (mainText.includes("Reason:")) {
                                const splitReason = mainText.split("Reason:");
                                mainText = splitReason[0];
                                reasonText = splitReason[1];
                              }

                              if (mainText.includes("You can republish")) {
                                const splitRepublish = mainText.split("You can republish");
                                mainText = splitRepublish[0];
                                hasRepublish = true;
                              }

                              let formattedMain = mainText.trim();
                              if (formattedMain.includes('has been suspended.')) {
                                const match = formattedMain.match(/Your course "([^"]+)" has been suspended\./);
                                if (match) {
                                  formattedMain = t('notifications.course_suspended_msg', { title: match[1], defaultValue: `Your course "${match[1]}" has been suspended.` });
                                }
                              } else if (formattedMain === 'A student asked a new question in your course.') {
                                formattedMain = t('notifications.new_question_msg', 'A student asked a new question in your course.');
                              } else if (formattedMain.includes('has been approved!')) {
                                const match = formattedMain.match(/Your course "([^"]+)" has been approved!/);
                                if (match) {
                                  formattedMain = t('notifications.course_approved_msg', { title: match[1], defaultValue: `Your course "${match[1]}" has been approved!` });
                                }
                              }

                              return (
                                <>
                                  {formattedMain}
                                  {hasRepublish && (
                                    <>
                                      <br />
                                      {t('notifications.republish_instructions', 'You can republish your course by clicking on the course card after resolving the suspended reason.')}
                                    </>
                                  )}
                                  {reasonText && (
                                    <>
                                      <br />
                                      <span style={{ color: '#ef4444' }}>{t('instructor.dashboard.status.reason', 'Reason')}:</span> {reasonText}
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(notif.createdAt).toLocaleDateString()}</div>
                          
                          <button
                            onClick={(e) => clearNotification(notif._id, e)}
                            style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            title={t('instructor.notifications.clear', 'Clear')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      )) : (
                        <div style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          {t('nav.no_notifications', 'No new notifications')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab !== 'settings' && (
              <div className="profile-wrapper">
                <button 
                  className="utility-icon-btn" 
                  onClick={() => setActiveTab('settings')}
                  data-tooltip={t('instructor.nav.settings')}
                  aria-label={t('instructor.nav.settings')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* INSTRUCTOR CONTENT */}
        <div style={{ flex: 1, padding: '24px 40px 40px 40px', overflowY: 'auto', width: '100%' }}>
          <div style={{ maxWidth: activeTab === 'settings' ? '100%' : '1000px', width: '100%', margin: '0 auto' }}>
          
          {activeTab === 'curriculum' ? (
            <div className="animate-entrance">
              <CurriculumBuilderTab
                courses={courses}
                modulesByCourse={modulesByCourse}
                onAction={fetchMyCourses}
                onOpenAddLesson={(courseId, moduleId) => {
                  setError('');
                  setSelectedCourseId(courseId);
                  setSelectedModuleId(moduleId);
                  setEditingLessonId(null);
                  setLessonData({ title: '', attachmentTitle: '' });
                  setVideoFile(null);
                  setAttachmentFile(null);
                  setShowLessonModal(true);
                }}
                onOpenEditLesson={(lesson) => {
                  setError('');
                  setEditingLessonId(lesson._id);
                  setLessonData({ title: lesson.title, attachmentTitle: lesson.attachmentTitle || '' });
                  setVideoFile(null);
                  setAttachmentFile(null);
                  setShowLessonModal(true);
                }}
                onOpenAddQuiz={(courseId, moduleId) => setQuizBuilderContext({ courseId, moduleId, lesson: null })}
                onOpenEditQuiz={(courseId, lesson) => setQuizBuilderContext({ courseId, moduleId: null, lesson })}
                onEditCourse={(course) => {
                  setEditingCourse(course);
                  setFormData({
                    title: course.title,
                    description: course.description,
                    price: course.price,
                    college: course.college || '', // INS-03: Initialize college from course data
                    semester: course.semester || ''
                  });
                  setThumbnailFile(null);
                  setShowCreateModal(true);
                }}
                onDeleteCourse={handleDeleteCourse}
              />
            </div>
          ) : activeTab === 'engagement' ? (
            <div className="animate-entrance">
              <InstructorEngagementTab courses={courses} onAction={fetchUnreadCount} />
            </div>
          ) : activeTab === 'grading' ? (
            <div className="animate-entrance">
              <InstructorGradingTab onAction={fetchPendingGradingCount} />
            </div>
          ) : activeTab === 'analytics' ? (
            <div className="animate-entrance">
              <InstructorAnalyticsTab 
                courses={courses}
                stats={stats} 
                timeSeries={timeSeries}
              />
            </div>
          ) : activeTab === 'financials' ? (
            <InstructorFinancialsTab user={user} />
          ) : activeTab === 'reviews' ? (
            <div className="animate-entrance">
              <InstructorReviewsTab />
            </div>
          ) : activeTab === 'settings' ? (
            <div className="animate-entrance">
              <SettingsPage 
                user={user} 
                setUser={setUser} 
                isLightMode={isLightMode} 
                toggleTheme={toggleTheme} 
                onLogout={onLogout} 
              />
            </div>
          ) : (
            <div className="animate-entrance">
            {/* STATS OVERVIEW */}
            <div className="stats-grid animate-entrance" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '24px', marginBottom: '48px' }}>
              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {/* Translated Total Revenue */}
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('instructor.analytics.total_revenue')}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  EGP {stats.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                </div>
              </div>
              
              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {/* Translated Total Enrollments */}
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('instructor.analytics.total_enrollments')}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #FBBF24, #FFD54A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stats.reduce((sum, s) => sum + s.enrolled, 0).toLocaleString()}
                </div>
              </div>

              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                {/* Translated Active Courses (mapped to total courses) */}
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{t('instructor.dashboard.total_courses')}</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{courses.length}</div>
              </div>
            </div>
              
              <div className="flex justify-between items-center mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              {/* Translated My Courses header */}
              <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-h)' }}>{t('instructor.dashboard.my_courses')}</h2>
              <button 
                // INS-03: Resetting formData correctly without category/major
                onClick={() => { setError(''); setEditingCourse(null); setFormData({ title: '', description: '', price: '', college: '', semester: '' }); setShowCreateModal(true); }}
                style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
              >
                {/* Translated Create New Course button */}
                {t('instructor.dashboard.create_course')}
              </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {courses.length === 0 ? (
              <div className="solid-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0 }}>
                  {t('instructor.no_courses', "You haven't created any courses yet. Start sharing your knowledge with the world!")}
                </p>
              </div>
            ) : (
              courses.map(course => {
                const lessons = (modulesByCourse[course._id] || []).flatMap(m => m.lessons || []);
                return (
                  <div
                    key={course._id}
                    className={`solid-card hover-glow ${course.status === 'suspended' ? 'clickable' : ''}`}
                    onClick={() => course.status === 'suspended' && handleRepublish(course._id)}
                    style={{
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      cursor: course.status === 'suspended' ? 'pointer' : 'default'
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "20px",
                          alignItems: "center",
                        }}
                      >
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            style={{
                              width: "120px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "120px",
                              height: "80px",
                              background:
                                "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                              borderRadius: "8px",
                            }}
                          ></div>
                        )}
                        <div>
                          <h3
                            style={{ fontSize: "1.3rem", margin: "0 0 8px 0" }}
                          >
                            {course.title}
                          </h3>
                          <div
                            style={{
                              color: "var(--text)",
                              fontSize: "0.95rem",
                            }}
                          >
                            {t("instructor.dashboard.price")}: EGP{" "}
                            {course.price} •{" "}
                            {t("instructor.dashboard.category")}:{" "}
                            {t(`categories.${course.category.replace(/\s+/g, '_').toLowerCase()}`, course.category)}
                          </div>
                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "50px",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                boxShadow: "var(--inner-shadow)",
                                background:
                                  course.status === "approved"
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : course.status === "draft"
                                      ? "rgba(59, 130, 246, 0.2)"
                                      : course.status === "rejected"
                                        ? "rgba(239, 68, 68, 0.2)"
                                        : "rgba(245, 158, 11, 0.2)",
                                color:
                                  course.status === "approved"
                                    ? "#10B981"
                                    : course.status === "draft"
                                      ? "#3B82F6"
                                      : course.status === "rejected"
                                        ? "#ef4444"
                                        : "#F59E0B",
                              }}
                            >
                              {course.status === "approved" ? "LIVE" : course.status === "draft" ? "DRAFT" : (t(`instructor.dashboard.status.${course.status}`) || course.status.toUpperCase())}
                            </span>

                            {course.status === "draft" && (
                              <button
                                onClick={(e) => handleTogglePublish(course._id, e)}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: "50px",
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "white",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                                }}
                              >
                                Go Live
                              </button>
                            )}

                            {course.status === "approved" && (
                              <button
                                onClick={(e) => handleTogglePublish(course._id, e)}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: "50px",
                                  background: "rgba(255, 255, 255, 0.08)",
                                  color: "var(--text-h)",
                                  border: "1px solid var(--border)",
                                  boxShadow: "var(--inner-shadow)",
                                  cursor: "pointer",
                                  fontSize: "0.75rem"
                                }}
                              >
                                Make Draft
                              </button>
                            )}

                            <span
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text)",
                              }}
                            >
                              {lessons.length === 0
                                ? t(
                                    "instructor.dashboard.status.no_lessons_yet",
                                  )
                                : `${lessons.length} ${lessons.length === 1 ? t("instructor.dashboard.status.lesson") : t("instructor.dashboard.status.lessons")}`}
                            </span>
                          </div>
                          {(course.status === "rejected" || course.status === "suspended") &&
                            course.rejectionReason && (
                              <div
                                style={{
                                  boxShadow: "var(--inner-shadow)",
                                  marginTop: "8px",
                                  padding: "6px 14px",
                                  background: course.status === "suspended" ? "rgba(245, 158, 11, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                  border: "none",
                                  borderRadius: "50px",
                                  fontSize: "0.85rem",
                                  color: "var(--text)",
                                  width: "fit-content",
                                }}
                              >
                                <span
                                  style={{ color: course.status === "suspended" ? "#f59e0b" : "#ef4444", fontWeight: 600 }}
                                >
                                  {t("instructor.dashboard.status.reason")}
                                  :{" "}
                                </span>
                                {course.rejectionReason}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Create / Edit Course Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>{editingCourse ? t('instructor.create_course.edit_title') : t('instructor.create_course.title')}</h2>
            
            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
            
            <form noValidate onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>{t('instructor.create_course.form.title')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={error && !formData.title.trim() ? 'input-error' : ''} />
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.description')} <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ minHeight: '100px', resize: 'vertical' }} className={error && !formData.description.trim() ? 'input-error' : ''} />
              </div>
              {/* INS-05: Hide the price input entirely if we are editing the course */}
              {!editingCourse && (
                <div className="input-row" style={{ marginBottom: '-16px' }}>
                  <div className="input-group">
                    <label>{t('instructor.create_course.form.price')} (EGP) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={error && formData.price === '' ? 'input-error' : ''} />
                  </div>
                  <div className="input-group" style={{ visibility: 'hidden' }}></div>
                </div>
              )}
              
              <div className="input-row">
                {/* INS-03: Replace category/major with college */}
                <div className="input-group">
                  <label>{t('instructor.create_course.form.college', 'College')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <CustomSelect
                    value={formData.college}
                    onChange={val => setFormData({...formData, college: val})}
                    placeholder={t('instructor.create_course.form.college_placeholder', 'Select a college')}
                    options={COLLEGES.map(c => ({ value: c.id, label: t(c.key, c.id) }))}
                  />
                </div>
                <div className="input-group">
                  <label>{t('instructor.create_course.form.semester', 'Semester')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <CustomSelect
                    value={formData.semester ? String(formData.semester) : ''}
                    onChange={val => setFormData({...formData, semester: val})}
                    placeholder={t('instructor.create_course.form.semester_placeholder', 'Select a semester')}
                    options={Array.from({ length: 12 }, (_, i) => i + 1).map(n => ({ value: String(n), label: t('instructor.create_course.form.semester_n', 'Semester {{n}}', { n }) }))}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.thumbnail')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input required={!editingCourse} type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
                <div className="input-hint">{editingCourse ? t('instructor.create_course.leave_blank_placeholder') : ''}</div>
              </div>
              
              <div className="input-row" style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingCourse(null); }} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
                <button type="submit" disabled={submitting} className="sys-btn-primary">
                  {submitting ? t('instructor.create_course.saving') : t('instructor.create_course.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '700px', padding: '32px' }}>
            {/* Translated Add Lesson Modal Title */}
            <h2 style={{ margin: '0 0 24px 0' }}>{editingLessonId ? t('instructor.curriculum.edit_lesson', 'Edit Lesson') : t('instructor.curriculum.add_lesson')}</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
            
            <form noValidate onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
                <div className="input-group">
                  <label>{t('instructor.curriculum.lesson_title')}</label>
                  <input required type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} placeholder={t('instructor.curriculum.ph_lesson_title')} />
                  <div className="input-hint">{t('instructor.curriculum.lessons_numbered_auto')}</div>
                </div>
                <div className="input-group">
                  <label>{t('instructor.curriculum.video_file')}</label>
                  <input required={!editingLessonId} type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                  <div className="input-hint">{editingLessonId ? t('instructor.curriculum.leave_blank_video') : t('instructor.curriculum.upload_cloudinary')}</div>
                  {submitting && videoFile && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ height: '6px', borderRadius: '999px', background: 'var(--c-border, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
                        <div style={{ width: `${videoUploadProgress}%`, height: '100%', background: 'var(--color-accent, #6B5DD3)', transition: 'width 0.2s ease' }} />
                      </div>
                      <div className="input-hint" style={{ marginTop: '4px' }}>
                        {videoUploadProgress < 100
                          ? t('instructor.curriculum.uploading_video', 'Uploading video… {{percent}}%', { percent: videoUploadProgress })
                          : t('instructor.curriculum.processing_video', 'Upload complete — saving lesson…')}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="input-group">
                  <label>{t('instructor.curriculum.attachment_title')}</label>
                  <input type="text" value={lessonData.attachmentTitle} onChange={e => setLessonData({...lessonData, attachmentTitle: e.target.value})} placeholder={t('instructor.curriculum.ph_attachment_title')} />
                </div>
                <div className="input-group">
                  <label>{t('instructor.curriculum.attachment_file')}</label>
                  <input type="file" onChange={e => setAttachmentFile(e.target.files[0])} />
                  <div className="input-hint">{editingLessonId ? t('instructor.curriculum.leave_blank_attachment') : t('instructor.curriculum.optional_doc')}</div>
                </div>
              </div>
              
              <div className="input-row" style={{ marginTop: '16px', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowLessonModal(false)} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
                <button type="submit" disabled={submitting} className="sys-btn-primary">
                  {/* Translated Saving / Add Lesson buttons */}
                  {submitting ? t('instructor.create_course.saving') : (editingLessonId ? t('instructor.curriculum.update_lesson') : t('instructor.curriculum.add_lesson'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {quizBuilderContext && (
        <QuizBuilder
          courseId={quizBuilderContext.courseId}
          moduleId={quizBuilderContext.moduleId}
          lesson={quizBuilderContext.lesson}
          onClose={() => setQuizBuilderContext(null)}
          onSaved={() => {
            setQuizBuilderContext(null);
            fetchMyCourses();
          }}
        />
      )}
      </main>
    </div>
  );
}



