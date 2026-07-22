import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ContactPage() {
  const [contact, setContact] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/website/public/content')
      .then((res) => setContact(res.data?.contact || null))
      .catch(() => setContact(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="static-page">
      <h1 className="static-page-title">Contact Us</h1>

      {isLoading ? (
        <div className="static-page-skeleton">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '70%' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '50%' }} />
        </div>
      ) : (
        <div className="static-page-grid-two">
          <div className="static-page-card">
            <h3>Support</h3>
            <p>
              <a href={`mailto:${contact?.supportEmail || 'support@program.com'}`}>
                {contact?.supportEmail || 'support@program.com'}
              </a>
            </p>
          </div>

          <div className="static-page-card">
            <h3>Business Inquiries</h3>
            <p>
              <a href={`mailto:${contact?.businessEmail || 'business@program.com'}`}>
                {contact?.businessEmail || 'business@program.com'}
              </a>
            </p>
          </div>

          {contact?.phoneNumbers?.length > 0 && (
            <div className="static-page-card">
              <h3>Phone</h3>
              {contact.phoneNumbers.map((p, i) => (
                <p key={i}>{p.label ? `${p.label}: ` : ''}{p.number}</p>
              ))}
            </div>
          )}

          {contact?.address && (
            <div className="static-page-card">
              <h3>Address</h3>
              <p>{contact.address}</p>
            </div>
          )}

          {contact?.businessHours && (
            <div className="static-page-card">
              <h3>Business Hours</h3>
              <p>{contact.businessHours}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
