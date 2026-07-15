import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ExploreTab({ user }) {
  const navigate = useNavigate();
  const firstName = user?.name ? user.name.split(" ")[0] : "Student";
  const categories = ["All", "Development", "Design", "Data", "Business"];
  const [currentCategory, setCurrentCategory] = useState("All");
  const categoryContainerRef = useRef(null);
  const [filterIndicatorStyle, setFilterIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses');
        setCourses(res.data.data || res.data.courses || []);
      } catch (err) {
        console.error("Failed to fetch courses", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    // Small delay to ensure buttons are rendered and have dimensions
    const timer = setTimeout(() => {
      if (categoryContainerRef.current) {
        // Find the active button within the container
        const activeBtn = categoryContainerRef.current.querySelector('.filter-btn.active');
        if (activeBtn) {
          setFilterIndicatorStyle({
            left: activeBtn.offsetLeft,
            width: activeBtn.offsetWidth,
            opacity: 1
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [currentCategory, categories]);

  const filteredCourses = currentCategory === "All" 
    ? courses 
    : courses.filter(c => c.category === currentCategory);

  return (
    <>
      {/* Hero Banner */}
      <div className="hero-section glass-card animate-entrance" style={{ animationDelay: '0.1s' }}>
        <div className="hero-content">
          <h1>Ready to level up, {firstName}?</h1>
          <p>Discover new skills, dive into hot topics, and learn from the industry's best instructors.</p>
        </div>
        <button type="button" className="hero-btn glass-btn">Explore Catalog</button>
      </div>

      <div className="dashboard-grid">
        <div className="main-column" style={{ width: '100%' }}>

          {/* Suggested Courses with Filters */}
          <section className="dashboard-section animate-entrance" style={{ animationDelay: '0.4s' }}>
            <div className="section-header">
              <h2>Recommended for You</h2>
              <a href="#" className="view-all">View all</a>
            </div>
            
            <div className="category-filters" style={{ position: 'relative' }} ref={categoryContainerRef}>
              <div 
                className="filter-indicator" 
                style={{ 
                  left: `${filterIndicatorStyle.left}px`, 
                  width: `${filterIndicatorStyle.width}px`, 
                  opacity: filterIndicatorStyle.opacity 
                }} 
              />
              {categories.map(cat => (
                <button 
                  key={cat}
                  type="button" 
                  className={`filter-btn glass-card hover-glow ${cat === currentCategory ? 'active' : ''}`} 
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentCategory(cat);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="courses-row">
              {isLoading ? (
                <p style={{ color: 'var(--c-sub)' }}>Loading courses...</p>
              ) : filteredCourses.length > 0 ? filteredCourses.map((course, idx) => (
                <div 
                  key={course._id || idx} 
                  className="course-card glass-card animate-entrance hover-glow" 
                  style={{ animationDelay: `${0.05 + (idx * 0.1)}s`, cursor: 'pointer' }}
                  onClick={() => navigate(`/course/${course._id || idx + 1}`)}
                >
                  <div className="course-thumb" style={{ background: course.color || 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}></div>
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <p>{course.instructor?.name || 'Instructor'}</p>
                    <div className="course-meta">
                      <span className="rating">⭐ {course.rating || '4.5'}</span>
                      <span className="students">👨‍🎓 {course.students || '0'}</span>
                    </div>
                  </div>
                </div>
              )) : <p style={{ color: 'var(--c-sub)' }}>No courses found in this category.</p>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
