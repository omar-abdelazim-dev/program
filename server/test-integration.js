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
  const { default: Transaction } = await import('./models/Transaction.js');

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
    college: 'Engineering',
    semester: 1,
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

  // 5. Create an admin directly in the DB
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
  
  // Instructor publishes course live
  res = await agentInstructor.patch(`/api/courses/${courseId}/publish`).set('X-CSRF-Token', instructorCsrf);
  assert(res.status === 200, `Publish failed: ${JSON.stringify(res.body)}`);
  assert(res.body.course.status === 'approved', 'Course should now be approved');
  console.log('✓ Admin approved and instructor published course');

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

  // --- STUDENT PAYMENT WORKFLOW TESTS ---

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

  // 12. Student requests enrollment with payment details
  res = await agentStudent.post(`/api/enrollments/request/${courseId}`).set('X-CSRF-Token', studentCsrf).send({
    providerTransactionId: 'VF-982734982',
    payerNumber: '01012345678',
    paymentMethod: 'vodafone_cash',
    screenshotUrl: 'https://example.com/screenshot.jpg',
  });
  assert(res.status === 201, `Request enrollment failed: ${JSON.stringify(res.body)}`);
  assert(res.body.enrollment.programTransactionId.startsWith('PRG-TXN-'), 'Program TX ID must start with PRG-TXN-');
  assert(res.body.enrollment.status === 'pending', 'Request status must be pending');
  const requestId = res.body.enrollment._id;
  console.log('✓ Student submitted enrollment payment request with Program TX ID');

  // 13. Student checks status -> should be unenrolled with requestStatus: pending
  res = await agentStudent.get(`/api/enrollments/${courseId}`);
  assert(res.body.enrolled === false, 'Student should not be enrolled while pending approval');
  assert(res.body.requestStatus === 'pending', 'Status check should return requestStatus: pending');
  console.log('✓ Student correctly blocked from course content while pending approval');

  // 14. Admin fetches enrollment requests
  res = await agentAdmin.get('/api/enrollments/admin/requests');
  assert(res.status === 200, 'Admin requests fetch failed');
  assert(res.body.requests.length === 1, 'Admin should see 1 pending enrollment request');
  console.log('✓ Admin sees pending enrollment request');

  // 15. Admin approves enrollment request
  res = await agentAdmin.patch(`/api/enrollments/admin/requests/${requestId}/approve`).set('X-CSRF-Token', adminCsrf);
  assert(res.status === 200, `Admin approval failed: ${JSON.stringify(res.body)}`);
  assert(res.body.enrollment.status === 'approved', 'Enrollment status must be approved');
  console.log('✓ Admin approved enrollment request');

  // 16. Verify central financial ledger transaction was created
  const ledgerTx = await Transaction.findOne({ programTransactionId: res.body.enrollment.programTransactionId });
  assert(ledgerTx !== null, 'Central ledger transaction must exist');
  assert(ledgerTx.type === 'enrollment_payment', 'Ledger transaction type must be enrollment_payment');
  assert(ledgerTx.amount === 49, 'Ledger amount must match course price');
  console.log('✓ Central financial ledger entry verified');

  // 17. Now student CAN access the lesson video
  res = await agentStudent.get(`/api/courses/${courseId}/lessons/${lessonId}`);
  assert(res.status === 200, `Enrolled student should access lesson: ${JSON.stringify(res.body)}`);
  assert(res.body.lesson.videoUrl, 'Lesson content response should include videoUrl');
  console.log('✓ Approved student can access lesson video content');

  // 18. Attempt reusing the same provider transaction ID by a new student -> must fail
  const agentStudent2 = request.agent(app);
  res = await agentStudent2.post('/api/auth/register').send({
    name: 'Tariq Student',
    email: 'tariq@example.com',
    password: 'Password123!',
    role: 'student',
  });
  const student2Csrf = getCsrfToken(res);

  res = await agentStudent2.post(`/api/enrollments/request/${courseId}`).set('X-CSRF-Token', student2Csrf).send({
    providerTransactionId: 'VF-982734982',
    payerNumber: '01099998888',
    paymentMethod: 'vodafone_cash',
    screenshotUrl: 'https://example.com/screenshot2.jpg',
  });
  assert(res.status === 400, 'Reusing provider transaction ID must return 400 Bad Request');
  console.log('✓ Reusing provider transaction ID correctly blocked (400)');

  // 19. Student 2 submits with a unique provider TX ID, then Admin rejects
  res = await agentStudent2.post(`/api/enrollments/request/${courseId}`).set('X-CSRF-Token', student2Csrf).send({
    providerTransactionId: 'VF-1122334455',
    payerNumber: '01099998888',
    paymentMethod: 'vodafone_cash',
    screenshotUrl: 'https://example.com/screenshot2.jpg',
  });
  assert(res.status === 201, 'Student 2 valid request creation failed');
  const request2Id = res.body.enrollment._id;

  res = await agentAdmin.patch(`/api/enrollments/admin/requests/${request2Id}/reject`).set('X-CSRF-Token', adminCsrf).send({
    rejectionReason: 'Invalid screenshot amount does not match course price',
  });
  assert(res.status === 200, 'Admin rejection failed');
  assert(res.body.enrollment.status === 'rejected', 'Status must be rejected');
  assert(res.body.enrollment.refundTransactionId.startsWith('PRG-REF-'), 'Refund transaction ID must start with PRG-REF-');
  console.log('✓ Admin rejected enrollment request and generated PRG-REF-* refund entry');

  await mongoose.disconnect();
  await mongod.stop();
  console.log('\nALL INTEGRATION TESTS PASSED');
};

function assert(condition, message) {
  if (!condition) throw new Error('FAILED: ' + message);
}

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
