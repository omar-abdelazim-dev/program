import notyf from '../utils/notyf';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from './ConfirmModal';
import ThreeDotMenu from './common/ThreeDotMenu';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function CurriculumBuilderTab({ 
  courses = [], 
  modulesByCourse = {}, 
  selectedCourseId: controlledSelectedCourseId,
  onSelectCourse,
  onCreateCourse,
  onTogglePublish,
  onSubmitForReview,
  onRepublish,
  onRequestPriceChange,
  onConvertCourse,
  onOpenAddLesson, 
  onOpenEditLesson, 
  onOpenAddQuiz, 
  onOpenEditQuiz, 
  onEditCourse, 
  onDeleteCourse, 
  onAction, 
  onOpenStandaloneLessons 
}) {
  const { t, i18n } = useTranslation();
  const [internalSelectedCourseId, setInternalSelectedCourseId] = useState(controlledSelectedCourseId || null);
  const selectedCourseId = controlledSelectedCourseId !== undefined ? controlledSelectedCourseId : internalSelectedCourseId;
  const setSelectedCourseId = (id) => {
    setInternalSelectedCourseId(id);
    if (onSelectCourse) onSelectCourse(id);
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState(null);
  const [deleteModuleTarget, setDeleteModuleTarget] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);
  const [previewQuiz, setPreviewQuiz] = useState(null);
  // Optimistic status overrides: { lessonId: 'draft' | 'published' }
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [localModules, setLocalModules] = useState([]);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [moduleTitleDraft, setModuleTitleDraft] = useState('');
  const [modulePriceDraft, setModulePriceDraft] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModulePrice, setNewModulePrice] = useState('');
  const [isAddModuleFocused, setIsAddModuleFocused] = useState(false);
  const [isAddModulePriceFocused, setIsAddModulePriceFocused] = useState(false);
  const [isEditModuleFocused, setIsEditModuleFocused] = useState(false);
  const [isEditModulePriceFocused, setIsEditModulePriceFocused] = useState(false);
  const [hoveredModuleId, setHoveredModuleId] = useState(null);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  // Mirrors the backend's isCourseContentLocked (server/utils/courseContent.js) —
  // a published Full Course can't take new modules/lessons.
  const isLocked = selectedCourse?.courseType === 'full' && selectedCourse?.status === 'approved';

  // Sync local modules when props change
  React.useEffect(() => {
    if (selectedCourseId && modulesByCourse[selectedCourseId]) {
      setLocalModules(modulesByCourse[selectedCourseId]);
    } else {
      setLocalModules([]);
    }
  }, [selectedCourseId, modulesByCourse]);

  const toggleModuleCollapsed = (moduleId) => {
    setCollapsedModules(prev => ({ ...prev, [moduleId]: prev[moduleId] === false ? true : false }));
  };

  const handleAddModule = async () => {
    if (!selectedCourseId || !newModuleTitle.trim()) return;
    const isOngoing = selectedCourse?.courseType === 'ongoing';
    let priceVal = undefined;
    if (isOngoing) {
      const parsedPrice = Number(newModulePrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 50 || parsedPrice > 200) {
        notyf.error(t('instructor.curriculum.ongoing_module_price_range', 'Ongoing course module price must be between 50 EGP and 200 EGP.'));
        return;
      }
      priceVal = parsedPrice;
    }

    try {
      const { data } = await api.post(`/courses/${selectedCourseId}/modules`, {
        title: newModuleTitle.trim(),
        ...(priceVal !== undefined && { price: priceVal }),
      });
      setLocalModules(prev => [...prev, { ...data.module, lessons: [] }]);
      setCollapsedModules(prev => ({ ...prev, [data.module._id]: false }));
      setNewModuleTitle('');
      setNewModulePrice('');
      setAddingModule(false);
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || t('instructor.curriculum.module_add_failed', 'Failed to add module'));
    }
  };

  const handleRenameModule = async (moduleId) => {
    if (!selectedCourseId || !moduleTitleDraft.trim()) {
      setEditingModuleId(null);
      return;
    }
    const title = moduleTitleDraft.trim();
    const isOngoing = selectedCourse?.courseType === 'ongoing';
    let priceVal = undefined;
    if (isOngoing && modulePriceDraft !== '') {
      const parsedPrice = Number(modulePriceDraft);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 50 || parsedPrice > 200) {
        notyf.error(t('instructor.curriculum.ongoing_module_price_range', 'Ongoing course module price must be between 50 EGP and 200 EGP.'));
        return;
      }
      priceVal = parsedPrice;
    }

    setLocalModules(prev => prev.map(m => m._id === moduleId ? { ...m, title, ...(priceVal !== undefined && { price: priceVal }) } : m));
    setEditingModuleId(null);
    try {
      await api.put(`/courses/${selectedCourseId}/modules/${moduleId}`, {
        title,
        ...(priceVal !== undefined && { price: priceVal }),
      });
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || t('instructor.curriculum.module_update_failed', 'Failed to update module'));
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
      notyf.error(err.response?.data?.message || 'Failed to delete lesson');
    }
  };

  const handleToggleLessonStatus = async (lesson) => {
    if (!selectedCourseId) return;
    const currentStatus = pendingStatuses[lesson._id] || lesson.status || 'draft';
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';

    // Optimistically update
    setPendingStatuses(prev => ({ ...prev, [lesson._id]: nextStatus }));

    try {
      const formData = new FormData();
      formData.append('title', lesson.title);
      formData.append('status', nextStatus);
      formData.append('duration', lesson.duration || 0);

      await api.put(`/courses/${selectedCourseId}/lessons/${lesson._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPendingStatuses(prev => {
        const next = { ...prev };
        delete next[lesson._id];
        return next;
      });

      if (nextStatus === 'published') {
        notyf.success(t('instructor.notyf.lesson_published', 'Lesson published!'));
      } else {
        notyf.success(t('instructor.notyf.lesson_draft', 'Lesson saved as draft.'));
      }

      if (onAction) onAction();
    } catch (err) {
      console.error('Failed to toggle lesson status:', err);
      // Revert optimistic update
      setPendingStatuses(prev => {
        const next = { ...prev };
        delete next[lesson._id];
        return next;
      });
      notyf.error(t('instructor.notyf.lesson_update_failed', 'Failed to update lesson status'));
    }
  };

  const handlePublishAllInModule = async (module) => {
    if (!selectedCourseId || !module.lessons || module.lessons.length === 0) {
      notyf.error(t('instructor.curriculum.no_lessons_in_module', 'No lessons in this module yet.'));
      return;
    }
    const draftLessons = module.lessons.filter(l => (pendingStatuses[l._id] || l.status) !== 'published');
    if (draftLessons.length === 0) {
      notyf.success(t('instructor.curriculum.all_lessons_already_published', 'All lessons in this module are already published.'));
      return;
    }

    // Optimistically update all draft lessons in this module
    const newPending = {};
    draftLessons.forEach(l => { newPending[l._id] = 'published'; });
    setPendingStatuses(prev => ({ ...prev, ...newPending }));

    try {
      await Promise.all(draftLessons.map(lesson => {
        const formData = new FormData();
        formData.append('title', lesson.title);
        formData.append('status', 'published');
        formData.append('duration', lesson.duration || 0);
        return api.put(`/courses/${selectedCourseId}/lessons/${lesson._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }));

      setPendingStatuses(prev => {
        const next = { ...prev };
        draftLessons.forEach(l => delete next[l._id]);
        return next;
      });

      notyf.success(t('instructor.curriculum.all_lessons_published', 'All lessons in this module have been published!'));
      if (onAction) onAction();
    } catch (err) {
      console.error('Failed to publish all lessons:', err);
      setPendingStatuses(prev => {
        const next = { ...prev };
        draftLessons.forEach(l => delete next[l._id]);
        return next;
      });
      notyf.error(t('instructor.curriculum.publish_all_failed', 'Failed to publish all lessons'));
    }
  };

  const handleReviewLesson = async (lesson) => {
    if (!selectedCourseId) return;
    if (lesson.videoUrl || lesson.attachmentUrl) {
      setPreviewLesson(lesson);
      return;
    }
    try {
      const res = await api.get(`/courses/${selectedCourseId}/lessons/${lesson._id}`);
      setPreviewLesson(res.data.lesson || lesson);
    } catch (err) {
      console.error('Failed to load lesson for review:', err);
      setPreviewLesson(lesson);
    }
  };

  const handleReviewQuiz = async (lesson) => {
    if (!selectedCourseId) return;
    if (lesson.quiz?.questions) {
      setPreviewQuiz(lesson.quiz);
      return;
    }
    try {
      const res = await api.get(`/courses/${selectedCourseId}/quizzes/${lesson.quiz?._id || lesson._id}`);
      setPreviewQuiz(res.data.quiz || lesson.quiz || lesson);
    } catch (err) {
      console.error('Failed to load quiz for review:', err);
      setPreviewQuiz(lesson.quiz || lesson);
    }
  };

  const totalLessonCount = localModules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  // VIEW 1: MY COURSES LIST VIEW
  if (!selectedCourseId) {
    return (
      <div data-role="instructor" className="animate-entrance">
        {/* Header with Title and + Create Course Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-h)' }}>{t('instructor.dashboard.my_courses')}</h2>
          {onCreateCourse && (
            <button
              onClick={onCreateCourse}
              style={{
                width: 'auto',
                borderRadius: '12px',
                padding: '10px 24px',
                fontWeight: 700,
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
              {t('instructor.dashboard.create_course')}
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))', gap: '24px' }}>
          {courses.length === 0 ? (
            <div className="solid-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', gridColumn: '1 / -1' }}>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0 }}>
                {t('instructor.no_courses', "You haven't created any courses yet. Start sharing your knowledge with the world!")}
              </p>
            </div>
          ) : (
            courses.map(course => {
              const modules = modulesByCourse[course._id] || [];
              const lessonCount = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
              const isFullCourse = course.courseType !== 'ongoing';
              return (
                <div
                  key={course._id}
                  className={`solid-card hover-glow ${course.status === 'suspended' ? 'clickable' : ''}`}
                  onClick={() => {
                    if (course.status === 'suspended' && onRepublish) {
                      onRepublish(course._id);
                    } else {
                      setSelectedCourseId(course._id);
                    }
                  }}
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    boxShadow: 'var(--outer-shadow)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          style={{
                            width: '120px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '120px',
                            height: '80px',
                            background: 'var(--bg-main)',
                            boxShadow: 'var(--inner-shadow)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--c-sub)',
                            flexShrink: 0
                          }}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--text-h)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {course.title}
                        </h3>
                        <div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>
                          {t('instructor.dashboard.price')}: EGP {course.price} • {t('instructor.dashboard.category')}: {t(`categories.${(course.category || '').replace(/\s+/g, '_').toLowerCase()}`, course.category || '')}
                        </div>

                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* If course in draft and not yet approved by admin, show "Submit for Review" button */}
                          {course.status === 'draft' && !course.approvedBy ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onSubmitForReview && onSubmitForReview(course._id, e); }}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                              onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                            >
                              {t('instructor.dashboard.submit_for_review', 'Submit for Review')}
                            </button>
                          ) : course.status === 'draft' && onTogglePublish ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onTogglePublish(course._id, e); }}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                              onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                            >
                              {t('instructor.dashboard.go_live', 'Go Live')}
                            </button>
                          ) : (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                boxShadow: 'var(--inner-shadow)',
                                background:
                                  course.status === 'approved'
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : course.status === 'rejected'
                                      ? 'rgba(239, 68, 68, 0.2)'
                                      : course.status === 'archived'
                                        ? 'rgba(148, 163, 184, 0.2)'
                                        : 'rgba(245, 158, 11, 0.2)',
                                color:
                                  course.status === 'approved'
                                    ? '#10B981'
                                    : course.status === 'rejected'
                                      ? '#ef4444'
                                      : course.status === 'archived'
                                        ? '#94a3b8'
                                        : '#F59E0B',
                              }}
                            >
                              {course.status === 'approved' ? t('instructor.dashboard.status.live', 'LIVE') : (t(`instructor.dashboard.status.${course.status}`) || course.status.toUpperCase())}
                            </span>
                          )}

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              boxShadow: 'var(--inner-shadow)',
                              background: 'rgba(148, 163, 184, 0.15)',
                              color: 'var(--text)',
                            }}
                          >
                            {isFullCourse
                              ? t('instructor.create_course.full_course_title', 'Full Course')
                              : t('instructor.create_course.ongoing_course_title', 'Ongoing Course')}
                            {isFullCourse && course.status === 'approved' && ` · ${t('instructor.curriculum.content_locked', 'Content Locked')}`}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                            {lessonCount === 0
                              ? t('instructor.dashboard.status.no_lessons_yet')
                              : `${lessonCount} ${lessonCount === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}`}
                          </span>

                          {/* Request Price Change (Only for Live Full Courses) */}
                          {isFullCourse && course.status === 'approved' && (
                            course.pendingPriceChange?.status === 'pending' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  boxShadow: 'var(--inner-shadow)',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#d97706',
                                  border: 'none',
                                }}
                              >
                                {t('instructor.dashboard.price_change.pending', 'Price change pending: EGP {{price}}', {
                                  price: course.pendingPriceChange.requestedPrice,
                                })}
                              </span>
                            ) : (
                              onRequestPriceChange && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRequestPriceChange(course);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: 'rgba(249, 115, 22, 0.1)',
                                    border: 'none',
                                    boxShadow: 'var(--inner-shadow)',
                                    color: '#f97316',
                                    cursor: 'pointer',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease-in-out',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
                                    e.currentTarget.style.filter = 'brightness(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                    e.currentTarget.style.filter = 'none';
                                  }}
                                >
                                  {t('instructor.dashboard.price_change.request', 'Request Price Change')}
                                </button>
                              )
                            )
                          )}
                        </div>

                        {(course.status === 'rejected' || course.status === 'suspended') && course.rejectionReason && (
                          <div
                            style={{
                              boxShadow: 'var(--inner-shadow)',
                              marginTop: '8px',
                              padding: '6px 14px',
                              background: course.status === 'suspended' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              border: 'none',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              color: 'var(--text)',
                              width: 'fit-content',
                            }}
                          >
                            <span style={{ color: course.status === 'suspended' ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                              {t('instructor.dashboard.status.reason')}:{' '}
                            </span>
                            {course.rejectionReason}
                          </div>
                        )}

                        {course.courseType === 'ongoing' && course.status === 'approved' && course.lastPublishedContentAt && (() => {
                          const daysSince = Math.floor((Date.now() - new Date(course.lastPublishedContentAt).getTime()) / (24 * 60 * 60 * 1000));
                          const daysLeft = Math.max(0, 14 - daysSince);
                          return (
                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text)' }}>
                              {t('instructor.dashboard.ongoing.last_lecture', 'Last Lecture: {{days}} days ago', { days: daysSince })}
                              {' · '}
                              {t('instructor.dashboard.ongoing.next_deadline', 'Next Activity Deadline: {{days}} days', { days: daysLeft })}
                            </div>
                          );
                        })()}

                        {course.courseType === 'ongoing' && course.status === 'draft' && course.draftStartedAt && (() => {
                          const daysSinceDraft = Math.floor((Date.now() - new Date(course.draftStartedAt).getTime()) / (24 * 60 * 60 * 1000));
                          const daysUntilArchive = Math.max(0, 90 - daysSinceDraft);
                          return (
                            <div
                              style={{
                                boxShadow: 'var(--inner-shadow)',
                                marginTop: '8px',
                                padding: '6px 14px',
                                background: 'rgba(249, 115, 22, 0.15)',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                color: 'var(--text)',
                                width: 'fit-content',
                              }}
                            >
                              <div>{t('instructor.dashboard.ongoing.draft_reason', 'No new lecture was published for 14 days.')}</div>
                              <div style={{ marginTop: '4px', fontWeight: 600 }}>
                                {t('instructor.dashboard.ongoing.draft_deletion', 'Removed in {{days}} days unless you publish a new lesson or convert to a Full Course.', { days: daysUntilArchive })}
                              </div>
                              {onConvertCourse && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onConvertCourse(course); }}
                                  style={{ marginTop: '8px', background: 'none', border: 'none', color: '#f97316', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
                                >
                                  {t('instructor.dashboard.convert.button', 'Convert to Full Course')}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <ThreeDotMenu
                        options={[
                          {
                            label: t('instructor.curriculum.edit_curriculum', 'Edit Curriculum'),
                            action: () => setSelectedCourseId(course._id)
                          },
                          {
                            label: t('instructor.dashboard.actions.edit', 'Edit Course Details'),
                            action: () => onEditCourse && onEditCourse(course)
                          },
                          ...(course.courseType !== 'ongoing' && course.status === 'approved' && onRequestPriceChange ? [{
                            label: t('instructor.dashboard.price_change.request', 'Request Price Change'),
                            action: () => onRequestPriceChange(course)
                          }] : []),
                          ...(onOpenStandaloneLessons ? [{
                            label: t('instructor.curriculum.standalone.manage', 'Manage Standalone Lessons'),
                            action: () => onOpenStandaloneLessons(course)
                          }] : []),
                          {
                            label: t('instructor.dashboard.actions.delete', 'Delete Course'),
                            action: () => {
                              setSelectedCourseId(course._id);
                              setShowDeleteModal(true);
                            },
                            danger: true
                          }
                        ]}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: COURSE CURRICULUM BUILDER VIEW
  return (
    <div data-role="instructor" className="animate-entrance">
      {/* Top Header Bar with Back Button and Course Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSelectedCourseId(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--outer-shadow)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '8px 18px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-h)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: 'auto',
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--bg-main)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)';
              e.currentTarget.style.boxShadow = 'var(--outer-shadow)';
            }}
          >
            <span>{i18n.language === 'ar' ? '→' : '←'}</span> {t('instructor.curriculum.back_to_courses', 'Back to My Courses')}
          </button>

          <div>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-h)' }}>{selectedCourse?.title}</h2>
            <p style={{ color: 'var(--c-sub)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
              {t('instructor.curriculum.manage_lessons')} · {totalLessonCount} {totalLessonCount === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}
              {selectedCourse?.courseType && (
                <>
                  {' · '}
                  {selectedCourse.courseType === 'full' ? t('instructor.create_course.full_course_title', 'Full Course') : t('instructor.create_course.ongoing_course_title', 'Ongoing Course')}
                  {isLocked && <> · {t('instructor.curriculum.content_locked', 'Content Locked')}</>}
                </>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedCourse?.status === 'draft' && !selectedCourse?.approvedBy && onSubmitForReview && (
            <button
              onClick={(e) => onSubmitForReview(selectedCourse._id, e)}
              style={{
                width: 'auto',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
            >
              {t('instructor.dashboard.submit_for_review', 'Submit for Review')}
            </button>
          )}
          {selectedCourse?.status === 'pending' && (
            <span
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                boxShadow: 'var(--inner-shadow)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#F59E0B',
              }}
            >
              {t('instructor.dashboard.status.pending', 'Pending Review')}
            </span>
          )}
          {selectedCourse?.status === 'draft' && selectedCourse?.approvedBy && onTogglePublish && (
            <button
              onClick={(e) => onTogglePublish(selectedCourse._id, e)}
              style={{
                width: 'auto',
                borderRadius: '12px',
                padding: '10px 20px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseOut={(e) => (e.currentTarget.style.filter = 'none')}
            >
              {t('instructor.dashboard.go_live', 'Go Live')}
            </button>
          )}
          {selectedCourse?.courseType !== 'ongoing' && selectedCourse?.status === 'approved' && (
            selectedCourse.pendingPriceChange?.status === 'pending' ? (
              <span
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: 'var(--inner-shadow)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {t('instructor.dashboard.price_change.pending', 'Price change pending: EGP {{price}} awaiting admin approval', {
                  price: selectedCourse.pendingPriceChange.requestedPrice,
                })}
              </span>
            ) : onRequestPriceChange ? (
              <button
                onClick={() => onRequestPriceChange(selectedCourse)}
                style={{
                  width: 'auto',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  background: 'rgba(249, 115, 22, 0.1)',
                  color: '#f97316',
                  border: 'none',
                  boxShadow: 'var(--inner-shadow)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
                  e.currentTarget.style.filter = 'brightness(1.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                {t('instructor.dashboard.price_change.request', 'Request Price Change')}
              </button>
            ) : null
          )}
          {selectedCourse?.courseType === 'ongoing' && onConvertCourse && (
            <button
              onClick={() => onConvertCourse(selectedCourse)}
              style={{ width: 'auto', borderRadius: '12px', padding: '10px 20px', fontWeight: 600, background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'; e.currentTarget.style.filter = 'none'; }}
            >
              {t('instructor.dashboard.convert.button', 'Convert to Full Course')}
            </button>
          )}
          <button
            onClick={() => onEditCourse && onEditCourse(selectedCourse)}
            style={{ width: 'auto', borderRadius: '12px', padding: '10px 20px', fontWeight: 600, background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.filter = 'none'; }}
          >
            {t('instructor.dashboard.actions.edit')}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ width: 'auto', borderRadius: '12px', padding: '10px 20px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.filter = 'none'; }}
          >
            {t('instructor.dashboard.actions.delete')}
          </button>
          {!isLocked && (
            <button
              onClick={() => setAddingModule(true)}
              style={{ width: 'auto', borderRadius: '12px', padding: '10px 20px', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.filter = 'none'; }}
            >
              {t('instructor.curriculum.add_module', '+ Add Module')}
            </button>
          )}
        </div>
      </div>

      {/* Add Module Input Field */}
      {!isLocked && addingModule && (
        <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
          <input
            autoFocus
            type="text"
            className="auth-input"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onFocus={() => setIsAddModuleFocused(true)}
            onBlur={() => setIsAddModuleFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') { setAddingModule(false); setNewModuleTitle(''); setNewModulePrice(''); } }}
            placeholder={t('instructor.curriculum.ph_module_title', 'Module title (e.g. "Introduction to Java")')}
            style={{
              flex: 2,
              minWidth: '200px',
              background: 'var(--bg-main)',
              boxShadow: isAddModuleFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
              border: isAddModuleFocused ? '1px solid #f97316' : '1px solid transparent',
              color: 'var(--text-h)',
              padding: '10px 16px',
              borderRadius: '12px',
              outline: 'none',
              fontSize: '0.95rem',
              transition: 'all 0.2s ease-in-out'
            }}
          />
          {selectedCourse?.courseType === 'ongoing' && (
            <input
              type="number"
              min="50"
              max="200"
              className="auth-input"
              value={newModulePrice}
              onChange={(e) => setNewModulePrice(e.target.value)}
              onFocus={() => setIsAddModulePriceFocused(true)}
              onBlur={() => setIsAddModulePriceFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') { setAddingModule(false); setNewModuleTitle(''); setNewModulePrice(''); } }}
              placeholder="Module Price (50 - 200 EGP) *"
              style={{
                flex: 1,
                minWidth: '160px',
                background: 'var(--bg-main)',
                boxShadow: isAddModulePriceFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                border: isAddModulePriceFocused ? '1px solid #f97316' : '1px solid transparent',
                color: 'var(--text-h)',
                padding: '10px 16px',
                borderRadius: '12px',
                outline: 'none',
                fontSize: '0.95rem',
                transition: 'all 0.2s ease-in-out'
              }}
            />
          )}
          <button onClick={handleAddModule} className="solid-btn" style={{ width: 'auto', padding: '10px 20px' }}>
            {t('instructor.curriculum.save_module', 'Save Module')}
          </button>
          <button
            onClick={() => { setAddingModule(false); setNewModuleTitle(''); setNewModulePrice(''); }}
            style={{
              width: 'auto',
              padding: '10px 20px',
              background: 'var(--bg-main)',
              boxShadow: 'var(--inner-shadow)',
              borderRadius: '12px',
              border: 'none',
              color: 'var(--text-h)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            {t('instructor.create_course.cancel', 'Cancel')}
          </button>
        </div>
      )}

      {/* Modules & Lessons List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {localModules.length === 0 ? (
          <div className="solid-card" style={{ padding: '40px', textAlign: 'center', borderRadius: '12px', color: 'var(--c-sub)', boxShadow: 'var(--outer-shadow)' }}>
            {t('instructor.curriculum.no_modules', 'No modules yet. Add a module to start organizing lessons.')}
          </div>
        ) : (
          localModules.map((module, mIndex) => {
            const isCollapsed = collapsedModules[module._id] !== false;
            const lessons = module.lessons || [];
            return (
              <div key={module._id} className="glass-card no-border" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-surface)', borderRadius: '12px', boxShadow: 'var(--outer-shadow)' }}>
                {/* Module header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <button
                        type="button"
                        className="reorder-arrow-btn"
                        onClick={() => handleReorderModule(mIndex, 'up')}
                        disabled={mIndex === 0}
                        title="Move up"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button
                        type="button"
                        className="reorder-arrow-btn"
                        onClick={() => handleReorderModule(mIndex, 'down')}
                        disabled={mIndex === localModules.length - 1}
                        title="Move down"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>

                    <button
                      onClick={() => toggleModuleCollapsed(module._id)}
                      onMouseEnter={() => setHoveredModuleId(module._id)}
                      onMouseLeave={() => setHoveredModuleId(null)}
                      style={{ 
                        background: hoveredModuleId === module._id ? 'var(--bg-main)' : 'transparent',
                        border: 'none', 
                        cursor: 'pointer', 
                        color: 'var(--c-sub)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        transition: 'all 0.25s', 
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        padding: '6px',
                        borderRadius: '12px',
                        boxShadow: hoveredModuleId === module._id ? 'var(--inner-shadow, inset 0 2px 4px 0 rgba(0,0,0,0.06))' : 'none'
                      }}
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>

                    {editingModuleId === module._id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
                        <input
                          autoFocus
                          type="text"
                          className="auth-input"
                          value={moduleTitleDraft}
                          onChange={(e) => setModuleTitleDraft(e.target.value)}
                          onFocus={() => setIsEditModuleFocused(true)}
                          onBlur={() => setIsEditModuleFocused(false)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameModule(module._id); if (e.key === 'Escape') setEditingModuleId(null); }}
                          style={{
                            flex: 2,
                            minWidth: '180px',
                            background: 'var(--bg-main)',
                            boxShadow: isEditModuleFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                            border: isEditModuleFocused ? '1px solid #f97316' : '1px solid transparent',
                            color: 'var(--text-h)',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            outline: 'none',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease-in-out'
                          }}
                        />
                        {selectedCourse?.courseType === 'ongoing' && (
                          <input
                            type="number"
                            min="50"
                            max="200"
                            className="auth-input"
                            value={modulePriceDraft}
                            onChange={(e) => setModulePriceDraft(e.target.value)}
                            onFocus={() => setIsEditModulePriceFocused(true)}
                            onBlur={() => setIsEditModulePriceFocused(false)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameModule(module._id); if (e.key === 'Escape') setEditingModuleId(null); }}
                            placeholder="Price (50 - 200 EGP)"
                            style={{
                              flex: 1,
                              minWidth: '140px',
                              background: 'var(--bg-main)',
                              boxShadow: isEditModulePriceFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                              border: isEditModulePriceFocused ? '1px solid #f97316' : '1px solid transparent',
                              color: 'var(--text-h)',
                              padding: '8px 14px',
                              borderRadius: '12px',
                              outline: 'none',
                              fontSize: '0.95rem',
                              fontWeight: 600,
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRenameModule(module._id)}
                          className="solid-btn"
                          style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingModuleId(null)}
                          style={{
                            width: 'auto',
                            padding: '6px 14px',
                            background: 'var(--bg-main)',
                            boxShadow: 'var(--inner-shadow)',
                            borderRadius: '10px',
                            border: 'none',
                            color: 'var(--text-h)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-h)' }}>
                            {t('instructor.curriculum.module_label', 'Module')} {mIndex + 1} — {module.title}
                          </h4>
                          {selectedCourse?.courseType === 'ongoing' && (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(249, 115, 22, 0.12)',
                                color: '#f97316',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                boxShadow: 'var(--inner-shadow)',
                              }}
                            >
                              {module.price ? `${module.price} EGP` : '50 EGP'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>
                          {lessons.length} {lessons.length === 1 ? t('instructor.dashboard.status.lesson') : t('instructor.dashboard.status.lessons')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isLocked && (
                      <>
                        <button
                          onClick={() => onOpenAddLesson(selectedCourseId, module._id)}
                          style={{
                            width: 'auto',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            background: 'rgba(249, 115, 22, 0.1)',
                            color: '#f97316',
                            border: 'none',
                            boxShadow: 'var(--inner-shadow)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'; e.currentTarget.style.filter = 'none'; }}
                        >
                          {t('instructor.curriculum.add_lesson', '+ Add Lesson')}
                        </button>
                        <button
                          onClick={() => onOpenAddQuiz(selectedCourseId, module._id)}
                          style={{
                            width: 'auto',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            background: 'rgba(139, 92, 246, 0.1)',
                            color: '#8b5cf6',
                            border: 'none',
                            boxShadow: 'var(--inner-shadow)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.filter = 'brightness(1.15)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.filter = 'none'; }}
                        >
                          {t('instructor.quiz.add_quiz', '+ Add Quiz')}
                        </button>
                      </>
                    )}
                    <ThreeDotMenu
                      options={[
                        ...(lessons.length > 0 ? [{
                          label: t('instructor.curriculum.publish_all', 'Publish All'),
                          action: () => handlePublishAllInModule(module)
                        }] : []),
                        {
                          label: selectedCourse?.courseType === 'ongoing' ? t('instructor.curriculum.edit_module', 'Edit Module & Price') : t('instructor.curriculum.rename_module', 'Rename Module'),
                          action: () => {
                            setEditingModuleId(module._id);
                            setModuleTitleDraft(module.title);
                            setModulePriceDraft(module.price || '');
                          }
                        },
                        ...(!isLocked ? [{
                          label: t('instructor.curriculum.delete_module', 'Delete Module'),
                          action: () => setDeleteModuleTarget(module),
                          danger: true
                        }] : [])
                      ]}
                    />
                  </div>
                </div>

                {/* Lessons inside module */}
                {!isCollapsed && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-main)' }}>
                    {lessons.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--c-sub)', fontSize: '0.85rem' }}>
                        {t('instructor.curriculum.no_lessons_in_module', 'No lessons in this module yet.')}
                      </div>
                    ) : (
                      lessons.map((lesson, lIndex) => {
                        const effectiveStatus = pendingStatuses[lesson._id] || lesson.status || 'draft';
                        const isPublished = effectiveStatus === 'published';
                        const isQuiz = lesson.lessonType === 'quiz' || lesson.type === 'quiz' || (Array.isArray(lesson.quiz?.questions) && lesson.quiz.questions.length > 0);

                        return (
                          <div
                            key={lesson._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: 'var(--bg-surface)',
                              boxShadow: 'var(--outer-shadow)',
                              border: '1px solid var(--border)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <button
                                  type="button"
                                  className="reorder-arrow-btn"
                                  onClick={() => handleReorderLesson(module._id, lIndex, 'up')}
                                  disabled={lIndex === 0}
                                  title="Move up"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                </button>
                                <button
                                  type="button"
                                  className="reorder-arrow-btn"
                                  onClick={() => handleReorderLesson(module._id, lIndex, 'down')}
                                  disabled={lIndex === lessons.length - 1}
                                  title="Move down"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                              </div>

                              <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)', width: '24px' }}>
                                {lIndex + 1}.
                              </span>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.95rem' }}>
                                    {lesson.title}
                                  </span>
                                  {isQuiz ? (
                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontWeight: 600 }}>
                                      {t('instructor.quiz.badge', 'Quiz')} ({lesson.quiz?.questions?.length || 0})
                                    </span>
                                  ) : (
                                    <>
                                      {lesson.videoUrl && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--c-sub)' }}>🎥</span>
                                      )}
                                      {lesson.attachmentUrl && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--c-sub)' }}>📎</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={() => handleToggleLessonStatus(lesson)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                  color: isPublished ? '#10b981' : 'var(--text)',
                                  boxShadow: 'var(--inner-shadow)'
                                }}
                              >
                                {isPublished ? t('instructor.dashboard.status.published', 'Published') : t('instructor.dashboard.status.draft', 'Draft')}
                              </button>

                              <ThreeDotMenu
                                options={[
                                  {
                                    label: isQuiz ? t('instructor.curriculum.review_quiz', 'Review Quiz') : t('instructor.curriculum.review_lesson', 'Review Lesson'),
                                    action: () => isQuiz ? handleReviewQuiz(lesson) : handleReviewLesson(lesson)
                                  },
                                  ...(lesson.attachmentUrl ? [{
                                    label: t('instructor.curriculum.review_pdf', 'Review PDF / Attachment'),
                                    action: () => window.open(lesson.attachmentUrl, '_blank', 'noopener,noreferrer')
                                  }] : []),
                                  {
                                    label: isQuiz ? t('instructor.quiz.edit_quiz', 'Edit Quiz') : t('instructor.curriculum.edit_lesson', 'Edit Lesson'),
                                    action: () => isQuiz ? onOpenEditQuiz(selectedCourseId, lesson) : onOpenEditLesson(lesson)
                                  },
                                  {
                                    label: isQuiz ? t('instructor.curriculum.delete_quiz', 'Delete Quiz') : t('instructor.curriculum.delete_lesson', 'Delete Lesson'),
                                    action: () => setDeleteLessonTarget(lesson),
                                    danger: true
                                  }
                                ]}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Standalone Lessons Banner for Full Courses */}
      {selectedCourse?.courseType === 'full' && onOpenStandaloneLessons && (
        <div className="solid-card" style={{ marginTop: '32px', padding: '24px', borderRadius: '12px', boxShadow: 'var(--outer-shadow)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>{t('instructor.curriculum.standalone.title', 'Standalone Lessons')}</h4>
              <p style={{ margin: '4px 0 0 0', color: 'var(--c-sub)', fontSize: '0.85rem' }}>
                {t('instructor.curriculum.standalone.subtitle', 'Purchased separately from this course — never added to its modules.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenStandaloneLessons(selectedCourse)}
              style={{ width: 'auto', borderRadius: '12px', padding: '8px 18px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', boxShadow: 'var(--inner-shadow)', cursor: 'pointer' }}
            >
              {t('instructor.curriculum.standalone.manage', 'Manage Standalone Lessons')}
            </button>
          </div>
        </div>
      )}

      {/* Video / Lesson Preview Modal */}
      {previewLesson && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={() => setPreviewLesson(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--outer-shadow)', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>{previewLesson.title}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{t('instructor.curriculum.review_lesson', 'Review Lesson')}</span>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}>
              {previewLesson.videoUrl ? (
                <video src={previewLesson.videoUrl} controls autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }}>
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', gap: '8px' }}>
                  <span style={{ fontSize: '2rem' }}>🎥</span>
                  <span>No video file attached</span>
                </div>
              )}
            </div>

            {previewLesson.attachmentUrl && (
              <div style={{ padding: '16px 24px', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                  📎 {previewLesson.attachmentTitle || 'Lesson Attachment (PDF)'}
                </span>
                <button
                  type="button"
                  onClick={() => window.open(previewLesson.attachmentUrl, '_blank', 'noopener,noreferrer')}
                  style={{ width: 'auto', padding: '6px 16px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {t('instructor.curriculum.review_pdf', 'Open PDF / File')} {i18n.language === 'ar' ? '←' : '→'}
                </button>
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {/* Quiz Preview Modal */}
      {previewQuiz && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={() => setPreviewQuiz(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '85vh', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--outer-shadow)', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-h)' }}>{previewQuiz.title || 'Quiz Preview'}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                  {t('instructor.curriculum.review_quiz', 'Review Quiz')} · {previewQuiz.questions?.length || 0} {t('instructor.quiz.questions', 'questions')}
                  {previewQuiz.passingScore ? ` · Passing: ${previewQuiz.passingScore}%` : ''}
                </span>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(previewQuiz.questions || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--c-sub)', padding: '20px' }}>
                  {t('instructor.quiz.no_questions', 'No questions configured for this quiz yet.')}
                </div>
              ) : (
                (previewQuiz.questions || []).map((q, qIndex) => (
                  <div key={qIndex} style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: '12px', boxShadow: 'var(--inner-shadow)' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-h)', fontWeight: 600 }}>
                      {qIndex + 1}. {q.prompt || q.question || q.text}
                    </h5>
                    {q.type === 'written' ? (
                      <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--c-sub)', background: 'var(--bg-surface)', fontStyle: 'italic' }}>
                        {t('instructor.quiz.written_preview', 'Free text response question')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(q.options || []).map((opt, optIndex) => {
                          const isCorrect = opt.isCorrect ?? (q.correctOptionIndex === optIndex || q.correctAnswer === optIndex);
                          return (
                            <div
                              key={optIndex}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '0.88rem',
                                background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                                color: isCorrect ? '#10b981' : 'var(--text)',
                                border: isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                fontWeight: isCorrect ? 600 : 400,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <span>{typeof opt === 'string' ? opt : opt.text}</span>
                              {isCorrect && <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>✓ Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      , document.body)}

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
