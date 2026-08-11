import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import CustomSelect from './CustomSelect';

export default function PaymentModal({ course, onConfirm, onCancel, isEnrolling }) {
  const [transactionId, setTransactionId] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('+20');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInvoiceId(`INV-${Math.floor(Math.random() * 1000000)}`);
  }, []);

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+20')) {
      val = '+20';
    }
    const rest = val.slice(3).replace(/\D/g, '');
    setPaymentAccount('+20' + rest.slice(0, 10));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!paymentMethod || !paymentAccount || !transactionId || !screenshotFile) {
      setError('All fields are required.');
      return;
    }

    if (!/^\+20\d{10}$/.test(paymentAccount)) {
      setError('Phone number must have exactly 10 digits after the +20 code.');
      return;
    }

    setIsUploading(true);
    let screenshotUrl = '';
    try {
      const formData = new FormData();
      formData.append('image', screenshotFile);
      const uploadRes = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      screenshotUrl = uploadRes.data.url;
    } catch (err) {
      console.error('Image upload failed', err);
      setError('Failed to upload screenshot. Please try again.');
      setIsUploading(false);
      return;
    }

    onConfirm({
      transactionId,
      paymentAccount,
      paymentMethod,
      screenshot: screenshotUrl,
      invoiceId,
    });
  };

  if (!course) return null;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: '24px',
    paddingRight: '24px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '50px',
    color: 'var(--text-primary)',
    boxShadow: 'var(--inner-shadow)',
    outline: 'none',
    fontSize: '0.95rem',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <style>{`
        .payment-file-input::file-selector-button {
          background: linear-gradient(90deg, var(--c-orange, #f59e0b), var(--c-yellow, #fef08a));
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 4px 16px;
          margin-right: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }
        .payment-file-input::file-selector-button:hover {
          opacity: 0.9;
        }
      `}</style>
      <div className="animate-entrance" style={{
        background: 'var(--bg-main)',
        padding: '32px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: 'var(--outer-shadow)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Complete Enrollment
          </h2>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>×</button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {(() => {
          const expectedFees = (course.price * 0.01).toFixed(2);
          const totalAmount = (course.price * 1.01).toFixed(2);
          return (
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '28px', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Course:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Instructor:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.instructor?.name || 'Instructor'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Invoice ID:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{invoiceId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Price:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.price} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Expected Fees (1%):</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{expectedFees} EGP</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Total:</span>
                <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>{totalAmount} EGP</span>
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr',
            gap: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Payment Method <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <CustomSelect
                options={[
                  { value: 'Vodafone Cash', label: 'Vodafone Cash' },
                  { value: 'InstaPay', label: 'InstaPay' },
                  { value: 'PayPal', label: 'PayPal' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' }
                ]}
                value={paymentMethod}
                onChange={setPaymentMethod}
                placeholder="Select a payment method"
                triggerStyle={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Phone Number Used <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+201012345678"
                pattern="^\+20\d{10}$"
                title="Please enter a valid Egypt phone number starting with +20 followed by 10 digits"
                maxLength={13}
                value={paymentAccount}
                onChange={handlePhoneChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Transaction ID <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter reference ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Payment Screenshot <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setScreenshotFile(e.target.files[0])}
                className="payment-file-input"
                style={{ ...inputStyle, padding: '8px 24px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{ flex: 1, padding: '14px', borderRadius: '50px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEnrolling || isUploading}
              className="solid-btn"
              style={{ flex: 1, padding: '14px', borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px', cursor: (isEnrolling || isUploading) ? 'not-allowed' : 'pointer', opacity: (isEnrolling || isUploading) ? 0.7 : 1 }}
            >
              {(isEnrolling || isUploading) ? 'Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
