import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import api from '../api/axios';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import InstructorAnalyticsTab from './InstructorAnalyticsTab';
import CurriculumBuilderTab from './CurriculumBuilderTab';
import InstructorEngagementTab from './InstructorEngagementTab';
import InstructorFinancialsTab from './InstructorFinancialsTab';
import InstructorReviewsTab from './InstructorReviewsTab';

export default function InstructorPortal({ user, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState([]);
  const [timeSeries, setTimeSeries] = useState([]);
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const fileData = new FormData();
        fileData.append('image', thumbnailFile);
        const uploadRes = await api.post('/uploads/image', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        thumbnailUrl = uploadRes.data.url;
      }

      await api.post('/courses', {
        ...formData,
        price: Number(formData.price),
        thumbnailUrl
      });
      
      setShowCreateModal(false);
      setFormData({ title: '', description: '', price: '', category: '' });
      setThumbnailFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
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
    <div data-role="instructor" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--c-bg)' }}>
      {/* Top Navbar */}
      <nav className="top-nav">
        <div className="nav-row-top">
          <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/instructor" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`}
                alt="Program Logo"
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            </Link>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-h)', fontWeight: 'bold' }}>Instructor</span>
          </div>

          <div className="nav-controls">
            <button className="nav-icon-btn" onClick={toggleTheme}>
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
              <div className="nav-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4"></circle>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
                </svg>
              </div>
              <div className="profile-tooltip">
                <div className="tooltip-name">{user?.name || 'Instructor'}</div>
                <hr className="tooltip-divider" />
                <div style={{ padding: '0 12px 8px', fontSize: '0.8rem', color: 'var(--c-sub)' }}>{user?.email}</div>
                <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="tooltip-link logout-link">Log out</a>
              </div>
            </div>
          </div>
        </div>

        <div className="nav-row-bottom" data-role="instructor" style={{ maxWidth: '1000px', width: '100%' }}>
          <button className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button className={`nav-tab ${activeTab === 'curriculum' ? 'active' : ''}`} onClick={() => setActiveTab('curriculum')}>
            Curriculum
          </button>
          <button className={`nav-tab ${activeTab === 'engagement' ? 'active' : ''}`} onClick={() => setActiveTab('engagement')}>
            Engagement
          </button>
          <button className={`nav-tab ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
            Reviews
          </button>
          <button className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button className={`nav-tab ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')}>
            Financials
          </button>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '140px 40px 40px 40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
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
          ) : (
            <div className="animate-entrance">
              {/* Analytics Overview */}
              <div className="stats-grid animate-entrance" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                <div className="stat-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Revenue</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-h)', marginTop: 'auto' }}>
                    EGP {stats.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                  </div>
                </div>
                <div className="stat-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Enrollments</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-h)', marginTop: 'auto' }}>
                    {stats.reduce((sum, s) => sum + s.enrolled, 0).toLocaleString()}
                  </div>
                </div>
                <div className="stat-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: 'var(--c-sub)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Active Courses</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-h)', marginTop: 'auto' }}>{courses.length}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-h)' }}>My Courses</h2>
            <button onClick={() => { setError(''); setShowCreateModal(true); }} className="sys-btn-primary" style={{ width: 'auto' }}>
              + Create New Course
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {courses.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                <p style={{ color: 'var(--c-sub)', fontSize: '1.1rem', margin: 0 }}>
                  You haven't created any courses yet. Start sharing your knowledge with the world!
                </p>
              </div>
            ) : (
              courses.map(course => {
                const lessons = lessonsByCourse[course._id] || [];
                return (
                <div key={course._id} className="glass-card hover-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      {course.thumbnailUrl ? (
                        <img src={course.thumbnailUrl} alt={course.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ width: '120px', height: '80px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px' }}></div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '1.3rem', margin: '0 0 8px 0' }}>{course.title}</h3>
                        <div style={{ color: 'var(--c-sub)', fontSize: '0.95rem' }}>Price: EGP {course.price} • Category: {course.category}</div>
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
                          <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                            {lessons.length === 0 ? 'No lessons yet' : `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`}
                          </span>
                        </div>
                        {course.status === 'rejected' && course.rejectionReason && (
                          <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--c-sub)', maxWidth: '480px' }}>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>Reason: </span>
                            {course.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {lessons.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--c-border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {lessons.map(lesson => (
                        <div key={lesson._id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--c-sub)' }}>
                          <span style={{ minWidth: '20px', color: 'var(--c-light)', fontWeight: 600 }}>{lesson.order}.</span>
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

      {/* Create Course Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Create New Course</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
            
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="sys-btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="sys-btn-primary">
                  {submitting ? 'Creating...' : 'Submit Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-entrance" style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
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
    </div>
  );
}
