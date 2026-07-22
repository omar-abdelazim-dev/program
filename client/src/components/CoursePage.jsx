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
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/courses/${id}`, { signal: controller.signal });
        setCourse(data.course);
        setLessons(data.lessons || []);

        try {
          const enrollRes = await api.get(`/enrollments/${id}`, { signal: controller.signal });
          if (enrollRes.data && enrollRes.data.enrolled) {
            setIsEnrolled(true);
          }
        } catch(e) {
          // Ignore — likely 404 (not enrolled) or the request was cancelled
        }
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message || 'Failed to fetch course');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
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
    <div className="animate-entrance" style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Course Header Banner */}
      <div className="solid-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <button onClick={() => navigate('/student')} className="back-arrow-btn" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0', marginBottom: '24px', fontSize: '0.95rem', fontWeight: '500', transition: 'color 0.2s ease' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Explore
        </button>
        
        <span style={{ display: 'inline-flex', padding: '6px 14px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--color-accent)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
          {course.category}
        </span>
        
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.2' }}>
          {course.title}
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: '1.6', margin: '0' }}>
          {course.description}
        </p>
      </div>

      {/* Main Grid: Left Column (Syllabus/Instructor) & Right Column (Sidebar) */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '1fr 380px', gap: '32px', alignItems: 'start' }}>

        {/* Left Column: Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div className="solid-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.4rem', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              {(course.instructor?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '4px' }}>Instructor</div>
              <div style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{course.instructor?.name || 'Instructor'}</div>
            </div>
          </div>

          <div className="solid-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
              <button
                className={`dashboard-tab ${activeTab === 'syllabus' ? 'active' : ''}`}
                onClick={() => setActiveTab('syllabus')}
                style={{ paddingBottom: '16px', borderRadius: '0' }}
              >
                Course Syllabus
              </button>
            </div>

            {activeTab === 'syllabus' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0 }}>Lessons</h3>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
                </div>

                {lessons.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                    No lessons have been added to this course yet.
                  </div>
                ) : lessons.map((lesson, i) => (
                  <div key={lesson._id} style={{ padding: '20px 24px', background: 'var(--bg-main)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem' }}>
                      {i + 1}
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>{lesson.title}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Floating Action Sidebar */}
        <div className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
          {course.thumbnailUrl && (
            <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-main)', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={course.thumbnailUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '4px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
              {course.price === 0 ? 'Free' : `EGP ${course.price}`}
            </h2>
          </div>

          {enrollError && <div style={{ color: '#ef4444', fontSize: '0.9rem', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontWeight: '500' }}>{enrollError}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {isEnrolled ? (
              <button onClick={() => navigate(`/learn/${course._id}`)} className="solid-btn" style={{ width: '100%', height: '54px', fontSize: '1.05rem', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                Go to Course
              </button>
            ) : (
              <button onClick={handleEnroll} disabled={isEnrolling} className="solid-btn" style={{ width: '100%', height: '54px', fontSize: '1.05rem', opacity: isEnrolling ? 0.7 : 1, cursor: isEnrolling ? 'not-allowed' : 'pointer' }}>
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}

            {!isEnrolled && (
              <button
                onClick={() => {
                  if (setCart && !cart.find(c => c._id === course._id)) {
                    setCart([...cart, course]);
                  }
                }}
                style={{ width: '100%', height: '54px', background: 'transparent', border: '2px solid var(--border)', borderRadius: '50px', color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.05rem', cursor: cart.find(c => c._id === course._id) ? 'default' : 'pointer', transition: 'all 0.2s ease', opacity: cart.find(c => c._id === course._id) ? 0.5 : 1 }}
                onMouseEnter={(e) => {
                  if (!cart.find(c => c._id === course._id)) {
                    e.currentTarget.style.background = 'var(--bg-main)';
                    e.currentTarget.style.borderColor = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cart.find(c => c._id === course._id)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                {cart.find(c => c._id === course._id) ? 'Added to Cart ✓' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
