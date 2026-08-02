const fs = require('fs');
const enPath = 'locales/en.json';
const arPath = 'locales/ar.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

en.course_page = {
  loading: "Loading course details...",
  fetch_error: "Failed to fetch course",
  enroll_error: "Failed to enroll",
  back_dashboard: "Back to Dashboard",
  back_explore: "Back to Explore",
  instructor_label: "Instructor",
  instructor_fallback: "Instructor",
  syllabus: "Course Syllabus",
  lessons_title: "Lessons",
  lesson_singular: "lesson",
  lesson_plural: "lessons",
  no_lessons: "No lessons have been added to this course yet.",
  free: "Free",
  currency: "EGP",
  go_to_course: "Go to Course",
  enrolling: "Enrolling...",
  enroll_now: "Enroll Now",
  added_to_cart: "Added to Cart ✓",
  add_to_cart: "Add to Cart"
};

ar.course_page = {
  loading: "جاري تحميل تفاصيل الدورة...",
  fetch_error: "فشل في جلب الدورة",
  enroll_error: "فشل في التسجيل",
  back_dashboard: "العودة إلى لوحة القيادة",
  back_explore: "العودة إلى الاستكشاف",
  instructor_label: "المدرب",
  instructor_fallback: "المدرب",
  syllabus: "منهج الدورة",
  lessons_title: "الدروس",
  lesson_singular: "درس",
  lesson_plural: "دروس",
  no_lessons: "لم يتم إضافة دروس لهذه الدورة بعد.",
  free: "مجاناً",
  currency: "ج.م",
  go_to_course: "الذهاب إلى الدورة",
  enrolling: "جاري التسجيل...",
  enroll_now: "سجل الآن",
  added_to_cart: "تمت الإضافة للسلة ✓",
  add_to_cart: "أضف للسلة"
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));
console.log('Done extending translations!');
