import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const isArabic = document.documentElement.lang === 'ar';

  return (
    <div className="static-page legal-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="static-page-title">{t('static_pages.privacy.title')}</h1>
      <p className="static-page-intro">{isArabic ? 'آخر تحديث: 25 أغسطس 2026. توضح هذه السياسة كيف نتعامل مع بياناتك.' : 'Last updated: August 25, 2026. This policy explains how we handle your data.'}</p>
      <div className="static-page-body">
        {(isArabic ? [
          ['البيانات التي نجمعها', 'قد نجمع الاسم والبريد الإلكتروني وبيانات الملف الأكاديمي، ومعلومات الدورات والتقدم، وبيانات الدعم، وعناوين IP وسجلات الأمان اللازمة لتشغيل الخدمة وحمايتها.'],
          ['كيف نستخدم البيانات', 'نستخدم البيانات لإنشاء الحسابات والتحقق منها، وتقديم الدورات وتتبع التقدم، ومعالجة طلبات التسجيل والدعم، وإرسال رسائل الخدمة، ومنع الاحتيال وتحسين المنصة. لا نبيع بياناتك الشخصية.'],
          ['مشاركة البيانات', 'نشارك الحد الأدنى اللازم مع مزودي الاستضافة والبريد والتخزين السحابي ومقدمي الخدمات الذين يساعدوننا في تشغيل Program، أو عندما يطلب القانون ذلك. قد يظهر اسم المدرب أو بيانات الملف التي تختار نشرها علناً.'],
          ['الاحتفاظ والأمان', 'نحتفظ بالبيانات ما دام الحساب أو الغرض التشغيلي قائماً، ثم نحذفها أو نجهل هويتها عندما يسمح القانون. نستخدم ضوابط أمنية معقولة، لكن لا توجد وسيلة نقل أو تخزين آمنة تماماً.'],
          ['حقوقك واختياراتك', 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذف حسابك، مع مراعاة الاستثناءات القانونية. يمكنك التواصل معنا عبر support@program.com. قد نحتاج إلى التحقق من هويتك قبل تنفيذ الطلب.'],
          ['ملفات الارتباط', 'نستخدم ملفات ارتباط ضرورية للجلسة والأمان، مثل ملفات المصادقة وCSRF. لا نستخدم ملفات ارتباط إعلانية أو تحليلات غير ضرورية وفقاً للنسخة الحالية من الخدمة. إذا أضفنا تقنيات اختيارية، سنحدث هذه السياسة ونطلب الموافقة حيث يلزم.'],
          ['الأطفال والتغييرات', 'الخدمة ليست موجهة للأطفال دون السن الذي يسمح به القانون المحلي باستخدام الخدمات الرقمية دون موافقة ولي الأمر. قد نحدث هذه السياسة، وسنضع تاريخ التحديث أعلاه.'],
          ['التواصل', 'لأسئلة الخصوصية أو طلبات الحقوق، راسل support@program.com أو استخدم صفحة التواصل.'],
        ] : [
          ['Information we collect', 'We may collect your name, email, academic profile details, course and progress data, support messages, IP addresses, and security logs needed to operate and protect the service.'],
          ['How we use information', 'We use information to create and verify accounts, deliver courses and track progress, handle enrollment and support, send service messages, prevent fraud, and improve Program. We do not sell personal information.'],
          ['Sharing information', 'We share only what is needed with hosting, email, cloud storage, and other service providers that help operate Program, or when required by law. Instructor names and profile details may be public when an instructor chooses to publish them.'],
          ['Retention and security', 'We keep information while your account or an operational purpose exists, then delete or de-identify it where permitted. We use reasonable safeguards, but no transmission or storage method is completely secure.'],
          ['Your rights and choices', 'You may request access to, correction of, or deletion of your account data, subject to legal exceptions. Contact support@program.com. We may verify your identity before completing a request.'],
          ['Cookies', 'We use essential cookies for sessions and security, including authentication and CSRF cookies. The current service does not use advertising or non-essential analytics cookies. If optional technologies are added, we will update this policy and request consent where required.'],
          ['Children and changes', 'The service is not directed to children below the age at which local law permits independent use of digital services. We may update this policy and will place the revision date above.'],
          ['Contact', 'For privacy questions or rights requests, email support@program.com or use our Contact page.'],
        ]).map(([heading, text]) => (
          <section className="static-page-section" key={heading}><h2>{heading}</h2><p>{text}</p></section>
        ))}
      </div>
    </div>
  );
}
