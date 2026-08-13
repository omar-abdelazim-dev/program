import notyf from '../utils/notyf';
import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import ThreeDotMenu from './common/ThreeDotMenu';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function CurriculumBuilderTab({ courses = [], modulesByCourse = {}, onOpenAddLesson, onOpenEditLesson, onEditCourse, onDeleteCourse, onAction }) {
  const { t } = useTranslation();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState(null);
  const [deleteModuleTarget, setDeleteModuleTarget] = useState(null);
  // Optimistic status overrides: { lessonId: 'draft' | 'published' }
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [localModules, setLocalModules] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [isAddModuleFocused, setIsAddModuleFocused] = useState(false);
  const [isEditModuleFocused, setIsEditModuleFocused] = useState(false);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  // Sync local modules when props change
  React.useEffect(() => {
    if (selectedCourseId && modulesByCourse[selectedCourseId]) {
      setLocalModules(modulesByCourse[selectedCourseId]);
    } else {
      setLocalModules([]);
    }
  }, [selectedCourseId, modulesByCourse]);

  const toggleModuleCollapsed = (moduleId) => {
    setCollapsedModules(prev => {
      const currentlyCollapsed = prev[moduleId] !== false;
      return { ...prev, [moduleId]: !currentlyCollapsed };
    });
  };

  const handleAddModule = async () => {
    if (!selectedCourseId || !newModuleTitle.trim()) return;
    try {
      const { data } = await api.post(`/courses/${selectedCourseId}/modules`, { title: newModuleTitle.trim() });
      setLocalModules(prev => [...prev, { ...data.module, lessons: [] }]);
      setCollapsedModules(prev => ({ ...prev, [data.module._id]: false }));
      setNewModuleTitle('');
      setAddingModule(false);
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.curriculum.module_add_failed', 'Failed to add module'));
    }
  };

  const handleRenameModule = async (moduleId) => {
    if (!selectedCourseId || !moduleTitleDraft.trim()) {
      setEditingModuleId(null);
      return;
    }
    const title = moduleTitleDraft.trim();
    setLocalModules(prev => prev.map(m => m._id === moduleId ? { ...m, title } : m));
    setEditingModuleId(null);
    try {
      await api.put(`/courses/${selectedCourseId}/modules/${moduleId}`, { title });
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.curriculum.module_update_failed', 'Failed to rename module'));
      setLocalModules(modulesByCourse[selectedCourseId] || []);
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteModuleTarget || !selectedCourseId) return;
    try {
      await api.delete(`/courses/${selectedCourseId}/modules/${deleteModuleTarget._id}`);
      notyf.success(t('instructor.curriculum.module_deleted', 'Module deleted'));
      setDeleteModuleTarget(null);
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.curriculum.module_delete_failed', 'Failed to delete module'));
    }
  };

  const handleReorderModule = async (index, direction) => {
    if (!selectedCourseId) return;

    const newModules = [...localModules];
    if (direction === 'up' && index > 0) {
      [newModules[index - 1], newModules[index]] = [newModules[index], newModules[index - 1]];
    } else if (direction === 'down' && index < newModules.length - 1) {
      [newModules[index + 1], newModules[index]] = [newModules[index], newModules[index + 1]];
    } else {
      return;
    }
    setLocalModules(newModules);

    const moduleIds = newModules.map(m => m._id);
    try {
      await api.put(`/courses/${selectedCourseId}/modules-reorder`, { moduleIds });
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.curriculum.module_reorder_failed', 'Failed to reorder modules'));
      setLocalModules(modulesByCourse[selectedCourseId] || []);
    }
  };

  const handleReorderLesson = async (moduleId, index, direction) => {
    if (!selectedCourseId) return;
    const moduleIndex = localModules.findIndex(m => m._id === moduleId);
    if (moduleIndex === -1) return;

    const newModules = [...localModules];
    const lessons = [...(newModules[moduleIndex].lessons || [])];
    if (direction === 'up' && index > 0) {
      [lessons[index - 1], lessons[index]] = [lessons[index], lessons[index - 1]];
    } else if (direction === 'down' && index < lessons.length - 1) {
      [lessons[index + 1], lessons[index]] = [lessons[index], lessons[index + 1]];
    } else {
      return;
    }
    newModules[moduleIndex] = { ...newModules[moduleIndex], lessons };
    setLocalModules(newModules);

    const lessonIds = lessons.map(l => l._id);
    try {
      await api.put(`/courses/${selectedCourseId}/modules/${moduleId}/lessons-reorder`, { lessonIds });
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.curriculum.lesson_reorder_failed', 'Failed to reorder lessons'));
      setLocalModules(modulesByCourse[selectedCourseId] || []);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonTarget || !selectedCourseId) return;
    try {
      await api.delete(`/courses/${selectedCourseId}/lessons/${deleteLessonTarget._id}`);
      notyf.success('Lesson deleted successfully');
      setDeleteLessonTarget(null);
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error('Failed to delete lesson');
    }
  };

  const handleTogglePublish = async (courseId, lesson) => {
    // Use effective status (includes optimistic overrides)
    const currentStatus = pendingStatuses[lesson._id] || lesson.status;
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    // Optimistic: slide the pill immediately
    setPendingStatuses(prev => ({ ...prev, [lesson._id]: newStatus }));
    try {
      await api.put(`/courses/${courseId}/lessons/${lesson._id}`, { status: newStatus });
      notyf.success(newStatus === 'published'
        ? t('instructor.notyf.lesson_published', 'Lesson published')
        : t('instructor.notyf.lesson_drafted', 'Lesson drafted'));
      if (onAction) onAction();
    } catch (err) {
      // Revert on failure
      setPendingStatuses(prev => {
        const next = { ...prev };
        delete next[lesson._id];
        return next;
      });
      notyf.error(t('instructor.notyf.lesson_update_failed', 'Failed to update lesson status'));
    }
  };

  const totalLessonCount = localModules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  return (
    <div data-role="instructor">
      <div style={{ display: 'flex', minHeight: '600px', gap: '24px' }}>

        {/* Left pane: Course List */}
        <div className="glass-card no-border" style={{ width: '300px', background: 'var(--bg-surface)', border: 'none', padding: '24px', overflowY: 'auto', borderRadius: '24px', boxShadow: 'var(--outer-shadow)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.dashboard.my_courses')}</h3>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
              {courses.length === 0 ? (
                <p style={{ color: 'var(--c-sub)', fontSize: '0.9rem' }}>{t('instructor.curriculum.no_course_selected')}</p>
              ) : (
                courses.map(course => {
                  const lessonCount = (modulesByCourse[course._id] || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
                  return (
                    <div
                      key={course._id}
                      id={`course-btn-${course._id}`}
                      onClick={() => setSelectedCourseId(course._id)}
                      className={`hover-glow ${selectedCourseId === course._id ? 'active' : ''}`}
                      style={{
                        padding: '16px',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: '1px solid transparent',
                        transition: 'all 0.2s',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-h)' }}>{course.title}</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)', marginTop: '6px' }}>
                        {lessonCount} {(lessonCount === 1) ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Sliding vertical pill */}
            {(() => {
              const activeEl = document.getElementById(`course-btn-${selectedCourseId}`);
              const top = activeEl ? activeEl.offsetTop : 0;
              const height = activeEl ? activeEl.offsetHeight : 0;
              return (
                <div style={{
                  position: 'absolute',
                  top: top + 'px',
                  left: 0,
                  width: '100%',
                  height: height + 'px',
                  background: 'var(--bg-main)',
                  boxShadow: 'var(--inner-shadow)',
                  borderRadius: '24px',
                  transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 0,
                  opacity: selectedCourseId && activeEl ? 1 : 0,
                  pointerEvents: 'none'
                }} />
              );
            })()}
          </div>
        </div>

        {/* Right pane: Module / Lesson Manager */}
        <div style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column' }}>
          {!selectedCourseId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)' }}>
              {t('instructor.curriculum.select_course')}
            </div>
          ) : (
            <div key={selectedCourseId} className="animate-entrance" style={{ animationDuration: '0.9s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-h)' }}>{selectedCourse?.title}</h2>
                  <p style={{ color: 'var(--c-sub)', margin: '4px 0 0 0' }}>
                    {t('instructor.curriculum.manage_lessons')} · {totalLessonCount} {totalLessonCount === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => onEditCourse(selectedCourse)}
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {t('instructor.dashboard.actions.edit')}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {t('instructor.dashboard.actions.delete')}
                  </button>
                  <button
                    onClick={() => setAddingModule(true)}
                    style={{ width: 'auto', borderRadius: '24px', padding: '10px 24px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.boxShadow = 'var(--inner-shadow)'; e.currentTarget.style.filter = 'none'; }}
                  >
                    {t('instructor.curriculum.add_module', '+ Add Module')}
                  </button>
                </div>
              </div>

              {addingModule && (
                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                  <input
                    autoFocus
                    type="text"
                    className="auth-input"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onFocus={() => setIsAddModuleFocused(true)}
                    onBlur={() => setIsAddModuleFocused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') { setAddingModule(false); setNewModuleTitle(''); } }}
                    placeholder={t('instructor.curriculum.ph_module_title', 'Module title (e.g. "Introduction to Java")')}
                    style={{
                      flex: 1,
                      background: 'var(--bg-main)',
                      boxShadow: isAddModuleFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                      border: isAddModuleFocused ? '1px solid #f97316' : '1px solid var(--border)',
                      color: 'var(--text-h)',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      outline: 'none',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  />
                  <button onClick={handleAddModule} className="solid-btn" style={{ width: 'auto', padding: '10px 20px' }}>
                    {t('instructor.create_course.save', 'Save')}
                  </button>
                  <button onClick={() => { setAddingModule(false); setNewModuleTitle(''); }} style={{ width: 'auto', padding: '10px 20px', background: 'transparent', border: 'none', color: 'var(--c-sub)', cursor: 'pointer' }}>
                    {t('instructor.create_course.cancel', 'Cancel')}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {localModules.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--c-sub)' }}>
                    {t('instructor.curriculum.no_modules', 'No modules yet. Add a module to start organizing lessons.')}
                  </div>
                ) : (
                  localModules.map((module, mIndex) => {
                    const isCollapsed = collapsedModules[module._id] !== false;
                    const lessons = module.lessons || [];
                    return (
                      <div key={module._id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {/* Module header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <button
                                className="reorder-arrow-btn"
                                onClick={() => handleReorderModule(mIndex, 'up')}
                                disabled={mIndex === 0}
                                style={{ cursor: mIndex === 0 ? 'default' : 'pointer', color: mIndex === 0 ? 'var(--border)' : 'var(--c-sub)' }}
                                title="Move up"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                              </button>
                              <button
                                className="reorder-arrow-btn"
                                onClick={() => handleReorderModule(mIndex, 'down')}
                                disabled={mIndex === localModules.length - 1}
                                style={{ cursor: mIndex === localModules.length - 1 ? 'default' : 'pointer', color: mIndex === localModules.length - 1 ? 'var(--border)' : 'var(--c-sub)' }}
                                title="Move down"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                            </div>

                            <button
                              onClick={() => toggleModuleCollapsed(module._id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--c-sub)', display: 'flex', transition: 'transform 0.25s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                              title={isCollapsed ? 'Expand' : 'Collapse'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>

                            {editingModuleId === module._id ? (
                              <input
                                autoFocus
                                type="text"
                                className="auth-input"
                                value={moduleTitleDraft}
                                onChange={(e) => setModuleTitleDraft(e.target.value)}
                                onFocus={() => setIsEditModuleFocused(true)}
                                onBlur={() => { setIsEditModuleFocused(false); handleRenameModule(module._id); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameModule(module._id); if (e.key === 'Escape') setEditingModuleId(null); }}
                                style={{
                                  flex: 1,
                                  background: 'var(--bg-main)',
                                  boxShadow: isEditModuleFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                                  border: isEditModuleFocused ? '1px solid #f97316' : '1px solid var(--border)',
                                  color: 'var(--text-h)',
                                  padding: '8px 14px',
                                  borderRadius: '12px',
                                  outline: 'none',
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              />
                            ) : (
                              <div style={{ minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-h)' }}>{t('instructor.curriculum.module_label', 'Module')} {mIndex + 1} — {module.title}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>
                                  {lessons.length} {lessons.length === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}
                                </span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                              onClick={() => onOpenAddLesson(selectedCourseId, module._id)}
                              style={{
                                width: 'auto',
                                borderRadius: '20px',
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                border: 'none',
                                boxShadow: 'var(--inner-shadow)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.filter = 'none'; }}
                            >
                              {t('instructor.curriculum.add_lesson')}
                            </button>
                            <ThreeDotMenu
                              options={[
                                {
                                  label: t('instructor.dashboard.actions.edit', 'Edit'),
                                  action: () => { setEditingModuleId(module._id); setModuleTitleDraft(module.title); },
                                },
                                {
                                  label: t('instructor.dashboard.actions.delete', 'Delete'),
                                  danger: true,
                                  action: () => setDeleteModuleTarget(module),
                                },
                              ]}
                            />
                          </div>
                        </div>

                        {/* Lessons within this module (collapsible) */}
                        <div className={`expandable-section ${!isCollapsed ? 'expanded' : ''}`}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: lessons.length ? '0 20px 20px 20px' : '0' }}>
                              {lessons.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--c-sub)', fontSize: '0.9rem' }}>
                                  {t('instructor.curriculum.no_lessons')}
                                </div>
                              ) : (
                                lessons.map((lesson, index) => (
                                  <div key={lesson._id || index} style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button
                                          className="reorder-arrow-btn"
                                          onClick={() => handleReorderLesson(module._id, index, 'up')}
                                          disabled={index === 0}
                                          style={{ cursor: index === 0 ? 'default' : 'pointer', color: index === 0 ? 'var(--border)' : 'var(--c-sub)' }}
                                          title="Move up"
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                        </button>
                                        <button
                                          className="reorder-arrow-btn"
                                          onClick={() => handleReorderLesson(module._id, index, 'down')}
                                          disabled={index === lessons.length - 1}
                                          style={{ cursor: index === lessons.length - 1 ? 'default' : 'pointer', color: index === lessons.length - 1 ? 'var(--border)' : 'var(--c-sub)' }}
                                          title="Move down"
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                        </button>
                                      </div>
                                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-h)', fontWeight: 'bold', flexShrink: 0 }}>
                                        {index + 1}
                                      </div>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '1.0rem', color: 'var(--text-h)' }}>{lesson.title}</h4>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>{t('instructor.curriculum.video_content', 'Video content')}</span>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                      {(() => {
                                        const isPublished = (pendingStatuses[lesson._id] || lesson.status) === 'published';
                                        return (
                                          <div style={{ position: 'relative', display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: '50px', boxShadow: 'var(--inner-shadow)', width: '180px', height: '34px' }}>
                                            <div style={{
                                              position: 'absolute',
                                              top: '4px',
                                              insetInlineStart: isPublished ? '50%' : '4px',
                                              width: 'calc(50% - 4px)',
                                              height: 'calc(100% - 8px)',
                                              borderRadius: '50px',
                                              background: 'var(--bg-main)',
                                              boxShadow: 'var(--outer-shadow)',
                                              transition: 'inset-inline-start 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                              zIndex: 0,
                                            }} />
                                            <button
                                              onClick={() => { if (isPublished) handleTogglePublish(selectedCourseId, lesson); }}
                                              style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0', borderRadius: '50px', border: 'none', background: 'transparent', color: !isPublished ? 'var(--text-h)' : 'var(--c-sub)', cursor: 'pointer', fontWeight: !isPublished ? '600' : '400', transition: 'color 0.3s, font-weight 0.3s', fontSize: '0.82rem' }}
                                            >
                                              {t('instructor.dashboard.status.draft', 'Draft')}
                                            </button>
                                            <button
                                              onClick={() => { if (!isPublished) handleTogglePublish(selectedCourseId, lesson); }}
                                              style={{ flex: 1, position: 'relative', zIndex: 1, padding: '0', borderRadius: '50px', border: 'none', background: 'transparent', color: isPublished ? 'var(--text-h)' : 'var(--c-sub)', cursor: 'pointer', fontWeight: isPublished ? '600' : '400', transition: 'color 0.3s, font-weight 0.3s', fontSize: '0.82rem' }}
                                            >
                                              {t('instructor.dashboard.status.published', 'Published')}
                                            </button>
                                          </div>
                                        );
                                      })()}

                                      <ThreeDotMenu
                                        options={[
                                          {
                                            label: t('instructor.dashboard.actions.edit', 'Edit'),
                                            action: () => onOpenEditLesson(lesson),
                                          },
                                          {
                                            label: t('instructor.dashboard.actions.delete', 'Delete'),
                                            danger: true,
                                            action: () => setDeleteLessonTarget(lesson),
                                          },
                                        ]}
                                      />
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
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

      <ConfirmModal
        isOpen={!!deleteLessonTarget}
        title={t('instructor.curriculum.delete_lesson', 'Delete Lesson')}
        message={t('instructor.curriculum.delete_lesson_confirm', "Are you sure you want to delete this lesson? This is a permanent deletion and you can't revoke it.")}
        confirmText={t('instructor.dashboard.actions.delete', 'Delete')}
        cancelText={t('instructor.create_course.cancel', 'Cancel')}
        intent="danger"
        onConfirm={handleDeleteLesson}
        onCancel={() => setDeleteLessonTarget(null)}
      />

      <ConfirmModal
        isOpen={!!deleteModuleTarget}
        title={t('instructor.curriculum.delete_module', 'Delete Module')}
        message={t('instructor.curriculum.delete_module_confirm', "Are you sure you want to delete this module? All of its lessons will be permanently deleted too.")}
        confirmText={t('instructor.dashboard.actions.delete', 'Delete')}
        cancelText={t('instructor.create_course.cancel', 'Cancel')}
        intent="danger"
        onConfirm={handleDeleteModule}
        onCancel={() => setDeleteModuleTarget(null)}
      />
    </div>
  );
}
