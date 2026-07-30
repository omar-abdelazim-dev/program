import notyf from '../utils/notyf';
import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import Spinner from './Spinner';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';


export default function InstructorFinancialsTab({ user }) {
  const { t, i18n } = useTranslation();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [vodafoneNumber, setVodafoneNumber] = useState(user?.phone || '');
  const [bankAccount, setBankAccount] = useState('');
  const [instapayAccount, setInstapayAccount] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || !paymentMethod) return;
    if (paymentMethod === 'vodafone_cash' && !vodafoneNumber) {
      notyf.error(t('instructor.notyf.vodafone_required'));
      return;
    }
    if (paymentMethod === 'bank_transfer' && !bankAccount) {
      notyf.error(t('instructor.notyf.bank_required'));
      return;
    }
    if (paymentMethod === 'instapay' && !instapayAccount) {
      notyf.error(t('instructor.notyf.instapay_required'));
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post('/financials/payout', {
        amount: Number(payoutAmount),
        method: paymentMethod,
        payoutDetails: paymentMethod === 'vodafone_cash' ? vodafoneNumber : paymentMethod === 'bank_transfer' ? bankAccount : paymentMethod === 'instapay' ? instapayAccount : undefined
      });
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPaymentMethod('');
      setVodafoneNumber(user?.phone || '');
      setBankAccount('');
      setInstapayAccount('');
      notyf.success(t('instructor.notyf.payout_requested'));
      fetchFinancials(); // refresh balance and ledger
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || t('instructor.notyf.payout_failed', 'Failed to request payout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentOptions = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'vodafone_cash', label: 'Vodafone Cash' },
    { value: 'instapay', label: 'InstaPay' }
  ];

  return (
    <div className="animate-entrance" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Current Balance Card */}
      <div className="stat-card glass-card no-border" style={{ padding: '32px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
        <div>
          {/* Translated Available Balance */}
          <div className="stat-label" style={{ color: 'var(--c-sub)', marginBottom: '8px', fontSize: '1rem' }}>{t('instructor.financials.available_balance')}</div>
          <div className="stat-value" style={{ fontSize: '2.5rem', color: 'var(--text-h)', fontWeight: 800 }}>EGP {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <button 
          className="glass-btn primary-action" 
          style={{ padding: '12px 32px', fontSize: '1.1rem' }}
          onClick={() => setShowPayoutModal(true)}
        >
          {/* Translated Request Payout */}
          {t('instructor.financials.request_payout')}
        </button>
      </div>

      {/* Earnings Ledger */}
      <div className="glass-card no-border" style={{ padding: '24px', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
        {/* Translated Transaction History */}
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
                transactions.map((tx) => (
                  <tr key={tx._id} className="analytics-row" style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderStartStartRadius: '16px', borderEndStartRadius: '16px' }}>
                      {new Date(tx.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                      {tx.description
                        .replace('Course Sale - ', t('instructor.financials.course_sale_prefix'))
                        .replace('Payout Request - ', t('instructor.financials.payout_request_prefix'))
                        .replace(' (Rejected)', t('instructor.financials.rejected_suffix'))}
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
                      <span className="status-badge" style={{
                        color: tx.status === 'cleared' ? '#10b981' : tx.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      }}>
                        {tx.status === 'cleared' ? t('instructor.financials.status_cleared') : 
                         tx.status === 'rejected' ? t('instructor.financials.status_rejected') : 
                         t('instructor.financials.status_pending')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
          <div className="glass-card animate-entrance" style={{
            padding: '32px',
            maxWidth: '450px',
            width: '90%',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowPayoutModal(false)}
              className="nav-icon-btn"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              ✕
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: 'var(--text-h)' }}>Request Payout</h2>
            
            <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Payout Amount (EGP)</label>
                <input 
                  type="number" 
                  className="auth-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 1500"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  required
                  min="100"
                />
              </div>

              <div className="input-group" style={{ zIndex: 10 }}>
                <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Payment Method</label>
                <CustomSelect 
                  options={paymentOptions}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  placeholder="Select payment method..."
                />
              </div>

              {paymentMethod === 'vodafone_cash' && (
                <div className="input-group animate-entrance">
                  <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Vodafone Cash Number</label>
                  <input 
                    type="tel" 
                    className="auth-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. 010xxxxxxxx"
                    value={vodafoneNumber}
                    onChange={(e) => setVodafoneNumber(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--c-sub)', marginTop: '6px', display: 'block', fontSize: '0.8rem' }}>
                    Defaults to your account phone number. You can change it for this transaction if needed.
                  </small>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="input-group animate-entrance">
                  <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>Bank Account Number / IBAN</label>
                  <input 
                    type="text" 
                    className="auth-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. EG680000000000000000000000000"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--c-sub)', marginTop: '6px', display: 'block', fontSize: '0.8rem' }}>
                    For security, this information will be permanently removed from the database once the payout is completed.
                  </small>
                </div>
              )}

              {paymentMethod === 'instapay' && (
                <div className="input-group animate-entrance">
                  <label style={{ color: 'var(--c-sub)', marginBottom: '8px', display: 'block' }}>InstaPay Payment Address (IPA) or Mobile</label>
                  <input 
                    type="text" 
                    className="auth-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. username@instapay or 010xxxxxxxx"
                    value={instapayAccount}
                    onChange={(e) => setInstapayAccount(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--c-sub)', marginTop: '6px', display: 'block', fontSize: '0.8rem' }}>
                    For security, this information will be permanently removed from the database once the payout is completed.
                  </small>
                </div>
              )}

              <button 
                type="submit"
                className="glass-btn" 
                disabled={!payoutAmount || !paymentMethod || isSubmitting}
                style={{ 
                  padding: '12px 24px', 
                  fontWeight: 700, 
                  marginTop: '16px',
                  width: '100%'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
