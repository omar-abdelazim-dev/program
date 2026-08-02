import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import CourseCard from './CourseCard';
import FullPageLoader from './FullPageLoader';
import '../styles/instructor.css';

export default function InstructorProfilePage({ isLightMode }) {
  const { id } = useParams();
  const [instructor, setInstructor] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);
    api.get(`/instructors/${id}`)
      .then((res) => {
        setInstructor(res.data.instructor);
        setCourses(res.data.courses || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '60vh' }}>
        <FullPageLoader message="Loading instructor" />
      </div>
    );
  }

  if (notFound || !instructor) {
    return (
      <p style={{ color: 'var(--text-secondary)', padding: '64px 0', textAlign: 'center' }}>
        Instructor not found.
      </p>
    );
  }

  const fullName = [instructor.name, instructor.lastName].filter(Boolean).join(' ');
  const initials = instructor.name?.[0]?.toUpperCase() ?? 'I';

  return (
    <div className="dashboard-grid">
      <div className="main-column animate-entrance" style={{ width: '100%' }}>
        <div className="profile-header solid-card">
          <div className="ic-avatar">
            {instructor.avatarUrl ? <img src={instructor.avatarUrl} alt={fullName} /> : <span>{initials}</span>}
          </div>
          <div className="profile-header-info">
            <h1>{fullName}</h1>
            {instructor.bio && <p>{instructor.bio}</p>}
            <div className="ic-stats">
              <span>{instructor.courseCount} {instructor.courseCount === 1 ? 'course' : 'courses'}</span>
              <span>★ {instructor.avgRating > 0 ? instructor.avgRating.toFixed(1) : 'New'} ({(instructor.totalReviews || 0).toLocaleString()} reviews)</span>
              <span>{(instructor.totalStudents || 0).toLocaleString()} students</span>
            </div>
            {instructor.expertise?.length > 0 && (
              <div className="ic-expertise" style={{ justifyContent: 'flex-start', marginTop: '12px' }}>
                {instructor.expertise.map((tag) => (
                  <span key={tag} className="ic-expertise-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '1.5rem' }}>
          Courses by {instructor.name}
        </h2>
        {courses.length > 0 ? (
          <div className="cc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '24px' }}>
            {courses.map((course, idx) => (
              <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>
            No published courses yet.
          </p>
        )}
      </div>
    </div>
  );
}

