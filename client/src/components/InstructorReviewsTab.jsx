import notyf from '../utils/notyf';
import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';


const ThreeDotMenu = ({ options }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="menu-container course-menu-container" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        className="menu-trigger course-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Menu"
      >
        ⋮
      </button>
      {open && (
        <div className="dropdown-menu course-dropdown glass-card">
          {options.map((opt, i) => (
            <button
              key={i}
              className="dropdown-item course-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                opt.action();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StarIcon = ({ filled }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? 'var(--c-yellow, #f59e0b)' : 'none'}
    stroke="var(--c-yellow, #f59e0b)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarRating = ({ rating, size = 18 }) => (
  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={star <= rating ? 'var(--c-yellow, #f59e0b)' : 'none'}
        stroke="var(--c-yellow, #f59e0b)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ))}
  </div>
);

export default function InstructorReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/instructor');
      setReviews(res.data.reviews || []);
      setAverageRating(res.data.averageRating || 0);
      setTotalReviews(res.data.totalReviews || 0);
    } catch (err) {
      console.error(err);
      notyf.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReport = async (reviewId) => {
    try {
      await api.patch(`/reviews/${reviewId}/report`);
      notyf.success('Review reported to admins');
      fetchReviews();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to report review');
    }
  };

  if (loading) {
    return (
      <div className="glass-card animate-entrance" style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ color: 'var(--c-sub)' }}>Loading reviews...</div>
      </div>
    );
  }

  return (
    <div data-role="instructor">
      {/* Overall Rating Card */}
      <div
        className="stat-card glass-card animate-entrance"
        style={{
          padding: '32px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'var(--c-yellow, #f59e0b)',
              lineHeight: 1,
            }}
          >
            {averageRating.toFixed(1)}
          </div>
          <div style={{ marginTop: '8px' }}>
            <StarRating rating={Math.round(averageRating)} size={22} />
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--c-sub)',
              marginBottom: '4px',
            }}
          >
            Overall Rating
          </div>
          <div style={{ fontSize: '1.1rem', color: 'var(--text-h)' }}>
            Based on <strong>{totalReviews}</strong> student{totalReviews !== 1 ? 's' : ''} review{totalReviews !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Review Feed */}
      {reviews.length === 0 ? (
        <div
          className="glass-card animate-entrance"
          style={{ padding: '48px', textAlign: 'center', color: 'var(--c-sub)' }}
        >
          No reviews yet. Once students review your courses, they will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((review) => (
            <div
              key={review._id}
              className="glass-card hover-glow animate-entrance"
              style={{
                padding: '24px',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Three dot menu */}
              <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                <ThreeDotMenu
                  options={[
                    {
                      label: review.isReported ? '✓ Already Reported' : '⚑ Report Review',
                      action: () => {
                        if (!review.isReported) {
                          handleReport(review._id);
                        }
                      },
                    },
                  ]}
                />
              </div>

              {/* Header: Student + Course */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <img
                  src={
                    review.student?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.student?.name || 'User'}`
                  }
                  alt={review.student?.name || 'Student'}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--c-bg)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-h)',
                      fontSize: '1.05rem',
                    }}
                  >
                    {review.student?.name || 'Anonymous Student'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--c-sub)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {review.course?.title || 'Unknown Course'}
                    <span style={{ opacity: 0.4 }}>•</span>
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div style={{ marginBottom: '12px' }}>
                <StarRating rating={review.rating} />
              </div>

              {/* Review Text */}
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-h)',
                  lineHeight: 1.6,
                  fontSize: '0.95rem',
                }}
              >
                {review.text}
              </p>

              {/* Reported badge */}
              {review.isReported && (
                <div
                  style={{
                    marginTop: '12px',
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Reported
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
