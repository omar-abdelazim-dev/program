import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/register?mode=register&role=instructor">Become an Instructor</Link>
        </div>

        <div className="site-footer-col">
          <h4>Support</h4>
          <Link to="/contact">Contact Us</Link>
          <Link to="/help">Help &amp; Support</Link>
        </div>

        <div className="site-footer-col">
          <h4>Legal</h4>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </div>

        <div className="site-footer-col">
          <h4>Get the App</h4>
          <Link to="/mobile-app">Mobile App</Link>
        </div>
      </div>

      {activeSocialLinks.length > 0 && (
        <div className="site-footer-social">
          {activeSocialLinks.map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" title={SOCIAL_LABELS[key] || key}>
              {SOCIAL_LABELS[key] || key}
            </a>
          ))}
        </div>
      )}

      <div className="site-footer-bottom">© {new Date().getFullYear()} Program. All rights reserved.</div>
    </footer>
  );
}
