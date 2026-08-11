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
  if (title === 'New Student Enrollment') return t('notifications.new_student_enrollment', 'New Student Enrollment');

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

  if (msg.startsWith('An announcement was posted in ')) {
    const course = msg.replace('An announcement was posted in ', '').replace(/\.$/, '');
    return t('notifications.announcement_posted_msg', { course, defaultValue: `An announcement was posted in ${course}.` });
  }

  return msg;
};
