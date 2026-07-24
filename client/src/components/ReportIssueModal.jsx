import React, { useState } from 'react';

export default function ReportIssueModal({ isOpen, course, onClose, onSubmit }) {
  const [category, setCategory] = useState('Specific course');
  const [description, setDescription] = useState('');
  
  const tabsContainerRef = React.useRef(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (tabsContainerRef.current) {
          const activeBtn = tabsContainerRef.current.querySelector(".category-btn.active");
          if (activeBtn) {
            const containerLeft = tabsContainerRef.current.getBoundingClientRect().left;
            const btnLeft = activeBtn.getBoundingClientRect().left;
            const leftPos = btnLeft - containerLeft;
            
            setTabIndicatorStyle({
              left: leftPos,
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
    
    onSubmit({ category, description, courseId: course?._id });
    
    setCategory('Specific course');
    setDescription('');
  };

  const handleClose = () => {
    setCategory('Specific course');
    setDescription('');
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {/* Changed to solid-card to match Student Theme flat design */}
      <div
        className="solid-card animate-entrance"
        style={{ width: "100%", maxWidth: "600px", padding: "32px" }}
      >
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "var(--text-h)",
            letterSpacing: "-0.5px",
          }}
        >
          Report an Issue
        </h2>
        <p
          style={{
            margin: "0 0 32px 0",
            color: "var(--text)",
            fontSize: "1rem",
            lineHeight: "1.5",
          }}
        >
          Please let us know what's going wrong so we can fix it as soon as
          possible.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          <div className="input-group">
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--c-sub)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
                display: "block",
              }}
            >
              Issue Category
            </label>
            <div 
              ref={tabsContainerRef}
              style={{ 
                position: 'relative',
                display: 'flex', 
                gap: '8px'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${tabIndicatorStyle.left}px`,
                  width: `${tabIndicatorStyle.width}px`,
                  opacity: tabIndicatorStyle.opacity,
                  background: '#131219',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  zIndex: 0
                }}
              />
              
              {['Specific course', 'Specific instructor'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-btn ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                  style={{
                    flex: 1,
                    position: 'relative',
                    zIndex: 1,
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: category === cat ? '600' : '500',
                    color: category === cat ? 'var(--text-h)' : 'var(--c-sub)',
                    background: 'transparent',
                    transition: 'color 0.3s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Target Info Card */}
          {category === "Specific course" && course && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: "rgba(59, 130, 246, 0.05)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#3b82f6",
                    textTransform: "uppercase",
                    fontWeight: "600",
                    letterSpacing: "0.5px",
                    marginBottom: "2px",
                  }}
                >
                  Course Context
                </div>
                <div
                  style={{
                    color: "var(--text-h)",
                    fontWeight: "500",
                    fontSize: "1.05rem",
                  }}
                >
                  {course.title}
                </div>
              </div>
            </div>
          )}

          {category === "Specific instructor" && course?.instructor && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: "rgba(249, 115, 22, 0.05)",
                border: "1px solid rgba(249, 115, 22, 0.2)",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(249, 115, 22, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f97316",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#f97316",
                    textTransform: "uppercase",
                    fontWeight: "600",
                    letterSpacing: "0.5px",
                    marginBottom: "2px",
                  }}
                >
                  Instructor Context
                </div>
                <div
                  style={{
                    color: "var(--text-h)",
                    fontWeight: "500",
                    fontSize: "1.05rem",
                  }}
                >
                  {course.instructor.name || "Unknown Instructor"}
                </div>
              </div>
            </div>
          )}

          <div className="input-group">
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--c-sub)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Issue Description
            </label>
            <textarea
              placeholder="Please describe the problem in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              style={{
                minHeight: "120px",
                resize: "vertical",
                background: "var(--bg-main)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px",
                color: "var(--text-h)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.2s ease",
                backgroundColor: "inset rgba(0, 0, 0, 0.5) 0px 4px 12px",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-accent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
              }}
            />
          </div>

          <div className="input-row" style={{ marginTop: '8px', gap: '16px' }}>
            <button 
              type="button"
              className="sys-btn-secondary" 
              onClick={handleClose}
              style={{ 
                flex: 1, 
                padding: '14px 24px', 
                border: '1px solid #F5A623', 
                color: 'var(--text)', 
                background: 'transparent',
                borderRadius: '999px',
                transition: 'all 0.2s ease'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="sys-btn-primary" 
              disabled={!category || !description.trim()}
              style={{
                flex: 1,
                padding: '14px 24px',
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
