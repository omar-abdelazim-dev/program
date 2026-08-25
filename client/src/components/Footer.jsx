import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

const SOCIAL_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  github: 'GitHub',
};

export default function Footer() {
  const { t } = useTranslation();
  const [socialLinks, setSocialLinks] = useState({});

  useEffect(() => {
    api.get('/website/public/content')
      .then((res) => setSocialLinks(res.data?.contact?.socialMediaLinks || {}))
      .catch(() => setSocialLinks({}));
  }, []);

  const activeSocialLinks = Object.entries(socialLinks).filter(([, url]) => url);

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-col">
          <h4>{t('footer.company')}</h4>
          <Link to="/about">{t('footer.about')}</Link>
          <Link to="/register?mode=register&role=instructor">{t('footer.become_instructor')}</Link>
        </div>

        <div className="site-footer-col">
          <h4>{t('footer.support')}</h4>
          <Link to="/contact">{t('footer.contact')}</Link>
          <Link to="/help">{t('footer.help')}</Link>
        </div>

        <div className="site-footer-col">
          <h4>{t('footer.legal')}</h4>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/refunds">{t('footer.refunds', 'Refunds & Cancellations')}</Link>
        </div>

        <div className="site-footer-col">
          <h4>{t('footer.get_app')}</h4>
          <Link to="/mobile-app">{t('footer.mobile_app')}</Link>
        </div>
      </div>

      {activeSocialLinks.length > 0 && (
        <div className="site-footer-social">
          {activeSocialLinks.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" data-tooltip={SOCIAL_LABELS[key] || key}>
              {SOCIAL_LABELS[key] || key}
            </a>
          ))}
        </div>
      )}

      <div className="site-footer-bottom">{t('footer.copyright', { year: new Date().getFullYear() })}</div>
    </footer>
  );
}
