import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function MyCoursesTab() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        const { data } = await api.get('/enrollments/mine');
        setEnrollments(data.enrollments || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load your courses');
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, []);

  if (loading) return <p style={{ color: 'var(--c-sub)' }}>Loading your courses...</p>;
  if (error) return <p style={{ color: '#ef4444' }}>{error}</p>;

  return (
    <div className="dashboard-grid">
      <div className="main-column" style={{ width: '100%' }}>
        <section className="dashboard-section animate-entrance" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <h2>Continue Learning</h2>
          </div>

          {enrollments.length === 0 ? (
            <p style={{ color: 'var(--c-sub)' }}>
              You haven't enrolled in any courses yet. Head over to Explore to find one.
            </p>
          ) : (
            <div className="continue-row">
              {enrollments.map((enrollment) => (
                <div key={enrollment._id} className="continue-card glass-card hover-glow animate-entrance">
                  <div
                    className="continue-thumb"
                    style={enrollment.course.thumbnailUrl
                      ? { backgroundImage: `url(${enrollment.course.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
                  ></div>
                  <div className="continue-info">
                    <div className="continue-details">
                      <h3>{enrollment.course.title}</h3>
                    </div>
                    <div className="continue-progress-area">
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${enrollment.progressPercent}%` }}></div>
                      </div>
                      <span className="progress-text">{enrollment.progressPercent}% Complete</span>
                    </div>
                    <button className="play-btn glass-btn" onClick={() => navigate(`/learn/${enrollment.course._id}`)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
