import notyf from '../utils/notyf';
import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { useTranslation } from 'react-i18next';


export default function CurriculumBuilderTab({ courses = [], lessonsByCourse = {}, onOpenAddLesson, onOpenEditLesson, onEditCourse, onDeleteCourse }) {
  const { t } = useTranslation();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  const selectedLessons = selectedCourseId ? (lessonsByCourse[selectedCourseId] || []) : [];

  const handleTogglePublish = () => {
    notyf.success(t('instructor.notyf.lesson_updated'));
  };

  return (
    <div data-role="instructor">
      <div style={{ display: 'flex', minHeight: '600px', gap: '24px' }}>
        
        {/* Left pane: Course List */}
        <div className="glass-card no-border" style={{ width: '300px', background: 'var(--bg-surface)', border: 'none', padding: '24px', overflowY: 'auto', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
          {/* Translated Your Courses */}
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.dashboard.my_courses')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>{t('instructor.curriculum.no_course_selected')}</p>
            ) : (
              courses.map(course => (
                <div 
                  key={course._id} 
                  onClick={() => setSelectedCourseId(course._id)}
                  className={`hover-glow ${selectedCourseId === course._id ? 'active' : ''}`}
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    background: selectedCourseId === course._id ? 'var(--bg-main)' : 'transparent',
                    border: selectedCourseId === course._id ? '1px solid transparent' : '1px solid transparent',
                    boxShadow: selectedCourseId === course._id ? 'inset 0 4px 12px rgba(0,0,0,0.5)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-h)' }}>{course.title}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '6px' }}>
                    {lessonsByCourse[course._id]?.length || 0} lessons
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right pane: Lesson Manager */}
        <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column' }}>
          {!selectedCourseId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)' }}>
              {/* Translated Select a course */}
              {t('instructor.curriculum.select_course')}
            </div>
          ) : (
            <div className="animate-entrance">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-h)' }}>{selectedCourse?.title}</h2>
                  <p style={{ color: 'var(--c-sub)', margin: '4px 0 0 0' }}>{t('instructor.curriculum.manage_lessons')}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => onEditCourse(selectedCourse)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.5)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.3)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {/* Translated Edit Course */}
                    {t('instructor.dashboard.actions.edit')}
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.5)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.3)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {/* Translated Delete Course */}
                    {t('instructor.dashboard.actions.delete')}
                  </button>
                  <button 
                    onClick={() => onOpenAddLesson(selectedCourseId)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.5)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.boxShadow = 'inset 0 4px 12px rgba(0, 0, 0, 0.3)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {/* Translated Add Lesson */}
                    {t('instructor.curriculum.add_lesson')}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedLessons.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--c-sub)' }}>
                    {/* Translated No lessons */}
                    {t('instructor.curriculum.no_lessons')}
                  </div>
                ) : (
                  selectedLessons.map((lesson, index) => (
                    <div key={lesson._id || index} className="glass-card hover-glow" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-h)', fontWeight: 'bold' }}>
                          {lesson.order || index + 1}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-h)' }}>{lesson.title}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>Video content</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 500 }}>Draft</span>
                          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0 }}>
                            <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} onChange={handleTogglePublish} defaultChecked={true} />
                            <span style={{ 
                              position: 'absolute', cursor: 'pointer', inset: 0, backgroundColor: 'var(--c-orange)', borderRadius: '24px', transition: '.4s',
                            }}>
                              <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: '22px', bottom: '3px', backgroundColor: 'var(--bg)', borderRadius: '50%', transition: '.4s' }} />
                            </span>
                          </label>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-h)', fontWeight: 500 }}>Published</span>
                        </div>
                        
                        <button onClick={() => onOpenEditLesson(lesson)} className="sys-btn-secondary" style={{ padding: '6px 16px', fontSize: '0.9rem' }}>Edit</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        title={t('instructor.dashboard.actions.delete')}
        message={t('instructor.curriculum.delete_course_confirm')}
        confirmText={t('instructor.dashboard.actions.delete')}
        cancelText={t('instructor.create_course.cancel')}
        intent="danger"
        onConfirm={() => {
          onDeleteCourse(selectedCourseId);
          setShowDeleteModal(false);
          setSelectedCourseId(null);
        }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
