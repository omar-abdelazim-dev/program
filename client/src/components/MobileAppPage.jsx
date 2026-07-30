import { useTranslation } from 'react-i18next';

export default function MobileAppPage() {
  const { t } = useTranslation();
  return (
    <div className="static-page">
      <h1 className="static-page-title">{t('static_pages.mobile.title')}</h1>
      <div className="static-page-coming-soon">
        <p>{t('static_pages.mobile.coming_soon')}</p>
        <p>{t('static_pages.mobile.works_in_browser')}</p>
      </div>
    </div>
  );
}
