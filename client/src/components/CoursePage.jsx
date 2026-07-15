import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CoursePage({ cart = [], setCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('syllabus');

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/courses/${id}`);
        setCourse(data.course);
        setLessons(data.lessons || []);

        try {
          const enrollRes = await api.get(`/enrollments/${id}`);
          if (enrollRes.data && enrollRes.data.enrolled) {
            setIsEnrolled(true);
          }
        } catch(e) {
          // Ignore, likely 404 (not enrolled)
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch course');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setEnrollError('');
    try {
      await api.post(`/enrollments/${id}`);
      setIsEnrolled(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setIsEnrolled(true);
      } else {
        setEnrollError(err.response?.data?.message || 'Failed to enroll');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', color: 'white', fontSize: '1.2rem' }}>Loading course details...</div>;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: '#ef4444', fontSize: '1.2rem' }}>{error}</div>;
  if (!course) return null;

  return (
    <div className="course-page animate-entrance" style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Course Header Banner */}
      <div className="course-header-banner glass-card" style={{ marginBottom: '24px', padding: '40px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))' }}>
        <button onClick={() => navigate('/student')} className="back-btn" style={{ marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Explore
        </button>
        <span className="topic-pill" style={{ display: 'inline-block', marginBottom: '16px', padding: '6px 16px', background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600' }}>{course.category}</span>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', lineHeight: '1.2' }}>{course.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--c-sub)', marginBottom: '24px', maxWidth: '800px' }}>{course.description}</p>
      </div>

      {/* Main Grid: Left Column (Syllabus/Instructor) & Right Column (Sidebar) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>

        {/* Left Column: Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.2rem' }}>
              {(course.instructor?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{course.instructor?.name || 'Instructor'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '32px' }}>
            <button
              className={`nav-tab ${activeTab === 'syllabus' ? 'active' : ''}`}
              onClick={() => setActiveTab('syllabus')}
              style={{ background: 'transparent', paddingBottom: '12px', borderRadius: '0', cursor: 'pointer' }}
            >
              Course Syllabus
            </button>
          </div>

          {activeTab === 'syllabus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Lessons</h3>
                <span style={{ color: 'var(--c-sub)', fontWeight: '500' }}>{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
              </div>

              {lessons.length === 0 ? (
                <p style={{ color: 'var(--c-sub)' }}>No lessons have been added to this course yet.</p>
              ) : lessons.map((lesson, i) => (
                <div key={lesson._id} className="glass-card hover-glow" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--c-sub)', fontWeight: '600' }}>{i + 1}</span>
                    <h4 style={{ fontSize: '1.15rem', margin: 0 }}>{lesson.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Floating Action Sidebar */}
        <div style={{ width: '100%', maxWidth: '400px', justifySelf: 'end' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '100px' }}>
            {course.thumbnailUrl && (
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
              <h2 style={{ fontSize: '2rem' }}>EGP {course.price}</h2>
            </div>

            {enrollError && <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '8px' }}>{enrollError}</div>}

            {isEnrolled ? (
              <button onClick={() => navigate(`/learn/${course._id}`)} className="glass-btn auth-submit-btn" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', cursor: 'pointer', marginBottom: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.5)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                Go to Course
              </button>
            ) : (
              <button onClick={handleEnroll} disabled={isEnrolling} className="glass-btn auth-submit-btn" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', cursor: isEnrolling ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}

            <button
              onClick={() => {
                if (setCart && !cart.find(c => c._id === course._id)) {
                  setCart([...cart, course]);
                }
              }}
              className="glass-card hover-glow"
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-h)' }}
              disabled={!!cart.find(c => c._id === course._id)}
            >
              {cart.find(c => c._id === course._id) ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
