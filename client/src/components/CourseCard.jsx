import { useNavigate } from 'react-router-dom';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

export default function CourseCard({ course, idx = 0, isLightMode = false }) {
  const navigate = useNavigate();

  const {
    _id,
    title,
    thumbnailUrl,
    instructor,
    price,
    discountedPrice,
    averageRating,
    reviewsCount,
    category,
  } = course;

  const hasDiscount = discountedPrice != null && discountedPrice < price;
  const displayPrice = hasDiscount ? discountedPrice : price;
  const isProgramCourse = instructor?.isProgramInstructor === true;

  const renderStars = (rating) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
      <span className="cc-stars" aria-label={`${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) return <span key={i} className="cc-star cc-star--full">★</span>;
          if (i === full && half) return <span key={i} className="cc-star cc-star--half">★</span>;
          return <span key={i} className="cc-star cc-star--empty">★</span>;
        })}
      </span>
    );
  };

  const avatarSrc = instructor?.avatar;
  const avatarFallback = instructor?.name?.[0]?.toUpperCase() ?? 'I';
  const logo = isLightMode ? logoLight : logoDark;

  return (
    <article
      className="cc-card glass-card hover-glow animate-entrance"
      style={{ animationDelay: `${0.05 + idx * 0.06}s` }}
      onClick={() => navigate(`/course/${_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/course/${_id}`)}
      aria-label={`View course: ${title}`}
    >
      {/* 1. Thumbnail */}
      <div className="cc-thumb-wrap">
        {thumbnailUrl ? (
          <img
            className="cc-thumb"
            src={thumbnailUrl}
            alt={title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cc-thumb cc-thumb--fallback" aria-hidden="true" />
        )}

        {/* Program logo badge overlay on thumbnail — only for Program courses */}
        {isProgramCourse && (
          <div className="cc-thumb-badge" aria-label="Program course">
            <img src={logo} alt="Program" className="cc-thumb-badge-logo" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="cc-body">

        {/* 2. Title */}
        <h3 className="cc-title">{title}</h3>

        {/* 3. Instructor row */}
        <div className="cc-instructor-row">
          <div className="cc-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={instructor?.name} loading="lazy" decoding="async" />
            ) : (
              <span className="cc-avatar-initials">{avatarFallback}</span>
            )}
          </div>
          <span className="cc-instructor-name">
            {instructor?.name ?? 'Instructor'}
          </span>
          {isProgramCourse && (
            <img
              className="cc-program-logo"
              src={logo}
              alt="Program"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>

        {/* 4. Reviews */}
        <div className="cc-reviews">
          {reviewsCount > 0 ? (
            <>
              {renderStars(averageRating ?? 0)}
              <span className="cc-rating-value">{(averageRating ?? 0).toFixed(1)}</span>
              <span className="cc-reviews-count">
                ({reviewsCount.toLocaleString()} Reviews)
              </span>
            </>
          ) : (
            <span className="cc-no-reviews">No reviews yet</span>
          )}
        </div>

        {/* 5. Price */}
        <div className="cc-price-row">
          <span className="cc-price-current">
            EGP {Number(displayPrice ?? 0).toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="cc-price-original">
              EGP {Number(price).toLocaleString()}
            </span>
          )}
        </div>

        {/* 6. Category tag + Program logo box */}
        {category && (
          <div className="cc-footer">
            <span className="cc-category-tag">{category}</span>
            <div className="cc-logo-box">
              <img
                src={logo}
                alt="Program"
                className="cc-logo-box-img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        )}

      </div>
    </article>
  );
}
