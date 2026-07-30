import { useNavigate } from 'react-router-dom';
import '../styles/instructor.css';

export default function InstructorCard({ instructor, idx = 0 }) {
  const navigate = useNavigate();
  const { id, name, lastName, avatarUrl, expertise = [], avgRating = 0, totalStudents = 0, courseCount = 0 } = instructor;

  const fullName = [name, lastName].filter(Boolean).join(' ');
  const initials = name?.[0]?.toUpperCase() ?? 'I';

  const goToProfile = () => navigate(`/instructor/${id}`);

  return (
    <article
      className="ic-card saas-card interactive animate-entrance"
      style={{ animationDelay: `${0.05 + idx * 0.06}s` }}
      onClick={goToProfile}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && goToProfile()}
      aria-label={`View instructor profile: ${fullName}`}
    >
      <div className="ic-body">
        <div className="ic-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={fullName} loading="lazy" /> : <span>{initials}</span>}
        </div>
        <h3 className="ic-name">{fullName}</h3>
        <div className="ic-stats">
          <span>{courseCount} {courseCount === 1 ? 'course' : 'courses'}</span>
          <span>★ {avgRating > 0 ? avgRating.toFixed(1) : 'New'}</span>
          <span>{totalStudents.toLocaleString()} students</span>
        </div>
        {expertise.length > 0 && (
          <div className="ic-expertise">
            {expertise.slice(0, 3).map((tag) => (
              <span key={tag} className="ic-expertise-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
