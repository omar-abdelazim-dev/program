import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';

export default function InstructorPortal({ user, onLogout, toggleTheme, isLightMode }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ title: '', description: '', price: '', category: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  
  const [lessonData, setLessonData] = useState({ title: '', order: '' });
  const [videoFile, setVideoFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchMyCourses = async () => {
    try {
      const res = await api.get('/courses/mine');
      setCourses(res.data.courses || []);
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
        order: Number(lessonData.order),
        videoUrl: uploadRes.data.url
      });
      
      setShowLessonModal(false);
      setLessonData({ title: '', order: '' });
      setVideoFile(null);
      fetchMyCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add lesson');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading Instructor Portal...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--c-bg)' }}>
      {/* Top Navbar using top-nav styling */}
      <nav className="top-nav" style={{ position: 'relative', borderBottom:'1px solid rgba(255, 255, 255, 0.15)', zIndex: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: '70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '40px' }}>
          <Link to="/">
            <img 
              src={isLightMode ? `${logoLight}?v=3` : `${logoDark}?v=3`} 
              alt="Program Logo" 
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>
        <div className="nav-logo">
          <h1 style={{ fontSize: '1.2rem', margin: '0' }}>Instructor Portal</h1>
        </div>
        <div className="nav-controls" style={{ display: 'flex', alignItems: 'center' }}>
          <button className="nav-icon-btn" onClick={toggleTheme} style={{ marginRight: '16px' }}>
            {isLightMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
              <div className="profile-header">
                <div style={{ fontWeight: '600' }}>{user?.name || 'Instructor'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{user?.email}</div>
              </div>
              <button onClick={onLogout} className="tooltip-link" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>Log out</button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>My Courses</h2>
            <button onClick={() => setShowCreateModal(true)} className="glass-btn auth-submit-btn" style={{ width: 'auto', padding: '12px 24px' }}>
              + Create New Course
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {courses.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--c-sub)' }}>
                You haven't created any courses yet.
              </div>
            ) : (
              courses.map(course => (
                <div key={course._id} className="glass-card hover-glow" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <div style={{ width: '120px', height: '80px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', borderRadius: '8px' }}></div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '1.3rem', margin: '0 0 8px 0' }}>{course.title}</h3>
                      <div style={{ color: 'var(--c-sub)', fontSize: '0.95rem' }}>Price: EGP {course.price} • Category: {course.category}</div>
                      <div style={{ marginTop: '8px' }}>
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
                      </div>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => { setSelectedCourseId(course._id); setShowLessonModal(true); }}
                      className="glass-btn hover-glow" style={{ padding: '8px 16px', fontSize: '0.95rem' }}
                    >
                      + Add Lesson
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Create New Course</h2>
            {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
            
            <form onSubmit={handleCreateCourse}>
              <div className="auth-input-group">
                <label>Course Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="auth-input" placeholder="e.g. Advanced React Patterns" />
              </div>
              <div className="auth-input-group">
                <label>Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="auth-input" style={{ minHeight: '100px' }} placeholder="What will students learn?" />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="auth-input-group" style={{ flex: 1 }}>
                  <label>Price (EGP)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="auth-input" placeholder="e.g. 500" />
                </div>
                <div className="auth-input-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="auth-input">
                    <option value="">Select a category</option>
                    <option value="Development">Development</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Data">Data</option>
                  </select>
                </div>
              </div>
              <div className="auth-input-group">
                <label>Thumbnail Image</label>
                <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} className="auth-input" style={{ padding: '10px' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="glass-btn hover-glow" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="glass-btn auth-submit-btn" style={{ flex: 1 }}>
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
            
            <form onSubmit={handleAddLesson}>
              <div className="auth-input-group">
                <label>Lesson Title</label>
                <input required type="text" value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} className="auth-input" placeholder="e.g. Introduction to State" />
              </div>
              <div className="auth-input-group">
                <label>Order Number</label>
                <input required type="number" min="1" value={lessonData.order} onChange={e => setLessonData({...lessonData, order: e.target.value})} className="auth-input" placeholder="e.g. 1" />
              </div>
              <div className="auth-input-group">
                <label>Video File</label>
                <input required type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} className="auth-input" style={{ padding: '10px' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '8px' }}>Uploading directly to Cloudinary</div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                <button type="button" onClick={() => setShowLessonModal(false)} className="glass-btn hover-glow" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="glass-btn auth-submit-btn" style={{ flex: 1 }}>
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
