import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function CoursePage({ cart = [], setCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('syllabus');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Mock course data since we don't have a backend yet
  const course = {
    id: id || '123',
    title: "Advanced React Patterns & System Design",
    instructor: "Dr. Sarah Ahmed",
    rating: "4.9",
    students: "12,450",
    price: "EGP 450",
    originalPrice: "EGP 1,200",
    description: "Master React by building enterprise-level applications. Learn how to architect scalable frontends, manage complex state, and implement design systems from scratch.",
    modules: [
      { title: "Module 1: Foundations of Enterprise React", lessons: 4, duration: "2h 15m" },
      { title: "Module 2: Advanced State Management (Zustand & Redux)", lessons: 6, duration: "3h 45m" },
      { title: "Module 3: Design Systems & CSS Architecture", lessons: 5, duration: "2h 30m" },
      { title: "Module 4: Performance Optimization & Web Vitals", lessons: 4, duration: "1h 50m" },
    ]
  };

  return (
    <div className="course-page animate-entrance" style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Course Header Banner */}
      <div className="course-header-banner glass-card" style={{ marginBottom: '24px', padding: '40px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))' }}>
        <button onClick={() => navigate('/student')} className="back-btn" style={{ marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Explore
        </button>
        <span className="topic-pill" style={{ display: 'inline-block', marginBottom: '16px', padding: '6px 16px', background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600' }}>Development</span>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', lineHeight: '1.2' }}>{course.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--c-sub)', marginBottom: '24px', maxWidth: '800px' }}>{course.description}</p>
        
        <div style={{ display: 'flex', gap: '24px', color: 'var(--c-sub)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <strong style={{ color: 'var(--c-light)' }}>{course.rating}</strong> (2.4k reviews)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <strong style={{ color: 'var(--c-light)' }}>{course.students}</strong> students
          </span>
        </div>
      </div>
      
      {/* Main Grid: Left Column (Syllabus/Instructor) & Right Column (Sidebar) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
        
        {/* Left Column: Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <img src="https://i.pravatar.cc/150?u=drsarah" alt={course.instructor} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{course.instructor}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)' }}>Senior Software Engineer at Google</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '32px' }}>
            <button 
              className={`nav-tab ${activeTab === 'syllabus' ? 'active' : ''}`}
              onClick={() => setActiveTab('syllabus')}
              style={{ background: 'transparent', paddingBottom: '12px', borderRadius: '0', cursor: 'pointer' }}
            >
              Course Syllabus
            </button>
            <button 
              className={`nav-tab ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
              style={{ background: 'transparent', paddingBottom: '12px', borderRadius: '0', cursor: 'pointer' }}
            >
              Reviews
            </button>
          </div>
          
          {activeTab === 'syllabus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.4rem' }}>Modules</h3>
                <span style={{ color: 'var(--c-sub)', fontWeight: '500' }}>{course.modules.length} sections • 10h 20m total length</span>
              </div>
              
              {course.modules.map((mod, i) => (
                <div key={i} className="glass-card hover-glow" style={{ padding: '24px', cursor: 'pointer', transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1.15rem', margin: 0 }}>{mod.title}</h4>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--c-sub)', marginTop: '12px', display: 'flex', gap: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> {mod.lessons} lessons</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {mod.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right Column: Floating Action Sidebar */}
        <div style={{ width: '100%', maxWidth: '400px', justifySelf: 'end' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '100px' }}>
            <div 
              onClick={() => setIsVideoModalOpen(true)}
              style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <img src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop" alt="Trailer" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: '0.5', transition: 'opacity 0.3s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '0.5'} />
              <div style={{ position: 'absolute', width: '64px', height: '64px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="2" style={{ marginLeft: '4px' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '8px' }}>
              <h2 style={{ fontSize: '2rem' }}>{course.price}</h2>
              <span style={{ color: 'var(--c-sub)', textDecoration: 'line-through', fontSize: '1.2rem' }}>{course.originalPrice}</span>
            </div>
            <p style={{ color: '#10B981', fontSize: '0.95rem', fontWeight: '600', marginTop: '-8px' }}>62% off - limited time!</p>
            
            <button onClick={() => navigate(`/checkout/${course.id}`)} className="glass-btn auth-submit-btn" style={{ width: '100%', padding: '14px', fontSize: '1.1rem', cursor: 'pointer', marginBottom: '12px' }}>
              Enroll Now
            </button>
            <button 
              onClick={() => {
                if (setCart && !cart.find(c => c.id === course.id)) {
                  setCart([...cart, course]);
                }
              }}
              className="glass-card hover-glow" 
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-h)' }}
              disabled={cart.find(c => c.id === course.id)}
            >
              {cart.find(c => c.id === course.id) ? 'Added to Cart ✓' : 'Add to Cart'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--c-sub)' }}>30-Day Money-Back Guarantee</p>
          </div>
        </div>
        
      </div>

      {/* Video Trailer Modal */}
      {isVideoModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '900px', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <button 
              onClick={() => setIsVideoModalOpen(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '50%', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div style={{ width: '100%', aspectRatio: '16/9' }}>
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                title="Course Trailer" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                style={{ border: 'none' }}
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
