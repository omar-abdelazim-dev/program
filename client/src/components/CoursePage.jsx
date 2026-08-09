import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import FullPageLoader from './FullPageLoader';
import ThreeDotMenu from './common/ThreeDotMenu';
import notyf from '../utils/notyf';

export default function CoursePage({ cart = [], setCart, user }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromDashboard = location.state?.from === 'dashboard';
  const [activeTab, setActiveTab] = useState('syllabus');

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

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

        try {
          const reviewsRes = await api.get(`/reviews/course/${id}`, { signal: controller.signal });
          if (reviewsRes.data && reviewsRes.data.reviews) {
            setReviews(reviewsRes.data.reviews);
            if (user && reviewsRes.data.reviews.some(r => r.student?._id === user._id || r.student?._id === user.id)) {
              setHasReviewed(true);
            }
          }
        } catch (e) {
          // Ignore review fetch error
        }
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message || t('course_page.fetch_error'));
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
        setEnrollError(err.response?.data?.message || t('course_page.enroll_error'));
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !reviewRating) return;
    
    setIsSubmittingReview(true);
    try {
      const res = await api.post('/reviews', { courseId: id, rating: reviewRating, text: reviewText });
      if (res.data.review) {
        const newReview = res.data.review;
        newReview.student = { _id: user?._id || user?.id, name: user?.name, avatarUrl: user?.avatarUrl };
        setReviews([newReview, ...reviews].slice(0, 10)); // Keep max 10
        setHasReviewed(true);
        setReviewText('');
        setReviewRating(5);
        notyf.success('Review submitted successfully');
      }
    } catch (err) {
      console.error('Failed to submit review', err);
      notyf.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReviewClick = (review) => {
    setEditingReviewId(review._id);
    setEditReviewText(review.text);
    setEditReviewRating(review.rating);
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditReviewText('');
    setEditReviewRating(5);
  };

  const updateReview = async (e) => {
    e.preventDefault();
    if (!editReviewText.trim() || !editReviewRating) return;

    setIsUpdatingReview(true);
    try {
      const res = await api.put(`/reviews/${editingReviewId}`, { rating: editReviewRating, text: editReviewText });
      if (res.data.review) {
        setReviews(reviews.map(r => r._id === editingReviewId ? res.data.review : r));
        setEditingReviewId(null);
        notyf.success('Review updated successfully');
      }
    } catch (err) {
      console.error('Failed to update review', err);
      notyf.error(err.response?.data?.message || 'Failed to update review');
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(reviews.filter(r => r._id !== reviewId));
      setHasReviewed(false);
      notyf.success('Review deleted successfully');
    } catch (err) {
      console.error('Failed to delete review', err);
      notyf.error(err.response?.data?.message || 'Failed to delete review');
    }
  };

  if (loading) return <FullPageLoader message={t('course_page.loading')} />;
  if (error) return <div style={{ padding: '100px', textAlign: 'center', color: '#ef4444', fontSize: '1.2rem' }}>{error}</div>;
  if (!course) return null;

  return (
    <div
      className="animate-entrance"
      style={{
        padding: "40px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
        paddingBottom: "80px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      {/* Course Header Banner */}
      <div
        className="solid-card"
        style={{
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <button
          onClick={() =>
            navigate(fromDashboard ? "/student/dashboard" : "/student")
          }
          className="back-arrow-btn"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            padding: "0",
            marginBottom: "24px",
            fontSize: "0.95rem",
            fontWeight: "500",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {fromDashboard
            ? t("course_page.back_dashboard")
            : t("course_page.back_explore")}
        </button>

        <span
          style={{
            display: "inline-flex",
            padding: "6px 14px",
            background: "rgba(249, 115, 22, 0.1)",
            color: "var(--color-accent)",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "16px",
            boxShadow: "var(--inner-shadow)",
          }}
        >
          {t(`categories.${course.category.replace(/\s+/g, '_').toLowerCase()}`, t(course.category, course.category))}
        </span>

        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            color: "var(--text-primary)",
            marginBottom: "16px",
            lineHeight: "1.2",
          }}
        >
          {course.title}
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "var(--text-secondary)",
            maxWidth: "800px",
            lineHeight: "1.6",
            margin: "0",
          }}
        >
          {course.description}
        </p>
      </div>

      {/* Main Grid: Left Column (Syllabus/Instructor) & Right Column (Sidebar) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: window.innerWidth < 900 ? "1fr" : "1fr 380px",
          gap: "32px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div
            className="solid-card"
            style={{
              padding: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              cursor: course.instructor?._id ? "pointer" : "default",
            }}
            onClick={() =>
              course.instructor?._id &&
              navigate(`/instructor/${course.instructor._id}`)
            }
            role={course.instructor?._id ? "button" : undefined}
            tabIndex={course.instructor?._id ? 0 : undefined}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--bg-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "1.4rem",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {(course.instructor?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                {t("course_page.instructor_label")}
              </div>
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "1.2rem",
                  color: "var(--text-primary)",
                }}
              >
                {course.instructor?.name ||
                  t("course_page.instructor_fallback")}
              </div>
            </div>
          </div>

          <div className="solid-card" style={{ padding: "32px" }}>
            <div
              style={{
                display: "flex",
                gap: "32px",
                borderBottom: "1px solid var(--border)",
                marginBottom: "24px",
              }}
            >
              <button
                className={`dashboard-tab ${activeTab === "syllabus" ? "active" : ""}`}
                onClick={() => setActiveTab("syllabus")}
                style={{ paddingBottom: "16px", borderRadius: "0" }}
              >
                {t("course_page.syllabus")}
              </button>
              <button
                className={`dashboard-tab ${activeTab === "reviews" ? "active" : ""}`}
                onClick={() => setActiveTab("reviews")}
                style={{ paddingBottom: "16px", borderRadius: "0" }}
              >
                {t("course_page.reviews_tab", "Reviews ({{count}})", { count: reviews.length })}
              </button>
            </div>

            {activeTab === "syllabus" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <h3
                    style={{ fontSize: "1.3rem", fontWeight: "700", margin: 0 }}
                  >
                    {t("course_page.lessons_title")}
                  </h3>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    {lessons.length}{" "}
                    {lessons.length === 1
                      ? t("course_page.lesson_singular")
                      : t("course_page.lesson_plural")}
                  </span>
                </div>

                {lessons.length === 0 ? (
                  <div
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      background: "var(--bg-main)",
                      borderRadius: "12px",
                      color: "var(--text-secondary)",
                      boxShadow: "var(--inner-shadow)",
                    }}
                  >
                    {t("course_page.no_lessons")}
                  </div>
                ) : (
                  lessons.map((lesson, i) => (
                    <div
                      key={lesson._id}
                      style={{
                        padding: "20px 24px",
                        background: "var(--bg-main)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        boxShadow: "var(--inner-shadow)",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                          boxShadow: "var(--outer-shadow)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        {lesson.title}
                      </h4>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "reviews" && (() => {
              /* Calculate average rating from reviews */
              const avgRating = reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                : '0.0';

              return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                {/* Average Rating Summary */}
                <div style={{ padding: '24px', background: 'var(--bg-main)', borderRadius: '12px', boxShadow: 'var(--inner-shadow)', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>{avgRating}</div>
                    <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '8px' }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < Math.round(parseFloat(avgRating)) ? '#f59e0b' : 'var(--border)', fontSize: '1.1rem' }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {reviews.length} {t('course_page.review_label', reviews.length === 1 ? 'review' : 'reviews')}
                    </div>
                  </div>
                  {/* Rating breakdown bars */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '16px', textAlign: 'right' }}>{star}</span>
                          <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>★</span>
                          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--bg-surface)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', background: '#f59e0b', transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '24px' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isEnrolled && !hasReviewed && (
                  <div
                    style={{
                      padding: "24px",
                      background: "var(--bg-main)",
                      borderRadius: "12px",
                      boxShadow: "var(--inner-shadow)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "1.1rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      Leave a Review
                    </h4>
                    <form onSubmit={submitReview}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "16px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color:
                                star <= reviewRating
                                  ? "#f59e0b"
                                  : "var(--border)",
                              fontSize: "1.5rem",
                              padding: 0,
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Write your review here..."
                        style={{
                          width: "100%",
                          height: "100px",
                          padding: "25px",
                          borderRadius: "25px",
                          border: "1px solid var(--border)",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          marginBottom: "16px",
                          resize: "vertical",
                          boxShadow: "var(--outer-shadow)",
                          boxSizing: "border-box",
                        }}
                        required
                      />
                      <button
                        type="submit"
                        className="solid-btn"
                        disabled={isSubmittingReview}
                      >
                        {isSubmittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  </div>
                )}

                {reviews.length === 0 ? (
                  <div
                    style={{
                      padding: "48px 32px",
                      textAlign: "center",
                      background: "var(--bg-main)",
                      borderRadius: "12px",
                      color: "var(--text-secondary)",
                      boxShadow: "var(--inner-shadow)",
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📝</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>{t('common.no_reviews_yet', 'No reviews yet')}</div>
                    <div style={{ fontSize: '0.9rem' }}>{t('student.learning.be_first_review', 'Be the first to share your experience with this course!')}</div>
                  </div>
                ) : (
                  reviews.map((review) => {
                    const isOwner =
                      user &&
                      (review.student?._id === user._id ||
                        review.student?._id === user.id);
                    const isEditing = editingReviewId === review._id;

                    if (isEditing) {
                      return (
                        <div
                          key={review._id}
                          style={{
                            padding: "24px",
                            background: "var(--bg-main)",
                            borderRadius: "12px",
                            boxShadow: "var(--inner-shadow)",
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 16px 0",
                              fontSize: "1.1rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            Edit Review
                          </h4>
                          <form onSubmit={updateReview}>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                marginBottom: "16px",
                              }}
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setEditReviewRating(star)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color:
                                      star <= editReviewRating
                                        ? "#f59e0b"
                                        : "var(--border)",
                                    fontSize: "1.5rem",
                                    padding: 0,
                                  }}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={editReviewText}
                              onChange={(e) =>
                                setEditReviewText(e.target.value)
                              }
                              placeholder="Update your review..."
                              style={{
                                width: "100%",
                                height: "100px",
                                padding: "25px",
                                borderRadius: "25px",
                                border: "1px solid var(--border)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                marginBottom: "16px",
                                resize: "vertical",
                                boxShadow: "var(--outer-shadow)",
                              }}
                              required
                            />
                            <div style={{ display: "flex", gap: "12px" }}>
                              <button
                                type="submit"
                                className="solid-btn"
                                disabled={isUpdatingReview}
                              >
                                {isUpdatingReview ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditReview}
                                style={{
                                  padding: "12px 24px",
                                  borderRadius: "50px",
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--text-primary)",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={review._id}
                        style={{
                          padding: "24px",
                          background: "var(--bg-main)",
                          borderRadius: "12px",
                          boxShadow: "var(--inner-shadow)",
                          position: "relative",
                        }}
                      >
                        {isOwner && (
                          <div
                            style={{
                              position: "absolute",
                              top: "16px",
                              insetInlineEnd: "16px",
                            }}
                          >
                            <ThreeDotMenu
                              options={[
                                {
                                  label: t('common.edit', 'Edit'),
                                  action: () => handleEditReviewClick(review),
                                },
                                {
                                  label: t('common.delete', 'Delete'),
                                  action: () => handleDeleteReview(review._id),
                                  danger: true,
                                },
                              ]}
                            />
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "12px",
                          }}
                        >
                          {review.student?.avatarUrl ? (
                            <img
                              src={review.student.avatarUrl}
                              alt="Avatar"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "700",
                              }}
                            >
                              {(review.student?.name || "A")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div
                              style={{
                                fontWeight: "600",
                                color: "var(--text-primary)",
                              }}
                            >
                              {review.student?.name || "Anonymous"}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                color: "#f59e0b",
                                fontSize: "0.9rem",
                              }}
                            >
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  style={{
                                    color:
                                      i < review.rating
                                        ? "#f59e0b"
                                        : "var(--border)",
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            color: "var(--text-secondary)",
                            lineHeight: "1.6",
                          }}
                        >
                          {review.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Floating Action Sidebar */}
        <div
          className="solid-card"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            position: "sticky",
            top: "24px",
          }}
        >
          {course.thumbnailUrl && (
            <div
              style={{
                width: "100%",
                aspectRatio: "16/9",
                background: "var(--bg-main)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              marginTop: "4px",
            }}
          >
            <h2
              style={{
                fontSize: "2.2rem",
                fontWeight: "800",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {course.price === 0
                ? t("course_page.free")
                : `${t("course_page.currency")} ${course.price}`}
            </h2>
          </div>

          {enrollError && (
            <div
              style={{
                color: "#ef4444",
                fontSize: "0.9rem",
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "8px",
                fontWeight: "500",
              }}
            >
              {enrollError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            {isEnrolled ? (
              <button
                onClick={() => navigate(`/learn/${course._id}`)}
                className="solid-btn"
                style={{
                  width: "100%",
                  height: "54px",
                  fontSize: "1.05rem",
                  background:
                    "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  boxShadow: "var(--inner-shadow)",
                }}
              >
                {t("course_page.go_to_course")}
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="solid-btn"
                style={{
                  width: "100%",
                  height: "54px",
                  fontSize: "1.05rem",
                  opacity: isEnrolling ? 0.7 : 1,
                  cursor: isEnrolling ? "not-allowed" : "pointer",
                }}
              >
                {isEnrolling
                  ? t("course_page.enrolling")
                  : t("course_page.enroll_now")}
              </button>
            )}

            {!isEnrolled && (
              <button
                onClick={() => {
                  if (setCart && !cart.find((c) => c._id === course._id)) {
                    setCart([...cart, course]);
                  }
                }}
                style={{
                  width: "100%",
                  height: "54px",
                  background: "transparent",
                  border: "2px solid var(--border)",
                  borderRadius: "50px",
                  color: "var(--text-primary)",
                  fontWeight: "700",
                  fontSize: "1.05rem",
                  cursor: cart.find((c) => c._id === course._id)
                    ? "default"
                    : "pointer",
                  transition: "all 0.2s ease",
                  opacity: cart.find((c) => c._id === course._id) ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!cart.find((c) => c._id === course._id)) {
                    e.currentTarget.style.background = "var(--bg-main)";
                    e.currentTarget.style.borderColor = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cart.find((c) => c._id === course._id)) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }
                }}
              >
                {cart.find((c) => c._id === course._id)
                  ? t("course_page.added_to_cart")
                  : t("course_page.add_to_cart")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
