import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function DashboardTab() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const fetchEnrollments = async () => {
      try {
        const { data } = await api.get('/enrollments/mine', { signal: controller.signal });
        setEnrollments(data.enrollments || []);
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message || 'Failed to load your courses');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchEnrollments();
    return () => controller.abort();
  }, []);

  if (loading) return <p style={{ color: 'var(--c-sub)' }}>Loading your courses...</p>;
  if (error) return <p style={{ color: '#ef4444' }}>{error}</p>;

  const completedLessonCount = enrollments.reduce((sum, e) => sum + e.completedLessons.length, 0);
  const coursesCompleted = enrollments.filter(e => e.progressPercent === 100).length;

  return (
    <>
      <div className="stats-grid animate-entrance" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card glass-card">
          <div className="stat-value">{enrollments.length}</div>
          <div className="stat-label">Enrolled Courses</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">{completedLessonCount}</div>
          <div className="stat-label">Completed Lessons</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">{coursesCompleted}</div>
          <div className="stat-label">Courses Completed</div>
        </div>
      </div>

    </>
  );
}
