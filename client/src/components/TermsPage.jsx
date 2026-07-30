import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="static-page">
      <h1 className="static-page-title">{t('static_pages.terms.title')}</h1>
      <div className="static-page-coming-soon">
        <p>{t('static_pages.terms.coming_soon')}</p>
        <p>{t('static_pages.terms.contact_support')}</p>
      </div>
    </div>
  );
}
