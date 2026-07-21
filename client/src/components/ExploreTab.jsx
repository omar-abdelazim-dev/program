import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import CourseCard from './CourseCard';

const SEARCH_DEBOUNCE_MS = 300;

export default function ExploreTab({ user, searchQuery = '' }) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const categories = ['All', 'Development', 'Design', 'Data', 'Business'];
  const [currentCategory, setCurrentCategory] = useState('All');
  const categoryContainerRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery.trim());
  const [websiteContent, setWebsiteContent] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (currentCategory !== 'All') params.category = currentCategory;
        const [res, contentRes] = await Promise.all([
          api.get('/courses', { params, signal: controller.signal }),
          api.get('/website/public/content').catch(() => null)
        ]);
        setCourses(res.data.data || res.data.courses || []);
        if (contentRes && contentRes.data) {
          setWebsiteContent(contentRes.data);
        }
      } catch (err) {
        if (err.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch courses', err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchCourses();
    return () => controller.abort();
  }, [debouncedSearch, currentCategory]);

  return (
    <>
      {/* Hero Banner */}
      {(!websiteContent || websiteContent.homepage?.sectionsVisibility?.hero) && (
        <div 
          className="hero-section glass-card animate-entrance" 
          style={{ 
            animationDelay: '0.1s',
            ...(websiteContent?.homepage?.hero?.heroImage ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${websiteContent.homepage.hero.heroImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {})
          }}
        >
          <div className="hero-content">
            <h1>{websiteContent?.homepage?.hero?.title ? websiteContent.homepage.hero.title.replace('{name}', firstName) : `Ready to level up, ${firstName}?`}</h1>
            <p>{websiteContent?.homepage?.hero?.subtitle || "Discover new skills, dive into hot topics, and learn from the industry's best instructors."}</p>
          </div>
          <button type="button" className="hero-btn glass-btn">
            {websiteContent?.homepage?.hero?.primaryButtonText || 'Explore Catalog'}
          </button>
        </div>
      )}

      {/* Banner */}
      {websiteContent?.homepage?.banner?.enabled && (
        <div className="glass-card animate-entrance" style={{ animationDelay: '0.2s', marginTop: '20px', background: 'var(--c-orange)', color: '#000', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{websiteContent.homepage.banner.title}</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>{websiteContent.homepage.banner.description}</p>
          </div>
          {websiteContent.homepage.banner.ctaText && (
            <button className="glass-btn" style={{ background: '#000', color: '#fff', border: 'none' }}>
              {websiteContent.homepage.banner.ctaText}
            </button>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="main-column" style={{ width: '100%' }}>
          <section className="dashboard-section animate-entrance" style={{ animationDelay: '0.4s' }}>
            <div className="section-header">
              <h2>Recommended for You</h2>
              <a href="#" className="view-all">View all</a>
            </div>

            {/* Category filters */}
            <div
              className="category-filters"
              style={{ position: 'relative' }}
              ref={categoryContainerRef}
            >

              {categories.map((cat) => (
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

            {/* Course grid */}
            {isLoading ? (
              <div className="cc-skeleton-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="cc-skeleton glass-card" />
                ))}
              </div>
            ) : courses.length > 0 ? (
              <div className="cc-grid">
                {courses.map((course, idx) => (
                  <CourseCard key={course._id || idx} course={course} idx={idx} />
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--c-sub)', padding: '32px 0' }}>
                {debouncedSearch
                  ? `No courses found for "${debouncedSearch}"${currentCategory !== 'All' ? ` in ${currentCategory}` : ''}.`
                  : 'No courses found in this category.'}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
