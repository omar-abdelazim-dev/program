import notyf from '../utils/notyf';
import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import Spinner from './Spinner';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import PayoutOtpVerification from './PayoutOtpVerification';


export default function InstructorFinancialsTab({ user }) {
  const { t, i18n } = useTranslation();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [walletNumber, setWalletNumber] = useState(user?.phone || '');
  const [instapayAccount, setInstapayAccount] = useState('');
  const [payoutEmail, setPayoutEmail] = useState(user?.email || '');
  const [isWalletFocused, setIsWalletFocused] = useState(false);
  const [isPayoutEmailFocused, setIsPayoutEmailFocused] = useState(false);
  const [createdPayoutId, setCreatedPayoutId] = useState(null);
  const [payoutRequestedAmount, setPayoutRequestedAmount] = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceCode, setInvoiceCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [selectedTxForDetails, setSelectedTxForDetails] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const visibleTransactions = transactions.filter(tx => tx.type === 'course_sale' || ['otp_verified', 'approved', 'processing', 'cleared', 'paid', 'rejected', 'failed'].includes(tx.status));
  const totalPages = Math.ceil(visibleTransactions.length / itemsPerPage) || 1;
  const currentTransactions = visibleTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (showPayoutModal) {
      const code = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setInvoiceCode(code);
    }
  }, [showPayoutModal]);


  const fetchFinancials = async () => {
    try {
      const res = await api.get('/financials');
      setAvailableBalance(res.data.availableBalance || 0);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error(err);
      notyf.error(t('instructor.notyf.load_financials_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const isWalletMethod = ['vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_cash'].includes(paymentMethod);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!paymentMethod) return;
    if (availableBalance < 100) {
      notyf.error('Minimum payout amount is EGP 100');
      return;
    }
    if (isWalletMethod && (!walletNumber || !/^\d{11}$/.test(walletNumber))) {
      notyf.error('Mobile wallet phone number must be exactly 11 digits');
      return;
    }
    if (paymentMethod === 'instapay' && !instapayAccount) {
      notyf.error(t('instructor.notyf.instapay_required'));
      return;
    }
    
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
    const cleanEmail = payoutEmail.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      notyf.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/financials/payout', {
        method: paymentMethod,
        payoutDetails: isWalletMethod ? walletNumber : instapayAccount,
        payoutEmail,
        referenceId: invoiceCode
      });
      setCreatedPayoutId(res.data.transaction._id);
      setPayoutRequestedAmount(availableBalance);
      notyf.success('Payout initiated. Please verify your email.');
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || t('instructor.notyf.payout_failed', 'Failed to request payout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    { value: 'vodafone_cash', label: 'Vodafone Cash' },
    { value: 'orange_cash', label: 'Orange Cash' },
    { value: 'etisalat_cash', label: 'Etisalat Cash' },
    { value: 'we_cash', label: 'WE Cash' },
    { value: 'instapay', label: 'InstaPay' }
  ];

  const lastPayoutTx = transactions.find(t => t.type === 'payout_request');
  let isPayoutDisabled = availableBalance < 100;
  let payoutDisabledReason = '';

  if (lastPayoutTx) {
    if (['otp_verified', 'approved', 'processing', 'pending'].includes(lastPayoutTx.status)) {
      isPayoutDisabled = true;
      payoutDisabledReason = t('instructor.financials.payout_processing', 'Payout Processing');
    } else if (['cleared', 'paid'].includes(lastPayoutTx.status)) {
      const approvalDate = lastPayoutTx.updatedAt || lastPayoutTx.approvedAt || lastPayoutTx.createdAt;
      const cooldownEnds = new Date(new Date(approvalDate).getTime() + 7 * 24 * 60 * 60 * 1000);
      const now = new Date();
      if (now < cooldownEnds) {
        isPayoutDisabled = true;
        const diff = cooldownEnds - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        payoutDisabledReason = `Available in ${d}d ${h}h`;
      }
    }
  }
      
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => setOtpCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);


  return (
    <div className="animate-entrance" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Current Balance Card */}
      <div className="stat-card glass-card no-border" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)' }}>
        <div>
          {/* Translated Available Balance */}
          <div className="stat-label" style={{ color: 'var(--c-sub)', marginBottom: '8px', fontSize: '1rem' }}>{t('instructor.financials.available_balance')}</div>
          <div className="stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-h)', fontWeight: 800 }}>EGP {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <button 
          className="glass-btn primary-action" 
          disabled={isPayoutDisabled}
          style={{ 
            padding: '12px 32px', 
            fontSize: '1.1rem',
            opacity: isPayoutDisabled ? 0.6 : 1,
            cursor: isPayoutDisabled ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !isPayoutDisabled && setShowPayoutModal(true)}
        >
          {isPayoutDisabled && payoutDisabledReason
            ? payoutDisabledReason
            : t('instructor.financials.request_payout')}
        </button>
      </div>

      {/* Earnings Ledger */}
      <div className="glass-card no-border" style={{ padding: '24px', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: 'var(--outer-shadow)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>{t('instructor.financials.payout_history')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)' }}>
                <th style={{ padding: '16px', fontWeight: 600 }}>{t('instructor.financials.date')}</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>{t('instructor.financials.description')}</th>
                <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>{t('instructor.financials.amount')}</th>
                <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>{t('instructor.financials.status')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    {/* Translated No History */}
                    {loading ? <Spinner size="small" label="Loading..." /> : t('instructor.financials.no_history')}
                  </td>
                </tr>
              ) : (
                currentTransactions.map((tx) => (
                  <tr 
                    key={tx._id} 
                    className="analytics-row" 
                    onClick={() => setSelectedTxForDetails(tx)}
                    style={{ backgroundColor: 'transparent', transition: 'all 0.3s', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderStartStartRadius: '16px', borderEndStartRadius: '16px' }}>
                      {new Date(tx.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                      <div>
                        {tx.description
                          .replace(/\s*\([\d\+\s\-_]+\)/g, '')
                          .replace(/\s*\(Rejected\)/gi, '')
                          .replace('Course Sale - ', t('instructor.financials.course_sale_prefix'))
                          .replace('Payout Request - ', t('instructor.financials.payout_request_prefix'))
                          .trim()}
                      </div>
                    </td>
                    <td style={tx.amount > 0 ? {
                      padding: '16px', 
                      textAlign: 'right', 
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border)',
                      backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    } : {
                      padding: '16px', 
                      textAlign: 'right', 
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text)'
                    }}>
                      {tx.amount > 0 ? '+ ' : '- '}EGP {Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border)', borderStartEndRadius: '16px', borderEndEndRadius: '16px' }}>
                      {(() => {
                        const isCleared = tx.type === 'course_sale'
                          ? (!tx.availableAt || new Date(tx.availableAt) <= new Date())
                          : (tx.status === 'paid' || tx.status === 'cleared');
                        const isProcessing = ['processing', 'otp_verified', 'approved'].includes(tx.status);
                        return (
                          <span className="status-badge" style={{
                            color: isCleared ? '#10b981' : isProcessing ? '#3b82f6' : tx.status === 'rejected' ? '#ef4444' : '#f59e0b',
                          }}>
                            {isCleared 
                              ? (tx.type === 'course_sale' ? (t('instructor.financials.status_received') || 'Received') : (t('instructor.financials.status_paid') || 'Paid')) 
                              : isProcessing ? (t('instructor.financials.status_processing', 'Processing') || 'Processing') :
                              tx.status === 'rejected' ? (t('instructor.financials.status_rejected') || 'Rejected') : 
                              (t('instructor.financials.status_pending') || 'Pending')}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {visibleTransactions.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, visibleTransactions.length)} of {visibleTransactions.length} transactions
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="glass-btn"
                style={{ 
                  padding: '6px 14px', 
                  fontSize: '0.85rem', 
                  opacity: currentPage === 1 ? 0.4 : 1, 
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer' 
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)', padding: '0 8px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="glass-btn"
                style={{ 
                  padding: '6px 14px', 
                  fontSize: '0.85rem', 
                  opacity: currentPage === totalPages ? 0.4 : 1, 
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' 
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="animate-entrance" style={{
            padding: '32px',
            maxWidth: '540px',
            width: '90%',
            position: 'relative',
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            boxShadow: 'var(--outer-shadow, 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4))',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-h)' }}>{t('instructor.financials.request_payout')}</h2>
              <button 
                onClick={() => {
                  setShowPayoutModal(false);
                  setCreatedPayoutId(null);
                }}
                className="nav-icon-btn"
                style={{ 
                  background: 'var(--bg-main)',
                  boxShadow: 'var(--inner-shadow, inset 0 2px 4px rgba(0, 0, 0, 0.5))',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>
            
            {createdPayoutId ? (
              <PayoutOtpVerification
                payoutId={createdPayoutId}
                accountEmail={payoutEmail || user?.email}
                payoutAmount={payoutRequestedAmount}
                onVerified={({ status, requiresApproval }) => {
                  setShowPayoutModal(false);
                  setCreatedPayoutId(null);
                  setPaymentMethod('');
                  setWalletNumber(user?.phone || '');
                  setInstapayAccount('');
                  setPayoutEmail(user?.email || '');
                  notyf.success(
                    requiresApproval
                      ? 'Payout request submitted for secondary approval.'
                      : 'Payout request approved!'
                  );
                  fetchFinancials();
                }}
                onError={(msg) => notyf.error(msg)}
                onBack={() => setCreatedPayoutId(null)}
              />
            ) : (
              <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Fixed Read-only Payout Amount Input */}
                <div className="input-group">
                  <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>{t('instructor.financials.payout_amount')}</label>
                <input 
                  type="text" 
                  className="auth-input"
                  style={{ width: '100%', opacity: 0.85, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}
                  value={availableBalance ? availableBalance.toFixed(2) : '0.00'}
                  disabled
                  readOnly
                />
              </div>

              {/* Financial Breakdown (2% Fee) */}
              <div style={{ padding: '20px', borderRadius: '24px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow, inset 0 2px 6px rgba(0, 0, 0, 0.5))', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.invoice_code')}</span>
                  <strong style={{ color: '#3b82f6', letterSpacing: '0.5px', fontFamily: 'monospace' }}>{invoiceCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.available_cash')}</span>
                  <strong style={{ color: 'var(--text-h)' }}>EGP {availableBalance.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}>
                  <span>{t('instructor.financials.platform_fee')}</span>
                  <span>- EGP {(availableBalance * 0.02).toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{t('instructor.financials.total_payout')}</span>
                  <strong style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>EGP {(availableBalance * 0.98).toFixed(2)}</strong>
                </div>
              </div>

              {/* Payment Method & Number Inputs on Same Row */}
              <div style={{ display: 'grid', gridTemplateColumns: (isWalletMethod || paymentMethod === 'instapay') ? 'repeat(2, 1fr)' : '1fr', gap: '16px', alignItems: 'start' }}>
                <div className="input-group" style={{ zIndex: 10 }}>
                  <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>{t('instructor.financials.payment_method')}</label>
                  <CustomSelect 
                    options={paymentOptions}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    placeholder={t('instructor.financials.select_payment_method')}
                  />
                </div>

                {isWalletMethod && (
                  <div className="input-group animate-entrance">
                    <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                      {paymentMethod === 'vodafone_cash' ? t('instructor.financials.vodafone_cash_num') :
                       paymentMethod === 'orange_cash' ? t('instructor.financials.orange_cash_num') :
                       paymentMethod === 'etisalat_cash' ? t('instructor.financials.etisalat_cash_num') :
                       t('instructor.financials.we_cash_num')}
                    </label>
                    <input 
                      type="tel" 
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={11}
                      className="auth-input"
                      onFocus={() => setIsWalletFocused(true)}
                      onBlur={() => setIsWalletFocused(false)}
                      style={{ 
                        width: '100%',
                        border: isWalletFocused ? '1px solid #f97316' : undefined,
                        boxShadow: isWalletFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : undefined
                      }}
                      placeholder="e.g. 010xxxxxxxx"
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      required
                    />
                  </div>
                )}

                {paymentMethod === 'instapay' && (
                  <div className="input-group animate-entrance">
                    <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>{t('instructor.financials.instapay_address')}</label>
                    <input 
                      type="text" 
                      className="auth-input"
                      style={{ width: '100%' }}
                      placeholder="e.g. username@instapay"
                      value={instapayAccount}
                      onChange={(e) => setInstapayAccount(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {isWalletMethod && (
                <small style={{ color: 'var(--c-sub)', marginTop: '-8px', display: 'block', fontSize: '0.8rem' }}>
                  {t('instructor.financials.phone_help')}
                </small>
              )}

              {paymentMethod === 'instapay' && (
                <small style={{ color: 'var(--c-sub)', marginTop: '-8px', display: 'block', fontSize: '0.8rem' }}>
                  {t('instructor.financials.security_notice')}
                </small>
              )}

              {/* Payout Email input field */}
              <div className="input-group">
                <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>{t('instructor.financials.payout_email_label', 'Payout Email (For Verification OTP)')}</label>
                <input 
                  type="email" 
                  className="auth-input"
                  onFocus={() => setIsPayoutEmailFocused(true)}
                  onBlur={() => setIsPayoutEmailFocused(false)}
                  style={{ 
                    width: '100%',
                    border: isPayoutEmailFocused ? '1px solid #f97316' : undefined,
                    boxShadow: isPayoutEmailFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : undefined
                  }}
                  placeholder="e.g. email@example.com"
                  value={payoutEmail}
                  onChange={(e) => setPayoutEmail(e.target.value.replace(/[^a-zA-Z0-9._%+@-]/g, ''))}
                  required
                />
                <small style={{ color: 'var(--c-sub)', marginTop: '4px', display: 'block', fontSize: '0.75rem' }}>
                  {t('instructor.financials.otp_help_text', 'The 6-digit security code will be sent to this email address.')}
                </small>
              </div>

              <button 
                type="submit"
                className="glass-btn" 
                disabled={availableBalance < 100 || !paymentMethod || isSubmitting}
                style={{ 
                  padding: '12px 24px', 
                  fontWeight: 700, 
                  marginTop: '16px',
                  width: '100%',
                  opacity: isSubmitting || availableBalance < 100 || !paymentMethod ? 0.6 : 1,
                  cursor: isSubmitting || availableBalance < 100 || !paymentMethod ? 'not-allowed' : 'pointer',
                  pointerEvents: isSubmitting ? 'none' : 'auto'
                }}
              >
                {isSubmitting ? t('instructor.financials.submitting') : t('instructor.financials.submit_request')}
              </button>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTxForDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-card animate-entrance" style={{
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            position: 'relative',
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            boxShadow: 'var(--outer-shadow)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-h)' }}>
                {selectedTxForDetails.type === 'payout_request' ? t('instructor.financials.payout_details') : t('instructor.financials.tx_details')}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {(() => {
                  const isCleared = selectedTxForDetails.type === 'course_sale'
                    ? (!selectedTxForDetails.availableAt || new Date(selectedTxForDetails.availableAt) <= new Date())
                    : (selectedTxForDetails.status === 'paid' || selectedTxForDetails.status === 'cleared');
                  const isProcessing = ['processing', 'otp_verified', 'approved'].includes(selectedTxForDetails.status);
                  return (
                    <span className="status-badge" style={{
                      padding: '4px 12px',
                      borderRadius: '50px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: isCleared ? '#10b981' : isProcessing ? '#3b82f6' : selectedTxForDetails.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      background: isCleared ? 'rgba(16, 185, 129, 0.15)' : isProcessing ? 'rgba(59, 130, 246, 0.15)' : selectedTxForDetails.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'
                    }}>
                      {isCleared 
                        ? (selectedTxForDetails.type === 'course_sale' ? (t('instructor.financials.status_received') || 'RECEIVED') : (t('instructor.financials.status_paid') || 'PAID')) : 
                       isProcessing ? (t('instructor.financials.status_processing') || 'PROCESSING') :
                       selectedTxForDetails.status === 'rejected' ? (t('instructor.financials.status_rejected') || 'REJECTED') : (t('instructor.financials.status_pending') || 'PENDING')}
                    </span>
                  );
                })()}
                <button 
                  onClick={() => setSelectedTxForDetails(null)}
                  className="nav-icon-btn"
                  style={{ 
                    background: 'var(--bg-main)',
                    boxShadow: 'var(--inner-shadow)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', borderRadius: '24px', background: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.date_time')}</span>
                <strong style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                  {new Date(selectedTxForDetails.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>

              {selectedTxForDetails.referenceId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.invoice_code')}</span>
                  <strong style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                    {selectedTxForDetails.referenceId}
                  </strong>
                </div>
              )}

              {(selectedTxForDetails.payoutMethod || selectedTxForDetails.type === 'payout_request') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.payment_method')}:</span>
                  <strong style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                    {selectedTxForDetails.payoutMethod 
                      ? selectedTxForDetails.payoutMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'Payout Request'}
                  </strong>
                </div>
              )}

              {(selectedTxForDetails.payoutMethod || selectedTxForDetails.type === 'payout_request') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.account_number')}</span>
                  <strong style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                    {selectedTxForDetails.payoutDetails || user?.phone || 'N/A'}
                  </strong>
                </div>
              )}

              {(selectedTxForDetails.payoutMethod || selectedTxForDetails.type === 'payout_request') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.email_used', 'Email Used:')}</span>
                  <strong style={{ color: 'var(--text-h)', fontWeight: 600 }}>
                    {selectedTxForDetails.payoutEmail || user?.email || 'N/A'}
                  </strong>
                </div>
              )}

              {selectedTxForDetails.type === 'course_sale' && selectedTxForDetails.availableAt && new Date(selectedTxForDetails.availableAt) > new Date() && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--c-sub)' }}>{t('instructor.financials.available_on', 'Available On')}</span>
                  <strong style={{ color: '#f59e0b', fontWeight: 600 }}>
                    {new Date(selectedTxForDetails.availableAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
              )}

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.05rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>{t('instructor.financials.amount')}</span>
                <strong style={{ fontWeight: 800, color: selectedTxForDetails.amount > 0 ? '#f97316' : '#10b981' }}>
                  {selectedTxForDetails.amount > 0 ? '+ ' : '- '}EGP {Math.abs(selectedTxForDetails.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Rejection Reason Card if Rejected */}
            {selectedTxForDetails.status === 'rejected' && (
              <div style={{ 
                marginTop: '20px', 
                padding: '20px', 
                borderRadius: '24px', 
                background: 'var(--bg-main)', 
                boxShadow: 'var(--inner-shadow)',
                border: 'none'
              }}>
                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  {t('instructor.financials.rejection_reason')}
                </div>
                <div style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                  {selectedTxForDetails.rejectionReason || 'Your payout request was rejected by administration. Please review your payout details and try again.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
