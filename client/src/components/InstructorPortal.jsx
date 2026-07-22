import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import studentLogo from '../assets/logo.png';
import InstructorAnalyticsTab from './InstructorAnalyticsTab';
import CurriculumBuilderTab from './CurriculumBuilderTab';
import InstructorEngagementTab from './InstructorEngagementTab';
import SettingsPage from './SettingsPage';
import InstructorFinancialsTab from './InstructorFinancialsTab';
import InstructorReviewsTab from './InstructorReviewsTab';
import { notyf } from './WebsiteManagement/SharedUI';

export default function InstructorPortal({ user, setUser, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const [lessonData, setLessonData] = useState({ title: '' });
  const [videoFile, setVideoFile] = useState(null);

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
        notyf.success('Course updated successfully!');
      } else {
        await api.post('/courses', {
          ...formData,
          price: Number(formData.price),
          thumbnailUrl
        });
        notyf.success('Course created successfully!');
      }
      
      setShowCreateModal(false);
      setEditingCourse(null);
      setFormData({ title: '', description: '', price: '', category: '' });
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

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Please select a video file');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const fileData = new FormData();
      fileData.append('video', videoFile);
      const uploadRes = await api.post('/uploads/video', fileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await api.post(`/courses/${selectedCourseId}/lessons`, {
        title: lessonData.title,
        videoUrl: uploadRes.data.url
      });

      setShowLessonModal(false);
      setLessonData({ title: '' });
      setVideoFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add lesson');
    } finally {
      setSubmitting(false);
    }
  };

  // Guard the real UI render, not just the redirect effect above — otherwise
  // a wrong-role user briefly sees the full portal before the effect fires.
  if (user?.role !== 'instructor') {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Redirecting...</div>;
  }

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Instructor Portal...</div>;

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
                width: "44px",
                marginBottom: "0",
                objectFit: "contain",
                display: "block",
                scale: "4",
              }}
            />
          </Link>
        </div>

        <nav className="sidebar-nav-top">
          <button className={`sidebar-icon-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'curriculum' ? 'active' : ''}`} onClick={() => setActiveTab('curriculum')} title="Curriculum">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'engagement' ? 'active' : ''}`} onClick={() => setActiveTab('engagement')} title="Engagement">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')} title="Reviews">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} title="Analytics">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button className={`sidebar-icon-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')} title="Financials">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </nav>
        
        <nav className="sidebar-nav-bottom">
          <button className={`sidebar-icon-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title="Settings">
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
            <span style={{ fontSize: '1.2rem', color: 'var(--text-h)', fontWeight: 'bold' }}>Instructor Portal</span>
          </div>

          <div className="header-right">
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
                title="Settings"
                aria-label="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
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
                  setShowLessonModal(true);
                }}
                onEditCourse={(course) => {
                  setEditingCourse(course);
                  setFormData({
                    title: course.title,
                    description: course.description,
                    price: course.price,
                    category: course.category
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
            <div className="stats-grid animate-entrance" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Revenue</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  EGP {stats.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                </div>
              </div>
              
              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Enrollments</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #FBBF24, #FFD54A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stats.reduce((sum, s) => sum + s.enrolled, 0).toLocaleString()}
                </div>
              </div>

              <div className="stat-card solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Active Courses</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: 'auto', background: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{courses.length}</div>
              </div>
            </div>
              
              <div className="flex justify-between items-center mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-h)' }}>My Courses</h2>
              <button onClick={() => { setError(''); setEditingCourse(null); setFormData({ title: '', description: '', price: '', category: '' }); setShowCreateModal(true); }} className="sys-btn-primary" style={{ width: 'auto' }}>
                + Create New Course
              </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {courses.length === 0 ? (
              <div className="solid-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0 }}>
                  You haven't created any courses yet. Start sharing your knowledge with the world!
                </p>
              </div>
            ) : (
              courses.map(course => {
                const lessons = lessonsByCourse[course._id] || [];
                return (
                <div key={course._id} className="solid-card hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ width: '120px', height: '80px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px' }}></div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '1.3rem', margin: '0 0 8px 0' }}>{course.title}</h3>
                        <div style={{ color: 'var(--text)', fontSize: '0.95rem' }}>Price: EGP {course.price} • Category: {course.category}</div>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            background: course.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : course.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: course.status === 'approved' ? '#10B981' : course.status === 'rejected' ? '#ef4444' : '#F59E0B'
                          }}>
                            {course.status.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                            {lessons.length === 0 ? 'No lessons yet' : `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`}
                          </span>
                        </div>
                        {course.status === 'rejected' && course.rejectionReason && (
                          <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text)', maxWidth: '480px' }}>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Reason: </span>
                            {course.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {lessons.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {lessons.map(lesson => (
                        <div key={lesson._id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text)' }}>
                          <span style={{ minWidth: '20px', color: 'var(--text-h)', fontWeight: 600 }}>{lesson.order}.</span>
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
            <h2 style={{ margin: '0 0 24px 0' }}>{editingCourse ? 'Edit Course' : 'Create New Course'}</h2>
            
            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
            
            <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>Course Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Advanced React Patterns" />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ minHeight: '100px', resize: 'vertical' }} placeholder="What will students learn?" />
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>Price (EGP)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 500" />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <CustomSelect 
                    value={formData.category} 
                    onChange={val => setFormData({...formData, category: val})}
                    placeholder="Select a category"
                    options={[
                      { value: "Development", label: "Development" },
                      { value: "Design", label: "Design" },
                      { value: "Business", label: "Business" },
                      { value: "Data", label: "Data" }
                    ]}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Thumbnail Image</label>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
              </div>
              
              <div className="input-row" style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingCourse(null); }} className="sys-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="sys-btn-primary">
                  {submitting ? 'Saving...' : (editingCourse ? 'Update Course' : 'Submit Course')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Add Lesson</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
            
            <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label>Lesson Title</label>
                <input required type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} placeholder="e.g. Introduction to State" />
                <div className="input-hint">Lessons are numbered automatically in the order you add them.</div>
              </div>
              <div className="input-group">
                <label>Video File</label>
                <input required type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
                <div className="input-hint">Uploading directly to Cloudinary</div>
              </div>
              
              <div className="input-row" style={{ marginTop: '16px' }}>
                <button type="button" onClick={() => setShowLessonModal(false)} className="sys-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="sys-btn-primary">
                  {submitting ? 'Uploading Video...' : 'Add Lesson'}
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
