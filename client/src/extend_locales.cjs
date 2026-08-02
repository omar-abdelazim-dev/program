const fs = require('fs');
const enPath = 'locales/en.json';
const arPath = 'locales/ar.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

en.static_pages.help = {
  ...en.static_pages.help,
  intro: "Have a question? Check the FAQs below, or reach us directly at",
  empty_faqs: "No FAQs published yet — email us and we'll help directly."
};

en.static_pages.terms = {
  ...en.static_pages.terms,
  coming_soon: "Our Terms of Service are being finalized and will be published here soon.",
  contact_support: "In the meantime, questions can be sent to our support team via the Contact page."
};

en.static_pages.privacy = {
  ...en.static_pages.privacy,
  coming_soon: "Our Privacy Policy is being finalized and will be published here soon.",
  contact_support: "In the meantime, questions can be sent to our support team via the Contact page."
};

en.static_pages.mobile = {
  ...en.static_pages.mobile,
  coming_soon: "We're working on native mobile apps for Program. Coming soon.",
  works_in_browser: "For now, Program works great in your mobile browser."
};

ar.static_pages.help = {
  ...ar.static_pages.help,
  intro: "لديك سؤال؟ تحقق من الأسئلة الشائعة أدناه، أو اتصل بنا مباشرة على",
  empty_faqs: "لم يتم نشر أسئلة شائعة بعد — راسلنا عبر البريد الإلكتروني وسنساعدك مباشرة."
};

ar.static_pages.terms = {
  ...ar.static_pages.terms,
  coming_soon: "يتم وضع اللمسات الأخيرة على شروط الخدمة الخاصة بنا وسيتم نشرها هنا قريباً.",
  contact_support: "في غضون ذلك، يمكن إرسال الأسئلة إلى فريق الدعم الخاص بنا عبر صفحة اتصل بنا."
};

ar.static_pages.privacy = {
  ...ar.static_pages.privacy,
  coming_soon: "يتم وضع اللمسات الأخيرة على سياسة الخصوصية الخاصة بنا وسيتم نشرها هنا قريباً.",
  contact_support: "في غضون ذلك، يمكن إرسال الأسئلة إلى فريق الدعم الخاص بنا عبر صفحة اتصل بنا."
};

ar.static_pages.mobile = {
  ...ar.static_pages.mobile,
  coming_soon: "نحن نعمل على تطبيقات الهواتف الذكية الخاصة بـ Program. قريباً.",
  works_in_browser: "في الوقت الحالي، يعمل Program بشكل رائع في متصفح هاتفك المحمول."
};

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2));
console.log('Done extending translations!');
