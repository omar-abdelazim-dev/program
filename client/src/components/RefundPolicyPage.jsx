import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function RefundPolicyPage() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const content = isArabic ? [
    ['الإلغاء قبل الموافقة', 'يمكنك طلب إلغاء طلب التسجيل المعلّق قبل منحك الوصول إلى المحتوى. تواصل مع الدعم موضحاً رقم الفاتورة واسم الدورة.'],
    ['طلبات الاسترداد', 'تُراجع طلبات الاسترداد بصورة فردية وفقاً للقانون الواجب التطبيق ومعلومات المعاملة المعروضة لك قبل الدفع. لا تؤثر هذه السياسة في أي حقوق لا يمكن استبعادها قانوناً.'],
    ['طريقة التقديم والمعالجة', 'أرسل الطلب من البريد المرتبط بحسابك إلى البريد الموضح في صفحة التواصل، وأرفق رقم الفاتورة وإثبات الدفع. قد نطلب معلومات إضافية للتحقق من الطلب.'],
    ['موعد الوصول', 'لا يُمنح الوصول إلى الدورات المدفوعة إلا بعد مراجعة إثبات التحويل والموافقة عليه.'],
  ] : [
    ['Cancellation before approval', 'You may ask to cancel a pending enrollment before you receive access to course content. Contact support with the invoice ID and course name.'],
    ['Refund requests', 'We review refund requests individually under applicable law and the transaction information shown before payment. This policy does not remove rights that cannot lawfully be excluded.'],
    ['How to request a review', 'Send the request from the email associated with your account to the contact address on the Contact page, including your invoice ID and payment proof. We may request further information to verify the request.'],
    ['When access begins', 'Paid-course access is granted only after we review and approve the manual-transfer proof.'],
  ];

  return <div className="static-page legal-page" dir={isArabic ? 'rtl' : 'ltr'}>
    <h1 className="static-page-title">{isArabic ? 'سياسة الإلغاء والاسترداد' : 'Cancellation & Refund Policy'}</h1>
    <p className="static-page-intro">{isArabic ? 'آخر تحديث: 25 أغسطس 2026.' : 'Last updated: August 25, 2026.'}</p>
    <div className="static-page-body">
      {content.map(([heading, text]) => <section className="static-page-section" key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
      <section className="static-page-section"><p><Link to="/contact">{isArabic ? 'صفحة التواصل' : 'Contact page'}</Link></p></section>
    </div>
  </div>;
}
