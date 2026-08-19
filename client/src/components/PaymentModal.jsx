import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import CustomSelect from './CustomSelect';
import notyf from '../utils/notyf';
import { useConfig } from '../context/ConfigContext';

export default function PaymentModal({ course, onConfirm, onCancel, isEnrolling }) {
  const { t, i18n } = useTranslation();
  const { config } = useConfig();
  const isRTL = i18n.language === 'ar';

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

  const paymentConfig = config?.payment || {};
  const paymentOptions = [
    ...(paymentConfig.mobileWalletEnabled !== false
      ? [{ value: 'mobile_wallet', label: t('course_page.payment.mobile_wallet', 'Mobile Wallet') }]
      : []),
    ...(paymentConfig.instaPayEnabled !== false
      ? [{ value: 'instapay', label: 'InstaPay' }]
      : []),
  ];
  const recipientAccount = paymentMethod === 'mobile_wallet'
    ? paymentConfig.mobileWalletNumber
    : paymentMethod === 'instapay'
      ? paymentConfig.instaPayAccount
      : '';

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    setPaymentAccount(method === 'mobile_wallet' ? '+20' : '');
  };

  const handleAccountChange = (e) => {
    if (paymentMethod !== 'mobile_wallet') {
      setPaymentAccount(e.target.value.slice(0, 120));
      return;
    }
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
      const msg = t('course_page.payment.all_fields_required', 'All fields are required.');
      setError(msg);
      notyf.error(msg);
      return;
    }

    if (paymentMethod === 'mobile_wallet' && !/^\+20\d{10}$/.test(paymentAccount)) {
      const msg = t('course_page.payment.invalid_phone', 'Phone number must have exactly 10 digits after the +20 code.');
      setError(msg);
      notyf.error(msg);
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
      const msg = t('course_page.payment.upload_failed', 'Failed to upload screenshot. Please try again.');
      setError(msg);
      notyf.error(msg);
      setIsUploading(false);
      return;
    }

    try {
      await onConfirm({
        transactionId,
        paymentAccount,
        paymentMethod,
        screenshot: screenshotUrl,
        invoiceId,
      });
    } finally {
      setIsUploading(false);
    }
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
    borderRadius: '12px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', direction: isRTL ? 'rtl' : 'ltr' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('course_page.payment.complete_enrollment', 'Complete Enrollment')}
          </h2>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s'
          }} onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>×</button>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: '500', direction: isRTL ? 'rtl' : 'ltr' }}>
            {error}
          </div>
        )}

        {(() => {
          const numericPrice = typeof course.price === 'number'
            ? course.price
            : Number.parseFloat(String(course.price || '').replace(/[^0-9.]/g, '')) || 0;
          const totalAmount = numericPrice.toFixed(2);
          const curr = paymentConfig.currency || t('currency', 'EGP');
          return (
            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', marginBottom: '28px', fontSize: '0.95rem', direction: isRTL ? 'rtl' : 'ltr' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.course', 'Course')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.instructor', 'Instructor')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.instructor?.name || t('course_page.payment.instructor', 'Instructor')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.invoice_id', 'Invoice ID')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{invoiceId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.price', 'Price')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{numericPrice.toFixed(2)} {curr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{t('course_page.payment.total', 'Total')}:</span>
                <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>{totalAmount} {curr}</span>
              </div>
            </div>
          );
        })()}

        <div style={{ padding: '14px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', marginBottom: '24px', color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9rem', direction: isRTL ? 'rtl' : 'ltr' }}>
          {t('course_page.payment.manual_review_notice', 'Transfer the exact total outside the platform, then submit the receipt below. Access is granted only after an admin verifies the payment.')}
          {paymentConfig.manualPaymentInstructions && <div style={{ marginTop: '8px', fontWeight: 600 }}>{paymentConfig.manualPaymentInstructions}</div>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', direction: isRTL ? 'rtl' : 'ltr' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr',
            gap: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: isRTL ? 'right' : 'left' }}>
                {t('course_page.payment.payment_method', 'Payment Method')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <CustomSelect
                options={paymentOptions}
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                placeholder={t('course_page.payment.select_payment_method', 'Select a payment method')}
                triggerStyle={inputStyle}
              />
            </div>
            {paymentMethod && (
              <div style={{ gridColumn: '1 / -1', padding: '12px 16px', borderRadius: '10px', background: recipientAccount ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: recipientAccount ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {recipientAccount
                  ? `${t('course_page.payment.transfer_to', 'Transfer to')}: ${recipientAccount}`
                  : t('course_page.payment.destination_missing', 'This payment destination is not configured. Please contact support before transferring funds.')}
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: isRTL ? 'right' : 'left' }}>
                {paymentMethod === 'instapay'
                  ? t('course_page.payment.sender_account', 'Sender account or IPA')
                  : t('course_page.payment.phone_number_used', 'Phone Number Used')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                placeholder={paymentMethod === 'instapay' ? 'name@instapay' : '+201012345678'}
                maxLength={paymentMethod === 'instapay' ? 120 : 13}
                value={paymentAccount}
                onChange={handleAccountChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: isRTL ? 'right' : 'left' }}>
                {t('course_page.payment.transaction_id', 'Transaction ID')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder={t('course_page.payment.enter_reference_id', 'Enter reference ID')}
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: isRTL ? 'right' : 'left' }}>
                {t('course_page.payment.payment_screenshot', 'Payment Screenshot')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files[0])}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 }}
                />
                <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
                  <div style={{
                    background: 'linear-gradient(90deg, var(--c-orange, #f59e0b), var(--c-yellow, #fef08a))',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '6px 16px',
                    marginInlineEnd: '12px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}>
                    {t('course_page.payment.choose_file', 'Choose File')}
                  </div>
                  <span style={{ color: screenshotFile ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {screenshotFile ? screenshotFile.name : t('course_page.payment.no_file_chosen', 'No file chosen')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', color: 'var(--text-primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--bg-main)'}
            >
              {t('course_page.payment.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isEnrolling || isUploading || !recipientAccount}
              className="solid-btn"
              style={{ flex: 1, padding: '14px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px', cursor: (isEnrolling || isUploading || !recipientAccount) ? 'not-allowed' : 'pointer', opacity: (isEnrolling || isUploading || !recipientAccount) ? 0.7 : 1 }}
            >
              {(isEnrolling || isUploading) ? t('course_page.payment.submitting', 'Submitting...') : t('course_page.payment.submit_payment', 'Submit Proof for Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
