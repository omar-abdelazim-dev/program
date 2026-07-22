import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AboutPage() {
  const [about, setAbout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/website/public/content')
      .then((res) => setAbout(res.data?.about || null))
      .catch(() => setAbout(null))
      .finally(() => setIsLoading(false));
  }, []);

  const hasContent = about && (about.companyStory || about.mission || about.vision || about.values?.length || about.timeline?.length || about.teamMembers?.length);

  return (
    <div className="static-page">
      <h1 className="static-page-title">About Us</h1>

      {isLoading ? (
        <div className="static-page-skeleton">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '80%' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '60%' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '70%' }} />
        </div>
      ) : !hasContent ? (
        <p className="static-page-empty">This page hasn't been filled in yet — check back soon.</p>
      ) : (
        <div className="static-page-body">
          {about.companyStory && (
            <section className="static-page-section">
              <h2>Our Story</h2>
              <p>{about.companyStory}</p>
            </section>
          )}

          {(about.mission || about.vision) && (
            <div className="static-page-grid-two">
              {about.mission && (
                <section className="static-page-section">
                  <h2>Mission</h2>
                  <p>{about.mission}</p>
                </section>
              )}
              {about.vision && (
                <section className="static-page-section">
                  <h2>Vision</h2>
                  <p>{about.vision}</p>
                </section>
              )}
            </div>
          )}

          {about.values?.length > 0 && (
            <section className="static-page-section">
              <h2>Our Values</h2>
              <div className="static-page-grid-two">
                {about.values.map((v, i) => (
                  <div key={i} className="static-page-card">
                    <h3>{v.title}</h3>
                    <p>{v.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {about.timeline?.length > 0 && (
            <section className="static-page-section">
              <h2>Our Journey</h2>
              <div className="static-page-timeline">
                {[...about.timeline]
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((t, i) => (
                    <div key={i} className="static-page-timeline-item">
                      <div className="static-page-timeline-year">{t.year}</div>
                      <div>
                        <h3>{t.title}</h3>
                        <p>{t.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {about.teamMembers?.filter((m) => !m.isHidden).length > 0 && (
            <section className="static-page-section">
              <h2>Meet the Team</h2>
              <div className="static-page-grid-three">
                {about.teamMembers
                  .filter((m) => !m.isHidden)
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((m, i) => (
                    <div key={i} className="static-page-card static-page-team-card">
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="static-page-team-avatar" />
                      ) : (
                        <div className="static-page-team-avatar static-page-team-avatar-fallback">{m.name?.[0] || '?'}</div>
                      )}
                      <h3>{m.name}</h3>
                      <div className="static-page-team-position">{m.position}</div>
                      {m.bio && <p>{m.bio}</p>}
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
