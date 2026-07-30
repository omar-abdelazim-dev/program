import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [contact, setContact] = useState(null);
  const isRTL = i18n.dir() === 'rtl';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/website/public/content')
      .then((res) => setContact(res.data?.contact || null))
      .catch(() => setContact(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="static-page">
      <h1 className="static-page-title">{t('static_pages.contact.title')}</h1>

      {isLoading ? (
        <div className="static-page-skeleton">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '70%' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '50%' }} />
        </div>
      ) : (
        <div className="static-page-grid-two">
          <div className="static-page-card">
            <h3>{t('static_pages.contact.support')}</h3>
            <p>
              <a href={`mailto:${contact?.supportEmail || 'support@program.com'}`}>
                {contact?.supportEmail || 'support@program.com'}
              </a>
            </p>
          </div>

          <div className="static-page-card">
            <h3>{t('static_pages.contact.business')}</h3>
            <p>
              <a href={`mailto:${contact?.businessEmail || 'business@program.com'}`}>
                {contact?.businessEmail || 'business@program.com'}
              </a>
            </p>
          </div>

          {contact?.phoneNumbers?.length > 0 && (
            <div className="static-page-card">
              <h3>{t('static_pages.contact.phone')}</h3>
              {contact.phoneNumbers.map((p, i) => (
                <p key={i}>{p.label ? `${p.label}: ` : ''}{p.number}</p>
              ))}
            </div>
          )}

          {contact?.address && (
            <div className="static-page-card">
              <h3>{t('static_pages.contact.address')}</h3>
              <p>{isRTL && contact.addressAr ? contact.addressAr : contact.address}</p>
            </div>
          )}

          {contact?.businessHours && (
            <div className="static-page-card">
              <h3>{t('static_pages.contact.hours')}</h3>
              <p>{isRTL && contact.businessHoursAr ? contact.businessHoursAr : contact.businessHours}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
