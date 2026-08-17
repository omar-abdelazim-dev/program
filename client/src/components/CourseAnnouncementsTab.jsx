import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import Spinner from './Spinner';

export default function CourseAnnouncementsTab({ courseId, user }) {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/engagement/course/${courseId}/announcements`);
        setAnnouncements(res.data.announcements);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch course announcements', err);
        setError('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };
    if (courseId) {
      fetchAnnouncements();
    }
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spinner size={32} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--status-error)', padding: '40px' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
        {t('course.announcements.title', 'Announcements')}
      </h2>

      {announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📢</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {t('course.announcements.empty_title', 'No announcements yet')}
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {t('course.announcements.empty_desc', "The instructor hasn't posted any announcements for this course.")}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {announcements.map((ann) => (
            <div key={ann._id} className="solid-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <img 
                  src={ann.instructor?.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ann.instructor?.name || 'Instructor')}
                  alt={ann.instructor?.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ann.instructor?.name || 'Instructor'}
                  </h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                {ann.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {ann.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
