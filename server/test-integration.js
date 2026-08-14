import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.JWT_SECRET = 'test_secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const run = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('✓ Connected to in-memory MongoDB');

  const { default: app } = await import('./app.js');
  const { default: User } = await import('./models/User.js');

  const agentInstructor = request.agent(app);
  const agentAdmin = request.agent(app);
  const agentPublic = request.agent(app);

  // 1. Register an instructor
  let res = await agentInstructor.post('/api/auth/register').send({
    name: 'Nora Instructor',
    email: 'nora@example.com',
    password: 'Password123!',
    role: 'instructor',
  });
  assert(res.status === 201, `Instructor register failed: ${JSON.stringify(res.body)}`);
  const instructorCsrf = getCsrfToken(res);
  console.log('✓ Instructor registered');

  // 2. Instructor creates a course -> should default to pending
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Intro to Algorithms',
    description: 'Learn the fundamentals of algorithmic thinking.',
    price: 49,
    category: 'Computer Science',
    college: 'College of Computer Science and Information Technology',
    semester: 1,
  });
  assert(res.status === 201, `Create course failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'pending', 'New course should default to pending');
  const courseId = res.body.course._id;
  console.log('✓ Instructor created course (status: pending)');

  // 3a. Instructor creates a module for their course
  res = await agentInstructor.post(`/api/courses/${courseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Module 1: Foundations',
  });
  assert(res.status === 201, `Create module failed: ${JSON.stringify(res.body)}`);
  assert(res.body.module.order === 1, 'First module should be order 1');
  const moduleId = res.body.module._id;
  console.log('✓ Instructor created a module');

  // 3b. Instructor adds two lessons to that module, then reorders them
  res = await agentInstructor.post(`/api/courses/${courseId}/modules/${moduleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson 1: Big-O Notation',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
  });
  assert(res.status === 201, `Add lesson failed: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.order === 1, 'First lesson should be order 1');
  const lesson1Id = res.body.lesson._id;
  console.log('✓ Instructor added a lesson to the module');

  res = await agentInstructor.post(`/api/courses/${courseId}/modules/${moduleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson 2: Time Complexity',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample2.mp4',
  });
  assert(res.status === 201 && res.body.lesson.order === 2, `Second lesson should be order 2: ${JSON.stringify(res.body)}`);
  const lesson2Id = res.body.lesson._id;

  res = await agentInstructor.put(`/api/courses/${courseId}/modules/${moduleId}/lessons-reorder`).set('X-CSRF-Token', instructorCsrf).send({
    lessonIds: [lesson2Id, lesson1Id],
  });
  assert(res.status === 200, `Reorder lessons failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor reordered lessons within the module');

  // 3c. Instructor creates a second module and reorders both modules
  res = await agentInstructor.post(`/api/courses/${courseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Module 2: Data Structures',
  });
  assert(res.status === 201 && res.body.module.order === 2, `Second module should be order 2: ${JSON.stringify(res.body)}`);
  const module2Id = res.body.module._id;

  res = await agentInstructor.put(`/api/courses/${courseId}/modules-reorder`).set('X-CSRF-Token', instructorCsrf).send({
    moduleIds: [module2Id, moduleId],
  });
  assert(res.status === 200, `Reorder modules failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor reordered modules');

  // Delete the second (empty) module and one of the two lessons so the rest
  // of this test — written for "exactly 1 module / 1 lesson" — still holds.
  res = await agentInstructor.delete(`/api/courses/${courseId}/modules/${module2Id}`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200, `Delete second module failed: ${JSON.stringify(res.body)}`);
  res = await agentInstructor.delete(`/api/courses/${courseId}/lessons/${lesson2Id}`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200, `Delete second lesson failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Cleaned up extra module/lesson used for reorder testing');

  // 4. Public catalog should NOT show the pending course yet
  res = await agentPublic.get('/api/courses');
  assert(res.status === 200, 'Public catalog request failed');
  assert(res.body.courses.length === 0, 'Pending course should not appear in public catalog');
  console.log('✓ Public catalog correctly hides pending course');

  // 5. Create an admin directly in the DB (mirrors real-world: admins are
  // never created through the public register form)
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'adminpass123',
    role: 'admin',
  });
  res = await agentAdmin.post('/api/auth/login').send({
    email: 'admin@example.com',
    password: 'adminpass123',
  });
  assert(res.status === 200, `Admin login failed: ${JSON.stringify(res.body)}`);
  const adminCsrf = getCsrfToken(res);
  console.log('✓ Admin logged in');

  // 6. A non-admin (instructor) should be blocked from the pending-courses list
  res = await agentInstructor.get('/api/courses/pending');
  assert(res.status === 403, 'Instructor should NOT be able to access admin pending list');
  console.log('✓ Instructor correctly blocked from admin route (403)');

  // 7. Admin sees the pending course
  res = await agentAdmin.get('/api/courses/pending');
  assert(res.status === 200, 'Admin pending list failed');
  assert(res.body.courses.length === 1, 'Admin should see exactly 1 pending course');
  console.log('✓ Admin sees pending course');

  // 8. Admin approves it -> lands as a draft, not yet live (INS-03: instructor
  // must explicitly publish before it's visible to students)
  res = await agentAdmin.patch(`/api/courses/${courseId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Approve failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'draft', 'Approved course should land as a draft, pending publish');
  console.log('✓ Admin approved course (status: draft)');

  // 8b. Approved-but-unpublished course should NOT be public yet
  res = await agentPublic.get('/api/courses');
  assert(res.body.courses.length === 0, 'Draft course should not appear in public catalog yet');
  console.log('✓ Draft course correctly hidden from public catalog');

  // 8c. Instructor publishes the course to go live
  res = await agentInstructor.patch(`/api/courses/${courseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200, `Publish failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'approved', 'Published course should move to approved (live)');
  console.log('✓ Instructor published course (status: approved)');

  // 9. Public catalog now shows it
  res = await agentPublic.get('/api/courses');
  assert(res.body.courses.length === 1, 'Published course should now appear in public catalog');
  console.log('✓ Published course now visible in public catalog');

  // 9b. Publish gate: a course with zero lessons cannot be published live
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Empty Course',
    description: 'Has no modules or lessons yet.',
    price: 0,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
  });
  assert(res.status === 201, `Create empty course failed: ${JSON.stringify(res.body)}`);
  const emptyCourseId = res.body.course._id;
  res = await agentAdmin.patch(`/api/courses/${emptyCourseId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200 && res.body.course.status === 'draft', `Approve empty course failed: ${JSON.stringify(res.body)}`);
  res = await agentInstructor.patch(`/api/courses/${emptyCourseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 400, 'Publishing a course with zero lessons should be rejected');
  console.log('✓ Course with no lessons correctly blocked from publishing');

  // 10. Course details endpoint returns modules with nested lessons
  res = await agentPublic.get(`/api/courses/${courseId}`);
  assert(res.status === 200, 'Course details fetch failed');
  assert(res.body.modules.length === 1, 'Course details should include the 1 module we created');
  assert(res.body.modules[0].lessons.length === 1, 'Module should include the 1 lesson we added');
  assert(res.body.modules[0].lessons[0].videoUrl === undefined, 'Public course details must NOT leak videoUrl');
  const lessonId = res.body.modules[0].lessons[0]._id;
  console.log('✓ Course details endpoint returns course + modules + lessons (videoUrl correctly hidden)');

  // --- WEEK 3: enrollment + lesson player + progress ---

  // 11. Register a student
  const agentStudent = request.agent(app);
  res = await agentStudent.post('/api/auth/register').send({
    name: 'Sara Student',
    email: 'sara@example.com',
    password: 'Password123!',
    role: 'student',
  });
  assert(res.status === 201, `Student register failed: ${JSON.stringify(res.body)}`);
  const studentCsrf = getCsrfToken(res);
  console.log('✓ Student registered');

  // 12. Student tries to watch the lesson BEFORE enrolling -> should be blocked
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${lessonId}`);
  assert(res.status === 403, 'Student should be blocked from lesson content before enrolling');
  console.log('✓ Un-enrolled student correctly blocked from lesson video (403)');

  // 13. Student enrolls in a paid course -> lands as 'pending', not immediate access
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 201, `Enroll failed: ${JSON.stringify(res.body)}`);
  assert(res.body.enrollment.status === 'pending', `Paid enrollment should start pending: ${JSON.stringify(res.body)}`);
  const enrollmentId = res.body.enrollment._id;
  console.log('✓ Student enrolled in course (status: pending)');

  // 14. Double-enroll should be rejected
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 409, 'Duplicate enrollment should be rejected with 409');
  console.log('✓ Duplicate enrollment correctly rejected (409)');

  // 14b. While pending, the student is still blocked from lesson content
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${lessonId}`);
  assert(res.status === 403, `Pending enrollment should still be blocked from lesson video: ${JSON.stringify(res.body)}`);
  console.log('✓ Pending enrollment correctly blocked from lesson video (403)');

  // 14c. Admin approves the enrollment request
  res = await agentAdmin.patch(`/api/admin/enrollments/${enrollmentId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Approve enrollment failed: ${JSON.stringify(res.body)}`);
  assert(res.body.enrollment.status === 'approved', 'Enrollment should be approved');
  console.log('✓ Admin approved the enrollment request');

  // 14d. Approving an already-approved enrollment must be rejected, not
  // silently re-processed (regression test: this used to create a second
  // instructor revenue-split Transaction on every duplicate approve call).
  res = await agentAdmin.patch(`/api/admin/enrollments/${enrollmentId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 409, `Double-approving an enrollment should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Double-approving an enrollment correctly rejected (409)');

  // 15. Now the student CAN watch the lesson
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${lessonId}`);
  assert(res.status === 200, `Enrolled student should access lesson: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.videoUrl, 'Lesson content response should include videoUrl');
  console.log('✓ Enrolled student can access lesson video content');

  // 16. Progress should start at 0%
  res = await agentStudent.get(`/api/enrollments/${courseId}`);
  assert(res.body.enrolled === true, 'Enrollment status should show enrolled: true');
  assert(res.body.progressPercent === 0, 'Progress should start at 0%');
  assert(res.body.moduleProgress.length === 1 && res.body.moduleProgress[0].percent === 0, 'Module progress should start at 0%');
  console.log('✓ Initial progress is 0% (course + module level)');

  // 17. Mark the lesson complete
  res = await agentStudent.patch(`/api/enrollments/${courseId}/lessons/${lessonId}/complete`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 200, `Mark complete failed: ${JSON.stringify(res.body)}`);
  assert(res.body.progressPercent === 100, 'Progress should be 100% after completing the only lesson');
  assert(res.body.moduleProgress[0].percent === 100, 'Module progress should be 100% after completing its only lesson');
  console.log('✓ Marking lesson complete updates progress to 100% (course + module level)');

  // 18. Marking the same lesson complete twice should NOT create a duplicate
  res = await agentStudent.patch(`/api/enrollments/${courseId}/lessons/${lessonId}/complete`).set('X-CSRF-Token', studentCsrf);
  assert(res.body.completedLessonIds.length === 1, 'Completed lessons should not contain duplicates');
  console.log('✓ Marking complete twice does not duplicate progress');

  // 19. "My Learning" list shows the course with progress attached
  res = await agentStudent.get('/api/enrollments/mine');
  assert(res.body.enrollments.length === 1, 'Student should have exactly 1 enrollment');
  assert(res.body.enrollments[0].progressPercent === 100, 'My-enrollments list should show 100% progress');
  console.log('✓ My Learning list shows correct progress');

  // --- QUIZ LESSON: mcq auto-grading + written-answer manual grading ---

  // 20. Instructor creates a quiz lesson with 1 MCQ + 1 written question
  res = await agentInstructor.post(`/api/courses/${courseId}/modules/${moduleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Quiz: Algorithm Basics',
    lessonType: 'quiz',
    quiz: {
      questions: [
        { type: 'mcq', prompt: 'What is O(1)?', options: ['Constant time', 'Linear time', 'Quadratic time', 'Exponential time'], correctOptionIndex: 0, points: 1 },
        { type: 'written', prompt: 'Explain Big-O notation in your own words.', points: 2 },
      ],
    },
  });
  assert(res.status === 201, `Create quiz lesson failed: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.lessonType === 'quiz', 'Lesson should be created as a quiz');
  const quizLessonId = res.body.lesson._id;
  console.log('✓ Instructor created a quiz lesson (1 MCQ + 1 written question)');

  // 20b. Rejects an MCQ question with too few options
  res = await agentInstructor.post(`/api/courses/${courseId}/modules/${moduleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Bad Quiz',
    lessonType: 'quiz',
    quiz: { questions: [{ type: 'mcq', prompt: 'Bad?', options: ['A', 'B'], correctOptionIndex: 0 }] },
  });
  assert(res.status === 400, 'Quiz with only 2 MCQ options should be rejected');
  console.log('✓ Quiz validation rejects an MCQ question with too few options');

  // 20c. A student fetching the quiz must NOT see the correct answer index
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${quizLessonId}`);
  assert(res.status === 200, `Student should be able to fetch quiz content: ${JSON.stringify(res.body)}`);
  assert(
    res.body.lesson.quiz.questions.every((q) => !('correctOptionIndex' in q)),
    'Student-facing quiz content must not leak correctOptionIndex'
  );
  console.log('✓ Student-facing quiz content correctly hides the correct answer');

  // 21. Student submits the quiz: correct MCQ answer + a written answer
  res = await agentStudent.post(`/api/enrollments/${courseId}/lessons/${quizLessonId}/quiz-submit`).set('X-CSRF-Token', studentCsrf).send({
    answers: [
      { questionIndex: 0, selectedOptionIndex: 0 },
      { questionIndex: 1, textAnswer: 'It describes how runtime scales with input size.' },
    ],
  });
  assert(res.status === 200, `Quiz submit failed: ${JSON.stringify(res.body)}`);
  assert(res.body.submission.status === 'pending_review', 'Submission with a written answer should be pending_review');
  assert(res.body.submission.autoScore === 1, `MCQ auto-score should be 1: ${JSON.stringify(res.body.submission)}`);
  assert(res.body.completedLessonIds.includes(quizLessonId), 'Submitting the quiz should mark the lesson complete');
  console.log('✓ Student submitted the quiz — MCQ auto-graded, lesson marked complete');

  // 22. Instructor sees it in the grading queue
  res = await agentInstructor.get('/api/quiz-submissions?status=pending_review');
  assert(res.status === 200 && res.body.submissions.length === 1, `Grading queue should show 1 pending submission: ${JSON.stringify(res.body)}`);
  const submissionId = res.body.submissions[0]._id;
  console.log('✓ Instructor sees the submission in the grading queue');

  // 23. Instructor grades the written answer
  res = await agentInstructor.patch(`/api/quiz-submissions/${submissionId}/grade`).set('X-CSRF-Token', instructorCsrf).send({
    grades: [{ questionIndex: 1, pointsAwarded: 2, feedback: 'Clear and correct.' }],
  });
  assert(res.status === 200, `Grade submission failed: ${JSON.stringify(res.body)}`);
  assert(res.body.submission.status === 'graded', 'Submission should be graded');
  const writtenAnswer = res.body.submission.answers.find((a) => a.questionIndex === 1);
  assert(writtenAnswer.pointsAwarded === 2, 'Written answer should have the awarded points recorded');
  console.log('✓ Instructor graded the written answer');

  // 24. Grading it again should be rejected (already graded)
  res = await agentInstructor.patch(`/api/quiz-submissions/${submissionId}/grade`).set('X-CSRF-Token', instructorCsrf).send({
    grades: [{ questionIndex: 1, pointsAwarded: 1 }],
  });
  assert(res.status === 409, 'Re-grading an already-graded submission should be rejected');
  console.log('✓ Double-grading a submission correctly rejected (409)');

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\nALL INTEGRATION TESTS PASSED');
};

function assert(condition, message) {
  if (!condition) throw new Error('FAILED: ' + message);
}

// supertest's agent() persists cookies automatically but never echoes them
// back as headers the way a browser + our axios interceptor does — so the
// CSRF double-submit check needs the csrfToken cookie pulled out manually.
function getCsrfToken(res) {
  const cookies = res.headers['set-cookie'] || [];
  const csrfCookie = cookies.find((c) => c.startsWith('csrfToken='));
  return csrfCookie ? csrfCookie.split(';')[0].split('=')[1] : null;
}

run().catch((err) => {
  console.error('\nTEST SUITE FAILED');
  console.error(err);
  process.exit(1);
});
