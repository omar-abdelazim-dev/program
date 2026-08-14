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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
      <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '760px', maxHeight: '88vh', overflowY: 'auto', padding: '32px' }}>
        <h2 style={{ margin: '0 0 24px 0' }}>
          {isEditing ? t('instructor.quiz.edit_title', 'Edit Quiz') : t('instructor.quiz.add_title', 'Create Quiz')}
        </h2>

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
                <div key={qIndex} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.9rem' }}>
                      {t('instructor.quiz.question_n', 'Question {{n}}', { n: qIndex + 1 })} · {q.type === 'mcq' ? t('instructor.quiz.mcq', 'Multiple Choice') : t('instructor.quiz.written', 'Written Answer')}
                    </span>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(qIndex)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}>
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
                    style={{ width: '100%', marginBottom: '12px', resize: 'vertical' }}
                  />

                  {q.type === 'mcq' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={q.correctOptionIndex === optIndex}
                            onChange={() => updateQuestion(qIndex, { correctOptionIndex: optIndex })}
                            title={t('instructor.quiz.mark_correct', 'Mark as correct answer')}
                          />
                          <input
                            required
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                            placeholder={t('instructor.quiz.ph_option', 'Option {{n}}', { n: optIndex + 1 })}
                            style={{ flex: 1 }}
                          />
                          {q.options.length > MIN_OPTIONS && (
                            <button type="button" onClick={() => removeOption(qIndex, optIndex)} style={{ background: 'transparent', border: 'none', color: 'var(--c-sub)', cursor: 'pointer' }}>
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < MAX_OPTIONS && (
                        <button type="button" onClick={() => addOption(qIndex)} style={{ width: 'auto', alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--color-accent, #6B5DD3)', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 0' }}>
                          {t('instructor.quiz.add_option', '+ Add option')}
                        </button>
                      )}
                      <div className="input-hint">{t('instructor.quiz.select_correct_hint', 'Select the radio button next to the correct answer.')}</div>
                    </div>
                  ) : (
                    <div className="input-hint">{t('instructor.quiz.written_hint', "Students type a free-text answer — you'll grade it manually after they submit.")}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={() => addQuestion('mcq')} style={{ width: 'auto', borderRadius: '20px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', cursor: 'pointer' }}>
                {t('instructor.quiz.add_mcq', '+ Add Multiple Choice')}
              </button>
              <button type="button" onClick={() => addQuestion('written')} style={{ width: 'auto', borderRadius: '20px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
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
