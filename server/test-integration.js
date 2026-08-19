import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.JWT_SECRET = 'test_secret';
process.env.CLIENT_URL = 'http://localhost:5173';
// 'development' (not just any truthy value) specifically enables otpService's
// "[DEV OTP DEBUG]" console log, which is how registerViaOtpFlow below reads
// back a real OTP without a live mail provider. Also matches this repo's
// existing convention (test-auth-security.js sets NODE_ENV too) and, as a
// side effect, exempts this run from rate limiting (middleware/rateLimiter.js
// skips 'development'/'test'), same as that file relies on.
process.env.NODE_ENV = 'development';

// Registration now requires proving email ownership via OTP before the
// account can be created (send-registration-otp -> verify-registration-otp
// -> register) — see authController.js. There's no API to read a raw OTP
// back, only the DB-stored hash, so this captures it the same way a human
// tester would in dev: from the console debug line otpService prints.
const registerViaOtpFlow = async (agent, { name, email, password, role }) => {
  let capturedOtp = null;
  const originalLog = console.log;
  console.log = (...args) => {
    const match = args.join(' ').match(/Code: (\d{6})/);
    if (match) capturedOtp = match[1];
    originalLog(...args);
  };
  try {
    const sendRes = await agent.post('/api/auth/send-registration-otp').send({ name, email, password });
    if (sendRes.status !== 200) throw new Error(`send-registration-otp failed: ${JSON.stringify(sendRes.body)}`);
  } finally {
    console.log = originalLog;
  }
  if (!capturedOtp) throw new Error('Did not capture a dev-debug OTP for ' + email);

  const verifyRes = await agent.post('/api/auth/verify-registration-otp').send({ email, otp: capturedOtp });
  if (verifyRes.status !== 200) throw new Error(`verify-registration-otp failed: ${JSON.stringify(verifyRes.body)}`);

  return agent.post('/api/auth/register').send({ name, email, password, role });
};

const run = async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('✓ Connected to in-memory MongoDB');

  const { default: app } = await import('./app.js');
  const { default: User } = await import('./models/User.js');
  const { default: Transaction } = await import('./models/Transaction.js');
  const { default: Course } = await import('./models/Course.js');

  const agentInstructor = request.agent(app);
  const agentAdmin = request.agent(app);
  const agentPublic = request.agent(app);

  // 1. Register an instructor (via the required pre-registration OTP flow)
  let res = await registerViaOtpFlow(agentInstructor, {
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
    courseType: 'full',
  });
  assert(res.status === 201, `Create course failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'pending', 'New course should default to pending');
  const courseId = res.body.course._id;
  console.log('✓ Instructor created course (status: pending)');

  // 2b. courseType is required on creation
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Missing Course Type',
    description: 'Should be rejected for lacking a courseType.',
    price: 10,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
  });
  assert(res.status === 400, `Course creation without courseType should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Course creation without courseType correctly rejected (400)');

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
    isVerified: true, // created directly, bypassing the OTP-gated register() flow
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

  // 9a. Content lock: a published Full Course cannot take new modules/lessons
  res = await agentInstructor.post(`/api/courses/${courseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Module Attempted After Publish',
  });
  assert(res.status === 403, `Adding a module to a published Full Course should be blocked (403): ${JSON.stringify(res.body)}`);
  console.log('✓ Adding a module to a published Full Course correctly blocked (403)');

  res = await agentInstructor.post(`/api/courses/${courseId}/modules/${moduleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson Attempted After Publish',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample3.mp4',
  });
  assert(res.status === 403, `Adding a lesson to a published Full Course should be blocked (403): ${JSON.stringify(res.body)}`);
  console.log('✓ Adding a lesson to a published Full Course correctly blocked (403)');

  // 9a-legacy: a course with no courseType (simulating one created before
  // this feature shipped) must NOT be content-locked, even if live —
  // regression guard for CLAUDE.md's "don't break existing courses" rule.
  const noraInstructor = await User.findOne({ email: 'nora@example.com' });
  const legacyCourse = await Course.create({
    title: 'Pre-Existing Legacy Course',
    description: 'Created before courseType existed — should never be content-locked.',
    price: 10,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
    instructor: noraInstructor._id,
    status: 'approved', // live, but courseType intentionally left unset
  });
  res = await agentInstructor.post(`/api/courses/${legacyCourse._id}/modules`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Module On Legacy Course',
  });
  assert(res.status === 201, `Legacy (no courseType) course should never be content-locked: ${JSON.stringify(res.body)}`);
  console.log('✓ Legacy course with no courseType remains unrestricted even when live');

  // --- FULL COURSE PRICE-CHANGE APPROVAL (spec §5) ---
  const priceBeforeRequest = (await Course.findById(courseId)).price;

  // Ongoing courses can't request a price change (only 'full' per spec)
  res = await agentInstructor.post(`/api/courses/${legacyCourse._id}/request-price-change`).set('X-CSRF-Token', instructorCsrf).send({ requestedPrice: 999 });
  assert(res.status === 400, `Price-change request on a non-full course should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Price-change request correctly rejected for a course with no courseType');

  res = await agentInstructor.post(`/api/courses/${courseId}/request-price-change`).set('X-CSRF-Token', instructorCsrf).send({ requestedPrice: 199 });
  assert(res.status === 200, `Price-change request failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.pendingPriceChange.status === 'pending', 'Price-change request should be pending');
  assert(res.body.course.price === priceBeforeRequest, 'Public price must NOT change just from requesting');
  console.log('✓ Instructor requested a price change; public price unchanged while pending');

  // Duplicate request while one is already pending is rejected
  res = await agentInstructor.post(`/api/courses/${courseId}/request-price-change`).set('X-CSRF-Token', instructorCsrf).send({ requestedPrice: 250 });
  assert(res.status === 409, `A second price-change request while one is pending should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Duplicate price-change request correctly rejected (409)');

  // Public catalog/course-details still show the OLD price while pending
  res = await agentPublic.get(`/api/courses/${courseId}`);
  assert(res.body.course.price === priceBeforeRequest, 'Public course details must show the old price while a change is pending');
  console.log('✓ Public course details show unchanged price while a price-change request is pending');

  res = await agentAdmin.patch(`/api/courses/${courseId}/price-change/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Approving price change failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.price === 199, `Approved price change should update the public price: ${JSON.stringify(res.body.course)}`);
  assert(!res.body.course.pendingPriceChange, 'pendingPriceChange should be cleared after approval');
  console.log('✓ Admin approved price change; public price updated to the requested value');

  // A rejected request must NOT change the price
  res = await agentInstructor.post(`/api/courses/${courseId}/request-price-change`).set('X-CSRF-Token', instructorCsrf).send({ requestedPrice: 500 });
  assert(res.status === 200, `Second price-change request failed: ${JSON.stringify(res.body)}`);
  res = await agentAdmin.patch(`/api/courses/${courseId}/price-change/reject`).set('X-CSRF-Token', adminCsrf).send({ reason: 'Too high for this catalog category' });
  assert(res.status === 200, `Rejecting price change failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.price === 199, `Rejected price change must leave the price unchanged: ${JSON.stringify(res.body.course)}`);
  console.log('✓ Admin rejected a price change; price correctly left unchanged');

  // 9b. Publish gate: a course with zero lessons cannot be published live
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Empty Course',
    description: 'Has no modules or lessons yet.',
    price: 0,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
    courseType: 'full',
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
  res = await registerViaOtpFlow(agentStudent, {
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

  // 13. Paid enrollment requires complete manual-payment proof.
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 400, `Paid enrollment without proof should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Paid enrollment without payment proof correctly rejected (400)');

  // Complete proof creates a pending request, not immediate access.
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf).send({
    transactionId: 'TXN-COURSE-1',
    paymentAccount: '+201000000000',
    paymentMethod: 'mobile_wallet',
    screenshot: 'https://res.cloudinary.com/demo/image/upload/payment-course-1.jpg',
    invoiceId: 'INV-COURSE-1',
  });
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

  // courseId is a published (locked) Full Course as of section 9a — adding
  // more content requires the instructor to unpublish first, exactly as the
  // content-lock rule intends.
  res = await agentInstructor.patch(`/api/courses/${courseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200 && res.body.course.status === 'draft', `Unpublishing course before adding quiz lesson failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor unpublished course to add more content (content-lock working as intended)');

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

  // Republish now that content additions are done
  res = await agentInstructor.patch(`/api/courses/${courseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200 && res.body.course.status === 'approved', `Republishing course after adding quiz lesson failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor republished course (status: approved)');

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

  // --- COURSE DELETION: instructors own their course, but not over an enrolled student's head ---

  // 25. Instructor can delete their own course... but not this one, since a
  // student has an approved enrollment in it.
  res = await agentInstructor.delete(`/api/courses/${courseId}`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 409, `Deleting a course with an approved enrollment should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor correctly blocked from deleting a course with an enrolled student (409)');

  // 26. ...but CAN delete a course of their own with no enrollments
  res = await agentInstructor.delete(`/api/courses/${emptyCourseId}`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200, `Instructor should be able to delete their own unenrolled course: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor successfully deleted their own course with no enrollments');

  // --- ONGOING COURSE LIFECYCLE: activity timer, inactivity draft, archival ---
  const { runOngoingInactivityCheck, runDraftExpirationCheck } = await import('./jobs/courseLifecycleJobs.js');
  const { default: Module } = await import('./models/Module.js');
  const { default: Lesson } = await import('./models/Lesson.js');
  const { default: Notification } = await import('./models/Notification.js');

  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Ongoing: Web Dev From Scratch',
    description: 'A progressively-built ongoing course for lifecycle testing.',
    price: 0,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
    courseType: 'ongoing',
  });
  assert(res.status === 201 && res.body.course.courseType === 'ongoing', `Create ongoing course failed: ${JSON.stringify(res.body)}`);
  const ongoingCourseId = res.body.course._id;

  res = await agentInstructor.post(`/api/courses/${ongoingCourseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({ title: 'Week 1' });
  const ongoingModuleId = res.body.module._id;
  res = await agentInstructor.post(`/api/courses/${ongoingCourseId}/modules/${ongoingModuleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson 1', videoUrl: 'https://res.cloudinary.com/demo/video/upload/ongoing1.mp4',
  });
  const ongoingLessonId = res.body.lesson._id;

  await Course.findByIdAndUpdate(ongoingCourseId, { status: 'draft' }); // simulate admin approval
  res = await agentInstructor.patch(`/api/courses/${ongoingCourseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200 && res.body.course.status === 'approved', `Publishing ongoing course failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.lastPublishedContentAt, 'Publishing an ongoing course should stamp lastPublishedContentAt even with no lesson explicitly published yet');
  console.log('✓ Ongoing course created and published; activity clock started on publish');

  // Publishing an actual lesson also stamps the timestamp (and would reactivate a dormant course)
  res = await agentInstructor.put(`/api/courses/${ongoingCourseId}/lessons/${ongoingLessonId}`).set('X-CSRF-Token', instructorCsrf).send({ status: 'published' });
  assert(res.status === 200, `Publishing lesson failed: ${JSON.stringify(res.body)}`);
  let ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.lastPublishedContentAt, 'lastPublishedContentAt should be set after publishing a lesson');
  console.log('✓ Publishing a lesson stamps lastPublishedContentAt on an ongoing course');

  // Day 10: backdate activity 11 days -> first warning fires, course stays active
  await Course.findByIdAndUpdate(ongoingCourseId, { lastPublishedContentAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) });
  let notifCountBefore = await Notification.countDocuments({ user: ongoingCourse.instructor });
  await runOngoingInactivityCheck();
  ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.status === 'approved', 'Course should remain active at day 11');
  assert(ongoingCourse.inactivityWarningSentAt, 'Day-10 warning should have been sent');
  assert(!ongoingCourse.inactivityUrgentWarningSentAt, 'Urgent warning should not fire yet at day 11');
  let notifCountAfter = await Notification.countDocuments({ user: ongoingCourse.instructor });
  assert(notifCountAfter === notifCountBefore + 1, 'Exactly one notification should be sent for the day-10 warning');
  console.log('✓ Day-10 inactivity warning fires once, course stays active');

  // Idempotency: running the same check again must not re-notify
  await runOngoingInactivityCheck();
  notifCountAfter = await Notification.countDocuments({ user: ongoingCourse.instructor });
  assert(notifCountAfter === notifCountBefore + 1, 'Re-running the inactivity check should not send a duplicate day-10 warning');
  console.log('✓ Inactivity check is idempotent — no duplicate notification on rerun');

  // Day 14: backdate past the draft threshold -> course moves to draft
  await Course.findByIdAndUpdate(ongoingCourseId, { lastPublishedContentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) });
  await runOngoingInactivityCheck();
  ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.status === 'draft', `15 days of inactivity should move the course to draft: ${ongoingCourse.status}`);
  assert(ongoingCourse.draftStartedAt, 'draftStartedAt should be set when the course goes inactive');
  console.log('✓ 14+ days of inactivity moves an ongoing course to draft');

  // --- INSTRUCTOR DISCIPLINE: first abandonment logs a 'warning'-stage violation, never auto-suspends ---
  const { default: InstructorViolation } = await import('./models/InstructorViolation.js');
  let violations = await InstructorViolation.find({ instructor: ongoingCourse.instructor });
  assert(violations.length === 1, `Exactly one violation should be logged for the first abandonment: got ${violations.length}`);
  assert(violations[0].stage === 'warning', `First violation should be stage 'warning': got ${violations[0].stage}`);
  let instructorAfterFirstViolation = await User.findById(ongoingCourse.instructor);
  assert(instructorAfterFirstViolation.isBlocked === false, 'A single violation must never auto-suspend the instructor');
  console.log('✓ First abandoned ongoing course logs a warning-stage violation, instructor not touched');

  res = await agentAdmin.get('/api/admin/instructor-violations/summary').set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Fetching violation summary failed: ${JSON.stringify(res.body)}`);
  const summaryEntry = res.body.summary.find(s => s.instructorId === ongoingCourse.instructor.toString());
  assert(summaryEntry && summaryEntry.count === 1 && summaryEntry.latestStage === 'warning', `Admin violation summary incorrect: ${JSON.stringify(res.body.summary)}`);
  console.log('✓ Admin can see the violation summary for the instructor');

  // Publishing new content reactivates it
  res = await agentInstructor.put(`/api/courses/${ongoingCourseId}/lessons/${ongoingLessonId}`).set('X-CSRF-Token', instructorCsrf).send({ status: 'draft' });
  assert(res.status === 200, `Un-publishing lesson failed: ${JSON.stringify(res.body)}`);
  res = await agentInstructor.put(`/api/courses/${ongoingCourseId}/lessons/${ongoingLessonId}`).set('X-CSRF-Token', instructorCsrf).send({ status: 'published' });
  assert(res.status === 200, `Re-publishing lesson failed: ${JSON.stringify(res.body)}`);
  ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.status === 'approved', 'Publishing new content should reactivate a dormant ongoing course');
  assert(!ongoingCourse.draftStartedAt, 'draftStartedAt should be cleared on reactivation');
  console.log('✓ Publishing new content on a dormant course reactivates it');

  // --- ONGOING -> FULL COURSE CONVERSION (spec §9 Option 4) ---
  // A 'full' course cannot be converted (only 'ongoing' can)
  res = await agentInstructor.patch(`/api/courses/${courseId}/convert-to-full`).set('X-CSRF-Token', instructorCsrf).send({ price: 300 });
  assert(res.status === 400, `Converting an already-Full course should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Converting an already-Full course correctly rejected');

  // Dedicated course for this test — must NOT reuse ongoingCourseId, which
  // the later day-90/day-80 archival tests still need to stay courseType:'ongoing'.
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Ongoing: To Be Converted',
    description: 'An ongoing course specifically for testing the convert-to-full flow.',
    price: 0,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
    courseType: 'ongoing',
  });
  const convertCourseId = res.body.course._id;
  res = await agentInstructor.post(`/api/courses/${convertCourseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({ title: 'Week 1' });
  const convertModuleId = res.body.module._id;
  await agentInstructor.post(`/api/courses/${convertCourseId}/modules/${convertModuleId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson 1', videoUrl: 'https://res.cloudinary.com/demo/video/upload/convert1.mp4',
  });

  res = await agentInstructor.patch(`/api/courses/${convertCourseId}/convert-to-full`).set('X-CSRF-Token', instructorCsrf).send({ price: 350 });
  assert(res.status === 200, `Convert to Full Course failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.courseType === 'full', `Converted course should have courseType 'full': ${JSON.stringify(res.body.course)}`);
  assert(res.body.course.price === 350, 'Converted course should have the new full-course price');
  assert(res.body.course.status === 'pending', `Converted course should re-enter admin review as 'pending': ${JSON.stringify(res.body.course)}`);
  assert(!res.body.course.lastPublishedContentAt, 'Ongoing-only fields should be cleared after conversion');
  console.log('✓ Ongoing course converted to Full Course, price updated, resubmitted for admin review');

  // The converted course now follows Full Course rules end-to-end: admin approves -> instructor publishes -> content-locked
  res = await agentAdmin.patch(`/api/courses/${convertCourseId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200 && res.body.course.status === 'draft', `Admin approving converted course failed: ${JSON.stringify(res.body)}`);
  res = await agentInstructor.patch(`/api/courses/${convertCourseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200 && res.body.course.status === 'approved', `Publishing converted course failed: ${JSON.stringify(res.body)}`);
  res = await agentInstructor.post(`/api/courses/${convertCourseId}/modules`).set('X-CSRF-Token', instructorCsrf).send({ title: 'Should Be Blocked' });
  assert(res.status === 403, `Converted-and-published course should now be content-locked like any Full Course: ${JSON.stringify(res.body)}`);
  console.log('✓ Converted course follows the full Full Course lifecycle, including content lock once published');

  // A second abandoned ongoing course from the SAME instructor escalates to 'admin_review'
  res = await agentInstructor.post('/api/courses').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Ongoing: Second Course',
    description: 'A second ongoing course to test violation escalation across courses.',
    price: 0,
    college: 'College of Computer Science and Information Technology',
    semester: 1,
    courseType: 'ongoing',
  });
  const secondOngoingCourseId = res.body.course._id;
  await Course.findByIdAndUpdate(secondOngoingCourseId, {
    status: 'approved',
    lastPublishedContentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });
  await runOngoingInactivityCheck();
  violations = await InstructorViolation.find({ instructor: ongoingCourse.instructor }).sort({ createdAt: 1 });
  assert(violations.length === 2, `Second abandonment should log a second violation: got ${violations.length}`);
  assert(violations[1].stage === 'admin_review', `Second violation should escalate to 'admin_review': got ${violations[1].stage}`);
  instructorAfterFirstViolation = await User.findById(ongoingCourse.instructor);
  assert(instructorAfterFirstViolation.isBlocked === false, 'Escalation to admin_review still must not auto-suspend — only an admin can do that');
  console.log('✓ A second abandoned ongoing course escalates to admin_review, still no auto-suspension');

  // Day 90: a course left in draft gets archived, content preserved
  await Course.findByIdAndUpdate(ongoingCourseId, { status: 'draft', draftStartedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) });
  await runDraftExpirationCheck();
  ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.status === 'archived', `91 days in draft should archive the course: ${ongoingCourse.status}`);
  const survivingModule = await Module.findById(ongoingModuleId);
  const survivingLesson = await Lesson.findById(ongoingLessonId);
  assert(survivingModule && survivingLesson, 'Archiving must not delete the course\'s modules/lessons');
  console.log('✓ 90 days in draft archives the course without deleting its content');

  // Day 80: separately verify the pre-archival warning on a fresh draft course
  await Course.findByIdAndUpdate(ongoingCourseId, { status: 'draft', draftStartedAt: new Date(Date.now() - 81 * 24 * 60 * 60 * 1000) });
  await runDraftExpirationCheck();
  ongoingCourse = await Course.findById(ongoingCourseId);
  assert(ongoingCourse.status === 'draft', 'Course should not be archived yet at day 81');
  assert(ongoingCourse.draftExpirationWarningSentAt, 'Day-80 draft-expiration warning should have been sent');
  console.log('✓ Day-80 draft-expiration warning fires before the 90-day archive');

  // --- STANDALONE RELATED LESSONS (spec §11) ---
  // Can't relate a standalone lesson to a course you don't own
  const { default: StandaloneLesson } = await import('./models/StandaloneLesson.js');
  const otherInstructor = await User.create({ name: 'Other Instructor', email: 'other-instructor@example.com', password: 'Password123!', role: 'instructor' });
  const otherCourse = await Course.create({
    title: "Other Instructor's Course", description: 'Not owned by nora.', price: 10,
    college: 'College of Computer Science and Information Technology', semester: 1,
    instructor: otherInstructor._id, status: 'approved', courseType: 'full',
  });
  res = await agentInstructor.post('/api/standalone-lessons').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Should Be Blocked', description: 'Not the instructor\'s own course, should be rejected.',
    relatedCourseId: otherCourse._id, price: 50, videoUrl: 'https://res.cloudinary.com/demo/video/upload/standalone1.mp4',
  });
  assert(res.status === 403, `Relating a standalone lesson to another instructor's course should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Standalone lesson creation blocked for a course the instructor does not own');

  // Can't relate to an Ongoing course (spec §11 requires a Full Course)
  res = await agentInstructor.post('/api/standalone-lessons').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Should Also Be Blocked', description: 'Related course is Ongoing, not Full — should be rejected.',
    relatedCourseId: ongoingCourseId, price: 50, videoUrl: 'https://res.cloudinary.com/demo/video/upload/standalone2.mp4',
  });
  assert(res.status === 400, `Relating a standalone lesson to an Ongoing course should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Standalone lesson creation blocked when related course is not a Full Course');

  // Happy path: create, approve, discover, purchase, access-gate, purchase-approve, access
  res = await agentInstructor.post('/api/standalone-lessons').set('X-CSRF-Token', instructorCsrf).send({
    title: 'Algorithms Revision: Big-O Deep Dive',
    description: 'A standalone revision lesson related to the main Algorithms course.',
    relatedCourseId: courseId, price: 25, videoUrl: 'https://res.cloudinary.com/demo/video/upload/standalone3.mp4',
  });
  assert(res.status === 201, `Create standalone lesson failed: ${JSON.stringify(res.body)}`);
  const standaloneLessonId = res.body.lesson._id;
  console.log('✓ Instructor created a standalone lesson related to their Full Course');

  res = await agentPublic.get('/api/standalone-lessons');
  assert(res.status === 200 && res.body.lessons.length === 0, `Unapproved standalone lesson should not be publicly discoverable yet: ${JSON.stringify(res.body)}`);

  res = await agentAdmin.patch(`/api/standalone-lessons/${standaloneLessonId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200 && res.body.lesson.status === 'approved', `Admin approving standalone lesson failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Admin approved the standalone lesson');

  res = await agentPublic.get(`/api/standalone-lessons?relatedCourseId=${courseId}`);
  assert(res.status === 200 && res.body.lessons.length === 1, `Approved standalone lesson should be discoverable via its related course: ${JSON.stringify(res.body)}`);
  assert(res.body.lessons[0].videoUrl === undefined, 'Public discovery response must not include videoUrl');
  assert(res.body.lessons[0].relatedCourse.title === 'Intro to Algorithms', 'Discovery response should show the related course title');
  console.log('✓ Standalone lesson publicly discoverable, correctly shows "Related to" course, video hidden');

  // Un-purchased student cannot access the video
  res = await agentStudent.get(`/api/standalone-lessons/${standaloneLessonId}/access`);
  assert(res.status === 403, `Un-purchased student should be blocked from standalone lesson content: ${JSON.stringify(res.body)}`);
  console.log('✓ Un-purchased student correctly blocked from standalone lesson video (403)');

  res = await agentStudent.post(`/api/standalone-lessons/${standaloneLessonId}/purchase`).set('X-CSRF-Token', studentCsrf).send({
    transactionId: 'TXN-STANDALONE-1', paymentAccount: '+201000000000', paymentMethod: 'mobile_wallet',
    screenshot: 'https://res.cloudinary.com/demo/image/upload/payment-standalone-1.jpg', invoiceId: 'INV-STANDALONE-1',
  });
  assert(res.status === 201 && res.body.purchase.status === 'pending', `Standalone lesson purchase failed: ${JSON.stringify(res.body)}`);
  const standalonePurchaseId = res.body.purchase._id;
  console.log('✓ Student purchased the standalone lesson (pending admin approval)');

  res = await agentStudent.post(`/api/standalone-lessons/${standaloneLessonId}/purchase`).set('X-CSRF-Token', studentCsrf).send({ transactionId: 'TXN-DUP' });
  assert(res.status === 409, `Duplicate standalone lesson purchase should be rejected: ${JSON.stringify(res.body)}`);
  console.log('✓ Duplicate standalone lesson purchase correctly rejected (409)');

  res = await agentStudent.get(`/api/standalone-lessons/${standaloneLessonId}/access`);
  assert(res.status === 403, `Pending purchase should not yet grant access: ${JSON.stringify(res.body)}`);
  console.log('✓ Pending purchase correctly still blocked from video content');

  // Deletion is blocked once a purchase (even pending) exists is NOT required by spec — only approved must block; verify pending does NOT block
  res = await agentAdmin.patch(`/api/standalone-lessons/purchases/${standalonePurchaseId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200 && res.body.purchase.status === 'approved', `Admin approving standalone purchase failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Admin approved the standalone lesson purchase');

  res = await agentStudent.get(`/api/standalone-lessons/${standaloneLessonId}/access`);
  assert(res.status === 200 && res.body.lesson.videoUrl, `Approved purchase should grant video access: ${JSON.stringify(res.body)}`);
  console.log('✓ Student with an approved purchase can access the standalone lesson video');

  res = await agentStudent.get('/api/standalone-lessons/mine-purchased');
  assert(res.status === 200 && res.body.purchases.length === 1, `Student's purchased-lessons list incorrect: ${JSON.stringify(res.body)}`);
  console.log('✓ Student sees the standalone lesson in their purchased-lessons list');

  // Deletion blocked once there's an approved purchase
  res = await agentInstructor.delete(`/api/standalone-lessons/${standaloneLessonId}`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 409, `Deleting a standalone lesson with an approved purchase should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Instructor blocked from deleting a standalone lesson with an approved purchase (409)');

  // Confirm the standalone lesson was never inserted into the related course's modules
  res = await agentPublic.get(`/api/courses/${courseId}`);
  const relatedTitles = res.body.modules.flatMap(m => m.lessons.map(l => l.title));
  assert(!relatedTitles.includes('Algorithms Revision: Big-O Deep Dive'), 'Standalone lesson must never appear inside the related course\'s own module/lesson list');
  console.log('✓ Standalone lesson confirmed separate from the related course\'s own curriculum');

  // --- PAYOUTS: completing/processing must require OTP verification first ---
  // (Regression test for a bug where completePayout had no status guard at
  // all, and processPayout's guard was inverted — both let an admin release
  // funds on a payout the instructor never confirmed via OTP. We create the
  // Transaction directly rather than going through requestPayout/verify-otp,
  // since no email provider is configured in this environment — see
  // CLAUDE.md's "known gaps" — this isolates the fix under test from that
  // unrelated, already-documented limitation.)

  const instructorUser = await User.findOne({ email: 'nora@example.com' });
  const pendingPayout = await Transaction.create({
    instructor: instructorUser._id,
    amount: -500,
    type: 'payout_request',
    status: 'pending',
    description: 'Payout Request - Instapay',
    payoutMethod: 'instapay',
  });

  res = await agentAdmin.put(`/api/financials/${pendingPayout._id}/complete`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 400, `Completing a payout still pending OTP verification should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Admin correctly blocked from completing a payout pending OTP verification (400)');

  res = await agentAdmin.put(`/api/financials/${pendingPayout._id}/process`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 400, `Processing a payout still pending OTP verification should be blocked: ${JSON.stringify(res.body)}`);
  console.log('✓ Admin correctly blocked from processing a payout pending OTP verification (400)');

  await Transaction.findByIdAndUpdate(pendingPayout._id, { status: 'approved' });
  res = await agentAdmin.put(`/api/financials/${pendingPayout._id}/complete`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Completing an OTP-verified payout should succeed: ${JSON.stringify(res.body)}`);
  assert(res.body.transaction.status === 'paid', 'Payout should be marked paid');
  console.log('✓ Admin successfully completed a payout once it was OTP-verified');

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
