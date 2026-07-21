import React, { useState, useRef, useEffect } from 'react';

export default function ReportIssueModal({ isOpen, course, onClose, onSubmit }) {
  const [category, setCategory] = useState('Specific course');
  const [description, setDescription] = useState('');
  
  const tabsContainerRef = useRef(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (tabsContainerRef.current) {
          const activeBtn = tabsContainerRef.current.querySelector(".dashboard-tab.active");
          if (activeBtn) {
            setTabIndicatorStyle({
              left: activeBtn.offsetLeft,
              width: activeBtn.offsetWidth,
              opacity: 1,
            });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category || !description.trim()) return;
    
    // Simulate API submission
    onSubmit({ category, description, courseId: course?._id });
    
    // Reset form after submission
    setCategory('Specific course');
    setDescription('');
  };

  const handleClose = () => {
    setCategory('Specific course');
    setDescription('');
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="glass-card animate-entrance" style={{ width: '100%', maxWidth: '600px', padding: '32px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: 'var(--text-h)' }}>Report an Issue</h2>
        <p style={{ margin: '0 0 24px 0', color: 'var(--c-sub)', fontSize: '1rem', lineHeight: '1.5' }}>
          Please let us know what's going wrong so we can fix it as soon as possible.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="input-group">
            <label>Issue Category</label>
            <div className="course-tabs" style={{ position: "relative", marginBottom: "8px", marginTop: "8px" }} ref={tabsContainerRef}>
              <div
                className="dashboard-tab-indicator"
                style={{
                  left: `${tabIndicatorStyle.left}px`,
                  width: `${tabIndicatorStyle.width}px`,
                  opacity: tabIndicatorStyle.opacity,
                }}
              />
              <button
                type="button"
                className={`dashboard-tab ${category === "Specific course" ? "active" : ""}`}
                onClick={() => setCategory("Specific course")}
                data-text="Specific course"
              >
                Specific course
              </button>
              <button
                type="button"
                className={`dashboard-tab ${category === "Specific instructor" ? "active" : ""}`}
                onClick={() => setCategory("Specific instructor")}
                data-text="Specific instructor"
              >
                Specific instructor
              </button>
            </div>
          </div>

          {/* Conditional UI based on Category */}
          {category === 'Specific course' && course && (
            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>Course:</span>
              <span className="role-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                {course.title}
              </span>
            </div>
          )}

          {category === 'Specific instructor' && course?.instructor && (
            <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>Instructor:</span>
              <span className="role-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                {course.instructor.name || "Unknown Instructor"}
              </span>
            </div>
          )}

          <div className="input-group">
            <label>Issue Description</label>
            <textarea 
              placeholder="Please describe the problem in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              style={{ minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <div className="input-row" style={{ marginTop: '16px' }}>
            <button 
              type="button"
              className="sys-btn-secondary" 
              onClick={handleClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="sys-btn-primary" 
              disabled={!category || !description.trim()}
              style={{
                opacity: (!category || !description.trim()) ? 0.5 : 1,
                cursor: (!category || !description.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
