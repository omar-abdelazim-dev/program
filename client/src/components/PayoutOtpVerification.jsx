import { useState, useEffect, useRef } from 'react';
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
}) {
  const [payoutEmail, setPayoutEmail]         = useState(accountEmail || '');
  const [emailMismatch, setEmailMismatch]     = useState(false);
  const [codeSent, setCodeSent]               = useState(false);
  const [code, setCode]                       = useState('');
  const [error, setError]                     = useState('');
  const [info, setInfo]                       = useState('');
  const [sendingOtp, setSendingOtp]           = useState(false);
  const [verifying, setVerifying]             = useState(false);
  const [cooldown, setCooldown]               = useState(0); // seconds remaining
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
    const emailTrimmed = payoutEmail.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
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
      setInfo(`Verification code sent to ${emailTrimmed}.`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send code. Please try again.';
      if (err.response?.status === 429) {
        const resendAt = err.response.data?.resendAvailableAt;
        if (resendAt) {
          const secsLeft = Math.ceil((new Date(resendAt) - Date.now()) / 1000);
          setCooldown(Math.max(0, secsLeft));
        }
      }
      setError(msg);
      onError?.(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    setError('');
    setInfo('');
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post(`/payouts/${payoutId}/verify-otp`, { code });
      setInfo(res.data.message);
      onVerified?.({ status: res.data.status, requiresApproval: res.data.requiresApproval });
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed.';
      setError(msg);
      onError?.(msg);
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
          Security Verification Code
        </label>
        <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
          Payout: EGP {formattedAmount}
        </span>
      </div>

      {/* Email mismatch warning */}
      {emailMismatch && (
        <div style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.82rem',
          color: '#fbbf24',
        }}>
          ⚠️ You are sending the code to a different email than your account email ({accountEmail}).
          If this wasn't intentional, update the email below.
        </div>
      )}

      {/* Input Fields Container */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Payout email input */}
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--c-sub)', display: 'block', marginBottom: 6 }}>
            Send code to email
          </label>
          <input
            type="email"
            className="auth-input"
            value={payoutEmail}
            onChange={e => { setPayoutEmail(e.target.value); setCodeSent(false); setCode(''); }}
            placeholder="you@example.com"
            disabled={sendingOtp || verifying}
            style={{ 
              width: '100%',
              background: 'var(--bg-main)',
              boxShadow: 'var(--inner-shadow)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              color: 'var(--text, #fff)',
              padding: '12px 16px',
              borderRadius: '12px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Code input + expiry */}
        {codeSent && (
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--c-sub)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Enter OTP</span>
              {timeLeft !== null && (
                <span style={{ color: timeLeft < 60 ? '#ef4444' : 'var(--c-sub)' }}>
                  {timeLeft === 0 ? 'Expired' : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
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
                style={{ 
                  flex: 1, 
                  letterSpacing: '4px', 
                  fontWeight: 700, 
                  fontSize: '1.1rem', 
                  textAlign: 'center',
                  background: 'var(--bg-main)',
                  boxShadow: 'var(--inner-shadow)',
                  border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  color: 'var(--text, #fff)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
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
                disabled={verifying || code.length !== 6 || timeLeft === 0}
                style={{
                  padding: '0 20px',
                  fontWeight: 700,
                  opacity: verifying || code.length !== 6 || timeLeft === 0 ? 0.6 : 1,
                  cursor: verifying || code.length !== 6 || timeLeft === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send/Resend button */}
      <button
        type="button"
        className="glass-btn"
        onClick={handleRequestOtp}
        disabled={sendingOtp || cooldown > 0}
        style={{
          padding: '10px 20px',
          fontSize: '0.9rem',
          opacity: sendingOtp || cooldown > 0 ? 0.6 : 1,
          cursor: sendingOtp || cooldown > 0 ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
          marginTop: '-4px'
        }}
      >
        {sendingOtp
          ? 'Sending…'
          : cooldown > 0
            ? `Resend in ${cooldown}s`
            : codeSent
              ? 'Resend Code'
              : 'Send Code'}
      </button>

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
        🔒 The 6-digit code will be emailed to the address above. Never share it with anyone.
      </small>
    </div>
  );
}
