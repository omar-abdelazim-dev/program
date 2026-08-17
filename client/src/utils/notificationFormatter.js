export const formatNotificationTitle = (rawTitle, t) => {
  if (!rawTitle) return '';
  const title = String(rawTitle);
  if (title === 'New Reply') return t('notifications.new_reply', 'New Reply');
  if (title === 'Enrollment Request Approved') return t('notifications.enrollment_request_approved', 'Enrollment Request Approved');
  if (title === 'Enrollment Request Rejected') return t('notifications.enrollment_request_rejected', 'Enrollment Request Rejected');
  if (title === 'New Enrollment Request') return t('notifications.new_enrollment_request', 'New Enrollment Request');
  if (title === 'Course Suspended') return t('notifications.course_suspended', 'Course Suspended');
  if (title === 'Course Approved') return t('notifications.course_approved', 'Course Approved');
  if (title === 'Course Submitted') return t('notifications.course_submitted', 'Course Submitted');
  if (title === 'Course Rejected') return t('notifications.course_rejected', 'Course Rejected');
  if (title === 'Payout Request Received') return t('notifications.payout_received', 'Payout Request Received');
  if (title === 'Payout Request Approved') return t('notifications.payout_approved', 'Payout Request Approved');
  if (title === 'Payout Request Rejected') return t('notifications.payout_rejected', 'Payout Request Rejected');
  if (title === 'New Payout Request') return t('notifications.new_payout_request', 'New Payout Request');
  if (title === 'New Student Enrollment') return t('notifications.new_student_enrollment', 'New Student Enrollment');
  if (title === 'Your quiz has been graded') return t('notifications.quiz_graded', 'Your quiz has been graded');
  if (title === 'Instructor replied to your question') return t('notifications.instructor_reply_title', 'Instructor replied to your question');

  if (title.startsWith('New Announcement: ')) {
    const annTitle = title.replace('New Announcement: ', '');
    return `${t('notifications.new_announcement', 'New Announcement')}: ${annTitle}`;
  }
  if (title.startsWith('New Question in ')) {
    const courseTitle = title.replace('New Question in ', '');
    return `${t('notifications.new_question_in', 'New Question in')} ${courseTitle}`;
  }

  return title;
};

export const formatNotificationMessage = (rawMessage, t) => {
  if (!rawMessage) return '';
  const msg = String(rawMessage);
  
  if (msg.startsWith('instructor replies on your comment on ')) {
    const course = msg.replace('instructor replies on your comment on ', '');
    return t('notifications.instructor_reply_msg', { course, defaultValue: `Instructor replied to your comment on ${course}.` });
  }

  if (msg.startsWith('Your instructor has replied to your question in ')) {
    let course = msg.replace('Your instructor has replied to your question in ', '').trim();
    if (course === '.undefined') course = t('notifications.this_course', 'this course');
    else course = course.replace('.undefined', '');
    return t('notifications.instructor_reply_msg', { course, defaultValue: `Instructor replied to your comment on ${course}.` });
  }

  if (msg.startsWith('An announcement was posted in ')) {
    const course = msg.replace('An announcement was posted in ', '').replace(/\.$/, '');
    return t('notifications.announcement_posted_msg', { course, defaultValue: `An announcement was posted in ${course}.` });
  }

  if (msg.startsWith('Your written answers for "') && msg.includes('" have been graded.')) {
    const quizTitle = msg.replace('Your written answers for "', '').replace('" have been graded.', '');
    return t('notifications.quiz_graded_msg', { quizTitle, defaultValue: `Your written answers for "${quizTitle}" have been graded.` });
  }

  if (msg.startsWith('Your enrollment request for "') && msg.includes('" has been approved! You can start learning now.')) {
    const courseTitle = msg.replace('Your enrollment request for "', '').replace('" has been approved! You can start learning now.', '');
    return t('notifications.enrollment_approved_msg', { courseTitle, defaultValue: `Your enrollment request for "${courseTitle}" has been approved! You can start learning now.` });
  }

    if (msg.includes('We have received your payout request')) {
    return t('notifications.payout_received_msg', 'We have received your payout request and it is now under review.');
  }
  if (msg.includes('was rejected.')) {
    const match = msg.match(/payout request of EGP ([0-9,.]+)/);
    const amt = match ? match[1] : '';
    return t('notifications.payout_rejected_msg', { amount: amt, defaultValue: `Your payout request of EGP ${amt} was rejected.` });
  }
  if (msg.includes('has been approved and processed.')) {
    const match = msg.match(/payout request of EGP ([0-9,.]+)/);
    const amt = match ? match[1] : '';
    return t('notifications.payout_approved_msg', { amount: amt, defaultValue: `Your payout request of EGP ${amt} has been approved and processed.` });
  }
  return msg;
};
