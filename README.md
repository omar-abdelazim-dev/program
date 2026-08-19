# Full Stack Learning Management System (LMS)
A comprehensive, modern, and aesthetically premium Learning Management System featuring multiple role-based portals, full-stack course management, secure authentication, and financial tracking.

## 🌟 Core Architecture
- **Frontend**: React + Vite
- **Styling**: Pure CSS (Glassmorphism theme, dynamic gradients, responsive grids, custom scrollbars)
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose ORM)
- **Authentication**: JWT (JSON Web Tokens) stored securely in HTTP-only cookies

---

## 🔐 User Roles & Permissions
The system uses a strict hierarchy for access control.
1. **Student (Default)**: Can browse courses, view course details, and enroll.
2. **Instructor**: Can create courses, add lessons, and view their own financial analytics.
3. **Admin**: Can manage users (block/unblock, demote), approve/reject pending courses, and view global financial transactions.
4. **Super Admin**: Has all Admin privileges, plus the ability to assign new Admins, promote Instructors, and access the massive, nested system management sidebar.

---

## 🎨 UI/UX Highlights
- **Glassmorphism Design**: Frosted glass cards `backdrop-filter: blur()`, glowing borders, and modern transparency.
- **Dynamic Micro-Animations**: Buttons glow on hover, odometer animations for numbers (like Total Revenue), smooth page transitions.
- **Responsive Navigation**: Top navigation bars morph seamlessly, custom SVG icons.
- **Beautiful Toasts & Alerts**: Success and error messages are clearly styled for the user.

---

## 👨‍🎓 Student Portal (Learning Portal)
- **Dynamic Hero Section**: Welcomes the user with a gradient title and call to action.
- **Course Catalog (Explore Tab)**: Displays all `Approved` courses with thumbnails, titles, prices, and instructor names.
- **Search Functionality**: Real-time searching of courses by title or category.
- **Course Detail View**: See course description, total duration, number of lessons, and instructor details.
- **Checkout Flow**:
  - Manual Mobile Wallet/InstaPay transfer with transaction details and receipt upload.
  - Paid requests remain pending until an admin verifies the transfer; free items are approved immediately.
  - No integrated card processor or simulated payment gateway. See [Manual payment and enrollment model](docs/manual-payments.md).
- **Dashboard Tab**: 
  - Shows the student's actively enrolled courses.
  - Tracks total amount spent by the student.

---

## 👨‍🏫 Instructor Portal
- **Financial Dashboard**: 
  - Real-time total revenue calculation (only for the instructor's specific courses).
  - Number of enrolled students per course.
- **Course Creation Studio**:
  - Form to create new courses (Title, Category, Price, Description, Thumbnail URL).
  - All new courses default to `Pending` status until approved by an Admin.
- **Curriculum Builder**:
  - Ability to add new Lessons (Title, Video URL, Content/Text, Duration) to their own courses.
- **Course Status Badges**: Instructors can see if their courses are `Pending`, `Approved`, or `Rejected`.

---

## 🛡️ Admin Portal
- **Global Dashboard**:
  - Animated odometers displaying Global Total Revenue, Total Students, and Total Instructors.
  - Breakdown of enrollments grouped by Category.
- **User Management**:
  - Search any user by name, email, or phone.
  - Instantly **Block/Unblock** users (restricts access).
  - **Demote** Instructors back to Students.
  - Visual badges indicating User Role and Account Status.
- **Course Moderation**:
  - View all courses awaiting approval.
  - Approve courses (makes them visible to students).
  - Reject courses (prevents them from going live).
- **Financial Transactions**:
  - Read-only ledger of all purchases across the entire platform (Date, Student Name, Course, Revenue).

---

## 👑 Super Admin Portal
*Accessible only via direct database upgrade or promotion by another Super Admin.*
- **Expanded Navigation Sidebar**: 
  - Massive, fully collapsible nested sidebar featuring categories like *Course Management, Certificate Management, Website Management, Announcements, System Settings*, and more.
- **Role Assignment Forms**:
  - Form to instantly promote any user to an **Instructor** via email.
  - Form to instantly promote any user to an **Admin** via email.
  - Built-in safety checks prevent accidentally demoting or blocking yourself.

---

## ⚙️ Backend API Routes
### Authentication (`/api/auth`)
- `POST /register`: Creates a new user, hashes password, sets JWT cookie.
- `POST /login`: Verifies credentials, sets JWT cookie.
- `POST /logout`: Clears JWT cookie.
- `GET /me`: Returns current logged-in user profile.
- `PATCH /promote`: (Super Admin only) Promotes user to Admin.
- `PATCH /promote-instructor`: (Admin/Super Admin) Promotes user to Instructor.

### Courses (`/api/courses`)
- `GET /`: Returns all approved courses (Public).
- `GET /:id`: Returns course details.
- `POST /`: (Instructor) Creates a pending course.
- `GET /mine`: (Instructor) Returns courses owned by the user.
- `POST /:courseId/lessons`: (Instructor) Adds a lesson.
- `GET /pending`: (Admin) Returns all unapproved courses.
- `PATCH /:id/approve`: (Admin) Approves a course.
- `PATCH /:id/reject`: (Admin) Rejects a course.

### Enrollments (`/api/enrollments`)
- `POST /:courseId`: Creates an enrollment. Paid courses require manual-payment proof and start in `pending`; free courses are approved immediately.
- `GET /mine`: Returns courses the current student has purchased.

### Admin (`/api/admin`)
- `GET /stats`: Aggregates global financials and user counts.
- `GET /users`: Fetches users with regex search.
- `PATCH /users/:id/block`: Toggles user access.
- `PATCH /users/:id/demote`: Resets user to Student.
- `GET /transactions`: Lists all enrollments globally.
