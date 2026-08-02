const fs = require('fs');
const enPath = 'locales/en.json';
const arPath = 'locales/ar.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

en.static_pages = {
  about: {
    title: "About Us",
    empty: "This page hasn't been filled in yet — check back soon.",
    story: "Our Story",
    mission: "Mission",
    vision: "Vision",
    values: "Our Values",
    journey: "Our Journey",
    team: "Meet the Team"
  },
  contact: {
    title: "Contact Us",
    support: "Support",
    business: "Business Inquiries",
    phone: "Phone",
    address: "Address",
    hours: "Business Hours"
  },
  help: {
    title: "Help & Support"
  },
  terms: {
    title: "Terms of Service"
  },
  privacy: {
    title: "Privacy Policy"
  },
  mobile: {
    title: "Mobile App"
  }
};

ar.static_pages = {
  about: {
    title: "معلومات عنا",
    empty: "لم يتم ملء هذه الصفحة بعد — تحقق مرة أخرى قريباً.",
    story: "قصتنا",
    mission: "مهمتنا",
    vision: "رؤيتنا",
    values: "قيمنا",
    journey: "رحلتنا",
    team: "فريق العمل"
  },
  contact: {
    title: "اتصل بنا",
    support: "الدعم",
    business: "استفسارات الأعمال",
    phone: "الهاتف",
    address: "العنوان",
    hours: "ساعات العمل"
  },
  help: {
    title: "المساعدة والدعم"
  },
  terms: {
    title: "شروط الخدمة"
  },
  privacy: {
    title: "سياسة الخصوصية"
  },
  mobile: {
    title: "تطبيق الهاتف"
  }
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));
console.log('Done!');
