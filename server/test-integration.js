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
  });
  assert(res.status === 201, `Create course failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'pending', 'New course should default to pending');
  const courseId = res.body.course._id;
  console.log('✓ Instructor created course (status: pending)');

  // 3. Instructor adds a lesson to their own course
  res = await agentInstructor.post(`/api/courses/${courseId}/lessons`).set('X-CSRF-Token', instructorCsrf).send({
    title: 'Lesson 1: Big-O Notation',
    videoUrl: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
  });
  assert(res.status === 201, `Add lesson failed: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.order === 1, 'First lesson should be order 1');
  console.log('✓ Instructor added a lesson');

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

  // 8. Admin approves it
  res = await agentAdmin.patch(`/api/courses/${courseId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Approve failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'approved', 'Course should now be approved');
  console.log('✓ Admin approved course');

  // 9. Public catalog now shows it
  res = await agentPublic.get('/api/courses');
  assert(res.body.courses.length === 1, 'Approved course should now appear in public catalog');
  console.log('✓ Approved course now visible in public catalog');

  // 10. Course details endpoint returns lessons too
  res = await agentPublic.get(`/api/courses/${courseId}`);
  assert(res.status === 200, 'Course details fetch failed');
  assert(res.body.lessons.length === 1, 'Course details should include the 1 lesson we added');
  assert(res.body.lessons[0].videoUrl === undefined, 'Public course details must NOT leak videoUrl');
  const lessonId = res.body.lessons[0]._id;
  console.log('✓ Course details endpoint returns course + lessons (videoUrl correctly hidden)');

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

  // 13. Student enrolls
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 201, `Enroll failed: ${JSON.stringify(res.body)}`);
  console.log('✓ Student enrolled in course');

  // 14. Double-enroll should be rejected
  res = await agentStudent.post(`/api/enrollments/${courseId}`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 409, 'Duplicate enrollment should be rejected with 409');
  console.log('✓ Duplicate enrollment correctly rejected (409)');

  // 15. Now the student CAN watch the lesson
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${lessonId}`);
  assert(res.status === 200, `Enrolled student should access lesson: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.videoUrl, 'Lesson content response should include videoUrl');
  console.log('✓ Enrolled student can access lesson video content');

  // 16. Progress should start at 0%
  res = await agentStudent.get(`/api/enrollments/${courseId}`);
  assert(res.body.enrolled === true, 'Enrollment status should show enrolled: true');
  assert(res.body.progressPercent === 0, 'Progress should start at 0%');
  console.log('✓ Initial progress is 0%');

  // 17. Mark the lesson complete
  res = await agentStudent.patch(`/api/enrollments/${courseId}/lessons/${lessonId}/complete`).set('X-CSRF-Token', studentCsrf);
  assert(res.status === 200, `Mark complete failed: ${JSON.stringify(res.body)}`);
  assert(res.body.progressPercent === 100, 'Progress should be 100% after completing the only lesson');
  console.log('✓ Marking lesson complete updates progress to 100%');

  // 18. Marking the same lesson complete twice should NOT create a duplicate
  res = await agentStudent.patch(`/api/enrollments/${courseId}/lessons/${lessonId}/complete`).set('X-CSRF-Token', studentCsrf);
  assert(res.body.completedLessonIds.length === 1, 'Completed lessons should not contain duplicates');
  console.log('✓ Marking complete twice does not duplicate progress');

  // 19. "My Learning" list shows the course with progress attached
  res = await agentStudent.get('/api/enrollments/mine');
  assert(res.body.enrollments.length === 1, 'Student should have exactly 1 enrollment');
  assert(res.body.enrollments[0].progressPercent === 100, 'My-enrollments list should show 100% progress');
  console.log('✓ My Learning list shows correct progress');

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
