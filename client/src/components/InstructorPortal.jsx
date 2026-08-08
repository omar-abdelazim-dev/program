import { useState, useEffect } from 'react';
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
import InstructorEngagementTab from './InstructorEngagementTab';
import SettingsPage from './SettingsPage';
import InstructorFinancialsTab from './InstructorFinancialsTab';
import InstructorReviewsTab from './InstructorReviewsTab';
import { notyf } from './WebsiteManagement/SharedUI';
import { EXPLORE_CATEGORIES } from '../data/exploreCategories';
import { MAJORS, getMajor } from '../data/majors';
import { useTranslation } from 'react-i18next';

export default function InstructorPortal({ user, setUser, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [lessonsByCourse, setLessonsByCourse] = useState({});
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

  // Form states
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '', major: '', semester: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonData, setLessonData] = useState({ title: '', attachmentTitle: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/courses/mine');
      const myCourses = res.data.courses || [];
      setCourses(myCourses);

      // The owner-gated GET /api/courses/:id already returns { course, lessons },
      // so we can show real lesson visibility without any backend changes.
      const lessonEntries = await Promise.all(
        myCourses.map(async (c) => {
          try {
            const detail = await api.get(`/courses/${c._id}`);
            return [c._id, detail.data.lessons || []];
          } catch {
            return [c._id, []];
          }
        })
      );
      setLessonsByCourse(Object.fromEntries(lessonEntries));

      try {
        const statsRes = await api.get('/courses/stats');
        setStats(statsRes.data.courseStats || []);
        setTimeSeries(statsRes.data.timeSeriesData || []);
      } catch (statsErr) {
        console.error('Failed to load stats', statsErr);
      }
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
    if (!formData.title || !formData.description || formData.price === '' || formData.price === null || formData.price === undefined || !formData.category) {
      // NOTE: Using a generic message here since this is a quick alert. We can also add this to translations if needed.
      setError('Please fill in all required fields (Title, Description, Price, Category).');
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
        await api.put(`/courses/${editingCourse._id}`, {
          ...formData,
          price: Number(formData.price),
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
      setFormData({ title: '', description: '', price: '', category: '', major: '', semester: '' });
      setThumbnailFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSubmitting(false);
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
        await api.post(`/courses/${selectedCourseId}/lessons`, payload);
      }

      setShowLessonModal(false);
      setEditingLessonId(null);
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
          <button className={`sidebar-icon-btn ${activeTab === 'engagement' ? 'active' : ''}`} onClick={() => setActiveTab('engagement')} data-tooltip={t('instructor.nav.engagement')}>
            {/* Added i18n to Engagement tooltip title */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
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
            {/* Language Toggle */}
            <button
              className="utility-icon-btn"
              onClick={toggleLanguage}
              aria-label="Toggle language"
              style={{
                fontWeight: '600',
                fontSize: '0.9rem',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {i18n.language === "ar" ? "EN" : "AR"}
            </button>

            <button
              className="utility-icon-btn theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isLightMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="4"></circle>
                  <line x1="12" y1="2" x2="12" y2="4"></line>
                  <line x1="12" y1="20" x2="12" y2="22"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="2" y1="12" x2="4" y2="12"></line>
                  <line x1="20" y1="12" x2="22" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>

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
          </div>
        </header>

        {/* INSTRUCTOR CONTENT */}
        <div style={{ flex: 1, padding: '24px 40px 40px 40px', overflowY: 'auto', width: '100%' }}>
          <div style={{ maxWidth: activeTab === 'settings' ? '100%' : '1000px', width: '100%', margin: '0 auto' }}>
          
          {activeTab === 'curriculum' ? (
            <div className="animate-entrance">
              <CurriculumBuilderTab 
                courses={courses} 
                lessonsByCourse={lessonsByCourse} 
                onOpenAddLesson={(courseId) => {
                  setError('');
                  setSelectedCourseId(courseId);
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
                onEditCourse={(course) => {
                  setEditingCourse(course);
                  setFormData({
                    title: course.title,
                    description: course.description,
                    price: course.price,
                    category: course.category,
                    major: course.major || '',
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
              <InstructorEngagementTab courses={courses} />
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
                onClick={() => { setError(''); setEditingCourse(null); setFormData({ title: '', description: '', price: '', category: '', major: '', semester: '' }); setShowCreateModal(true); }}
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
                const lessons = lessonsByCourse[course._id] || [];
                return (
                  <div
                    key={course._id}
                    className="solid-card hover-glow"
                    style={{
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
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
                            {course.category}
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
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                boxShadow: "var(--inner-shadow)",
                                background:
                                  course.status === "approved"
                                    ? "rgba(16, 185, 129, 0.2)"
                                    : course.status === "rejected"
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(245, 158, 11, 0.2)",
                                color:
                                  course.status === "approved"
                                    ? "#10B981"
                                    : course.status === "rejected"
                                      ? "#ef4444"
                                      : "#F59E0B",
                              }}
                            >
                              {/* Translated Status Badges */}
                              {t(
                                `instructor.dashboard.status.${course.status}`,
                              ) || course.status.toUpperCase()}
                            </span>
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
                          {course.status === "rejected" &&
                            course.rejectionReason && (
                              <div
                                style={{
                                  boxShadow: "var(--inner-shadow)",
                                  marginTop: "8px",
                                  padding: "10px 12px",
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  borderRadius: "8px",
                                  fontSize: "0.85rem",
                                  color: "var(--text)",
                                  maxWidth: "480px",
                                }}
                              >
                                <span
                                  style={{ color: "#ef4444", fontWeight: 600 }}
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

                    {lessons.length > 0 && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border)",
                          paddingTop: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {lessons.map((lesson) => (
                          <div
                            key={lesson._id}
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                              fontSize: "0.9rem",
                              color: "var(--text)",
                            }}
                          >
                            <span
                              style={{
                                minWidth: "20px",
                                color: "var(--text-h)",
                                fontWeight: 600,
                              }}
                            >
                              {lesson.order}.
                            </span>
                            <span>{lesson.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                <label>{t('instructor.create_course.form.title')}</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.description')}</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('instructor.create_course.form.price')} (EGP)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>{t('instructor.create_course.form.category')}</label>
                  <CustomSelect
                    value={formData.category}
                    onChange={val => setFormData({...formData, category: val})}
                    placeholder={t('instructor.create_course.form.category_placeholder', 'Select a category')}
                    options={EXPLORE_CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>{t('instructor.create_course.form.major', 'Major (Optional)')}</label>
                  <CustomSelect
                    value={formData.major}
                    onChange={val => setFormData({...formData, major: val, semester: ''})}
                    placeholder={t('instructor.create_course.form.major_placeholder', "Not part of a major's curriculum")}
                    options={MAJORS.map(m => ({ value: m.id, label: m.label }))}
                  />
                  <div className="input-hint">{t('instructor.create_course.form.major_hint', "Lets this course appear on the Home page's major/semester sections.")}</div>
                </div>
                <div className="input-group">
                  <label>{t('instructor.create_course.form.semester', 'Semester (Optional)')}</label>
                  <CustomSelect
                    value={formData.semester ? String(formData.semester) : ''}
                    onChange={val => setFormData({...formData, semester: val})}
                    placeholder={formData.major ? t('instructor.create_course.form.semester_placeholder', 'Select a semester') : t('instructor.create_course.form.semester_placeholder_no_major', 'Select a major first')}
                    options={
                      getMajor(formData.major)
                        ? Array.from({ length: getMajor(formData.major).semesters }, (_, i) => i + 1)
                            .map(n => ({ value: String(n), label: t('instructor.create_course.form.semester_n', 'Semester {{n}}', { n }) }))
                        : []
                    }
                  />
                </div>
              </div>
              <div className="input-group">
                <label>{t('instructor.create_course.form.thumbnail')}</label>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
                <div className="input-hint">{t('instructor.create_course.leave_blank_placeholder')}</div>
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
      </main>
    </div>
  );
}



