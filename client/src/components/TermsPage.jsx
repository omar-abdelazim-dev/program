import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();
  const isArabic = document.documentElement.lang === 'ar';

  return (
    <div className="static-page legal-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <h1 className="static-page-title">{t('static_pages.terms.title')}</h1>
      <p className="static-page-intro">{isArabic ? 'آخر تحديث: 25 أغسطس 2026. باستخدامك لمنصة Program، فإنك توافق على هذه الشروط.' : 'Last updated: August 25, 2026. By using Program, you agree to these Terms of Service.'}</p>
      <div className="static-page-body">
        {(isArabic ? [
          ['الخدمة', 'Program منصة تعليمية تتيح للطلاب الوصول إلى الدورات، وتتيح للمدربين نشر المحتوى. قد تتغير الميزات أو تتوقف مؤقتاً للصيانة.'],
          ['حسابك', 'يجب تقديم معلومات صحيحة والحفاظ على سرية بيانات الدخول. أنت مسؤول عن النشاط الذي يتم من خلال حسابك، ويجوز لنا تعليق الحساب عند إساءة الاستخدام أو مخالفة هذه الشروط.'],
          ['محتوى الدورات', 'يحتفظ المدربون أو أصحاب الحقوق بملكية محتواهم. تحصل على ترخيص شخصي غير قابل للتحويل لمشاهدة المحتوى عبر المنصة، ولا يجوز نسخ المحتوى أو إعادة بيعه أو مشاركته أو استخدامه لتدريب أنظمة أخرى دون إذن.'],
          ['سلوك المستخدم', 'يُحظر الاحتيال، وانتهاك حقوق الآخرين، ورفع برمجيات ضارة، والتحايل على ضوابط الوصول، ونشر محتوى غير قانوني أو مسيء. أبلغنا عن الانتهاكات عبر صفحة التواصل.'],
          ['المدفوعات والاسترداد', 'أي سعر أو طريقة دفع أو سياسة استرداد خاصة بدورة تُعرض قبل التسجيل وتخضع للقانون الواجب التطبيق. لا نقدم ضماناً لنتيجة تعليمية أو وظيفية محددة. احتفظ بإثبات الدفع وتواصل معنا بشأن المشكلات في أقرب وقت.'],
          ['إخلاء المسؤولية والمسؤولية', 'تُقدم المنصة كما هي وبحسب التوافر. إلى الحد الذي يسمح به القانون، لا نتحمل مسؤولية الخسائر غير المباشرة أو فقدان البيانات الناتج عن استخدام الخدمة. لا يحد ذلك من الحقوق التي لا يجوز استبعادها قانوناً.'],
          ['التعديلات وإنهاء الاستخدام', 'قد نحدّث هذه الشروط بإشعار مناسب. استمرارك في استخدام الخدمة بعد التحديث يعني قبول النسخة الجديدة. يمكنك التوقف عن استخدام الخدمة، ويجوز لنا إنهاء الوصول عند الضرورة.'],
          ['التواصل', 'للأسئلة أو الشكاوى القانونية، تواصل معنا عبر support@program.com أو صفحة التواصل.'],
        ] : [
          ['The service', 'Program is an educational platform where students access courses and instructors publish content. Features may change and the service may be unavailable for maintenance.'],
          ['Your account', 'Provide accurate information and keep your login details confidential. You are responsible for activity through your account. We may suspend accounts for misuse or violations of these Terms.'],
          ['Course content', 'Instructors or other rights holders retain ownership of their content. You receive a personal, non-transferable license to view it through the platform. Do not copy, resell, share, or use content to train other systems without permission.'],
          ['Acceptable use', 'Do not commit fraud, infringe rights, upload malware, bypass access controls, or publish unlawful or abusive material. Report violations through our Contact page.'],
          ['Payments and refunds', 'Before submitting payment proof, you will see the course price, payment method, invoice ID, and that access is subject to manual review. Cancellation and refund requests are handled under our Refund & Cancellation Policy and applicable law. We do not promise a particular educational or employment outcome.'],
          ['Disclaimers and liability', 'The platform is provided as available. To the extent permitted by law, we are not liable for indirect losses or data loss arising from use of the service. This does not limit rights that cannot legally be excluded.'],
          ['Changes and termination', 'We may update these Terms with appropriate notice. Continued use after an update means you accept the revised Terms. You may stop using the service, and we may end access when necessary.'],
          ['Contact', 'For legal questions or complaints, email support@program.com or use our Contact page.'],
        ]).map(([heading, text]) => (
          <section className="static-page-section" key={heading}><h2>{heading}</h2><p>{text}</p></section>
        ))}
      </div>
    </div>
  );
}
