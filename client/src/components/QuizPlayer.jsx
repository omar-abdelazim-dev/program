import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import notyf from '../utils/notyf';

// Renders in place of the video element when the active lesson is a quiz.
// Loads any existing submission first so revisiting a quiz shows its
// result/status instead of a blank form. `lesson.quiz.questions` never
// contains `correctOptionIndex` for a student (stripped server-side in
// getLessonContent) — correctness only comes back in the submit response.
export default function QuizPlayer({ courseId, lesson, onSubmitted }) {
  const { t } = useTranslation();
  const questions = lesson.quiz?.questions || [];

  const [answers, setAnswers] = useState({}); // { [questionIndex]: selectedOptionIndex | textAnswer }
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnswers({});
    api.get(`/enrollments/${courseId}/lessons/${lesson._id}/quiz-submission`)
      .then(({ data }) => { if (!cancelled) setSubmission(data.submission); })
      .catch(() => { if (!cancelled) setSubmission(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId, lesson._id]);

  const isLocked = submission?.status === 'graded';
  const answerFor = (questionIndex) =>
    submission?.answers?.find((a) => a.questionIndex === questionIndex);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (questions.some((q, i) => q.type === 'written' ? !answers[i]?.trim() : answers[i] === undefined)) {
      notyf.error(t('student.quiz.answer_all', 'Please answer every question before submitting.'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q, i) => (
          q.type === 'mcq'
            ? { questionIndex: i, selectedOptionIndex: answers[i] }
            : { questionIndex: i, textAnswer: answers[i] }
        )),
      };
      const { data } = await api.post(`/enrollments/${courseId}/lessons/${lesson._id}/quiz-submit`, payload);
      setSubmission(data.submission);
      notyf.success(t('student.quiz.submitted', 'Quiz submitted'));
      onSubmitted(data);
    } catch (err) {
      notyf.error(err.response?.data?.message || t('student.quiz.submit_failed', 'Failed to submit quiz'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '48px 32px', textAlign: 'center', color: 'var(--c-sub)' }}>
        {t('student.quiz.loading', 'Loading quiz…')}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
      {submission && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px', borderRadius: '12px',
          background: isLocked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(249, 115, 22, 0.08)',
          color: isLocked ? '#10b981' : '#f97316', fontWeight: 600, fontSize: '0.92rem',
        }}>
          {isLocked
            ? t('student.quiz.graded_banner', 'Graded — {{score}} / {{max}} points', { score: submission.autoScore + submission.answers.reduce((s, a) => s + (a.pointsAwarded || 0), 0), max: submission.maxScore })
            : t('student.quiz.pending_banner', 'Submitted — written answers are awaiting instructor grading. You can resubmit until then.')}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {questions.map((q, index) => {
          const priorAnswer = answerFor(index);
          return (
            <div key={index} style={{ padding: '20px', borderRadius: '14px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-h)' }}>
                {t('student.quiz.question_n', 'Question {{n}}', { n: index + 1 })}. {q.prompt}
              </div>

              {q.type === 'mcq' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, optIndex) => {
                    const isSelected = (answers[index] ?? priorAnswer?.selectedOptionIndex) === optIndex;
                    const showResult = isLocked || (submission && !isLocked);
                    const isCorrect = priorAnswer?.isCorrect !== undefined && optIndex === priorAnswer.selectedOptionIndex && priorAnswer.isCorrect;
                    const isWrongPick = priorAnswer?.isCorrect === false && optIndex === priorAnswer.selectedOptionIndex;
                    return (
                      <label key={optIndex} style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.12)' : isWrongPick ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                        cursor: submission ? 'default' : 'pointer',
                      }}>
                        <input
                          type="radio"
                          name={`q-${index}`}
                          disabled={!!submission}
                          checked={isSelected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [index]: optIndex }))}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <>
                  <textarea
                    disabled={isLocked}
                    value={answers[index] ?? priorAnswer?.textAnswer ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [index]: e.target.value }))}
                    placeholder={t('student.quiz.written_placeholder', 'Type your answer…')}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                  {isLocked && priorAnswer && (
                    <div style={{ marginTop: '10px', fontSize: '0.88rem', color: 'var(--c-sub)' }}>
                      {t('student.quiz.points_awarded', '{{points}} / {{max}} points', { points: priorAnswer.pointsAwarded ?? 0, max: q.points })}
                      {priorAnswer.feedback && <div style={{ marginTop: '4px' }}>“{priorAnswer.feedback}”</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {!isLocked && (
          <button type="submit" disabled={submitting} className="solid-btn" style={{ width: 'auto', alignSelf: 'flex-start', padding: '12px 28px' }}>
            {submitting
              ? t('student.quiz.submitting', 'Submitting…')
              : submission
                ? t('student.quiz.resubmit', 'Resubmit')
                : t('student.quiz.submit', 'Submit Quiz')}
          </button>
        )}
      </form>
    </div>
  );
}
