import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import CourseCard from './CourseCard';
import FullPageLoader from './FullPageLoader';

export default function StudentProfilePage({ isLightMode, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/users/${id}/profile`),
      api.get(`/users/${id}/enrollments`),
    ])
      .then(([profileRes, enrollRes]) => {
        setProfile(profileRes.data.profile);
        setCourses(enrollRes.data.courses || []);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate(-1);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '60vh' }}>
        <FullPageLoader message={t('studentProfile.loading', 'Loading profile')} />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <p style={{ color: 'var(--text-secondary)', padding: '64px 0', textAlign: 'center' }}>
        {t('studentProfile.notFound', 'Student not found.')}
      </p>
    );
  }

  const fullName = [profile.name, profile.lastName].filter(Boolean).join(' ');
  const initials = profile.name?.[0]?.toUpperCase() ?? 'S';

  return (
    <div className="dashboard-grid">
      <div className="main-column animate-entrance" style={{ width: '100%' }}>

        {/* Profile Header Card */}
        <div className="profile-header solid-card" style={{ marginBottom: '32px', width: 'fit-content', paddingRight: '64px' }}>
          {/* Avatar */}
          <div className="ic-avatar">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={fullName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Info */}
          <div className="profile-header-info">
            <h1 style={{ margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: '800' }}>{fullName}</h1>

            {/* Role badge */}
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
              {t('studentProfile.roleStudent', 'Student')}
            </span>

            {/* Stats row */}
            <div className="ic-stats">
              {profile.university && <span dir="auto">🎓 {profile.university}</span>}
              {profile.college && <span dir="auto">🏛 {profile.college}</span>}
              {profile.major && <span dir="auto">📚 {profile.major}</span>}
              <span dir="auto">
                📖 {t('studentProfile.enrolledCount', '{{count}} enrolled courses', { count: courses.length })}
              </span>
            </div>

            {/* Bio / Goals */}
            {profile.bio && (
              <p style={{ margin: '12px 0 0 0', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '600px' }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Enrolled Courses Section */}
        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 20px 0', fontSize: '1.4rem', fontWeight: '700' }}>
          {t('studentProfile.enrolledCourses', 'Enrolled Courses')}
        </h2>

        {courses.length > 0 ? (
          <div className="cc-grid">
            {courses.map((course, idx) => (
              <CourseCard
                key={course._id || idx}
                course={course}
                idx={idx}
                isLightMode={isLightMode}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--bg-main)',
            borderRadius: '12px',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--inner-shadow)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📚</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              {t('studentProfile.noCoursesYet', 'No enrolled courses yet')}
            </div>
            <div style={{ fontSize: '0.9rem' }}>{t('studentProfile.noCoursesDesc', "This student hasn't enrolled in any courses.")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
