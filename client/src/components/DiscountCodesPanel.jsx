import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import notyf from '../utils/notyf';
import { useTranslation } from 'react-i18next';
import SegmentedControl from './common/SegmentedControl';
import ConfirmModal from './ConfirmModal';

export default function DiscountCodesPanel() {
  const { t } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', discountPercentage: '', expiresAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState('all');

  // Edit Modal State
  const [editingCode, setEditingCode] = useState(null);
  const [editForm, setEditForm] = useState({ code: '', discountPercentage: '', expiresAt: '', isActive: true });
  const [editLoading, setEditLoading] = useState(false);

  // Renew Modal State
  const [renewingCode, setRenewingCode] = useState(null);
  const [renewExpiresAt, setRenewExpiresAt] = useState('');
  const [renewLoading, setRenewLoading] = useState(false);

  // Confirm Modal State (for Delete)
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete', code: object }

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get('/admin/discount-codes');
      setCodes(r.data.discountCodes || []);
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Unable to load discount codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/discount-codes', form);
      setForm({ code: '', discountPercentage: '', expiresAt: '' });
      notyf.success('Discount code created successfully');
      load();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Unable to create discount code.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Stop / Activate
  const handleToggle = async (code) => {
    try {
      const res = await api.patch(`/admin/discount-codes/${code._id}/toggle`);
      notyf.success(res.data.message || 'Status updated');
      load();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Open Edit Modal
  const openEdit = (code) => {
    const localDate = new Date(code.expiresAt).toISOString().slice(0, 16);
    setEditForm({
      code: code.code,
      discountPercentage: code.discountPercentage,
      expiresAt: localDate,
      isActive: code.isActive,
    });
    setEditingCode(code);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingCode) return;
    setEditLoading(true);
    try {
      await api.put(`/admin/discount-codes/${editingCode._id}`, editForm);
      notyf.success('Discount code updated successfully');
      setEditingCode(null);
      load();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to update discount code');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Renew Modal
  const openRenew = (code) => {
    // Default renew date to +30 days from now
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    setRenewExpiresAt(nextMonth.toISOString().slice(0, 16));
    setRenewingCode(code);
  };

  const setRenewPresetDays = (days) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    setRenewExpiresAt(target.toISOString().slice(0, 16));
  };

  const submitRenew = async (e) => {
    e.preventDefault();
    if (!renewingCode) return;
    setRenewLoading(true);
    try {
      await api.patch(`/admin/discount-codes/${renewingCode._id}/renew`, {
        expiresAt: renewExpiresAt,
      });
      notyf.success('Discount code renewed successfully');
      setRenewingCode(null);
      load();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to renew discount code');
    } finally {
      setRenewLoading(false);
    }
  };

  // Delete Action
  const confirmDelete = async () => {
    if (!confirmAction?.code) return;
    try {
      await api.delete(`/admin/discount-codes/${confirmAction.code._id}`);
      notyf.success('Discount code deleted successfully');
      setConfirmAction(null);
      load();
    } catch (err) {
      notyf.error(err.response?.data?.message || 'Failed to delete discount code');
    }
  };

  // Filter computation
  const getStatus = (code) => {
    const isExpired = new Date(code.expiresAt) <= new Date();
    if (isExpired) return 'expired';
    if (!code.isActive) return 'stopped';
    return 'active';
  };

  const counts = useMemo(() => {
    let active = 0;
    let expired = 0;
    let stopped = 0;
    codes.forEach((c) => {
      const s = getStatus(c);
      if (s === 'active') active++;
      else if (s === 'expired') expired++;
      else if (s === 'stopped') stopped++;
    });
    return { all: codes.length, active, expired, stopped };
  }, [codes]);

  const filteredCodes = useMemo(() => {
    if (filterTab === 'all') return codes;
    return codes.filter((c) => getStatus(c) === filterTab);
  }, [codes, filterTab]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    notyf.success(`Copied "${text}" to clipboard`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: '0 0 4px 0', color: 'var(--text-h)' }}>
            {t('admin.discount_codes', 'Discount Codes')}
          </h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--c-sub)' }}>
            {t('admin.discount_codes_desc', 'Create, update, stop, and renew promotional discount coupons for courses.')}
          </div>
        </div>
      </div>

      {/* Create New Code Card */}
      <section className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-h)' }}>
          {t('admin.create_discount_code', 'Create New Discount Code')}
        </h3>
        <form
          onSubmit={submitCreate}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            alignItems: 'end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
              Code Name
            </label>
            <input
              className="solid-input"
              required
              maxLength="40"
              placeholder="e.g. SUMMER25"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              style={{ borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
              Discount % (1-99)
            </label>
            <input
              className="solid-input"
              required
              type="number"
              min="1"
              max="99"
              placeholder="e.g. 25"
              value={form.discountPercentage}
              onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })}
              style={{ borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
              Expiration Date & Time
            </label>
            <input
              className="solid-input"
              required
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              style={{ borderRadius: '8px', fontSize: '0.9rem', width: '100%' }}
            />
          </div>
          <div>
            <button
              className="solid-btn"
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {submitting ? 'Creating...' : '+ Create Discount Code'}
            </button>
          </div>
        </form>
      </section>

      {/* Filter Tabs & Table Card */}
      <section className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <SegmentedControl
            tabs={[
              { id: 'all', label: `All (${counts.all})` },
              { id: 'active', label: `Active (${counts.active})` },
              { id: 'stopped', label: `Stopped (${counts.stopped})` },
              { id: 'expired', label: `Expired (${counts.expired})` },
            ]}
            activeTab={filterTab}
            onChange={setFilterTab}
            style={{ marginBottom: 0 }}
            trackStyle={{
              background: 'var(--bg-main)',
              boxShadow: 'var(--inner-shadow)',
            }}
            indicatorStyle={{
              background: 'var(--bg-surface)',
              boxShadow: 'var(--outer-shadow)',
            }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--c-sub)', fontSize: '0.85rem' }}>
                <th style={{ padding: '14px 16px' }}>Code</th>
                <th style={{ padding: '14px 16px' }}>Discount</th>
                <th style={{ padding: '14px 16px' }}>Expiration</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCodes.length > 0 ? (
                filteredCodes.map((code) => {
                  const status = getStatus(code);
                  const isExpired = status === 'expired';
                  const isStopped = status === 'stopped';
                  const isActive = status === 'active';

                  return (
                    <tr
                      key={code._id}
                      style={{
                        borderBottom: '1px solid var(--c-border-subtle, rgba(255,255,255,0.05))',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            onClick={() => copyToClipboard(code.code)}
                            title="Click to copy"
                            style={{
                              fontWeight: '700',
                              fontSize: '1rem',
                              color: 'var(--text-h)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {code.code}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c-sub)" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </span>
                        </div>
                      </td>

                      {/* Discount */}
                      <td style={{ padding: '14px 16px', color: 'var(--color-accent, #f97316)', fontWeight: '800', fontSize: '1.05rem' }}>
                        {code.discountPercentage}%
                      </td>

                      {/* Expiration */}
                      <td style={{ padding: '14px 16px', color: isExpired ? '#ef4444' : 'var(--c-sub)', fontSize: '0.9rem' }}>
                        <div>{new Date(code.expiresAt).toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.8 }}>
                          {isExpired ? 'Expired' : `Valid until ${new Date(code.expiresAt).toLocaleDateString()}`}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: isActive
                              ? 'rgba(16, 185, 129, 0.12)'
                              : isStopped
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            color: isActive ? '#10b981' : isStopped ? '#f59e0b' : '#ef4444',
                            boxShadow: 'var(--inner-shadow)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Stop / Activate Toggle */}
                          {!isExpired && (
                            <button
                              onClick={() => handleToggle(code)}
                              title={isActive ? 'Stop this discount code' : 'Activate this discount code'}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: isActive ? '#f59e0b' : '#10b981',
                                fontWeight: '600',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                boxShadow: 'var(--inner-shadow)',
                                transition: 'all 0.2s',
                              }}
                            >
                              {isActive ? 'Stop' : 'Activate'}
                            </button>
                          )}

                          {/* Renew / Extend */}
                          <button
                            onClick={() => openRenew(code)}
                            title="Renew or extend expiration"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--bg-main)',
                              color: 'var(--color-accent, #f97316)',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              boxShadow: 'var(--inner-shadow)',
                              transition: 'all 0.2s',
                            }}
                          >
                            Renew
                          </button>

                          {/* Edit / Update */}
                          <button
                            onClick={() => openEdit(code)}
                            title="Update discount details"
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              boxShadow: 'var(--inner-shadow)',
                              transition: 'all 0.2s',
                            }}
                          >
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', code })}
                            title="Delete discount code"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: 'none',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              fontWeight: '600',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              boxShadow: 'var(--inner-shadow)',
                              transition: 'all 0.2s',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--c-sub)' }}>
                    {loading ? 'Loading discount codes...' : `No ${filterTab === 'all' ? '' : filterTab} discount codes found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      {editingCode &&
        createPortal(
          <div
            onClick={() => setEditingCode(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '16px',
            }}
          >
            <div
              className="glass-card animate-entrance"
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '32px',
                maxWidth: '480px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                borderRadius: '16px',
                boxShadow: 'var(--outer-shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-h)' }}>
                  Update Discount Code
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCode(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--c-sub)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
                    Code Name
                  </label>
                  <input
                    className="solid-input"
                    required
                    maxLength="40"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    style={{ borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
                    Discount Percentage (%)
                  </label>
                  <input
                    className="solid-input"
                    required
                    type="number"
                    min="1"
                    max="99"
                    value={editForm.discountPercentage}
                    onChange={(e) => setEditForm({ ...editForm, discountPercentage: e.target.value })}
                    style={{ borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
                    Expiration Date & Time
                  </label>
                  <input
                    className="solid-input"
                    required
                    type="datetime-local"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                    style={{ borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#f97316', cursor: 'pointer' }}
                  />
                  <label htmlFor="editIsActive" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Code is active and usable
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingCode(null)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--bg-main)',
                      color: 'var(--c-sub)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: 'var(--inner-shadow)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="solid-btn"
                    type="submit"
                    disabled={editLoading}
                    style={{ padding: '10px 24px' }}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Renew Modal */}
      {renewingCode &&
        createPortal(
          <div
            onClick={() => setRenewingCode(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '16px',
            }}
          >
            <div
              className="glass-card animate-entrance"
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '32px',
                maxWidth: '440px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                borderRadius: '16px',
                boxShadow: 'var(--outer-shadow)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-h)' }}>
                    Renew Code "{renewingCode.code}"
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--c-sub)' }}>
                    Extend expiration and reactivate this discount coupon.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewingCode(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--c-sub)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setRenewPresetDays(7)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--inner-shadow)',
                  }}
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setRenewPresetDays(30)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--inner-shadow)',
                  }}
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setRenewPresetDays(90)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--inner-shadow)',
                  }}
                >
                  +90 Days
                </button>
              </div>

              <form onSubmit={submitRenew} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-sub)', marginBottom: '6px' }}>
                    New Expiration Date & Time
                  </label>
                  <input
                    className="solid-input"
                    required
                    type="datetime-local"
                    value={renewExpiresAt}
                    onChange={(e) => setRenewExpiresAt(e.target.value)}
                    style={{ borderRadius: '8px', fontSize: '0.95rem', width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setRenewingCode(null)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--bg-main)',
                      color: 'var(--c-sub)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: 'var(--inner-shadow)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="solid-btn"
                    type="submit"
                    disabled={renewLoading}
                    style={{ padding: '10px 24px' }}
                  >
                    {renewLoading ? 'Renewing...' : 'Renew & Activate'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title="Delete Discount Code"
        message={`Are you sure you want to delete "${confirmAction?.code?.code}"? This action cannot be undone.`}
        confirmText="Delete Code"
        cancelText="Cancel"
        intent="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
