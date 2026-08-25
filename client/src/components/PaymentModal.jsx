import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import CustomSelect from './CustomSelect';
import notyf from '../utils/notyf';
import { useConfig } from '../context/ConfigContext';
import { Link } from 'react-router-dom';

export default function PaymentModal({ course, courseId, courseTitle, module, onConfirm, onCancel, isEnrolling }) {
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
  const [discountCode, setDiscountCode] = useState('');
  const [discountQuote, setDiscountQuote] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(false);

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

  const applyDiscount = async () => {
    const code = discountCode.trim();
    setDiscountQuote(null);
    if (!code) return;
    setApplyingDiscount(true);
    try {
      const targetId = courseId || course?._id;
      const body = { code };
      if (module) {
        body.moduleId = module._id;
      }
      const res = await api.post(`/enrollments/${targetId}/discount-code`, body);
      setDiscountQuote(res.data);
      setError('');
    } catch {
      setError(t('course_page.payment.invalid_discount', 'Code not valid'));
    } finally { setApplyingDiscount(false); }
  };



  const numericPrice = typeof course.price === 'number'
    ? course.price
    : Number.parseFloat(String(course.price || '').replace(/[^0-9.]/g, '')) || 0;
  const totalAmount = Number(((discountQuote?.finalPrice ?? numericPrice) * 1.01).toFixed(2));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!checkoutTermsAccepted) {
      const msg = t('course_page.payment.terms_required', 'Please acknowledge the payment, cancellation, and refund terms.');
      setError(msg);
      notyf.error(msg);
      return;
    }
    if (totalAmount > 0) {
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
    }

    setIsUploading(true);
    let screenshotUrl = '';
    
    if (totalAmount > 0) {
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
    }

    try {
      await onConfirm({
        transactionId: totalAmount > 0 ? transactionId : 'FREE_DISCOUNT',
        paymentAccount: totalAmount > 0 ? paymentAccount : 'FREE',
        paymentMethod: totalAmount > 0 ? paymentMethod : 'free',
        screenshot: screenshotUrl,
        invoiceId,
        discountCode: discountQuote?.code || '',
        checkoutTermsAccepted: true,
        checkoutTermsVersion: '2026-08-25',
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
    boxSizing: 'border-box',
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
        .payment-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .payment-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="animate-entrance" style={{
        background: 'var(--bg-main)',
        padding: '32px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '550px',
        boxShadow: 'var(--outer-shadow)',
        border: '1px solid var(--border)',
        transform: 'scale(0.8)',
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
          const curr = paymentConfig.currency || t('currency', 'EGP');
          return (
            <div style={{ background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', direction: isRTL ? 'rtl' : 'ltr' }}>
              {courseTitle ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.course', 'Course')}:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{courseTitle}</span>
                  </div>
                  {module && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.module_label', 'Module')}:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{module.title}</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.course', 'Course')}:</span>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.title}</span>
                </div>
              )}
              <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>Discount Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={discountCode} onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setDiscountQuote(null); }} placeholder="SUMMER20" style={{ ...inputStyle, padding: '8px 12px' }} />
                  <button type="button" onClick={applyDiscount} disabled={applyingDiscount || !discountCode.trim()} className="solid-btn" style={{ padding: '0 14px', whiteSpace: 'nowrap', opacity: applyingDiscount || !discountCode.trim() ? .65 : 1, fontSize: '0.85rem' }}>{applyingDiscount ? 'Applying…' : 'Apply'}</button>
                </div>
              </div>
              {discountQuote && <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981' }}><span>Discount ({discountQuote.discountPercentage}%)</span><span>-{discountQuote.discountAmount.toFixed(2)} {curr}</span></div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Code {discountQuote.code} applied</div>
              </>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.instructor', 'Instructor')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{course.instructor?.name || t('course_page.payment.instructor', 'Instructor')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.invoice_id', 'Invoice ID')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{invoiceId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('course_page.payment.price', 'Price')}:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{numericPrice.toFixed(2)} {curr}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Company Fees (1%):</span>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{((discountQuote?.finalPrice ?? numericPrice) * 0.01).toFixed(2)} {curr}</span>
              </div>


              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{t('course_page.payment.total', 'Total')}:</span>
                <span style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>{totalAmount.toFixed(2)} {curr}</span>
              </div>
            </div>
          );
        })()}

        <div style={{ padding: '14px 16px', background: 'rgba(245, 158, 11, 0.1)', border: 'none', boxShadow: 'var(--inner-shadow)', borderRadius: '10px', marginBottom: '24px', color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9rem', direction: isRTL ? 'rtl' : 'ltr', display: totalAmount > 0 ? 'block' : 'none' }}>
          {t('course_page.payment.manual_review_notice', 'Transfer the exact total outside the platform, then submit the receipt below. Access is granted only after an admin verifies the payment.')}
          {paymentConfig.manualPaymentInstructions && <div style={{ marginTop: '8px', fontWeight: 600 }}>{paymentConfig.manualPaymentInstructions}</div>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', direction: isRTL ? 'rtl' : 'ltr' }}>
          {totalAmount > 0 && (
            <div className="payment-form-grid">
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: isRTL ? 'right' : 'left' }}>
                  {t('course_page.payment.transfer_to', 'Transfer To')}
                </label>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-body)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: recipientAccount ? '#10b981' : '#ef4444',
                  fontWeight: '700',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}>
                  {recipientAccount || t('course_page.payment.destination_missing', 'This payment destination is not configured.')}
                </div>
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
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.86rem', lineHeight: 1.45, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={checkoutTermsAccepted} onChange={(e) => setCheckoutTermsAccepted(e.target.checked)} required style={{ marginTop: '3px' }} />
            <span>
              {t('course_page.payment.legal_acknowledgement_prefix', 'I confirm the course price and understand that access is granted after payment review. I have read the ')}
              <Link to="/terms" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent, #f97316)' }}>{t('footer.terms', 'Terms of Service')}</Link>
              {t('course_page.payment.legal_acknowledgement_middle', ' and the ')}
              <Link to="/refunds" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent, #f97316)' }}>{t('footer.refunds', 'Refunds & Cancellations')}</Link>
              {t('course_page.payment.legal_acknowledgement_suffix', '.')}
            </span>
          </label>

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
              disabled={isEnrolling || isUploading || (totalAmount > 0 && !recipientAccount)}
              className="solid-btn"
              style={{ flex: 1, padding: '14px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px', cursor: (isEnrolling || isUploading || (totalAmount > 0 && !recipientAccount)) ? 'not-allowed' : 'pointer', opacity: (isEnrolling || isUploading || (totalAmount > 0 && !recipientAccount)) ? 0.7 : 1 }}
            >
              {(isEnrolling || isUploading) ? t('course_page.payment.submitting', 'Submitting...') : (totalAmount > 0 ? t('course_page.payment.submit_payment', 'Submit Proof for Review') : t('course_page.payment.complete_enrollment', 'Complete Enrollment'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
