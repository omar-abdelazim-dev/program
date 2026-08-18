import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import notyf from '../utils/notyf';

const MIN_OPTIONS = 4;
const MAX_OPTIONS = 6;

const blankMcq = () => ({ type: 'mcq', prompt: '', options: ['', '', '', ''], correctOptionIndex: 0, points: 1 });
const blankWritten = () => ({ type: 'written', prompt: '', points: 2 });

// Standalone full-screen modal for authoring a quiz lesson — multiple-choice
// questions (4-6 options, one marked correct) and free-text/written
// questions (queued for manual instructor grading after a student submits).
// Mirrors the Add/Edit Lesson modal in InstructorPortal.jsx but is kept in
// its own file since quiz authoring has a materially different shape (no
// video upload, a repeatable question builder instead).
export default function QuizBuilder({ courseId, moduleId, lesson, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEditing = !!lesson;

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([blankMcq()]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    setTitle(lesson.title);
    // The list view (GET /courses/:id) never includes quiz content — fetch
    // the gated endpoint the instructor is authorized to see full answers on.
    api.get(`/courses/${courseId}/lessons/${lesson._id}`)
      .then(({ data }) => {
        setQuestions(data.lesson.quiz?.questions?.length ? data.lesson.quiz.questions : [blankMcq()]);
      })
      .catch(() => setError(t('instructor.quiz.load_failed', 'Failed to load quiz content')))
      .finally(() => setLoading(false));
  }, [isEditing, lesson, courseId, t]);

  const updateQuestion = (index, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const options = [...q.options];
      options[optIndex] = value;
      return { ...q, options };
    }));
  };

  const addOption = (qIndex) => {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex && q.options.length < MAX_OPTIONS
      ? { ...q, options: [...q.options, ''] }
      : q)));
  };

  const removeOption = (qIndex, optIndex) => {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex || q.options.length <= MIN_OPTIONS) return q;
      const options = q.options.filter((_, oi) => oi !== optIndex);
      const correctOptionIndex = q.correctOptionIndex >= options.length ? 0 : q.correctOptionIndex;
      return { ...q, options, correctOptionIndex };
    }));
  };

  const addQuestion = (type) => {
    setQuestions((prev) => [...prev, type === 'mcq' ? blankMcq() : blankWritten()]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!title.trim()) return t('instructor.quiz.title_required', 'Quiz title is required');
    if (questions.length === 0) return t('instructor.quiz.needs_question', 'Add at least one question');
    for (const q of questions) {
      if (!q.prompt.trim()) return t('instructor.quiz.prompt_required', 'Every question needs a prompt');
      if (q.type === 'mcq') {
        if (q.options.some((o) => !o.trim())) {
          return t('instructor.quiz.options_required', 'Multiple-choice options cannot be empty');
        }
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = { title, lessonType: 'quiz', quiz: { questions } };
      if (isEditing) {
        await api.put(`/courses/${courseId}/lessons/${lesson._id}`, payload);
      } else {
        await api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, payload);
      }
      notyf.success(isEditing
        ? t('instructor.quiz.updated', 'Quiz updated')
        : t('instructor.quiz.created', 'Quiz created'));
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('instructor.quiz.save_failed', 'Failed to save quiz'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto', padding: '28px 32px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>
            {isEditing ? t('instructor.quiz.edit_title', 'Edit Quiz') : t('instructor.quiz.add_title', 'Create Quiz')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-sub)', cursor: 'pointer', boxShadow: 'var(--inner-shadow)', fontSize: '0.9rem' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-sub)' }}>{t('instructor.quiz.loading', 'Loading quiz…')}</div>
        ) : (
          <form noValidate onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && <div style={{ color: '#ef4444' }}>{error}</div>}

            <div className="input-group">
              <label>{t('instructor.quiz.quiz_title', 'Quiz title')}</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('instructor.quiz.ph_title', 'e.g. "Quiz: Algorithm Basics"')} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, qIndex) => (
                <div key={qIndex} style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '0.95rem' }}>
                      {t('instructor.quiz.question_n', 'Question {{n}}', { n: qIndex + 1 })} · {q.type === 'mcq' ? t('instructor.quiz.mcq', 'Multiple Choice') : t('instructor.quiz.written', 'Written Answer')}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          padding: '4px 12px',
                          boxShadow: 'var(--inner-shadow)'
                        }}
                      >
                        {t('instructor.dashboard.actions.delete', 'Delete')}
                      </button>
                    )}
                  </div>

                  <textarea
                    required
                    value={q.prompt}
                    onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                    placeholder={t('instructor.quiz.ph_prompt', 'Question text')}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--inner-shadow)',
                      color: 'var(--text-h)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      resize: 'vertical',
                      marginBottom: '14px',
                      fontFamily: 'inherit'
                    }}
                  />

                  {q.type === 'mcq' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {q.options.map((opt, optIndex) => {
                        const isCorrect = q.correctOptionIndex === optIndex;
                        return (
                          <div
                            key={optIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '8px 14px',
                              borderRadius: '12px',
                              background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                              border: isCorrect ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                              boxShadow: 'var(--inner-shadow)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={isCorrect}
                              onChange={() => updateQuestion(qIndex, { correctOptionIndex: optIndex })}
                              title={t('instructor.quiz.mark_correct', 'Mark as correct answer')}
                              style={{
                                cursor: 'pointer',
                                width: '18px',
                                height: '18px',
                                accentColor: '#10b981',
                                flexShrink: 0
                              }}
                            />
                            <input
                              required
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              placeholder={t('instructor.quiz.ph_option', 'Option {{n}}', { n: optIndex + 1 })}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-h)',
                                fontSize: '0.92rem',
                                padding: '4px 0',
                                fontFamily: 'inherit'
                              }}
                            />
                            {isCorrect && (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, flexShrink: 0 }}>
                                ✓ {t('instructor.quiz.correct', 'Correct')}
                              </span>
                            )}
                            {q.options.length > MIN_OPTIONS && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIndex, optIndex)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--c-sub)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  fontSize: '0.85rem',
                                  flexShrink: 0
                                }}
                                title="Remove option"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {q.options.length < MAX_OPTIONS && (
                        <button
                          type="button"
                          onClick={() => addOption(qIndex)}
                          style={{
                            width: 'auto',
                            alignSelf: 'flex-start',
                            background: 'var(--bg-main)',
                            border: 'none',
                            color: 'var(--color-accent, #6B5DD3)',
                            borderRadius: '16px',
                            boxShadow: 'var(--inner-shadow)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            padding: '6px 14px',
                            marginTop: '2px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {t('instructor.quiz.add_option', '+ Add option')}
                        </button>
                      )}
                      <div className="input-hint" style={{ fontSize: '0.78rem', color: 'var(--c-sub)', marginTop: '4px' }}>
                        {t('instructor.quiz.select_correct_hint', 'Select the radio button next to the correct answer.')}
                      </div>
                    </div>
                  ) : (
                    <div className="input-hint" style={{ fontSize: '0.78rem', color: 'var(--c-sub)', marginTop: '4px' }}>
                      {t('instructor.quiz.written_hint', "Students type a free-text answer — you'll grade it manually after they submit.")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => addQuestion('mcq')}
                style={{
                  width: 'auto',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  background: 'var(--bg-main)',
                  color: '#10b981',
                  border: 'none',
                  boxShadow: 'var(--inner-shadow)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t('instructor.quiz.add_mcq', '+ Add Multiple Choice')}
              </button>
              <button
                type="button"
                onClick={() => addQuestion('written')}
                style={{
                  width: 'auto',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  background: 'var(--bg-main)',
                  color: '#3b82f6',
                  border: 'none',
                  boxShadow: 'var(--inner-shadow)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {t('instructor.quiz.add_written', '+ Add Written Answer')}
              </button>
            </div>

            <div className="input-row" style={{ marginTop: '8px', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={onClose} className="sys-btn-secondary">{t('instructor.create_course.cancel', 'Cancel')}</button>
              <button type="submit" disabled={submitting} className="sys-btn-primary">
                {submitting ? t('instructor.create_course.saving', 'Saving…') : (isEditing ? t('instructor.quiz.update', 'Update Quiz') : t('instructor.quiz.save', 'Save Quiz'))}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
