import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import FullPageLoader from "./FullPageLoader";
import ThreeDotMenu from "./common/ThreeDotMenu";
import notyf from "../utils/notyf";
import PaymentModal from "./PaymentModal";

export default function CoursePage({ cart = [], setCart, user }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromDashboard = location.state?.from === "dashboard";
  const [activeTab, setActiveTab] = useState("syllabus");

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Standalone related lessons (spec §11) — discoverable independently,
  // purchased separately, never inserted into this course's own modules.
  const [standaloneLessons, setStandaloneLessons] = useState([]);
  const [purchasedStandaloneIds, setPurchasedStandaloneIds] = useState(
    new Set(),
  );
  const [purchasingStandaloneLesson, setPurchasingStandaloneLesson] =
    useState(null);
  const [isPurchasingStandalone, setIsPurchasingStandalone] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState("");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/courses/${id}`, {
          signal: controller.signal,
        });
        setCourse(data.course);
        setModules(data.modules || []);

        try {
          const enrollRes = await api.get(`/enrollments/${id}`, {
            signal: controller.signal,
          });
          if (enrollRes.data && enrollRes.data.enrolled) {
            setIsEnrolled(true);
            setEnrollStatus(enrollRes.data.status || "approved");
          }
        } catch (e) {
          // Ignore — likely 404 (not enrolled) or the request was cancelled
        }

        try {
          const reviewsRes = await api.get(`/reviews/course/${id}`, {
            signal: controller.signal,
          });
          if (reviewsRes.data && reviewsRes.data.reviews) {
            setReviews(reviewsRes.data.reviews);
            if (
              user &&
              reviewsRes.data.reviews.some(
                (r) =>
                  r.student?._id === user._id || r.student?._id === user.id,
              )
            ) {
              setHasReviewed(true);
            }
          }
        } catch (e) {
          // Ignore review fetch error
        }

        try {
          const standaloneRes = await api.get(
            `/standalone-lessons?relatedCourseId=${id}`,
            { signal: controller.signal },
          );
          setStandaloneLessons(standaloneRes.data.lessons || []);
        } catch (e) {
          // Ignore — standalone lessons are supplementary, not core to the page
        }

        if (user?.role === "student") {
          try {
            const purchasedRes = await api.get(
              "/standalone-lessons/mine-purchased",
              { signal: controller.signal },
            );
            const approvedIds = (purchasedRes.data.purchases || [])
              .filter((p) => p.status === "approved")
              .map((p) => p.lesson?._id);
            setPurchasedStandaloneIds(new Set(approvedIds));
          } catch (e) {
            // Ignore
          }
        }
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || t("course_page.fetch_error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (isEnrolled && enrollStatus === "pending") {
      const interval = setInterval(async () => {
        try {
          const enrollRes = await api.get(`/enrollments/${id}`);
          if (
            enrollRes.data &&
            enrollRes.data.enrolled &&
            enrollRes.data.status === "approved"
          ) {
            setEnrollStatus("approved");
            clearInterval(interval);
          }
        } catch (e) {
          // Ignore
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isEnrolled, enrollStatus, id]);

  const handleEnrollClick = () => {
    if (course.price > 0) {
      setShowPaymentModal(true);
    } else {
      handleEnroll();
    }
  };

  const handleEnroll = async (paymentDetails = {}) => {
    setIsEnrolling(true);
    setEnrollError("");
    setShowPaymentModal(false);
    try {
      const res = await api.post(`/enrollments/${id}`, paymentDetails);
      setIsEnrolled(true);
      setEnrollStatus(
        res.data.enrollment?.status ||
          (course.price > 0 ? "pending" : "approved"),
      );
    } catch (err) {
      if (err.response?.status === 409) {
        setIsEnrolled(true);
      } else {
        setEnrollError(
          err.response?.data?.message || t("course_page.enroll_error"),
        );
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleStandaloneLessonClick = (lesson) => {
    if (lesson.price > 0) {
      setPurchasingStandaloneLesson(lesson);
    } else {
      handlePurchaseStandaloneLesson(lesson, {});
    }
  };

  const handlePurchaseStandaloneLesson = async (
    lesson,
    paymentDetails = {},
  ) => {
    setIsPurchasingStandalone(true);
    setPurchasingStandaloneLesson(null);
    try {
      await api.post(
        `/standalone-lessons/${lesson._id}/purchase`,
        paymentDetails,
      );
      notyf.success(
        t(
          "course_page.standalone.purchased",
          "Purchase submitted — awaiting admin approval.",
        ),
      );
    } catch (err) {
      if (err.response?.status === 409) {
        notyf.error(
          t(
            "course_page.standalone.already_purchased",
            "You already purchased this lesson.",
          ),
        );
      } else {
        notyf.error(
          err.response?.data?.message || t("course_page.enroll_error"),
        );
      }
    } finally {
      setIsPurchasingStandalone(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !reviewRating) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.post("/reviews", {
        courseId: id,
        rating: reviewRating,
        text: reviewText,
      });
      if (res.data.review) {
        const newReview = res.data.review;
        newReview.student = {
          _id: user?._id || user?.id,
          name: user?.name,
          avatarUrl: user?.avatarUrl,
        };
        setReviews([newReview, ...reviews].slice(0, 10)); // Keep max 10
        setHasReviewed(true);
        setReviewText("");
        setReviewRating(5);
        notyf.success("Review submitted successfully");
      }
    } catch (err) {
      console.error("Failed to submit review", err);
      notyf.error(err.response?.data?.message || "Failed to submit review");
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
    setEditReviewText("");
    setEditReviewRating(5);
  };

  const updateReview = async (e) => {
    e.preventDefault();
    if (!editReviewText.trim() || !editReviewRating) return;

    setIsUpdatingReview(true);
    try {
      const res = await api.put(`/reviews/${editingReviewId}`, {
        rating: editReviewRating,
        text: editReviewText,
      });
      if (res.data.review) {
        setReviews(
          reviews.map((r) => (r._id === editingReviewId ? res.data.review : r)),
        );
        setEditingReviewId(null);
        notyf.success("Review updated successfully");
      }
    } catch (err) {
      console.error("Failed to update review", err);
      notyf.error(err.response?.data?.message || "Failed to update review");
    } finally {
      setIsUpdatingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(reviews.filter((r) => r._id !== reviewId));
      setHasReviewed(false);
      notyf.success("Review deleted successfully");
    } catch (err) {
      console.error("Failed to delete review", err);
      notyf.error(err.response?.data?.message || "Failed to delete review");
    }
  };

  if (loading) return <FullPageLoader message={t("course_page.loading")} />;
  if (error)
    return (
      <div
        style={{
          padding: "100px",
          textAlign: "center",
          color: "#ef4444",
          fontSize: "1.2rem",
        }}
      >
        {error}
      </div>
    );
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
            style={{ transform: isRTL ? "scaleX(-1)" : "none" }}
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
          {t(
            `categories.${course.category.replace(/\s+/g, "_").toLowerCase()}`,
            t(course.category, course.category),
          )}
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
                {t("course_page.reviews_tab", "Reviews ({{count}})", {
                  count: reviews.length,
                })}
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
                  {(() => {
                    const totalLessons = modules.reduce(
                      (sum, m) => sum + (m.lessons?.length || 0),
                      0,
                    );
                    return (
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                        }}
                      >
                        {totalLessons}{" "}
                        {totalLessons === 1
                          ? t("course_page.lesson_singular")
                          : t("course_page.lesson_plural")}
                      </span>
                    );
                  })()}
                </div>

                {modules.length === 0 ? (
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
                  modules.map((module, mIndex) => {
                    const isCollapsed = collapsedModules[module._id] !== false;
                    const moduleLessons = module.lessons || [];
                    return (
                      <div
                        key={module._id}
                        style={{
                          background: "var(--bg-main)",
                          borderRadius: "12px",
                          boxShadow: "var(--inner-shadow)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() =>
                            setCollapsedModules((prev) => ({
                              ...prev,
                              [module._id]: !prev[module._id],
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "18px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "start",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin: 0,
                                fontSize: "1.05rem",
                                fontWeight: "700",
                                color: "var(--text-primary)",
                              }}
                            >
                              {t("course_page.module_label", "Module")}{" "}
                              {mIndex + 1} — {module.title}
                            </h4>
                            <span
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {moduleLessons.length}{" "}
                              {moduleLessons.length === 1
                                ? t("course_page.lesson_singular")
                                : t("course_page.lesson_plural")}
                            </span>
                          </div>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transition: "transform 0.25s",
                              transform: isCollapsed
                                ? "rotate(-90deg)"
                                : "rotate(0deg)",
                              flexShrink: 0,
                              color: "var(--text-secondary)",
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        <div
                          className={`expandable-section ${!isCollapsed ? "expanded" : ""}`}
                        >
                          <div style={{ overflow: "hidden" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px",
                                padding: moduleLessons.length
                                  ? "0 16px 16px 16px"
                                  : "0",
                              }}
                            >
                              {moduleLessons.map((lesson, i) => (
                                <div
                                  key={lesson._id}
                                  style={{
                                    padding: "16px 20px",
                                    background: "var(--bg-surface)",
                                    borderRadius: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "16px",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "8px",
                                      background: "var(--bg-main)",
                                      color: "var(--text-primary)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: "700",
                                      fontSize: "0.85rem",
                                      boxShadow: "var(--outer-shadow)",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {i + 1}
                                  </div>
                                  <h4
                                    style={{
                                      margin: 0,
                                      fontSize: "1.0rem",
                                      fontWeight: "600",
                                      color: "var(--text-primary)",
                                    }}
                                  >
                                    {lesson.title}
                                  </h4>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "reviews" &&
              (() => {
                /* Calculate average rating from reviews */
                const avgRating =
                  reviews.length > 0
                    ? (
                        reviews.reduce((sum, r) => sum + r.rating, 0) /
                        reviews.length
                      ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "24px",
                    }}
                  >
                    {/* Average Rating Summary */}
                    <div
                      style={{
                        padding: "24px",
                        background: "var(--bg-main)",
                        borderRadius: "12px",
                        boxShadow: "var(--inner-shadow)",
                        display: "flex",
                        alignItems: "center",
                        gap: "24px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ textAlign: "center", minWidth: "80px" }}>
                        <div
                          style={{
                            fontSize: "2.5rem",
                            fontWeight: "800",
                            color: "var(--text-primary)",
                            lineHeight: "1",
                          }}
                        >
                          {avgRating}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "2px",
                            justifyContent: "center",
                            marginTop: "8px",
                          }}
                        >
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              style={{
                                color:
                                  i < Math.round(parseFloat(avgRating))
                                    ? "#f59e0b"
                                    : "var(--border)",
                                fontSize: "1.1rem",
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                            marginTop: "4px",
                          }}
                        >
                          {reviews.length}{" "}
                          {t(
                            "course_page.review_label",
                            reviews.length === 1 ? "review" : "reviews",
                          )}
                        </div>
                      </div>
                      {/* Rating breakdown bars */}
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          minWidth: "200px",
                        }}
                      >
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = reviews.filter(
                            (r) => r.rating === star,
                          ).length;
                          const pct =
                            reviews.length > 0
                              ? (count / reviews.length) * 100
                              : 0;
                          return (
                            <div
                              key={star}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-secondary)",
                                  width: "16px",
                                  textAlign: "right",
                                }}
                              >
                                {star}
                              </span>
                              <span
                                style={{
                                  color: "#f59e0b",
                                  fontSize: "0.85rem",
                                }}
                              >
                                ★
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  height: "8px",
                                  borderRadius: "4px",
                                  background: "var(--bg-surface)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: "100%",
                                    borderRadius: "4px",
                                    background: "#f59e0b",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  color: "var(--text-secondary)",
                                  width: "24px",
                                }}
                              >
                                {count}
                              </span>
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
                            {isSubmittingReview
                              ? "Submitting..."
                              : "Submit Review"}
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
                        <div
                          style={{ fontSize: "2.5rem", marginBottom: "12px" }}
                        >
                          📝
                        </div>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            marginBottom: "6px",
                          }}
                        >
                          {t("common.no_reviews_yet", "No reviews yet")}
                        </div>
                        <div style={{ fontSize: "0.9rem" }}>
                          {t(
                            "student.learning.be_first_review",
                            "Be the first to share your experience with this course!",
                          )}
                        </div>
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
                                      borderRadius: "12px",
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
                                      label: t("common.edit", "Edit"),
                                      action: () =>
                                        handleEditReviewClick(review),
                                    },
                                    {
                                      label: t("common.delete", "Delete"),
                                      action: () =>
                                        handleDeleteReview(review._id),
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
                                  alt={`${review.student.name || "Student"}'s profile picture`}
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
              enrollStatus === "pending" ? (
                <button
                  className="solid-btn"
                  style={{
                    width: "100%",
                    height: "54px",
                    fontSize: "1.05rem",
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                    cursor: "not-allowed",
                  }}
                  disabled
                >
                  {t("admin.pending_approval", "Pending Approval")}
                </button>
              ) : (
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
              )
            ) : (
              <button
                onClick={handleEnrollClick}
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
                disabled={cart.find((c) => c._id === course._id)}
                style={{
                  width: "100%",
                  height: "54px",
                  background: "var(--bg-main)",
                  boxShadow: "var(--inner-shadow)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
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
                    e.currentTarget.style.background = "var(--bg-surface)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cart.find((c) => c._id === course._id)) {
                    e.currentTarget.style.background = "var(--bg-main)";
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

      {standaloneLessons.length > 0 && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "32px auto 0",
            padding: "0 24px",
          }}
        >
          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: "700",
              marginBottom: "16px",
            }}
          >
            {t(
              "course_page.standalone.section_title",
              "Related Standalone Lessons",
            )}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {standaloneLessons.map((lesson) => {
              const alreadyPurchased = purchasedStandaloneIds.has(lesson._id);
              return (
                <div
                  key={lesson._id}
                  className="solid-card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--c-sub)",
                      fontWeight: 600,
                    }}
                  >
                    {t(
                      "course_page.standalone.related_to",
                      "Related to: {{course}}",
                      { course: course.title },
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    {lesson.title}
                  </div>
                  <div
                    style={{
                      color: "var(--text)",
                      fontSize: "0.9rem",
                      flex: 1,
                    }}
                  >
                    {lesson.description}
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {lesson.price > 0
                      ? `EGP ${lesson.price}`
                      : t("course_page.free", "Free")}
                  </div>
                  <button
                    type="button"
                    disabled={alreadyPurchased || isPurchasingStandalone}
                    onClick={() => handleStandaloneLessonClick(lesson)}
                    className="solid-btn"
                    style={{ marginTop: "8px" }}
                  >
                    {alreadyPurchased
                      ? t("course_page.standalone.owned", "Purchased")
                      : t("course_page.standalone.buy", "Purchase")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <PaymentModal
          course={course}
          isEnrolling={isEnrolling}
          onConfirm={handleEnroll}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {purchasingStandaloneLesson && (
        <PaymentModal
          course={purchasingStandaloneLesson}
          isEnrolling={isPurchasingStandalone}
          onConfirm={(paymentDetails) =>
            handlePurchaseStandaloneLesson(
              purchasingStandaloneLesson,
              paymentDetails,
            )
          }
          onCancel={() => setPurchasingStandaloneLesson(null)}
        />
      )}
    </div>
  );
}
