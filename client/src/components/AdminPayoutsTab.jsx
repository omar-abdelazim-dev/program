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

  const handleAction = async () => {
    if (!selectedPayout) return;
    try {
      if (actionType === 'clear') {
        await api.put(`/financials/${selectedPayout._id}/complete`);
        notyf.success('Payout marked as cleared');
      } else if (actionType === 'reject') {
        await api.put(`/financials/${selectedPayout._id}/reject`);
        notyf.success('Payout rejected');
      }
      setShowConfirm(false);
      setSelectedPayout(null);
      fetchPayouts();
    } catch (err) {
      console.error(err);
      notyf.error(err.response?.data?.message || `Failed to ${actionType} payout`);
    }
  };

  const openConfirmModal = (payout, action) => {
    setSelectedPayout(payout);
    setActionType(action);
    setShowConfirm(true);
  };

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const clearedPayouts = payouts.filter(p => p.status === 'cleared');
  const rejectedPayouts = payouts.filter(p => p.status === 'rejected');

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
                <th style={{ padding: '16px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Method</th>
                <th style={{ padding: '16px', fontWeight: 600 }}>Details</th>
                <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    Loading payouts...
                  </td>
                </tr>
              ) : pendingPayouts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    No pending payout requests.
                  </td>
                </tr>
              ) : (
                pendingPayouts.map((tx) => (
                  <tr key={tx._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px', color: 'var(--text)' }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500 }}>
                      {tx.instructor?.name || 'Unknown'}<br />
                      <small style={{ color: 'var(--c-sub)', fontWeight: 'normal' }}>{tx.instructor?.email}</small>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--c-orange)', fontWeight: 600 }}>
                      EGP {Math.abs(tx.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', textTransform: 'capitalize' }}>
                      {tx.payoutMethod?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)' }}>
                      {tx.payoutDetails}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openConfirmModal(tx, 'reject')}
                          style={{ 
                            padding: '8px 24px', 
                            fontSize: '0.9rem', 
                            color: '#fca5a5', 
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            transition: 'all 0.2s'
                          }}
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => openConfirmModal(tx, 'clear')}
                          style={{ 
                            padding: '8px 24px', 
                            fontSize: '0.9rem', 
                            color: '#6ee7b7', 
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            transition: 'all 0.2s'
                          }}
                        >
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(clearedPayouts.length > 0 || rejectedPayouts.length > 0) && (
        <div className="glass-card animate-entrance" style={{ padding: '24px', overflow: 'hidden', marginTop: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--text-h)' }}>Processed Requests</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)' }}>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Instructor</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '16px', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '16px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.filter(p => p.status !== 'pending').map((tx) => (
                  <tr key={tx._id} className="analytics-row" style={{ backgroundColor: 'transparent', transition: 'all 0.3s' }}>
                    <td style={{ padding: '16px', color: 'var(--text)', borderBottom: '1px solid var(--border)', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                      {new Date(tx.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                      {tx.instructor?.name || 'Unknown'}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                      EGP {Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text)', textTransform: 'capitalize', borderBottom: '1px solid var(--border)' }}>
                      {tx.payoutMethod?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', borderBottom: '1px solid var(--border)', borderTopRightRadius: '16px', borderBottomRightRadius: '16px' }}>
                      <span className="status-badge" style={{
                        color: tx.status === 'cleared' ? '#10b981' : tx.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showConfirm}
        title={actionType === 'clear' ? "Clear Payout" : "Reject Payout"}
        message={actionType === 'clear' 
          ? `Are you sure you want to mark this payout of EGP ${selectedPayout ? Math.abs(selectedPayout.amount).toLocaleString() : ''} to ${selectedPayout?.instructor?.name || 'this instructor'} as cleared? Ensure you have actually transferred the funds before doing this. This will also permanently erase their payment details from the database.`
          : `Are you sure you want to REJECT this payout of EGP ${selectedPayout ? Math.abs(selectedPayout.amount).toLocaleString() : ''}? The requested amount will remain in their available balance.`}
        confirmText={actionType === 'clear' ? "Mark as Cleared" : "Reject Request"}
        cancelText="Cancel"
        intent={actionType === 'clear' ? "primary" : "danger"}
        onConfirm={handleAction}
        onCancel={() => {
          setShowConfirm(false);
          setSelectedPayout(null);
        }}
      />
    </div>
  );
}
