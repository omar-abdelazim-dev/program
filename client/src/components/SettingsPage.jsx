import { useState, useRef } from 'react';
import api from '../api/axios';

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Change Password' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
];

export default function SettingsPage({ user, setUser, isLightMode, toggleTheme, onLogout }) {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="settings-page animate-entrance" style={{ padding: '40px 24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Settings</h1>
      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px', alignItems: 'start' }}>
        <nav className="settings-nav solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'sticky', top: '24px' }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeSection === s.id ? 'var(--bg-main)' : 'transparent',
                color: activeSection === s.id ? 'var(--color-accent)' : 'var(--text-secondary)',
                fontWeight: activeSection === s.id ? '700' : '500',
                boxShadow: activeSection === s.id ? 'inset 0 4px 12px rgba(0,0,0,0.5)' : 'inset 0 0 0 rgba(0,0,0,0)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="settings-panel solid-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeSection === 'profile' && <ProfileSection user={user} setUser={setUser} />}
          {activeSection === 'password' && <PasswordSection />}
          {activeSection === 'appearance' && <AppearanceSection isLightMode={isLightMode} toggleTheme={toggleTheme} />}
          {activeSection === 'account' && <AccountSection onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        const fileData = new FormData();
        fileData.append('image', avatarFile);
        const uploadRes = await api.post('/uploads/image', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        nextAvatarUrl = uploadRes.data.url;
      }

      const res = await api.patch('/auth/profile', {
        name,
        email,
        avatarUrl: nextAvatarUrl,
      });

      setUser(res.data.user);
      setAvatarUrl(res.data.user.avatarUrl);
      setAvatarFile(null);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="settings-section" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Profile</h2>
      {error && <div className="settings-message settings-message-error" style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div className="settings-message settings-message-success" style={{ color: '#10B981', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>{success}</div>}

      <div className="avatar-upload" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
        <div className="avatar-preview" style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-main)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--text-secondary)" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
            </svg>
          )}
        </div>
        <div>
          <button type="button" className="solid-btn" style={{ background: 'var(--bg-main)', border: '2px solid transparent', color: 'var(--text-primary)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }} onClick={() => fileInputRef.current?.click()}>
            Change picture
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Name</label>
        <input type="text" className="solid-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</label>
        <input type="email" className="solid-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <button type="submit" className="solid-btn" disabled={saving} style={{ marginTop: '16px', alignSelf: 'flex-start', width: 'auto', padding: '12px 32px' }}>
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="settings-section" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Change Password</h2>
      {error && <div className="settings-message settings-message-error" style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}
      {success && <div className="settings-message settings-message-success" style={{ color: '#10B981', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Password</label>
        <input type="password" className="solid-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>New Password</label>
        <input type="password" className="solid-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Confirm New Password</label>
        <input type="password" className="solid-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
      </div>

      <button type="submit" className="solid-btn" disabled={saving} style={{ marginTop: '16px', alignSelf: 'flex-start', width: 'auto', padding: '12px 32px' }}>
        {saving ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}

function AppearanceSection({ isLightMode, toggleTheme }) {
  return (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Appearance</h2>
      <p className="settings-section-desc" style={{ color: 'var(--text-secondary)' }}>Choose how Program looks on this device.</p>

      <div className="appearance-options" style={{ display: 'flex', gap: '16px' }}>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: 1, padding: '16px', borderRadius: '12px', border: !isLightMode ? '2px solid var(--color-accent)' : '2px solid var(--border)',
            background: !isLightMode ? 'var(--bg-main)' : 'transparent',
            color: !isLightMode ? 'var(--color-accent)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: !isLightMode ? 'inset 0 4px 12px rgba(0,0,0,0.5)' : 'inset 0 0 0 rgba(0,0,0,0)'
          }}
          onClick={() => { if (isLightMode) toggleTheme(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          Dark
        </button>
        <button
          type="button"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: 1, padding: '16px', borderRadius: '12px', border: isLightMode ? '2px solid var(--color-accent)' : '2px solid var(--border)',
            background: isLightMode ? 'var(--bg-main)' : 'transparent',
            color: isLightMode ? 'var(--color-accent)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: isLightMode ? 'inset 0 4px 12px rgba(0,0,0,0.5)' : 'inset 0 0 0 rgba(0,0,0,0)'
          }}
          onClick={() => { if (!isLightMode) toggleTheme(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="12" y1="2" x2="12" y2="4"></line>
            <line x1="12" y1="20" x2="12" y2="22"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="2" y1="12" x2="4" y2="12"></line>
            <line x1="20" y1="12" x2="22" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          Light
        </button>
      </div>
    </div>
  );
}

function AccountSection({ onLogout }) {
  return (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Account</h2>
      <p className="settings-section-desc" style={{ color: 'var(--text-secondary)' }}>Sign out of Program on this device.</p>
      <button type="button" className="solid-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', boxShadow: 'none', alignSelf: 'flex-start', padding: '12px 32px' }} onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
