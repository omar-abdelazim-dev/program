import notyf from '../utils/notyf';
import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';


export default function CurriculumBuilderTab({ courses = [], lessonsByCourse = {}, onOpenAddLesson, onOpenEditLesson, onEditCourse, onDeleteCourse }) {
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  const selectedLessons = selectedCourseId ? (lessonsByCourse[selectedCourseId] || []) : [];

  const handleTogglePublish = () => {
    notyf.success('Lesson updated successfully');
  };

  return (
    <div data-role="instructor">
      <div style={{ display: 'flex', minHeight: '600px', gap: '24px' }}>
        
        {/* Left pane: Course List */}
        <div className="glass-card no-border" style={{ width: '300px', background: 'var(--bg-surface)', border: 'none', padding: '24px', overflowY: 'auto', borderRadius: '24px', boxShadow: 'var(--outer-shadow)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Your Courses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {courses.length === 0 ? (
              <p style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>No courses created yet.</p>
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
                    boxShadow: selectedCourseId === course._id ? 'var(--inner-shadow)' : 'none',
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
              Select a course from the left to manage its curriculum.
            </div>
          ) : (
            <div className="animate-entrance">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-h)' }}>{selectedCourse?.title}</h2>
                  <p style={{ color: 'var(--c-sub)', margin: '4px 0 0 0' }}>Manage lessons and content</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => onEditCourse(selectedCourse)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    Edit Course
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(true)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    Delete Course
                  </button>
                  <button 
                    onClick={() => onOpenAddLesson(selectedCourseId)} 
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    + Add Lesson
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedLessons.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--c-sub)' }}>
                    No lessons in this course yet. Click '+ Add New Lesson' to get started.
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
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        confirmText="Delete Course"
        cancelText="Cancel"
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
