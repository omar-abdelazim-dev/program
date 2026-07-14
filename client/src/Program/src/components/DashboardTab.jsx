import { enrolledCourses } from '../data';

export default function DashboardTab() {
  return (
    <>
      <div className="stats-grid animate-entrance" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card glass-card">
          <div className="stat-value">3</div>
          <div className="stat-label">Courses in Progress</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">12</div>
          <div className="stat-label">Completed Lessons</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">4.5h</div>
          <div className="stat-label">Learning Time</div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-value">🔥 7</div>
          <div className="stat-label">Day Streak!</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="main-column" style={{ width: '100%' }}>
          
          <section className="dashboard-section animate-entrance" style={{ animationDelay: '0.3s' }}>
            <div className="section-header">
              <h2>Continue Learning</h2>
              <a href="#" className="view-all">View all</a>
            </div>
            
            <div className="continue-row">
              {enrolledCourses.map((course, idx) => (
                <div key={idx} className="continue-card glass-card hover-glow animate-entrance" style={{ animationDelay: `${0.4 + (idx * 0.1)}s` }}>
                  <div className="continue-thumb" style={{ background: course.image }}></div>
                  <div className="continue-info">
                    <div className="continue-details">
                      <h3>{course.title}</h3>
                      <p>Up next: {course.lastLesson}</p>
                    </div>
                    <div className="continue-progress-area">
                      <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${course.progress}%` }}></div>
                      </div>
                      <span className="progress-text">{course.progress}% Complete</span>
                    </div>
                    <button className="play-btn glass-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
