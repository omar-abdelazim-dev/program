import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function DiscountCodesPanel() {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState({ code: '', discountPercentage: '', expiresAt: '' });
  const [error, setError] = useState('');
  const load = () => api.get('/admin/discount-codes').then((r) => setCodes(r.data.discountCodes || [])).catch(() => setError('Unable to load discount codes.'));
  useEffect(() => { load(); }, []);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { await api.post('/admin/discount-codes', form); setForm({ code: '', discountPercentage: '', expiresAt: '' }); load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to create discount code.'); }
  };
  return <section className="glass-card" style={{ padding: 24 }}>
    <h3 style={{ marginTop: 0 }}>Discount Codes</h3>
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
      <input required maxLength="40" placeholder="Code (e.g. WELCOME20)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
      <input required type="number" min="1" max="99" placeholder="Discount %" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
      <input required type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
      <button className="solid-btn" type="submit">Create Discount Code</button>
    </form>
    {error && <p style={{ color: '#ef4444' }}>{error}</p>}
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th align="left">Code</th><th align="left">Discount</th><th align="left">Expiration</th><th align="left">Status</th></tr></thead>
      <tbody>{codes.map((code) => { const active = code.isActive && new Date(code.expiresAt) > new Date(); return <tr key={code._id}><td>{code.code}</td><td>{code.discountPercentage}%</td><td>{new Date(code.expiresAt).toLocaleString()}</td><td style={{ color: active ? '#10b981' : '#ef4444' }}>{active ? 'Active' : 'Expired'}</td></tr>; })}</tbody>
    </table></div>
  </section>;
}
