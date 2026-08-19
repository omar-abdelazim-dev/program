import notyf from '../utils/notyf';
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import CustomSelect from './CustomSelect';
import SegmentedControl from "./common/SegmentedControl";
import api from '../api/axios';
import { useTranslation } from 'react-i18next';


export default function InstructorEngagementTab({ courses = [], onAction }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('qa');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Announcement state
  const [announcementCourse, setAnnouncementCourse] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsContainerRef = useRef(null);

  // State
  const [questions, setQuestions] = useState([]);
  const [qaStatusTab, setQaStatusTab] = useState("pending");
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [replyToDelete, setReplyToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsContainerRef.current) {
        const activeBtn = tabsContainerRef.current.querySelector(".dashboard-tab.active");
        if (activeBtn) {
          const parentWidth = tabsContainerRef.current.offsetWidth;
          const childLeft = activeBtn.offsetLeft;
          const childWidth = activeBtn.offsetWidth;
          
          setTabIndicatorStyle({
            insetInlineStart: isRTL ? (parentWidth - (childLeft + childWidth)) : childLeft,
            width: childWidth,
            opacity: 1,
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, isRTL]);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await api.get('/engagement/questions');
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.notyf.load_questions_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleReplySubmit = async (id) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/engagement/questions/${id}/reply`, { reply: replyText });
      notyf.success(t('instructor.notyf.reply_posted'));
      setReplyingTo(null);
      setReplyText('');
      fetchQuestions(); // refresh questions to show reply
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.notyf.reply_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReply = (q) => {
    setReplyingTo(q._id);
    setReplyText(q.reply || '');
  };

  const handleDeleteReply = async (id) => {
    setReplyToDelete(id);
  };

  const confirmDeleteReply = async () => {
    if (!replyToDelete) return;
    try {
      await api.delete(`/engagement/questions/${replyToDelete}/reply`);
      notyf.success(t('instructor.engagement.reply_deleted', "Reply deleted"));
      fetchQuestions();
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.engagement.delete_reply_failed', "Failed to delete reply"));
    } finally {
      setReplyToDelete(null);
    }
  };

  const handleDeleteQuestion = async (id) => {
    setQuestionToDelete(id);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await api.delete(`/engagement/questions/${questionToDelete}`);
      notyf.success("Question deleted");
      fetchQuestions();
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error("Failed to delete question");
    } finally {
      setQuestionToDelete(null);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/engagement/questions/${id}/status`, { status });
      notyf.success(`Question marked as ${status}`);
      fetchQuestions();
      if (onAction) onAction();
    } catch (err) {
      console.error(err);
      notyf.error("Failed to update question status");
    }
  };

  const handleSendAnnouncement = () => {
    setShowConfirmModal(true);
  };

  const confirmSendAnnouncement = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/engagement/announcements', {
        courseId: announcementCourse,
        title: announcementTitle,
        message: announcementMessage
      });
      notyf.success(t('instructor.notyf.announcement_sent'));
      setShowConfirmModal(false);
      setAnnouncementCourse('');
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || t('instructor.notyf.announcement_failed', 'Failed to send announcement'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-role="instructor">
      <SegmentedControl
        tabs={[
          { id: 'qa', label: t('instructor.engagement.qna') },
          { id: 'announcements', label: t('instructor.engagement.announcements') }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: "32px" }}
      />

      {activeTab === 'qa' && (
        <div className="glass-card no-border animate-entrance" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-h)', margin: 0 }}>
              {t('instructor.engagement.title')}
            </h2>
            <SegmentedControl
              tabs={[
                { id: 'pending', label: t('instructor.engagement.pending') },
                { id: 'approved', label: t('instructor.engagement.approved') }
              ]}
              activeTab={qaStatusTab}
              onChange={setQaStatusTab}
              trackStyle={{
                background: 'var(--bg-main)',
                boxShadow: 'var(--inner-shadow)',
                marginBottom: 0
              }}
              indicatorStyle={{
                background: 'var(--bg-surface)',
                boxShadow: 'var(--outer-shadow)'
              }}
            />
          </div>
          {(() => {
            const filteredQuestions = questions.filter(q => (q.status || 'pending') === qaStatusTab);
            return loading ? (
              <div style={{ color: 'var(--c-sub)' }}>{t('instructor.engagement.loading_questions')}</div>
            ) : filteredQuestions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '16px', border: 'none', boxShadow: 'var(--inner-shadow)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#orange-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              {/* Translated No questions yet */}
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-h)', marginBottom: '8px', fontWeight: '600' }}>{t('instructor.engagement.no_questions')}</h3>
              <p style={{ color: 'var(--c-sub)', maxWidth: '400px', lineHeight: '1.6' }}>{t('instructor.engagement.subtitle')}</p>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredQuestions.map(q => (
              <div key={q._id} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {q.student?.avatarUrl ? (
                      <img 
                        src={q.student.avatarUrl} 
                        alt={q.student.name || 'Student'} 
                        onClick={() => q.student?._id && navigate(`/student/${q.student._id}`)}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--c-bg)', cursor: q.student?._id ? 'pointer' : 'default', objectFit: 'cover' }}
                      />
                    ) : (
                      <div 
                        onClick={() => q.student?._id && navigate(`/student/${q.student._id}`)}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--c-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: q.student?._id ? 'pointer' : 'default' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--c-sub)" strokeWidth="2">
                          <circle cx="12" cy="8" r="4"></circle>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
                        </svg>
                      </div>
                    )}                    <div>
                      <span
                        onClick={() => q.student?._id && navigate(`/student/${q.student._id}`)}
                        style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '1.05rem', cursor: q.student?._id ? 'pointer' : 'default', textDecoration: 'none' }}
                      >
                        {q.student?.name || t('instructor.engagement.anonymous_student')}
                      </span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{q.course?.title || t('instructor.engagement.unknown_course')} • {new Date(q.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div>
                    {q.status !== 'approved' && (
                      <button onClick={() => handleUpdateStatus(q._id, 'approved')} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px', marginRight: '8px' }} title="Approve Question">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                      </button>
                    )}
                    <button onClick={() => handleDeleteQuestion(q._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Delete Question">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                    </button>
                  </div>
                </div>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-h)', lineHeight: '1.5' }}>{q.question}</p>
                
                {replyingTo !== q._id && q.reply ? (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderInlineStart: '4px solid #10b981', borderRadius: '4px' }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>{t('instructor.engagement.your_reply')}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEditReply(q)} style={{ background: 'transparent', border: 'none', color: 'var(--c-sub)', cursor: 'pointer', padding: '2px' }} title="Edit Reply">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onClick={() => handleDeleteReply(q._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }} title="Delete Reply">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-h)' }}>{q.reply}</p>
                  </div>
                ) : replyingTo === q._id ? (
                  <div className="animate-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div className="input-group">
                      <textarea 
                        rows="3"
                        placeholder={t('instructor.engagement.type_response')}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="qa-reply-textarea"
                        style={{ resize: 'vertical', width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setReplyingTo(null)} className="sys-btn-secondary" style={{ padding: '8px 20px' }} disabled={isSubmitting}>{t('instructor.engagement.cancel')}</button>
                      <button onClick={() => handleReplySubmit(q._id)} className="sys-btn-primary" style={{ padding: '8px 20px', borderRadius: '24px', width: 'auto' }} disabled={isSubmitting}>
                        {isSubmitting ? t('instructor.engagement.posting') : t('instructor.engagement.post_reply')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setReplyingTo(q._id)} 
                    className="hover-glow"
                    style={{ background: 'transparent', border: '1px solid var(--c-orange)', color: 'var(--c-orange)', padding: '6px 16px', borderRadius: '24px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {t('instructor.engagement.reply')}
                  </button>
                )}
              </div>
            ))}
          </div>
          );
          })()}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="glass-card animate-entrance" style={{ padding: '40px', borderRadius: '24px', maxWidth: '800px', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '12px', fontWeight: '700', color: 'var(--text-h)' }}>{t('instructor.engagement.new_announcement')}</h2>
          <p style={{ color: 'var(--c-sub)', marginBottom: '32px' }}>{t('instructor.engagement.send_notification')}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group" style={{ zIndex: 10 }}>
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>{t('instructor.engagement.select_course')}</label>
              <CustomSelect 
                options={courses.map(c => ({ value: c._id, label: c.title }))}
                value={announcementCourse}
                onChange={setAnnouncementCourse}
                placeholder={t('instructor.engagement.choose_course')}
              />
            </div>

            <div className="input-group">
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>{t('instructor.engagement.announcement_title')}</label>
              <input 
                type="text" 
                className="solid-input"
                style={{ width: '100%' }}
                placeholder={t('instructor.engagement.ph_announcement_title')}
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>{t('instructor.engagement.message')}</label>
              <textarea 
                className="solid-input"
                rows="6"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder={t('instructor.engagement.type_message')}
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
              />
            </div>

            <button 
              onClick={handleSendAnnouncement}
              disabled={!announcementCourse || !announcementTitle || !announcementMessage}
              className="glass-btn" 
              style={{ padding: '12px 24px', fontWeight: 700, marginTop: '8px' }}
            >
              {isSubmitting ? t('instructor.engagement.posting') : t('instructor.engagement.send_announcement')}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showConfirmModal}
        title={t('instructor.engagement.send_announcement_title', 'Send Announcement')}
        message={t('instructor.engagement.send_announcement_msg', 'Are you sure you want to notify all students in this course?')}
        confirmText={t('instructor.engagement.send_now', 'Send Now')}
        cancelText={t('common.cancel', 'Cancel')}
        intent="primary"
        onConfirm={confirmSendAnnouncement}
        onCancel={() => setShowConfirmModal(false)}
      />

      <ConfirmModal 
        isOpen={!!questionToDelete}
        title={t('instructor.engagement.delete_question_title', 'Delete Question')}
        message={t('instructor.engagement.delete_question_msg', 'Are you sure you want to delete this question? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        intent="danger"
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
      />

      <ConfirmModal 
        isOpen={!!replyToDelete}
        title={t('instructor.engagement.delete_reply_title', 'Delete Reply')}
        message={t('instructor.engagement.delete_reply_msg', 'Are you sure you want to delete this reply? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        intent="danger"
        onConfirm={confirmDeleteReply}
        onCancel={() => setReplyToDelete(null)}
      />
    </div>
  );
}
