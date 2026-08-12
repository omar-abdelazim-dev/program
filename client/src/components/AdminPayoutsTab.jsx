import notyf from '../utils/notyf';
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ConfirmModal from './ConfirmModal';


export default function AdminPayoutsTab() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [actionType, setActionType] = useState(''); // 'clear' or 'reject'
  
  // New state for Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isViewingTrace, setIsViewingTrace] = useState(false);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [traceData, setTraceData] = useState(null);
  const [isFetchingTrace, setIsFetchingTrace] = useState(false);

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/admin/payouts');
      setPayouts(res.data.payouts || []);
    } catch (err) {
      console.error(err);
      notyf.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleAction = async (overrideAction) => {
    if (!selectedPayout) return;
    const action = typeof overrideAction === 'string' ? overrideAction : actionType;
    try {
      if (action === 'clear') {
        await api.put(`/financials/${selectedPayout._id}/complete`);
        notyf.success('Payout marked as cleared');
      } else if (action === 'reject') {
        await api.put(`/financials/${selectedPayout._id}/reject`, { reason: rejectReason });
        notyf.success('Payout rejected');
      }
      setShowConfirm(false);
      setShowReviewModal(false);
      setSelectedPayout(null);
      setRejectReason('');
      fetchPayouts();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || `Failed to ${action} payout`);
    }
  };

  const openConfirmModal = (payout, action) => {
    setSelectedPayout(payout);
    setActionType(action);
    setShowConfirm(true);
  };

  const openReviewModal = (payout) => {
    setSelectedPayout(payout);
    setIsViewingTrace(false);
    setIsConfirmingReject(false);
    setRejectReason('');
    setTraceData(null);
    setShowReviewModal(true);
  };

  const fetchRevenueTrace = async () => {
    if (!selectedPayout) return;
    setIsFetchingTrace(true);
    try {
      const res = await api.get(`/admin/payouts/${selectedPayout._id}/revenue-trace`);
      setTraceData(res.data);
      setIsViewingTrace(true);
    } catch (err) {
      console.error(err);
      notyf.error('Failed to load revenue trace');
    } finally {
      setIsFetchingTrace(false);
    }
  };

  const pendingPayouts = payouts.filter(p => ['pending', 'otp_verified', 'approved', 'processing'].includes(p.status));
  const clearedPayouts = payouts.filter(p => p.status === 'cleared');
  const rejectedPayouts = payouts.filter(p => p.status === 'rejected');
  const processedPayouts = payouts.filter(p => ['cleared', 'paid', 'rejected', 'failed'].includes(p.status));

  return (
    <div data-role="admin">
      <div className="glass-card animate-entrance" style={{ padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text-h)' }}>Payout Requests Queue</h2>
        <p style={{ color: 'var(--c-sub)', marginBottom: '0' }}>
          Approve pending payout requests below. Once approved, the status is marked as 'cleared' and the instructor's sensitive payout details (bank/phone) are permanently scrubbed from the database.
        </p>
      </div>

      <div className="glass-card animate-entrance" style={{ padding: '24px', overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Pending Requests ({pendingPayouts.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)' }}>
                <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Instructor</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Gross Requested</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Net Payout (To Send)</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Method</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Details</th>
                <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    Loading payouts...
                  </td>
                </tr>
              ) : pendingPayouts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    No pending payout requests.
                  </td>
                </tr>
              ) : (
                pendingPayouts.map((tx) => {
                  const grossAmount = Math.abs(tx.amount || 0);
                  const feeAmount = tx.expectedFees !== undefined ? tx.expectedFees : (grossAmount * 0.02);
                  const netPayout = tx.expectedPayout !== undefined ? tx.expectedPayout : (grossAmount - feeAmount);
                  return (
                    <tr key={tx._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px', color: 'var(--text)' }}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500 }}>
                        {tx.instructor?.name || 'Unknown'}<br />
                        <small style={{ color: 'var(--c-sub)', fontWeight: 'normal' }}>{tx.instructor?.email}</small>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text)', fontWeight: 600 }}>
                        EGP {grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '16px', color: '#10b981', fontWeight: 700 }}>
                        EGP {netPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <div style={{ fontSize: '0.75rem', color: 'var(--c-sub)', fontWeight: 400 }}>Fee (2%): EGP {feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text)', textTransform: 'capitalize' }}>
                        {tx.payoutMethod?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text)' }}>
                        {tx.payoutDetails}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => openReviewModal(tx)}
                          style={{ 
                            padding: '8px 24px', 
                            fontSize: '0.9rem', 
                            color: 'var(--c-orange)', 
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--inner-shadow)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            transition: 'all 0.2s'
                          }}
                        >
                          Review Request
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {processedPayouts.length > 0 && (
        <div className="glass-card animate-entrance" style={{ padding: '24px', overflow: 'hidden', marginTop: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Processed Requests</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Instructor</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Gross Requested</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Net Payout (Sent)</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {processedPayouts.map((tx) => {
                  const grossAmount = Math.abs(tx.amount || 0);
                  const netPayout = tx.expectedPayout !== undefined ? tx.expectedPayout : (grossAmount * 0.98);
                  return (
                    <tr key={tx._id} className="analytics-row" style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                      <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                        {new Date(tx.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                        {tx.instructor?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                        EGP {grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '16px', color: '#10b981', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                        EGP {netPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text)', textTransform: 'capitalize', borderBottom: '1px solid var(--border)' }}>
                        {tx.payoutMethod?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                        <span className="status-badge" style={{
                          color: tx.status === 'cleared' || tx.status === 'paid' ? '#10b981' : tx.status === 'rejected' ? '#ef4444' : '#f59e0b',
                        }}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showConfirm}
        data-tooltip={actionType === 'clear' ? "Clear Payout" : "Reject Payout"}
        message={actionType === 'clear' 
          ? `Are you sure you want to mark this payout to ${selectedPayout?.instructor?.name || 'this instructor'} as cleared?\n\n• Gross Requested Balance: EGP ${selectedPayout ? Math.abs(selectedPayout.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}\n• 2% Platform Fee: EGP ${selectedPayout ? (selectedPayout.expectedFees || (Math.abs(selectedPayout.amount) * 0.02)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}\n• Net Cash to Send: EGP ${selectedPayout ? (selectedPayout.expectedPayout || (Math.abs(selectedPayout.amount) * 0.98)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}\n\nPlease ensure you have transferred EGP ${selectedPayout ? (selectedPayout.expectedPayout || (Math.abs(selectedPayout.amount) * 0.98)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''} to their ${selectedPayout?.payoutMethod?.replace('_', ' ')} before confirming. This action will permanently erase sensitive payment details.`
          : `Are you sure you want to REJECT this payout request of EGP ${selectedPayout ? Math.abs(selectedPayout.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}? The requested amount will return to their available balance.`}
        confirmText={actionType === 'clear' ? "Mark as Cleared" : "Reject Request"}
        cancelText="Cancel"
        intent={actionType === 'clear' ? "primary" : "danger"}
        onConfirm={handleAction}
        onCancel={() => {
          setShowConfirm(false);
          // Only nullify selected payout if review modal is not also open
          if (!showReviewModal) setSelectedPayout(null);
        }}
      />

      {showReviewModal && selectedPayout && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-entrance" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
            <button 
              onClick={() => { setShowReviewModal(false); setSelectedPayout(null); }}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'var(--c-sub)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--text-h)' }}>
              {isViewingTrace ? 'Revenue Trace' : 'Review Payout Request'}
            </h2>

            {!isViewingTrace ? (
              isConfirmingReject ? (
                <>
                  <div style={{ marginBottom: '24px', color: 'var(--c-sub)', lineHeight: '1.6', fontSize: '1.1rem' }}>
                    Are you sure you want to REJECT this payout request of EGP {Math.abs(selectedPayout.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}? 
                    <br/><br/>
                    The requested amount will return to the instructor's available balance.
                  </div>
                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--c-sub)', fontWeight: 600 }}>Rejection Reason (Sent to Instructor):</label>
                    <textarea 
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Invalid bank account details..."
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--bg-main)', color: 'var(--text)', boxShadow: 'var(--inner-shadow)', minHeight: '100px', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setIsConfirmingReject(false)}
                      style={{ padding: '10px 24px', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', color: 'var(--c-sub)', borderRadius: '24px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleAction('reject')}
                      style={{ padding: '10px 24px', fontSize: '1rem', color: '#ef4444', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', borderRadius: '24px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      Confirm Reject
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--c-sub)' }}>Instructor Name:</span>
                      <strong style={{ color: 'var(--text)' }}>{selectedPayout.instructor?.name || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--c-sub)' }}>Instructor Email:</span>
                      <strong style={{ color: 'var(--text)' }}>{selectedPayout.instructor?.email || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--c-sub)' }}>Phone Number Provided:</span>
                      <strong style={{ color: 'var(--text)' }}>{selectedPayout.payoutDetails || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--c-sub)' }}>Invoice ID:</span>
                      <strong style={{ color: 'var(--text)' }}>{selectedPayout.referenceId || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--c-sub)' }}>Payout Amount Requested:</span>
                      <strong style={{ color: 'var(--text)', fontSize: '1.1rem' }}>EGP {(selectedPayout.expectedPayout !== undefined ? selectedPayout.expectedPayout : (Math.abs(selectedPayout.amount) * 0.98)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <button 
                      onClick={fetchRevenueTrace}
                      disabled={isFetchingTrace}
                      style={{ padding: '10px 24px', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', color: 'var(--c-orange)', borderRadius: '24px', cursor: isFetchingTrace ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: isFetchingTrace ? 0.6 : 1 }}
                    >
                      {isFetchingTrace ? 'Loading...' : 'View Revenue Trace'}
                    </button>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button 
                        onClick={() => setIsConfirmingReject(true)}
                        disabled={isFetchingTrace}
                        style={{ padding: '10px 24px', fontSize: '1rem', color: '#ef4444', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', borderRadius: '24px', cursor: isFetchingTrace ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isFetchingTrace ? 0.6 : 1 }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => openConfirmModal(selectedPayout, 'clear')}
                        disabled={isFetchingTrace}
                        style={{ padding: '10px 24px', fontSize: '1rem', color: '#10b981', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', borderRadius: '24px', cursor: isFetchingTrace ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isFetchingTrace ? 0.6 : 1 }}
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <>
                <div style={{ marginBottom: '24px', color: 'var(--c-sub)' }}>
                  All student enrollments generating revenue for this instructor since their last payout on {traceData?.sinceDate ? new Date(traceData.sinceDate).toLocaleDateString() : 'N/A'}.
                </div>

                {traceData?.enrollments?.length > 0 ? (
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 10 }}>
                          <th style={{ padding: '12px' }}>Date</th>
                          <th style={{ padding: '12px' }}>Student</th>
                          <th style={{ padding: '12px' }}>Invoice ID</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traceData.enrollments.map((e) => (
                          <tr key={e._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                            <td style={{ padding: '12px', color: 'var(--text)', fontSize: '0.9rem' }}>{new Date(e.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: '12px', color: 'var(--text-h)', fontSize: '0.9rem' }}>{e.student?.name || 'N/A'}</td>
                            <td style={{ padding: '12px', color: 'var(--c-sub)', fontSize: '0.9rem' }}>{e.invoiceId || e.transactionId || 'N/A'}</td>
                            <td style={{ padding: '12px', color: 'var(--text)', textAlign: 'right', fontWeight: 600 }}>EGP {(e.amountPaid || (e.course && e.course.price) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--c-sub)', backgroundColor: 'var(--bg-main)', borderRadius: '12px', marginBottom: '24px' }}>
                    No enrollments found for this trace period.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-main)', boxShadow: 'var(--inner-shadow)', borderRadius: '12px', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--c-sub)', fontWeight: 600, fontSize: '1.1rem' }}>Total Generated:</span>
                  <span style={{ color: 'var(--c-orange)', fontWeight: 700, fontSize: '1.2rem' }}>
                    EGP {traceData?.totalSum ? traceData.totalSum.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button 
                    onClick={() => setIsViewingTrace(false)}
                    style={{ padding: '10px 24px', background: 'var(--bg-main)', border: 'none', boxShadow: 'var(--inner-shadow)', color: 'var(--c-sub)', borderRadius: '24px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Back to Details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
