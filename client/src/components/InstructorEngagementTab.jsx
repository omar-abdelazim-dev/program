import notyf from '../utils/notyf';
import React, { useState, useEffect, useRef } from 'react';
import ConfirmModal from './ConfirmModal';
import CustomSelect from './CustomSelect';
import api from '../api/axios';


export default function InstructorEngagementTab({ courses = [] }) {
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
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tabsContainerRef.current) {
        const activeBtn = tabsContainerRef.current.querySelector(".dashboard-tab.active");
        if (activeBtn) {
          setTabIndicatorStyle({
            left: activeBtn.offsetLeft,
            width: activeBtn.offsetWidth,
            opacity: 1,
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const fetchQuestions = async () => {
    try {
      const res = await api.get('/engagement/questions');
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
      notyf.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (id) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/engagement/questions/${id}/reply`, { reply: replyText });
      notyf.success('Reply posted successfully');
      setReplyingTo(null);
      setReplyText('');
      fetchQuestions(); // refresh questions to show reply
    } catch (err) {
      console.error(err);
      notyf.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
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
      notyf.success('Announcement sent successfully');
      setShowConfirmModal(false);
      setAnnouncementCourse('');
      setAnnouncementTitle('');
      setAnnouncementMessage('');
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || 'Failed to send announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-role="instructor">
      <div
        className="course-tabs"
        style={{ position: "relative", marginBottom: "32px", width: "fit-content" }}
        ref={tabsContainerRef}
      >
        <div
          className="dashboard-tab-indicator"
          style={{
            left: `${tabIndicatorStyle.left}px`,
            width: `${tabIndicatorStyle.width}px`,
            opacity: tabIndicatorStyle.opacity,
          }}
        />
        <button
          className={`dashboard-tab ${activeTab === 'qa' ? "active" : ""}`}
          onClick={() => setActiveTab('qa')}
          data-text="Q&A"
        >
          Q&A
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'announcements' ? "active" : ""}`}
          onClick={() => setActiveTab('announcements')}
          data-text="Announcements"
        >
          Announcements
        </button>
      </div>

      {activeTab === 'qa' && (
        <div className="glass-card no-border animate-entrance" style={{ padding: '40px', borderRadius: '24px', background: 'var(--bg-surface)', border: 'none' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '32px', fontWeight: '700', backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Student Questions</h2>
          {loading ? (
            <div style={{ color: 'var(--c-sub)' }}>Loading questions...</div>
          ) : questions.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 32px', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '16px', border: 'none', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)' }}>
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
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-h)', marginBottom: '8px', fontWeight: '600' }}>No questions yet</h3>
              <p style={{ color: 'var(--c-sub)', maxWidth: '400px', lineHeight: '1.6' }}>When students ask questions about your courses, they'll appear here for you to answer.</p>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {questions.map(q => (
              <div key={q._id} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img src={q.student?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${q.student?.name || 'User'}`} alt={q.student?.name || 'Student'} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--c-bg)' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '1.05rem' }}>{q.student?.name || 'Anonymous Student'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>{q.course?.title || 'Unknown Course'} • {new Date(q.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '0 0 16px 0', color: 'var(--text-h)', lineHeight: '1.5' }}>{q.question}</p>
                
                {q.reply ? (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '4px' }}>
                    <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Your Reply</div>
                    <p style={{ margin: 0, color: 'var(--text-h)' }}>{q.reply}</p>
                  </div>
                ) : replyingTo === q._id ? (
                  <div className="animate-entrance" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    <div className="input-group">
                      <textarea 
                        rows="3"
                        placeholder="Type your response..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ resize: 'vertical', width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setReplyingTo(null)} className="sys-btn-secondary" style={{ padding: '8px 20px' }} disabled={isSubmitting}>Cancel</button>
                      <button onClick={() => handleReplySubmit(q._id)} className="sys-btn-primary" style={{ padding: '8px 20px', borderRadius: '24px', width: 'auto' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setReplyingTo(q._id)} 
                    className="hover-glow"
                    style={{ background: 'transparent', border: '1px solid var(--c-orange)', color: 'var(--c-orange)', padding: '6px 16px', borderRadius: '24px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reply
                  </button>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="glass-card animate-entrance" style={{ padding: '40px', borderRadius: '24px', maxWidth: '800px', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '12px', fontWeight: '700', backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>New Announcement</h2>
          <p style={{ color: 'var(--c-sub)', marginBottom: '32px' }}>Send an email and push notification to all enrolled students.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="input-group" style={{ zIndex: 10 }}>
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Select Course</label>
              <CustomSelect 
                options={courses.map(c => ({ value: c._id, label: c.title }))}
                value={announcementCourse}
                onChange={setAnnouncementCourse}
                placeholder="Choose a course..."
              />
            </div>

            <div className="input-group">
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Announcement Title</label>
              <input 
                type="text" 
                style={{ width: '100%' }}
                placeholder="e.g. New Lesson Just Dropped!"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Message</label>
              <textarea 
                rows="6"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="Type your message here..."
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
              Send Announcement
            </button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showConfirmModal}
        title="Send Announcement"
        message="Are you sure you want to notify all students in this course?"
        confirmText="Send Now"
        cancelText="Cancel"
        intent="primary"
        onConfirm={confirmSendAnnouncement}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
