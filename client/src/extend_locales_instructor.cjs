const fs = require('fs');

const enPath = 'locales/en.json';
const arPath = 'locales/ar.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

en.instructor = {
  loading: "Loading Instructor Portal...",
  redirecting: "Redirecting...",
  nav: {
    dashboard: "Dashboard",
    curriculum: "Curriculum",
    engagement: "Engagement",
    reviews: "Reviews",
    analytics: "Analytics",
    financials: "Financials",
    settings: "Settings"
  },
  header: {
    title: "Instructor Portal",
    subtitle: "Welcome back, manage your courses and students.",
    search_placeholder: "Search courses or students...",
    profile: "Instructor Profile",
    logout: "Log Out"
  },
  dashboard: {
    overview: "Overview",
    total_courses: "Total Courses",
    active_students: "Active Students",
    avg_rating: "Avg Rating",
    total_earnings: "Total Earnings",
    my_courses: "My Courses",
    create_course: "+ Create Course",
    table: {
      course: "Course",
      category: "Category",
      price: "Price",
      status: "Status",
      actions: "Actions"
    },
    status: {
      approved: "Approved",
      pending: "Pending",
      rejected: "Rejected"
    },
    actions: {
      edit: "Edit",
      delete: "Delete",
      manage_lessons: "Manage Lessons"
    }
  },
  create_course: {
    title: "Create New Course",
    edit_title: "Edit Course",
    form: {
      title: "Title",
      description: "Description",
      price: "Price",
      category: "Category",
      thumbnail: "Thumbnail Image"
    },
    cancel: "Cancel",
    save: "Save Course",
    saving: "Saving..."
  },
  curriculum: {
    title: "Curriculum Builder",
    subtitle: "Manage your lessons and course content.",
    select_course: "-- Select a Course --",
    no_course_selected: "Please select a course from the dropdown above to manage its curriculum.",
    lessons_for: "Lessons for",
    add_lesson: "+ Add Lesson",
    no_lessons: "No lessons added yet. Click 'Add Lesson' to get started.",
    upload_video: "Upload Video",
    upload_attachment: "Upload Attachment"
  },
  analytics: {
    title: "Analytics Dashboard",
    subtitle: "Track your performance and growth.",
    total_revenue: "Total Revenue",
    total_enrollments: "Total Enrollments",
    course_completion_rate: "Course Completion Rate",
    active_students: "Active Students",
    revenue_over_time: "Revenue Over Time",
    enrollments_by_course: "Enrollments by Course",
    no_data: "Not enough data to display analytics."
  },
  engagement: {
    title: "Student Engagement",
    subtitle: "Interact with your students and answer questions.",
    qna: "Q&A",
    announcements: "Announcements",
    no_questions: "No questions from students yet."
  },
  financials: {
    title: "Financials",
    subtitle: "Manage your payouts and revenue.",
    available_balance: "Available Balance",
    lifetime_earnings: "Lifetime Earnings",
    request_payout: "Request Payout",
    payout_history: "Payout History",
    no_history: "No payout history available."
  }
};

ar.instructor = {
  loading: "جاري تحميل بوابة المدرب...",
  redirecting: "جاري التحويل...",
  nav: {
    dashboard: "لوحة القيادة",
    curriculum: "المنهج الدراسي",
    engagement: "التفاعل",
    reviews: "التقييمات",
    analytics: "التحليلات",
    financials: "المالية",
    settings: "الإعدادات"
  },
  header: {
    title: "بوابة المدرب",
    subtitle: "مرحباً بعودتك، قم بإدارة دوراتك وطلابك.",
    search_placeholder: "ابحث عن الدورات أو الطلاب...",
    profile: "الملف الشخصي",
    logout: "تسجيل الخروج"
  },
  dashboard: {
    overview: "نظرة عامة",
    total_courses: "إجمالي الدورات",
    active_students: "الطلاب النشطين",
    avg_rating: "متوسط التقييم",
    total_earnings: "إجمالي الأرباح",
    my_courses: "دوراتي",
    create_course: "+ إنشاء دورة",
    table: {
      course: "الدورة",
      category: "الفئة",
      price: "السعر",
      status: "الحالة",
      actions: "إجراءات"
    },
    status: {
      approved: "معتمد",
      pending: "قيد الانتظار",
      rejected: "مرفوض"
    },
    actions: {
      edit: "تعديل",
      delete: "حذف",
      manage_lessons: "إدارة الدروس"
    }
  },
  create_course: {
    title: "إنشاء دورة جديدة",
    edit_title: "تعديل الدورة",
    form: {
      title: "العنوان",
      description: "الوصف",
      price: "السعر",
      category: "الفئة",
      thumbnail: "صورة مصغرة"
    },
    cancel: "إلغاء",
    save: "حفظ الدورة",
    saving: "جاري الحفظ..."
  },
  curriculum: {
    title: "منشئ المنهج",
    subtitle: "إدارة دروسك ومحتوى الدورة.",
    select_course: "-- اختر دورة --",
    no_course_selected: "يرجى اختيار دورة من القائمة أعلاه لإدارة منهجها.",
    lessons_for: "دروس لدورة",
    add_lesson: "+ إضافة درس",
    no_lessons: "لم يتم إضافة دروس بعد. انقر على 'إضافة درس' للبدء.",
    upload_video: "رفع فيديو",
    upload_attachment: "رفع مرفق"
  },
  analytics: {
    title: "لوحة التحليلات",
    subtitle: "تتبع أدائك ونموك.",
    total_revenue: "إجمالي الإيرادات",
    total_enrollments: "إجمالي التسجيلات",
    course_completion_rate: "معدل إكمال الدورة",
    active_students: "الطلاب النشطين",
    revenue_over_time: "الإيرادات بمرور الوقت",
    enrollments_by_course: "التسجيلات حسب الدورة",
    no_data: "لا توجد بيانات كافية لعرض التحليلات."
  },
  engagement: {
    title: "تفاعل الطلاب",
    subtitle: "تفاعل مع طلابك وأجب على أسئلتهم.",
    qna: "الأسئلة والأجوبة",
    announcements: "الإعلانات",
    no_questions: "لا توجد أسئلة من الطلاب بعد."
  },
  financials: {
    title: "المالية",
    subtitle: "إدارة المدفوعات والإيرادات.",
    available_balance: "الرصيد المتاح",
    lifetime_earnings: "الأرباح مدى الحياة",
    request_payout: "طلب دفع",
    payout_history: "تاريخ المدفوعات",
    no_history: "لا يوجد تاريخ للمدفوعات متاح."
  }
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));
console.log('Instructor translations added successfully!');
