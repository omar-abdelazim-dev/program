import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function LearningPortal() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Mock data for the learning environment
  const courseName = "Advanced React Patterns & System Design";
  const [activeVideo, setActiveVideo] = useState("Introduction to Enterprise Architecture");
  const [completedLessons, setCompletedLessons] = useState(['1.1', '1.2']);
  const [activeTab, setActiveTab] = useState('overview');
  
  const modules = [
    {
      title: "Module 1: Foundations",
      lessons: [
        { id: '1.1', title: "Welcome & Setup", duration: "10:45" },
        { id: '1.2', title: "Thinking in React at Scale", duration: "15:20" },
        { id: '1.3', title: "Introduction to Enterprise Architecture", duration: "25:10" },
      ]
    },
    {
      title: "Module 2: Advanced State",
      lessons: [
        { id: '2.1', title: "Context API Deep Dive", duration: "18:30" },
        { id: '2.2', title: "Zustand vs Redux", duration: "22:15" },
        { id: '2.3', title: "Complex State Machines", duration: "30:00" },
      ]
    }
  ];

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const progressPercent = Math.round((completedLessons.length / totalLessons) * 100);

  const toggleComplete = (lessonId) => {
    if (completedLessons.includes(lessonId)) {
      setCompletedLessons(completedLessons.filter(id => id !== lessonId));
    } else {
      setCompletedLessons([...completedLessons, lessonId]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--c-bg)' }}>
      {/* Top Navbar specifically for Learning Portal */}
      <div style={{ padding: '16px 24px', background: 'var(--c-card)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(`/course/${id}`)} style={{ background: 'transparent', border: 'none', color: 'var(--c-sub)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 style={{ fontSize: '1.2rem', margin: '0 0 4px 0' }}>{courseName}</h1>
            <div style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>{progressPercent}% Complete</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'var(--c-light)', fontSize: '0.95rem', fontWeight: '500' }}>{progressPercent}%</div>
          <div style={{ width: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--c-orange), var(--c-yellow))', transition: 'width 0.3s' }}></div>
          </div>
          <button className="glass-btn auth-submit-btn" style={{ padding: '8px 16px', fontSize: '0.9rem', width: 'auto', borderRadius: '8px' }}>Get Certificate</button>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Video Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ width: '100%', background: '#000', aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Fake Video Player UI */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, rgba(0,0,0,0.8), transparent)' }}></div>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none" style={{ zIndex: 2, cursor: 'pointer', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            
            {/* DRM Watermark Mockup */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', zIndex: 2 }}>
              ID: 8849-DRM-2026
            </div>

            {/* Video Controls Mockup */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', position: 'relative' }}>
                <div style={{ width: '35%', height: '100%', background: 'var(--c-orange)', borderRadius: '2px' }}></div>
              </div>
              <span style={{ fontSize: '0.9rem' }}>04:12 / 25:10</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </div>
          </div>

          <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>{activeVideo}</h2>
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px', marginBottom: '24px' }}>
              <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ padding: 0, paddingBottom: '8px' }}>Overview</button>
              <button className={`nav-tab ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')} style={{ padding: 0, paddingBottom: '8px' }}>Q&A</button>
              <button className={`nav-tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')} style={{ padding: 0, paddingBottom: '8px' }}>Notes</button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <p style={{ color: 'var(--c-sub)', lineHeight: '1.6', marginBottom: '32px' }}>
                  In this lesson, we will dive deep into the core concepts of Enterprise Architecture. You will learn how to structure large-scale applications so that they are maintainable, scalable, and easy for new developers to onboard onto. Make sure to download the attached cheat sheet before proceeding!
                </p>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Resources</h3>
                <div className="glass-card hover-glow" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <div>
                      <div style={{ fontWeight: '600' }}>Architecture_Cheat_Sheet.pdf</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>2.4 MB PDF</div>
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
              </div>
            )}
            
            {activeTab === 'qa' && (
              <div>
                <p style={{ color: 'var(--c-sub)' }}>No questions have been asked yet. Be the first to start a discussion!</p>
                <button className="glass-btn" style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.9rem' }}>Ask a Question</button>
              </div>
            )}
            
            {activeTab === 'notes' && (
              <div>
                <textarea 
                  placeholder="Type your notes here... They will be saved automatically." 
                  style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '16px', color: '#fff', fontSize: '1rem', resize: 'vertical' }}
                ></textarea>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: '400px', background: 'var(--c-card)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Course Content</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {modules.map((mod, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {mod.title}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                
                <div>
                  {mod.lessons.map(lesson => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isActive = activeVideo === lesson.title;
                    
                    return (
                      <div 
                        key={lesson.id} 
                        onClick={() => setActiveVideo(lesson.title)}
                        style={{ padding: '16px 24px', display: 'flex', gap: '16px', cursor: 'pointer', background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent', borderLeft: isActive ? '3px solid var(--c-orange)' : '3px solid transparent', transition: 'all 0.2s' }}
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id); }}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', border: isCompleted ? 'none' : '2px solid rgba(255,255,255,0.2)', background: isCompleted ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          {isCompleted && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </button>
                        
                        <div>
                          <div style={{ fontWeight: isActive ? '600' : '400', color: isActive ? 'var(--c-light)' : 'var(--c-sub)', marginBottom: '4px' }}>
                            {lesson.id} {lesson.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {lesson.duration}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
