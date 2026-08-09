import re

file_path = 'client/src/components/DashboardTab.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the InProgressCard and CompletedCard
pattern = re.compile(r'const InProgressCard = \(\{.*?^\};\n\nconst CompletedCard = \(\{.*?^\};\n', re.DOTALL | re.MULTILINE)

replacement = """const InProgressCard = ({
  enrollment,
  onOpen,
  onViewCourse,
  openReportModal,
}) => {
  const { t } = useTranslation();
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div
      className="coursera-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer" }}
    >
      <div className="coursera-card-left">
        <div className="provider-header">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} className="provider-logo" alt={course.title} />
          ) : (
            <div className="provider-logo" style={{ background: "var(--bg-main)" }} />
          )}
          <div className="provider-info">
            <span className="provider-name">{instructor?.name || t('common.instructor', 'Instructor')}</span>
            <span className="provider-offered">{course.college ? `Offered by ${course.college}` : 'Offered by Program Platform'}</span>
          </div>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <div className="course-meta">
          {t('student.course', 'Course')} &bull; {enrollment.progressPercent}% {t('student.completed', 'complete')} &bull; {t('student.learning.estimated_completion', 'Estimated completion:')} {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <div className="coursera-card-right">
        <div className="next-lesson-info">
          <h4 className="next-lesson-title">
            {enrollment.currentLesson?.title || t('student.learning.up_next', 'Course Introduction')}
          </h4>
          <span className="next-lesson-duration">
            <svg style={{marginRight:'4px'}} xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg> 
            Video ({enrollment.currentLesson?.duration || 5} {t('student.learning.min', 'minutes')})
          </span>
        </div>
        <button
          className="continue-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(course._id);
          }}
        >
          {t('student.get_started', 'Get started')}
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu
            options={[
              { label: t('student.learning.report_issue', 'Report issue'), action: () => openReportModal(course) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

const CompletedCard = ({
  enrollment,
  onOpen,
  onViewCourse,
  openReportModal,
}) => {
  const { t } = useTranslation();
  const course = enrollment.course;
  const instructor = course.instructor;

  return (
    <div
      className="coursera-card animate-entrance"
      onClick={onViewCourse}
      style={{ cursor: "pointer", borderColor: "var(--color-accent)" }}
    >
      <div className="coursera-card-left">
        <div className="provider-header">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} className="provider-logo" alt={course.title} />
          ) : (
            <div className="provider-logo" style={{ background: "var(--bg-main)" }} />
          )}
          <div className="provider-info">
            <span className="provider-name">{instructor?.name || t('common.instructor', 'Instructor')}</span>
            <span className="provider-offered">{course.college ? `Offered by ${course.college}` : 'Offered by Program Platform'}</span>
          </div>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <div className="course-meta">
          {t('student.course', 'Course')} &bull; 100% {t('student.completed', 'complete')} &bull; {t('student.learning.completed_on', 'Completed on')} {new Date(enrollment.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <div className="coursera-card-right" style={{ justifyContent: 'flex-end' }}>
        <button
          className="continue-btn"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(course._id);
          }}
        >
          {t('student.learning.review', 'Review Course')}
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <ThreeDotMenu
            options={[
              {
                label: t('student.learning.share', 'Share'),
                action: () =>
                  notyf.open({
                    type: "info",
                    message: t('student.learning.share_copied', 'Share link copied to clipboard'),
                  }),
              },
              { label: t('student.learning.report_issue', 'Report issue'), action: () => openReportModal(course) },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
"""

content = pattern.sub(replacement, content)
content = content.replace("display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))'", "display: 'grid', gridTemplateColumns: '1fr'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
