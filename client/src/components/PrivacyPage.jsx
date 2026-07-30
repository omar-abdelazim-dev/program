import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="static-page">
      <h1 className="static-page-title">{t('static_pages.privacy.title')}</h1>
      <div className="static-page-coming-soon">
        <p>{t('static_pages.privacy.coming_soon')}</p>
        <p>{t('static_pages.privacy.contact_support')}</p>
      </div>
    </div>
  );
}
