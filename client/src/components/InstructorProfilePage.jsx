import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import CourseCard from './CourseCard';
import FullPageLoader from './FullPageLoader';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import '../styles/instructor.css';

export default function InstructorProfilePage({ isLightMode }) {
  const { id } = useParams();
  const { t } = useTranslation();
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
        <FullPageLoader message={t('instructorProfile.loading', 'Loading instructor')} />
      </div>
    );
  }

  if (notFound || !instructor) {
    return (
      <p style={{ color: 'var(--text-secondary)', padding: '64px 0', textAlign: 'center' }}>
        {t('instructorProfile.notFound', 'Instructor not found.')}
      </p>
    );
  }

  const fullName = [instructor.name, instructor.lastName].filter(Boolean).join(' ');
  const initials = instructor.name?.[0]?.toUpperCase() ?? 'I';

  return (
    <div className="dashboard-grid">
      <div className="main-column animate-entrance" style={{ width: '100%' }}>
        <div className="profile-header solid-card" style={{ marginBottom: '32px', width: 'fit-content', paddingRight: '64px' }}>
          <div className="ic-avatar">
            {instructor.avatarUrl ? <img src={instructor.avatarUrl} alt={fullName} /> : <span>{initials}</span>}
          </div>
          <div className="profile-header-info">
            <h1>{fullName}</h1>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.12)',
              color: 'var(--color-accent)',
              fontSize: '0.78rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
              boxShadow: 'var(--inner-shadow)',
            }}>
              {t('instructorProfile.roleInstructor', 'Instructor')}
            </span>
            {instructor.isProgramInstructor && (
              <span style={{
                background: 'var(--bg-main)',
                padding: '4px 12px',
                borderRadius: '12px',
                margin: '0 8px',
                boxShadow: 'var(--inner-shadow)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src={isLightMode ? logoLight : logoDark} alt="Program" style={{ height: '14px', objectFit: 'contain' }} />
              </span>
            )}
            {instructor.bio && <p>{instructor.bio}</p>}
            <div className="ic-stats">
              <span dir="auto">
                {t('instructorProfile.coursesCount', '{{count}} courses', { count: instructor.courseCount })}
              </span>
              <span dir="auto">
                ★ {instructor.avgRating > 0 ? instructor.avgRating.toFixed(1) : t('instructorProfile.new', 'New')} {t('instructorProfile.reviewsCount', '({{count}} reviews)', { count: instructor.totalReviews || 0 })}
              </span>
              <span dir="auto">
                {t('instructorProfile.studentsCount', '{{count}} students', { count: instructor.totalStudents || 0 })}
              </span>
            </div>
            {instructor.expertise?.length > 0 && (
              <div className="ic-expertise" style={{ justifyContent: 'flex-start', marginTop: '12px' }}>
                {instructor.expertise.map((tag) => (
                  <span key={tag} className="ic-expertise-tag">{t(`expertise.${tag}`, tag)}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '1.5rem' }}>
          {t('instructorProfile.coursesBy', 'Courses by {{name}}', { name: instructor.name })}
        </h2>
        {courses.length > 0 ? (
          <div className="cc-grid">
            {courses.map((course, idx) => (
              <CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', padding: '32px 0', textAlign: 'center' }}>
            {t('instructorProfile.noCourses', 'No published courses yet.')}
          </p>
        )}
      </div>
    </div>
  );
}

