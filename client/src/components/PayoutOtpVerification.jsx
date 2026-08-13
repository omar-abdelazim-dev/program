import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

/**
 * PayoutOtpVerification
 *
 * Props:
 *   payoutId       {string}    The Transaction._id of the payout_request.
 *   accountEmail   {string}    The instructor's registered account email (pre-fill).
 *   payoutAmount   {number}    Displayed so the user can spot an unauthorized request.
 *   onVerified     {function}  Called with { status, requiresApproval } on success.
 *   onError        {function?} Optional: called with an error message string.
 */
export default function PayoutOtpVerification({
  payoutId,
  accountEmail,
  payoutAmount,
  onVerified,
  onError,
  onBack,
}) {
  const { t } = useTranslation();
  const [payoutEmail, setPayoutEmail]         = useState(accountEmail || '');
  const [emailMismatch, setEmailMismatch]     = useState(false);
  const [codeSent, setCodeSent]               = useState(false);
  const [code, setCode]                       = useState('');
  const [error, setError]                     = useState('');
  const [info, setInfo]                       = useState('');
  const [sendingOtp, setSendingOtp]           = useState(false);
  const [verifying, setVerifying]             = useState(false);
  const [cooldown, setCooldown]               = useState(0); // seconds remaining
  const [isEmailFocused, setIsEmailFocused]   = useState(false);
  const [isCodeFocused, setIsCodeFocused]     = useState(false);
  const [expiresAt, setExpiresAt]             = useState(null);
  const [timeLeft, setTimeLeft]               = useState(null); // seconds until code expires
  const cooldownRef                           = useRef(null);
  const expiryRef                             = useRef(null);

  // ── Cooldown countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  // ── Expiry countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0) clearInterval(expiryRef.current);
    };
    tick();
    expiryRef.current = setInterval(tick, 1000);
    return () => clearInterval(expiryRef.current);
  }, [expiresAt]);

  // ── Request OTP ──────────────────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    setError('');
    setInfo('');
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
    const emailTrimmed = payoutEmail.trim().toLowerCase();
    if (!emailTrimmed || !EMAIL_REGEX.test(emailTrimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await api.post(`/payouts/${payoutId}/request-otp`, { payoutEmail: emailTrimmed });
      setCodeSent(true);
      setEmailMismatch(res.data.emailMismatch || false);
      setExpiresAt(res.data.expiresAt);
      // Start resend cooldown
      const resendAt = new Date(res.data.resendAvailableAt);
      const secsLeft = Math.ceil((resendAt - Date.now()) / 1000);
      setCooldown(Math.max(0, secsLeft));
      setInfo(t('instructor.financials.code_sent_info', { email: emailTrimmed, defaultValue: `Verification code sent to ${emailTrimmed}` }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send code. Please try again.';
      if (err.response?.status === 429) {
        const resendAt = err.response.data?.resendAvailableAt;
        if (resendAt) {
          const secsLeft = Math.ceil((new Date(resendAt) - Date.now()) / 1000);
          setCooldown(Math.max(0, secsLeft));
        }
      }
      setError(translateError(msg));
      onError?.(translateError(msg));
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────────
    const translateError = (msg) => {
    if (!msg) return '';
    if (msg.includes('No OTP found')) return t('instructor.financials.no_otp_found', 'No OTP found. Please request a verification code first.');
    if (msg.includes('already been used')) return t('instructor.financials.otp_already_used', 'This code has already been used.');
    if (msg.includes('code has expired') || msg.includes('expired')) return t('instructor.financials.otp_expired', 'Verification code has expired. Please request a new one.');
    if (msg.includes('Maximum verification attempts')) return t('instructor.financials.max_attempts_exceeded', 'Maximum verification attempts exceeded. Please request a new code.');
    if (msg.includes('Incorrect verification code')) return t('instructor.financials.incorrect_code', 'Incorrect verification code. Please check and try again.');
    if (msg.includes('Please enter the 6-digit code')) return t('instructor.financials.enter_6_digit_error', 'Please enter the 6-digit code from your email.');
    if (msg.includes('Failed to send code')) return t('instructor.financials.failed_send_code', 'Failed to send code. Please try again.');
    return msg;
  };

  const handleVerify = async () => {
    setError('');
    setInfo('');
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError(translateError('Please enter the 6-digit code from your email.'));
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post(`/payouts/${payoutId}/verify-otp`, { code });
      setInfo(res.data.message);
      onVerified?.({ status: res.data.status, requiresApproval: res.data.requiresApproval });
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed.';
      setError(translateError(msg));
      onError?.(translateError(msg));
      // If the code expired, prompt them to request a new one
      if (err.response?.status === 400 && msg.toLowerCase().includes('expired')) {
        setCodeSent(false);
        setCode('');
        setExpiresAt(null);
        setTimeLeft(null);
      }
    } finally {
      setVerifying(false);
    }
  };

  const formattedAmount = Number(payoutAmount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      paddingTop: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{
          color: 'var(--c-sub)',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}>
          {t('instructor.financials.security_code', 'Security Verification Code')}
        </label>
        <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
          {t('instructor.financials.payout_amount_label', 'Payout:')} EGP {formattedAmount}
        </span>
      </div>

      {/* Email mismatch warning */}
      {emailMismatch && (
        <div style={{
          background: 'var(--bg-main)',
          border: 'none',
          boxShadow: 'var(--inner-shadow)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.82rem',
          color: '#f59e0b',
          width: 'fit-content',
          fontWeight: 600,
        }}>
          {t('instructor.financials.email_mismatch_warning', { email: accountEmail, defaultValue: `⚠️ You are sending the code to a different email than your account email (${accountEmail}). If this wasn't intentional, update the email below.` })}
        </div>
      )}

      {/* Input Fields Container */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Payout email input */}
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--c-sub)', display: 'block', marginBottom: 6 }}>
            {t('instructor.financials.send_code_to_email', 'Send code to email')}
          </label>
          <input
            type="email"
            className="auth-input"
            value={payoutEmail}
            onChange={e => { setPayoutEmail(e.target.value.replace(/[^a-zA-Z0-9._%+@\-]/g, '')); setCodeSent(false); setCode(''); }}
            placeholder="you@example.com"
            disabled={sendingOtp || verifying}
            onFocus={() => setIsEmailFocused(true)}
            onBlur={() => setIsEmailFocused(false)}
            style={{ 
              width: '100%',
              background: 'var(--bg-main)',
              boxShadow: isEmailFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
              border: isEmailFocused ? '1px solid #f97316' : '1px solid var(--border, rgba(255,255,255,0.1))',
              color: 'var(--text, #fff)',
              padding: '12px 16px',
              borderRadius: '12px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease-in-out'
            }}
          />
        </div>

        {/* Code input + expiry */}
        {codeSent && (
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--c-sub)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{t('instructor.financials.enter_otp', 'Enter OTP')}</span>
              {timeLeft !== null && (
                <span style={{ color: timeLeft < 60 ? '#ef4444' : 'var(--c-sub)' }}>
                  {timeLeft === 0 ? t('instructor.financials.expired', 'Expired') : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                </span>
              )}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                className="auth-input"
                onFocus={() => setIsCodeFocused(true)}
                onBlur={() => setIsCodeFocused(false)}
                style={{ 
                  flex: 1, 
                  letterSpacing: '4px', 
                  fontWeight: 700, 
                  fontSize: '1.1rem', 
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  boxShadow: isCodeFocused ? '0 0 0 2px rgba(249, 115, 22, 0.3)' : 'var(--inner-shadow)',
                  border: isCodeFocused ? '1px solid #f97316' : '1px solid var(--border, rgba(255,255,255,0.1))',
                  color: 'var(--text, #fff)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease-in-out'
                }}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={verifying}
              />
              <button
                type="button"
                className="glass-btn"
                onClick={handleVerify}
                disabled={verifying || sendingOtp || code.length !== 6 || timeLeft === 0}
                style={{
                  padding: '0 20px',
                  fontWeight: 700,
                  opacity: verifying || sendingOtp || code.length !== 6 || timeLeft === 0 ? 0.5 : 1,
                  cursor: verifying || sendingOtp || code.length !== 6 || timeLeft === 0 ? 'not-allowed' : 'pointer',
                  pointerEvents: verifying || sendingOtp ? 'none' : 'auto',
                }}
              >
                {verifying ? t('instructor.financials.verifying', 'Verifying…') : t('instructor.financials.verify', 'Verify')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send/Resend & Back buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        {onBack ? (
          <button
            type="button"
            className="glass-btn"
            onClick={onBack}
            disabled={sendingOtp || verifying}
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              background: 'var(--bg-main)',
              boxShadow: 'var(--inner-shadow)',
              border: 'none',
              borderRadius: '24px',
              color: 'var(--c-sub)',
              opacity: sendingOtp || verifying ? 0.5 : 1,
              cursor: sendingOtp || verifying ? 'not-allowed' : 'pointer',
              pointerEvents: sendingOtp || verifying ? 'none' : 'auto',
              fontWeight: 600
            }}
          >
            ← {t('instructor.financials.back', 'Back')}
          </button>
        ) : <div />}

        <button
          type="button"
          className="glass-btn"
          onClick={handleRequestOtp}
          disabled={sendingOtp || verifying || cooldown > 0}
          style={{
            padding: '10px 20px',
            fontSize: '0.9rem',
            opacity: sendingOtp || verifying || cooldown > 0 ? 0.5 : 1,
            cursor: sendingOtp || verifying || cooldown > 0 ? 'not-allowed' : 'pointer',
            pointerEvents: sendingOtp || verifying ? 'none' : 'auto',
          }}
        >
          {sendingOtp
            ? t('instructor.financials.sending', 'Sending…')
            : cooldown > 0
              ? t('instructor.financials.resend_in', { seconds: cooldown, defaultValue: `Resend in ${cooldown}s` })
              : codeSent
                ? t('instructor.financials.resend_code', 'Resend Code')
                : t('instructor.financials.send_code', 'Send Code')}
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div style={{
          background: 'var(--bg-main)',
          border: 'none',
          boxShadow: 'var(--inner-shadow)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.85rem',
          color: '#ef4444',
          width: 'fit-content',
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}
      {info && !error && (
        <div style={{
          background: 'var(--bg-main)',
          border: 'none',
          boxShadow: 'var(--inner-shadow)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.85rem',
          color: '#10b981',
          width: 'fit-content',
          fontWeight: 600,
        }}>
          ✓ {info}
        </div>
      )}

      <small style={{ color: 'var(--c-sub)', fontSize: '0.78rem' }}>
        🔒 {t('instructor.financials.security_code_notice', 'The 6-digit code will be emailed to the address above. Never share it with anyone.')}
      </small>
    </div>
  );
}
