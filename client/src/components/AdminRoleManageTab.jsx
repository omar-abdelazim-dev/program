import { useState } from 'react';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconInfo = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const page = { padding: '32px 24px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main)' };
const card = { background: 'var(--bg-surface)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' };
const banner = {
  display: 'flex', alignItems: 'center', gap: '8px',
  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
  borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
  fontSize: '13px', color: 'var(--c-sub)',
};
const btn = (variant = 'ghost') => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer', border: 'none', transition: 'opacity 0.15s',
  ...(variant === 'primary'
    ? { background: 'var(--color-accent,#f97316)', color: '#fff' }
    : variant === 'danger'
    ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }
    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }),
});
const input = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', padding: '8px 12px', color: 'var(--text-main)',
  fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const label = { fontSize: '12px', color: 'var(--c-sub)', marginBottom: '4px', display: 'block' };
const badge = (color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  background: color + '22', color, border: `1px solid ${color}44`,
  borderRadius: '6px', padding: '2px 8px', fontSize: '11px',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
});

// ─── Data ─────────────────────────────────────────────────────────────────────
const SYSTEM_IDS = ['superadmin', 'admin', 'instructor', 'student'];
const DEFAULT_ROLES = [
  { id: 'superadmin', name: 'Super Admin', description: 'Full platform control — unrestricted access to all features and settings.', color: '#ef4444', usersCount: 3 },
  { id: 'admin',      name: 'Admin',       description: 'Platform management including users, courses, and financial oversight.',    color: '#f97316', usersCount: 8 },
  { id: 'instructor', name: 'Instructor',  description: 'Course creation & management with limited platform access.',               color: '#f59e0b', usersCount: 24 },
  { id: 'student',    name: 'Student',     description: 'Learning platform access — enroll, watch, and interact with courses.',     color: '#22c55e', usersCount: 1240 },
];
const PRESETS = ['#f97316', '#f59e0b', '#8b5cf6', '#22c55e', '#ec4899'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminRoleManageTab() {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name: '', description: '', color: PRESETS[0] });
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});

  const addRole = () => {
    if (!form.name.trim()) return;
    setRoles(r => [...r, { id: Date.now().toString(), ...form, name: form.name.trim(), usersCount: 0 }]);
    setForm({ name: '', description: '', color: PRESETS[0] });
    setShowAdd(false);
  };

  const deleteRole = (id) => { if (!SYSTEM_IDS.includes(id)) setRoles(r => r.filter(x => x.id !== id)); };
  const startEdit  = (role) => { setEditId(role.id); setEditForm({ name: role.name, description: role.description, color: role.color }); };
  const saveEdit   = (id) => { setRoles(r => r.map(x => x.id === id ? { ...x, ...editForm } : x)); setEditId(null); };

  const ColorPicker = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
      {PRESETS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
          border: value === c ? '2.5px solid #fff' : '2px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
        }}>
          {value === c && <IconCheck />}
        </button>
      ))}
    </div>
  );

  return (
    <div style={page}>
      {/* Banner */}
      <div style={banner}><IconInfo /> Role changes are saved locally for demonstration. Backend integration coming soon.</div>


      {/* Inline Add Form */}
      {showAdd && (
        <div style={{ ...card, marginBottom: '20px', borderColor: 'rgba(249,115,22,0.3)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-h)' }}>New Custom Role</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={label}>Role Name *</label>
              <input style={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Moderator" />
            </div>
            <div>
              <label style={label}>Description</label>
              <input style={input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <label style={label}>Badge Color</label>
            <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button style={btn('primary')} onClick={addRole}><IconSave /> Save Role</button>
            <button style={btn()} onClick={() => { setShowAdd(false); setForm({ name: '', description: '', color: PRESETS[0] }); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Role Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {roles.map(role => (
          <div key={role.id} style={card}>
            {editId === role.id ? (
              <div>
                <label style={label}>Name</label>
                <input style={{ ...input, marginBottom: '8px' }} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                <label style={label}>Description</label>
                <input style={{ ...input, marginBottom: '10px' }} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                <label style={label}>Color</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', marginTop: '4px' }}>
                  {PRESETS.map(c => (
                    <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))} style={{
                      width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: editForm.color === c ? '2px solid #fff' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {editForm.color === c && <IconCheck />}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={btn('primary')} onClick={() => saveEdit(role.id)}><IconCheck /> Save</button>
                  <button style={btn()} onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={badge(role.color)}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: role.color, display: 'inline-block' }} />
                    {role.name}
                  </span>
                  {SYSTEM_IDS.includes(role.id) && (
                    <span style={{ fontSize: '10px', color: 'var(--c-sub)', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '2px 6px' }}>System</span>
                  )}
                </div>
                <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--c-sub)', lineHeight: 1.55 }}>{role.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--c-sub)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <IconUsers />{role.usersCount.toLocaleString()} users
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button style={btn()} title="Edit" onClick={() => startEdit(role)}><IconEdit /></button>
                    {!SYSTEM_IDS.includes(role.id) && (
                      <button style={btn('danger')} title="Delete" onClick={() => deleteRole(role.id)}><IconTrash /></button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
