import { useState, useEffect } from 'react';
import api from '../api/axios';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const page = { padding: '32px 24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main)' };
const card = { background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' };
const input = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)',
  fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const badge = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  background: color + '22', color, border: `1px solid ${color}44`,
  borderRadius: '6px', padding: '2px 8px', fontSize: '11px',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
});

const ROLE_COLORS = { superadmin: '#ef4444', admin: '#f97316', instructor: '#f59e0b', student: '#22c55e' };

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent,#f97316)" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>
    </path>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminRoleAssignmentsTab({ user: currentUser }) {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get('/admin/users')
      .then(res => {
        const data = res.data;
        setUsers(Array.isArray(data) ? data : (data.users || []));
      })
      .catch(() => setError('Failed to load users. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const changeRole = async (uid, newRole) => {
    setUpdating(u => ({ ...u, [uid]: true }));
    try {
      await api.patch(`/admin/users/${uid}/role`, { role: newRole });
      setUsers(u => u.map(x => (x._id === uid || x.id === uid) ? { ...x, role: newRole } : x));
    } catch {
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(u => ({ ...u, [uid]: false }));
    }
  };

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const roleOptions  = isSuperAdmin
    ? ['student', 'instructor', 'admin', 'superadmin']
    : ['student', 'instructor', 'admin'];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q
      || (u.name     || u.fullName || '').toLowerCase().includes(q)
      || (u.email    || '').toLowerCase().includes(q);
  });

  const initial = (u) => ((u.name || u.fullName || u.email || '?')[0]).toUpperCase();

  return (
    <div style={page}>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '64px 0', color: 'var(--c-sub)', fontSize: '14px' }}>
          <Spinner /><span>Loading users…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ ...card, padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['User', 'Email', 'Current Role', 'Change Role'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 18px', color: 'var(--c-sub)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: 'var(--c-sub)', fontSize: '14px' }}>
                    No users match your search.
                  </td>
                </tr>
              ) : filtered.map(u => {
                const uid       = u._id || u.id;
                const name      = u.name || u.fullName || '—';
                const role      = u.role || 'student';
                const roleColor = ROLE_COLORS[role] || '#888';

                return (
                  <tr key={uid} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>

                    {/* Avatar + Name */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.avatar ? (
                          <img src={u.avatar} alt={name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: roleColor + '22', color: roleColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 700,
                          }}>{initial(u)}</div>
                        )}
                        <span style={{ fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '12px 18px', color: 'var(--c-sub)', whiteSpace: 'nowrap' }}>{u.email || '—'}</td>

                    {/* Role badge */}
                    <td style={{ padding: '12px 18px' }}>
                      <span style={badge(roleColor)}>{role}</span>
                    </td>

                    {/* Role selector */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={role}
                          onChange={e => changeRole(uid, e.target.value)}
                          disabled={!!updating[uid]}
                          style={{
                            ...input, width: 'auto', minWidth: '140px', cursor: 'pointer',
                            opacity: updating[uid] ? 0.5 : 1,
                          }}
                        >
                          {roleOptions.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        {updating[uid] && (
                          <span style={{ fontSize: '11px', color: 'var(--c-sub)', whiteSpace: 'nowrap' }}>Saving…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
