import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import StudentLayout from './StudentLayout';
import FullPageLoader from './FullPageLoader';
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
import { ACADEMIC_TYPES, SCHOOL_LEVELS } from '../data/academicGroups';
import { useTranslation } from 'react-i18next';

export default function InstructorPortal({ user, setUser, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [modulesByCourse, setModulesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  }, [i18n, i18n.language]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [quizBuilderContext, setQuizBuilderContext] = useState(null); // { courseId, moduleId, lesson } | null
  const [showCourseTypeModal, setShowCourseTypeModal] = useState(false);
  const [priceChangeCourseId, setPriceChangeCourseId] = useState(null);
  const [priceChangeValue, setPriceChangeValue] = useState('');
  const [priceChangeSubmitting, setPriceChangeSubmitting] = useState(false);
  const [convertCourseId, setConvertCourseId] = useState(null);
  const [convertPriceValue, setConvertPriceValue] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  // Standalone related lessons (spec §11)
  const [standaloneManageCourse, setStandaloneManageCourse] = useState(null);
  const [standaloneLessons, setStandaloneLessons] = useState([]);
  const [showAddStandaloneForm, setShowAddStandaloneForm] = useState(false);
  const [standaloneForm, setStandaloneForm] = useState({ title: '', description: '', price: '' });
  const [standaloneVideoFile, setStandaloneVideoFile] = useState(null);
  const [standaloneUploadProgress, setStandaloneUploadProgress] = useState(0);
  const [standaloneSubmitting, setStandaloneSubmitting] = useState(false);

  // Form states
  // INS-03: Replaced category/major with college
  const [formData, setFormData] = useState({ title: '', description: '', price: '', college: '', academicType: 'college', academicGroup: '', semester: '', courseType: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonData, setLessonData] = useState({ title: '', attachmentTitle: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [unreadEngagementCount, setUnreadEngagementCount] = useState(0);
  const [financialSummary, setFinancialSummary] = useState({ availableBalance: 0, transactions: [] });
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

      const modulesMap = {};
      for (const c of myCourses) {
        try {
          const modRes = await api.get(`/courses/${c._id}`);
          modulesMap[c._id] = modRes.data.modules || [];
        } catch (mErr) {
          console.error(`Failed to load modules for course ${c._id}`, mErr);
          modulesMap[c._id] = [];
        }
      }
      setModulesByCourse(modulesMap);

      try {
        const statsRes = await api.get('/courses/stats');
        setStats(statsRes.data.courseStats || []);
        setTimeSeries(statsRes.data.timeSeriesData || statsRes.data.timeSeries || []);
      } catch (err) {
        console.error('Failed to load instructor stats', err);
      }
      
      try {
        const finRes = await api.get('/financials');
        setFinancialSummary({
          availableBalance: finRes.data.availableBalance || 0,
          pendingBalance: finRes.data.pendingBalance || 0,
          transactions: finRes.data.transactions || []
        });
      } catch (finErr) {
        console.error('Failed to load financial summary in portal', finErr);
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
    if (!editingCourse) {
      const price = Number(formData.price);
      const limits = formData.courseType === 'ongoing' ? [50, 500] : [250, 5000];
      if (!Number.isFinite(price) || price < limits[0] || price > limits[1]) {
        setError(formData.courseType === 'ongoing' ? 'Ongoing course price must be between 50 EGP and 500 EGP.' : 'Full course price must be between 250 EGP and 5000 EGP.');
        return;
      }
    }
    if (formData.academicType === 'college' && !formData.college) {
      setError('College is required for College / Major courses.');
      return;
    }
    if (formData.academicType === 'school' && !formData.academicGroup) {
      setError('School level is required for School courses.');
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
    if (!editingCourse && !formData.courseType) {
      setError(t('instructor.create_course.form.course_type_required', 'Choose a course type before creating this course.'));
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
      setFormData({ title: '', description: '', price: '', college: '', academicType: 'college', academicGroup: '', semester: '', courseType: '' });
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

  const handleRequestPriceChange = async (e) => {
    e.preventDefault();
    if (!priceChangeCourseId || priceChangeValue === '') return;
    setPriceChangeSubmitting(true);
    try {
      await api.post(`/courses/${priceChangeCourseId}/request-price-change`, { requestedPrice: Number(priceChangeValue) });
      notyf.success(t('instructor.dashboard.price_change.submitted', 'Price change requested — awaiting admin approval.'));
      setPriceChangeCourseId(null);
      setPriceChangeValue('');
      fetchMyCourses();
    } catch (err) {
      notyf.error(err.response?.data?.message || t('instructor.notyf.error', 'An error occurred.'));
    } finally {
      setPriceChangeSubmitting(false);
    }
  };

  const handleConvertToFull = async (e) => {
    e.preventDefault();
    if (!convertCourseId || convertPriceValue === '') return;
    setConvertSubmitting(true);
    try {
      await api.patch(`/courses/${convertCourseId}/convert-to-full`, { price: Number(convertPriceValue) });
      notyf.success(t('instructor.dashboard.convert.submitted', 'Course converted to Full Course and submitted for admin review.'));
      setConvertCourseId(null);
      setConvertPriceValue('');
      fetchMyCourses();
    } catch (err) {
      notyf.error(err.response?.data?.message || t('instructor.notyf.error', 'An error occurred.'));
    } finally {
      setConvertSubmitting(false);
    }
  };

  const fetchStandaloneLessonsForCourse = async (courseId) => {
    try {
      const { data } = await api.get('/standalone-lessons/mine');
      setStandaloneLessons((data.lessons || []).filter(l => l.relatedCourse?._id === courseId || l.relatedCourse === courseId));
    } catch (err) {
      console.error('Failed to load standalone lessons', err);
    }
  };

  const handleAddStandaloneLesson = async (e) => {
    e.preventDefault();
    if (!standaloneForm.title.trim() || !standaloneVideoFile || standaloneForm.price === '') return;
    setStandaloneSubmitting(true);
    setStandaloneUploadProgress(0);
    try {
      const { data: sig } = await api.get('/uploads/video-signature');
      const cloudinaryForm = new FormData();
      cloudinaryForm.append('file', standaloneVideoFile);
      cloudinaryForm.append('api_key', sig.apiKey);
      cloudinaryForm.append('timestamp', sig.timestamp);
      cloudinaryForm.append('signature', sig.signature);
      cloudinaryForm.append('folder', sig.folder);
      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`,
        cloudinaryForm,
        { onUploadProgress: (evt) => { if (evt.total) setStandaloneUploadProgress(Math.round((evt.loaded / evt.total) * 100)); } }
      );

      await api.post('/standalone-lessons', {
        title: standaloneForm.title,
        description: standaloneForm.description,
        relatedCourseId: standaloneManageCourse._id,
        price: Number(standaloneForm.price),
        videoUrl: uploadRes.data.secure_url,
      });
      notyf.success(t('instructor.curriculum.standalone.created', 'Standalone lesson submitted for admin review.'));
      setShowAddStandaloneForm(false);
      setStandaloneForm({ title: '', description: '', price: '' });
      setStandaloneVideoFile(null);
      fetchStandaloneLessonsForCourse(standaloneManageCourse._id);
    } catch (err) {
      notyf.error(err.response?.data?.message || t('instructor.notyf.error', 'An error occurred.'));
    } finally {
      setStandaloneSubmitting(false);
    }
  };

  const handleDeleteStandaloneLesson = async (lessonId) => {
    try {
      await api.delete(`/standalone-lessons/${lessonId}`);
      notyf.success(t('instructor.dashboard.actions.delete', 'Deleted'));
      fetchStandaloneLessonsForCourse(standaloneManageCourse._id);
    } catch (err) {
      notyf.error(err.response?.data?.message || t('instructor.notyf.error', 'An error occurred.'));
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
      notyf.success('Course deleted successfully');
      fetchMyCourses();
    } catch (err) {
      console.error('Failed to delete course:', err);
      notyf.error(err.response?.data?.message || 'Failed to delete course');
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
    <div className="student-layout-wrapper student-layout-topnav" data-role="instructor">
      {/* MAIN CONTENT AREA */}
      <main className="student-main-area">
        {/* INSTRUCTOR TOP HEADER */}
        <header className="student-header student-topnav-header" style={{ position: 'relative', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 36px', background: 'transparent', borderBottom: 'none', boxShadow: 'none' }}>
          {/* Very Left: Logo + Program Badge */}
          <div className="topnav-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/instructor" className="topnav-logo" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={isLightMode ? logoLight : logoDark}
                alt="Program Logo"
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            {user?.isProgramInstructor && (
              <span className="program-badge-text" style={{ fontSize: '0.55rem', padding: '2px 6px', letterSpacing: '0.08em' }}>{t('instructor.header.program_badge', 'PROGRAM')}</span>
            )}
          </div>

          {/* Center: Tabs in Floating Pill Capsule */}
          <div className="topnav-center">
            <div className="topnav-pill-capsule">
              <nav className="topnav-links">
                <button className={`topnav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  {t('instructor.nav.dashboard', 'Dashboard')}
                </button>
                <button className={`topnav-link ${activeTab === 'curriculum' ? 'active' : ''}`} onClick={() => { setSelectedCourseId(null); setActiveTab('curriculum'); }}>
                  {t('instructor.nav.curriculum', 'Curriculum')}
                </button>
                <button className={`topnav-link ${activeTab === 'engagement' ? 'active' : ''}`} onClick={() => setActiveTab('engagement')} style={{ position: 'relative' }}>
                  {t('instructor.nav.engagement', 'Engagement')}
                  {unreadEngagementCount > 0 && (
                    <span className="topnav-badge">{unreadEngagementCount > 99 ? '99+' : unreadEngagementCount}</span>
                  )}
                </button>
                <button className={`topnav-link ${activeTab === 'grading' ? 'active' : ''}`} onClick={() => setActiveTab('grading')} style={{ position: 'relative' }}>
                  {t('instructor.nav.grading', 'Grading')}
                  {pendingGradingCount > 0 && (
                    <span className="topnav-badge">{pendingGradingCount > 99 ? '99+' : pendingGradingCount}</span>
                  )}
                </button>
                <button className={`topnav-link ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
                  {t('instructor.nav.reviews', 'Reviews')}
                </button>
                <button className={`topnav-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                  {t('instructor.nav.analytics', 'Analytics')}
                </button>
                <button className={`topnav-link ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>
                  {t('instructor.nav.financials', 'Financials')}
                </button>
              </nav>
            </div>
          </div>

          {/* Very Right: Utility Icons */}
          <div className="topnav-right header-right">
            {/* Hamburger Toggle (Mobile) */}
            <button
              className={`topnav-hamburger ${mobileNavOpen ? "active" : ""}`}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={t('instructor.nav.toggle_navigation', 'Toggle navigation')}
            >
              {mobileNavOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>


            {/* Notifications */}
            {activeTab !== 'settings' && (
              <div className="profile-wrapper" ref={notificationsRef}>
                <button 
                  className="utility-icon-btn nav-icon-btn" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ position: 'relative' }}
                >
                  {notifications.some((n) => !n.read) ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 14h14a1 1 0 0 0 .707-1.707L19 11.586V8a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 4 0h-4z" />
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.73 21a2 2 0 0 1-3.46 0"
                      ></path>
                    </svg>
                  )}
                  {notifications.some(n => !n.read) && (
                    <span style={{
                      position: 'absolute', top: '4px', right: '4px',
                      width: '8px', height: '8px', backgroundColor: '#ef4444',
                      borderRadius: '50%', boxShadow: '0 0 0 2px var(--bg-surface)'
                    }}></span>
                  )}
                </button>
                {showNotifications && (
                  <div
                    className="profile-dropdown"
                    style={{
                      width: '350px',
                      top: 'calc(100% + 24px)',
                      padding: 0,
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}
                  >
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
                              if (title === 'Payout Request Received') return t('notifications.payout_received', 'Payout Request Received');
                              if (title === 'Payout Request Approved') return t('notifications.payout_approved', 'Payout Request Approved');
                              if (title === 'Payout Request Rejected') return t('notifications.payout_rejected', 'Payout Request Rejected');
                              if (title === 'New Payout Request') return t('notifications.new_payout_request', 'New Payout Request');
                              if (title === 'New Reply') return t('notifications.new_reply', 'New Reply');
                              if (title === 'New Student Enrollment') return t('notifications.new_student_enrollment', 'New Student Enrollment');
                              if (title === 'New quiz submission to grade') return t('notifications.new_quiz_submission', 'New quiz submission to grade');
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
                              } else if (formattedMain.includes('We have received your payout request')) {
                                formattedMain = t('notifications.payout_received_msg', 'We have received your payout request and it is now under review.');
                              } else if (formattedMain.includes('was rejected.')) {
                                const amtMatch = formattedMain.match(/payout request of EGP ([0-9,.]+)/);
                                const amt = amtMatch ? amtMatch[1] : '';
                                formattedMain = t('notifications.payout_rejected_msg', { amount: amt, defaultValue: `Your payout request of EGP ${amt} was rejected.` });
                              } else if (formattedMain.includes('has been approved and processed.')) {
                                const amtMatch = formattedMain.match(/payout request of EGP ([0-9,.]+)/);
                                const amt = amtMatch ? amtMatch[1] : '';
                                formattedMain = t('notifications.payout_approved_msg', { amount: amt, defaultValue: `Your payout request of EGP ${amt} has been approved and processed.` });
                              } else if (formattedMain.startsWith('A student submitted "') && formattedMain.includes(' — written answers need grading')) {
                                const parts = formattedMain.match(/A student submitted "([^"]+)" in "([^"]+)" — written answers need grading/);
                                if (parts) {
                                  formattedMain = t('notifications.quiz_submission_msg', { quiz: parts[1], course: parts[2], defaultValue: formattedMain });
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

            {/* Avatar Logo / User Profile */}
            <div
              className="profile-wrapper hover-glow"
              onClick={() => setActiveTab("settings")}
              style={{ cursor: "pointer" }}
              title={t("settings.nav.profile", "Profile")}
            >
              <div
                className="nav-avatar"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(249, 115, 22, 0.12)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "var(--inner-shadow)"
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.name || "Profile"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-accent, #f97316)" }}>
                    {user?.name?.[0]?.toUpperCase() || "I"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Nav Dropdown */}
        <nav className={`topnav-mobile-dropdown ${mobileNavOpen ? 'open' : 'closed'}`}>
          <div className="topnav-mobile-dropdown-inner">
            <button className={`topnav-mobile-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setMobileNavOpen(false); }}>
              {t('instructor.nav.dashboard', 'Dashboard')}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'curriculum' ? 'active' : ''}`} onClick={() => { setSelectedCourseId(null); setActiveTab('curriculum'); setMobileNavOpen(false); }}>
              {t('instructor.nav.curriculum', 'Curriculum')}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'engagement' ? 'active' : ''}`} onClick={() => { setActiveTab('engagement'); setMobileNavOpen(false); }}>
              {t('instructor.nav.engagement', 'Engagement')}
              {unreadEngagementCount > 0 && <span className="topnav-badge">{unreadEngagementCount > 99 ? '99+' : unreadEngagementCount}</span>}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'grading' ? 'active' : ''}`} onClick={() => { setActiveTab('grading'); setMobileNavOpen(false); }}>
              {t('instructor.nav.grading', 'Grading')}
              {pendingGradingCount > 0 && <span className="topnav-badge">{pendingGradingCount > 99 ? '99+' : pendingGradingCount}</span>}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => { setActiveTab('reviews'); setMobileNavOpen(false); }}>
              {t('instructor.nav.reviews', 'Reviews')}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); setMobileNavOpen(false); }}>
              {t('instructor.nav.analytics', 'Analytics')}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => { setActiveTab('financials'); setMobileNavOpen(false); }}>
              {t('instructor.nav.financials', 'Financials')}
            </button>
            <button className={`topnav-mobile-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMobileNavOpen(false); }}>
              {t('instructor.nav.settings', 'Settings')}
            </button>
          </div>
        </nav>

        {/* INSTRUCTOR CONTENT */}
        <div style={{ flex: 1, minHeight: 0, padding: '24px 40px 40px 40px', overflowY: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ maxWidth: activeTab === 'settings' ? '100%' : '1000px', width: '100%', margin: '0 auto' }}>
          
          {activeTab === 'curriculum' ? (
            <div className="animate-entrance">
              <CurriculumBuilderTab
                courses={courses}
                modulesByCourse={modulesByCourse}
                selectedCourseId={selectedCourseId}
                onSelectCourse={setSelectedCourseId}
                onAction={fetchMyCourses}
                onCreateCourse={() => { setError(''); setEditingCourse(null); setFormData({ title: '', description: '', price: '', college: '', academicType: 'college', academicGroup: '', semester: '', courseType: '' }); setShowCourseTypeModal(true); }}
                onTogglePublish={handleTogglePublish}
                onRepublish={handleRepublish}
                onRequestPriceChange={(course) => { setPriceChangeCourseId(course._id); setPriceChangeValue(String(course.price || '')); }}
                onConvertCourse={(course) => { setConvertCourseId(course._id); setConvertPriceValue(String(course.price || '')); }}
                onOpenStandaloneLessons={(course) => { setStandaloneManageCourse(course); setStandaloneLessons([]); fetchStandaloneLessonsForCourse(course._id); }}
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
                  setLessonData({
                    title: lesson.title,
                    attachmentTitle: lesson.attachmentTitle || '',
                    attachmentUrl: lesson.attachmentUrl || ''
                  });
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
                    academicType: course.academicType || 'college',
                    academicGroup: course.academicGroup || '',
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
            {(() => {
              const totalRevenue = financialSummary.transactions
                .filter(t => t.type === 'course_sale')
                .reduce((sum, t) => sum + t.amount, 0);

              const lastWithdrawTx = financialSummary.transactions.find(t => t.type === 'payout_request');
              const lastWithdrawDate = lastWithdrawTx
                ? new Date(lastWithdrawTx.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A';
              let nextWithdrawText = t('instructor.financials.available_now');
              if (lastWithdrawTx) {
                if (['otp_verified', 'approved', 'processing', 'pending'].includes(lastWithdrawTx.status)) {
                  nextWithdrawText = t('instructor.financials.under_review', 'Under Review');
                } else if (['cleared', 'paid'].includes(lastWithdrawTx.status)) {
                  const approvalDate = lastWithdrawTx.updatedAt || lastWithdrawTx.approvedAt || lastWithdrawTx.createdAt;
                  const nextTime = new Date(new Date(approvalDate).getTime() + 7 * 24 * 60 * 60 * 1000);
                  const diff = nextTime - new Date();
                  if (diff > 0) {
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    nextWithdrawText = i18n.language === 'ar' ? `${d}ي ${h}س ${m}د` : `${d}d ${h}h ${m}m`;
                  }
                }
              }

              // Calculate On-Site Cash (Pending Settlement)
              const onSiteCash = financialSummary.pendingBalance !== undefined
                ? financialSummary.pendingBalance
                : (financialSummary.transactions || [])
                    .filter(t => t.type === 'course_sale' && t.availableAt && new Date(t.availableAt) > new Date())
                    .reduce((sum, t) => sum + t.amount, 0);              return (
                <div className="animate-entrance" style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Row 1: Total Revenue & On-Site Cash (2 Columns) */}
                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: 0 }}>
                    {/* Total Revenue Card */}
                    <div className="stat-card solid-card" style={{ padding: '20px 24px', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('instructor.analytics.total_revenue')}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316' }}>
                        EGP {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* On-Site Cash (Pending) Card */}
                    <div className="stat-card solid-card" style={{ padding: '20px 24px', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                          {t('instructor.financials.onsite_cash')}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                          EGP {onSiteCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ color: 'var(--c-sub)', fontSize: '0.75rem' }}>
                        {t('instructor.financials.onsite_cash_help')}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Standalone Full-Width Ready to Withdraw Card */}
                  <div className="stat-card solid-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                          {t('instructor.financials.ready_to_withdraw')}
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981' }}>
                          EGP {financialSummary.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ textAlign: i18n.language === 'ar' ? 'left' : 'right' }}>
                        <div style={{ color: 'var(--c-sub)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                          {t('instructor.financials.next_withdrawal_in')}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>
                          {nextWithdrawText}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.last_withdrawal')}</span>
                      <strong style={{ color: 'var(--text-h)', fontWeight: 600 }}>{lastWithdrawDate}</strong>
                    </div>
                  </div>

                  {/* Row 3: Total Enrollments & Total Courses (2 Columns) */}
                  <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: 0 }}>
                    {/* Total Enrollments Card */}
                    <div className="stat-card solid-card" style={{ padding: '20px 24px', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('instructor.analytics.total_enrollments')}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
                        {stats.reduce((sum, s) => sum + s.enrolled, 0).toLocaleString()}
                      </div>
                    </div>

                    {/* Total Courses Card */}
                    <div className="stat-card solid-card" style={{ padding: '20px 24px', minHeight: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('instructor.dashboard.total_courses')}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-h)' }}>{courses.length}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
              
              {/* Dashboard Quick Navigation & Course Overview */}
              <div className="solid-card animate-entrance" style={{ padding: '28px', marginTop: '32px', borderRadius: '12px', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-h)' }}>{t('instructor.dashboard.my_courses')}</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--c-sub)', fontSize: '0.9rem' }}>
                      {t('instructor.dashboard.quick_access_desc', 'Manage your course materials, lessons, quizzes, and curriculum structure.')}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setSelectedCourseId(null);
                        setActiveTab('curriculum');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-main)',
                        boxShadow: 'var(--inner-shadow)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--text-h)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        width: 'auto',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; }}
                    >
                      <span>{t('instructor.dashboard.go_to_curriculum', 'Go to Curriculum')}</span>
                      <span>{i18n.language === 'ar' ? '←' : '→'}</span>
                    </button>
                  </div>
                </div>

                {courses.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--c-sub)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      {t('instructor.no_courses', "You haven't created any courses yet. Start sharing your knowledge with the world!")}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {courses.slice(0, 5).map(course => {
                      const modules = modulesByCourse[course._id] || [];
                      const lessonCount = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
                      return (
                        <div
                          key={course._id}
                          onClick={() => {
                            setSelectedCourseId(course._id);
                            setActiveTab('curriculum');
                          }}
                          className="hover-glow"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            background: 'var(--bg-main)',
                            boxShadow: 'var(--inner-shadow)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                            {course.thumbnailUrl ? (
                              <img
                                src={course.thumbnailUrl}
                                alt={course.title}
                                style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: '60px', height: '40px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px', flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {course.title}
                              </h4>
                              <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '2px' }}>
                                {lessonCount} {lessonCount === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')} · EGP {course.price}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                boxShadow: 'var(--inner-shadow)',
                                background: course.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                color: course.status === 'approved' ? '#10B981' : '#3B82F6'
                              }}
                            >
                              {course.status === 'approved' ? t('instructor.dashboard.status.live', 'LIVE') : t('instructor.dashboard.status.draft', 'DRAFT')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Type Picker — shown before the create form for brand-new courses only; type is immutable after creation */}
      {showCourseTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>{t('instructor.create_course.choose_type_title', 'Choose Course Type')}</h2>
              <button
                type="button"
                onClick={() => setShowCourseTypeModal(false)}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text)' }}>{t('instructor.create_course.choose_type_subtitle', 'This cannot be changed once the course is created.')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                type="button"
                className="solid-card"
                onClick={() => { setFormData({ ...formData, courseType: 'full' }); setShowCourseTypeModal(false); setShowCreateModal(true); }}
                style={{ textAlign: 'left', padding: '20px', cursor: 'pointer', border: 'none' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{t('instructor.create_course.full_course_title', 'Full Course')}</div>
                <div style={{ color: 'var(--text)' }}>{t('instructor.create_course.full_course_desc', 'Complete your course before submitting it for review. Once published, it\'s locked — no further modules or lessons can be added.')}</div>
              </button>
              <button
                type="button"
                className="solid-card"
                onClick={() => { setFormData({ ...formData, courseType: 'ongoing' }); setShowCourseTypeModal(false); setShowCreateModal(true); }}
                style={{ textAlign: 'left', padding: '20px', cursor: 'pointer', border: 'none' }}
              >
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{t('instructor.create_course.ongoing_course_title', 'Ongoing Course')}</div>
                <div style={{ color: 'var(--text)' }}>{t('instructor.create_course.ongoing_course_desc', 'Build your course progressively and publish new content over time. Requires at least one new lesson every 14 days to stay active.')}</div>
              </button>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button type="button" onClick={() => setShowCourseTypeModal(false)} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Price Change Modal (Full Courses only — spec §5) */}
      {priceChangeCourseId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '440px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>{t('instructor.dashboard.price_change.title', 'Request Price Change')}</h2>
              <button
                type="button"
                onClick={() => { setPriceChangeCourseId(null); setPriceChangeValue(''); }}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '0.9rem' }}>
              {t('instructor.dashboard.price_change.subtitle', 'The public price stays the same until an admin approves this request.')}
            </p>
            <form onSubmit={handleRequestPriceChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>{t('instructor.dashboard.price_change.requested_price', 'Requested Price (EGP)')}</label>
                <input required type="number" min="0" value={priceChangeValue} onChange={e => setPriceChangeValue(e.target.value)} />
              </div>
              <div className="input-row" style={{ marginTop: '8px' }}>
                <button type="button" onClick={() => { setPriceChangeCourseId(null); setPriceChangeValue(''); }} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
                <button type="submit" disabled={priceChangeSubmitting} className="sys-btn-primary">
                  {priceChangeSubmitting ? t('instructor.create_course.saving') : t('instructor.dashboard.price_change.submit', 'Submit Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Ongoing -> Full Course Modal (spec §9 Option 4) */}
      {convertCourseId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '440px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>{t('instructor.dashboard.convert.title', 'Convert to Full Course')}</h2>
              <button
                type="button"
                onClick={() => { setConvertCourseId(null); setConvertPriceValue(''); }}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '0.9rem' }}>
              {t('instructor.dashboard.convert.subtitle', 'This course will be resubmitted for admin review as a Full Course, using the price you set here. Once approved and published, no further modules or lessons can be added.')}
            </p>
            <form onSubmit={handleConvertToFull} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>{t('instructor.dashboard.convert.full_price', 'Full Course Price (EGP)')}</label>
                <input required type="number" min="0" value={convertPriceValue} onChange={e => setConvertPriceValue(e.target.value)} />
              </div>
              <div className="input-row" style={{ marginTop: '8px' }}>
                <button type="button" onClick={() => { setConvertCourseId(null); setConvertPriceValue(''); }} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
                <button type="submit" disabled={convertSubmitting} className="sys-btn-primary">
                  {convertSubmitting ? t('instructor.create_course.saving') : t('instructor.dashboard.convert.submit', 'Convert & Submit for Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Related Lessons Manager (spec §11) */}
      {standaloneManageCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ margin: 0 }}>{t('instructor.curriculum.standalone.title', 'Standalone Lessons')}</h2>
              <button
                type="button"
                onClick={() => { setStandaloneManageCourse(null); setStandaloneLessons([]); }}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text)', fontSize: '0.9rem' }}>
              {t('course_page.standalone.related_to', 'Related to: {{course}}', { course: standaloneManageCourse.title })}
            </p>

            {!showAddStandaloneForm ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {standaloneLessons.length === 0 ? (
                    <p style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{t('instructor.curriculum.standalone.none_yet', 'No standalone lessons yet.')}</p>
                  ) : (
                    standaloneLessons.map((lesson) => (
                      <div key={lesson._id} className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{lesson.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>
                            EGP {lesson.price} · {t(`instructor.dashboard.status.${lesson.status}`, lesson.status)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStandaloneLesson(lesson._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {t('instructor.dashboard.actions.delete', 'Delete')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="input-row">
                  <button type="button" onClick={() => { setStandaloneManageCourse(null); setStandaloneLessons([]); }} className="sys-btn-secondary">
                    {t('instructor.create_course.cancel', 'Close')}
                  </button>
                  <button type="button" onClick={() => setShowAddStandaloneForm(true)} className="sys-btn-primary">
                    {t('instructor.curriculum.standalone.add', '+ Add Standalone Lesson')}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleAddStandaloneLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label>{t('instructor.curriculum.lesson_title')}</label>
                  <input required type="text" value={standaloneForm.title} onChange={e => setStandaloneForm({ ...standaloneForm, title: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>{t('instructor.create_course.form.description')}</label>
                  <textarea required value={standaloneForm.description} onChange={e => setStandaloneForm({ ...standaloneForm, description: e.target.value })} style={{ minHeight: '80px' }} />
                </div>
                <div className="input-group">
                  <label>{t('instructor.dashboard.price')} (EGP)</label>
                  <input required type="number" min="0" value={standaloneForm.price} onChange={e => setStandaloneForm({ ...standaloneForm, price: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>{t('instructor.curriculum.video_file')}</label>
                  <input required type="file" accept="video/*" onChange={e => setStandaloneVideoFile(e.target.files[0])} />
                  {standaloneSubmitting && standaloneUploadProgress > 0 && (
                    <div className="input-hint">{t('instructor.curriculum.uploading_video', 'Uploading video… {{percent}}%', { percent: standaloneUploadProgress })}</div>
                  )}
                </div>
                <div className="input-row" style={{ marginTop: '8px' }}>
                  <button type="button" onClick={() => setShowAddStandaloneForm(false)} className="sys-btn-secondary">{t('instructor.create_course.cancel')}</button>
                  <button type="submit" disabled={standaloneSubmitting} className="sys-btn-primary">
                    {standaloneSubmitting ? t('instructor.create_course.saving') : t('instructor.create_course.save', 'Save')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Course Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '560px', padding: '20px 24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{editingCourse ? t('instructor.create_course.edit_title') : t('instructor.create_course.title')}</h2>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingCourse(null); }}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>

            {!editingCourse && formData.courseType && (
              <div style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '0.82rem' }}>
                {formData.courseType === 'full'
                  ? t('instructor.create_course.full_course_title', 'Full Course')
                  : t('instructor.create_course.ongoing_course_title', 'Ongoing Course')}
                {' · '}
                <button type="button" onClick={() => { setShowCreateModal(false); setShowCourseTypeModal(true); }} style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                  {t('instructor.create_course.change_type', 'Change')}
                </button>
              </div>
            )}

            {error && <div className="error-message" style={{ marginBottom: '10px' }}>{error}</div>}
            
            <form noValidate onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="input-group">
                <label>{t('instructor.create_course.form.title')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={error && !formData.title.trim() ? 'input-error' : ''} />
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.description')} <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ minHeight: '52px', height: '52px', resize: 'none' }} className={error && !formData.description.trim() ? 'input-error' : ''} />
              </div>
              {/* INS-05: Hide the price input entirely if we are editing the course */}
              {!editingCourse && (
                <div className="input-row" style={{ marginBottom: '-10px' }}>
                  <div className="input-group">
                    <label>{t('instructor.create_course.form.price')} (EGP) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required type="number" min={formData.courseType === 'ongoing' ? 50 : 250} max={formData.courseType === 'ongoing' ? 500 : 5000} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={error && formData.price === '' ? 'input-error' : ''} />
                    <div className="input-hint">{formData.courseType === 'ongoing' ? 'Minimum 50 EGP — Maximum 500 EGP' : 'Minimum 250 EGP — Maximum 5000 EGP'}</div>
                  </div>
                  <div className="input-group" style={{ visibility: 'hidden' }}></div>
                </div>
              )}
              
              <div className="input-row">
                <div className="input-group">
                  <label>Academic Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <CustomSelect
                    value={formData.academicType}
                    onChange={val => setFormData(current => ({ ...current, academicType: val, academicGroup: '', college: val === 'school' ? '' : current.college }))}
                    placeholder="Select academic type"
                    options={ACADEMIC_TYPES.map(({ id, label }) => ({ value: id, label }))}
                  />
                </div>
                {formData.academicType === 'college' ? <div className="input-row">
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
                  <CustomSelect value={formData.semester ? String(formData.semester) : ''} onChange={val => setFormData({...formData, semester: val})} placeholder={t('instructor.create_course.form.semester_placeholder', 'Select a semester')} options={Array.from({ length: 12 }, (_, i) => i + 1).map(n => ({ value: String(n), label: `Semester ${n}` }))} />
                </div>
                </div> : <div className="input-row">
                <div className="input-group">
                  <label>School Level <span style={{ color: '#ef4444' }}>*</span></label>
                  <CustomSelect
                    value={formData.academicGroup}
                    onChange={val => setFormData(current => ({ ...current, academicGroup: val }))}
                    placeholder="Select school level"
                    options={SCHOOL_LEVELS.map(({ id, label }) => ({ value: id, label }))}
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
                </div>}
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.thumbnail')} <span style={{ color: '#ef4444' }}>*</span></label>
                <input required={!editingCourse} type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
                <div className="input-hint" style={{ marginTop: '2px', fontSize: '0.75rem' }}>{editingCourse ? t('instructor.create_course.leave_blank_placeholder') : ''}</div>
              </div>
              
              <div className="input-row" style={{ marginTop: '4px' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '700px', padding: '32px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>{editingLessonId ? t('instructor.curriculum.edit_lesson', 'Edit Lesson') : t('instructor.curriculum.add_lesson')}</h2>
              <button
                type="button"
                onClick={() => { setShowLessonModal(false); setEditingLessonId(null); }}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
            
            <form noValidate onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>{t('instructor.curriculum.lesson_title')}</label>
                <input required type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} placeholder={t('instructor.curriculum.ph_lesson_title')} />
                <div className="input-hint">{t('instructor.curriculum.lessons_numbered_auto')}</div>
              </div>

              {!editingLessonId && (
                <div className="input-group">
                  <label>{t('instructor.curriculum.video_file')}</label>
                  <input required type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                  <div className="input-hint">{t('instructor.curriculum.upload_cloudinary')}</div>
                  {submitting && videoFile && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ height: '6px', borderRadius: '12px', background: 'var(--c-border, rgba(255,255,255,0.1))', overflow: 'hidden' }}>
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
              )}
              
              {/* PDF / Document Attachment Section */}
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                    📎 {t('instructor.curriculum.attachment_section', 'PDF / Document Attachment')}
                  </span>
                  {lessonData.attachmentUrl && (
                    <a
                      href={lessonData.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'underline' }}
                    >
                      {t('instructor.curriculum.view_current_pdf', 'View current PDF')} ↗
                    </a>
                  )}
                </div>

                <div className="input-group">
                  <label>{t('instructor.curriculum.attachment_title', 'Attachment Title')}</label>
                  <input
                    type="text"
                    value={lessonData.attachmentTitle}
                    onChange={e => setLessonData({...lessonData, attachmentTitle: e.target.value})}
                    placeholder={t('instructor.curriculum.ph_attachment_title', 'e.g. Lecture Slides / Exercise Sheet')}
                  />
                </div>

                <div className="input-group">
                  <label>{lessonData.attachmentUrl ? t('instructor.curriculum.replace_pdf', 'Upload New / Replace PDF') : t('instructor.curriculum.upload_pdf', 'Upload PDF / File')}</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                    onChange={e => setAttachmentFile(e.target.files[0])}
                  />
                  <div className="input-hint" style={{ fontSize: '0.78rem' }}>
                    {editingLessonId
                      ? t('instructor.curriculum.leave_blank_attachment', 'Choose a new file to upload/replace, or leave empty to keep the existing one.')
                      : t('instructor.curriculum.optional_doc', 'Attach supplemental documents (PDF, DOCX, ZIP).')}
                  </div>
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
