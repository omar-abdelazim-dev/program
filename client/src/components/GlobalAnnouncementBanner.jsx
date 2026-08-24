import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function GlobalAnnouncementBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissedBanners');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await api.get('/website/public/announcements');
        // Filter for announcements meant to be banners and not dismissed
        if (res.data && Array.isArray(res.data)) {
          const activeBanners = res.data.filter(
            (ann) => (ann.showAsBanner || ann.isPinned) && !dismissed.includes(ann._id)
          );
          setBanners(activeBanners);
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, [dismissed]);

  const handleDismiss = (id) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify(newDismissed));
  };

  if (loading || banners.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', width: '100%' }}>
      {banners.map((banner) => {
        let bgColor = 'var(--bg-surface)';
        let borderColor = 'var(--border, rgba(255,255,255,0.08))';
        let icon = '📢';
        
        if (banner.priority === 'Critical' || banner.type === 'Emergency') {
          bgColor = 'rgba(239, 68, 68, 0.12)';
          borderColor = 'rgba(239, 68, 68, 0.3)';
          icon = '🚨';
        } else if (banner.priority === 'High') {
          bgColor = 'rgba(245, 158, 11, 0.12)';
          borderColor = 'rgba(245, 158, 11, 0.3)';
          icon = '⚠️';
        }

        return (
          <div
            key={banner._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              backgroundColor: bgColor,
              borderRadius: '14px',
              boxShadow: 'var(--outer-shadow, 0 2px 8px rgba(0,0,0,0.08))',
              border: `1px solid ${borderColor}`,
              animation: 'fadeInDown 0.3s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              <div>
                <strong style={{ color: 'var(--text-primary)', marginInlineEnd: '8px', fontWeight: '700' }}>{banner.title}:</strong>
                <span style={{ color: 'var(--text-secondary)' }}>{banner.content}</span>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(banner._id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--c-sub)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              aria-label="Dismiss announcement"
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-main)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
