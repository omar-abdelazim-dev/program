import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import notyf from '../utils/notyf';
import Spinner from './Spinner';
import SegmentedControl from './common/SegmentedControl';

// Grading queue for written quiz answers — same list -> detail-modal ->
// action-button shape as AdminPortal's enrollment review queue.
export default function InstructorGradingTab({ onAction }) {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [selected, setSelected] = useState(null);
  const [grades, setGrades] = useState({}); // { [questionIndex]: { pointsAwarded, feedback } }
  const [submitting, setSubmitting] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/quiz-submissions?status=${statusFilter}`);
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch quiz submissions', err);
      notyf.error(t('instructor.grading.load_failed', 'Failed to load submissions'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const openSubmission = (submission) => {
    setSelected(submission);
    const initial = {};
    submission.lesson.quiz.questions.forEach((q, i) => {
      if (q.type !== 'written') return;
      const existing = submission.answers.find((a) => a.questionIndex === i);
      initial[i] = { pointsAwarded: existing?.pointsAwarded ?? 0, feedback: existing?.feedback ?? '' };
    });
    setGrades(initial);
  };

  const handleGrade = async () => {
    setSubmitting(true);
    try {
      const payload = {
        grades: Object.entries(grades).map(([questionIndex, g]) => ({
          questionIndex: Number(questionIndex),
          pointsAwarded: Number(g.pointsAwarded) || 0,
          feedback: g.feedback,
        })),
      };
      await api.patch(`/quiz-submissions/${selected._id}/grade`, payload);
      notyf.success(t('instructor.grading.graded', 'Submission graded'));
      setSelected(null);
      fetchSubmissions();
      if (onAction) onAction();
    } catch (err) {
      notyf.error(err.response?.data?.message || t('instructor.grading.grade_failed', 'Failed to grade submission'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-h)' }}>{t('instructor.grading.title', 'Quiz Grading')}</h2>
        <SegmentedControl
          tabs={[
            { id: 'pending_review', label: t('instructor.grading.pending', 'Pending') },
            { id: 'graded', label: t('instructor.grading.graded_tab', 'Graded') },
          ]}
          activeTab={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {isLoading ? (
        <Spinner label={t('instructor.grading.loading', 'Loading submissions…')} />
      ) : submissions.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--c-sub)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
          {statusFilter === 'pending_review'
            ? t('instructor.grading.none_pending', 'Nothing to grade right now.')
            : t('instructor.grading.none_graded', 'No graded submissions yet.')}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {submissions.map((s) => (
            <div
              key={s._id}
              onClick={() => openSubmission(s)}
              className="hover-glow"
              style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{s.student?.name || t('instructor.grading.unknown_student', 'Unknown student')}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{s.lesson?.title} · {s.course?.title}</div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="solid-card animate-entrance" style={{ width: '100%', maxWidth: '720px', maxHeight: '88vh', overflowY: 'auto', padding: '32px' }}>
            <h2 style={{ margin: '0 0 4px 0' }}>{selected.lesson?.title}</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--c-sub)' }}>
              {t('instructor.grading.by_student', 'Submitted by {{name}}', { name: selected.student?.name || t('instructor.grading.unknown_student', 'Unknown student') })}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selected.lesson.quiz.questions.map((q, index) => {
                const answer = selected.answers.find((a) => a.questionIndex === index);
                return (
                  <div key={index} style={{ padding: '18px', borderRadius: '14px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)' }}>
                    <div style={{ fontWeight: 600, marginBottom: '10px', color: 'var(--text-h)' }}>
                      {t('instructor.quiz.question_n', 'Question {{n}}', { n: index + 1 })}. {q.prompt}
                    </div>

                    {q.type === 'mcq' ? (
                      <div style={{ fontSize: '0.9rem', color: answer?.isCorrect ? '#10b981' : '#ef4444' }}>
                        {t('instructor.grading.student_answered', 'Answered')}: {q.options[answer?.selectedOptionIndex] ?? '—'}
                        {' · '}
                        {answer?.isCorrect ? t('instructor.grading.correct', 'Correct') : t('instructor.grading.incorrect', 'Incorrect')}
                        {' '}({answer?.pointsAwarded ?? 0} / {q.points})
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-surface)', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                          {answer?.textAnswer || t('instructor.grading.no_answer', '(no answer submitted)')}
                        </div>
                        {selected.status === 'graded' ? (
                          <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)' }}>
                            {t('instructor.grading.awarded', 'Awarded')}: {answer?.pointsAwarded ?? 0} / {q.points}
                            {answer?.feedback && <div style={{ marginTop: '4px' }}>“{answer.feedback}”</div>}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div className="input-group" style={{ width: '110px' }}>
                              <label>{t('instructor.grading.points', 'Points (max {{max}})', { max: q.points })}</label>
                              <input
                                type="number"
                                min={0}
                                max={q.points}
                                value={grades[index]?.pointsAwarded ?? 0}
                                onChange={(e) => setGrades((prev) => ({ ...prev, [index]: { ...prev[index], pointsAwarded: e.target.value } }))}
                              />
                            </div>
                            <div className="input-group" style={{ flex: 1, minWidth: '220px' }}>
                              <label>{t('instructor.grading.feedback', 'Feedback (optional)')}</label>
                              <input
                                type="text"
                                value={grades[index]?.feedback ?? ''}
                                onChange={(e) => setGrades((prev) => ({ ...prev, [index]: { ...prev[index], feedback: e.target.value } }))}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="input-row" style={{ marginTop: '24px', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={() => setSelected(null)} className="sys-btn-secondary">
                {t('instructor.create_course.cancel', 'Cancel')}
              </button>
              {selected.status !== 'graded' && (
                <button type="button" disabled={submitting} onClick={handleGrade} className="sys-btn-primary">
                  {submitting ? t('instructor.create_course.saving', 'Saving…') : t('instructor.grading.submit_grade', 'Submit Grade')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
