import { useState, useEffect } from 'react';
import api from '../api/axios';

import { useTranslation } from 'react-i18next';
export default function HelpPage() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState([]);
  const [supportEmail, setSupportEmail] = useState('support@program.com');
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/website/public/faqs').catch(() => ({ data: [] })),
      api.get('/website/public/content').catch(() => null),
    ]).then(([faqRes, contentRes]) => {
      setFaqs(faqRes.data || []);
      if (contentRes?.data?.contact?.supportEmail) {
        setSupportEmail(contentRes.data.contact.supportEmail);
      }
    }).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="static-page">
      <h1 className="static-page-title">{t('static_pages.help.title')}</h1>
      <p className="static-page-intro">
        {t('static_pages.help.intro')} <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>

      {isLoading ? (
        <div className="static-page-skeleton">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '60px' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '60px' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '60px' }} />
        </div>
      ) : faqs.length === 0 ? (
        <div className="static-page-empty">{t('static_pages.help.empty_faqs')}</div>
      ) : (
        <div className="static-page-faq-list">
          {faqs.map((f) => (
            <div key={f._id} className={`static-page-faq-item ${openId === f._id ? 'open' : ''}`}>
              <button
                type="button"
                className="static-page-faq-question"
                onClick={() => setOpenId(openId === f._id ? null : f._id)}
              >
                <span>{f.question}</span>
                <span className="static-page-faq-chevron">▾</span>
              </button>
              {openId === f._id && <div className="static-page-faq-answer">{f.answer}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
