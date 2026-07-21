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
    <div className="settings-page">
      <h1>Settings</h1>
      <div className="settings-layout">
        <nav className="settings-nav glass-card">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="settings-panel glass-card">
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
    <form className="settings-section" onSubmit={handleSave}>
      <h2>Profile</h2>
      {error && <div className="settings-message settings-message-error">{error}</div>}
      {success && <div className="settings-message settings-message-success">{success}</div>}

      <div className="avatar-upload">
        <div className="avatar-preview">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar preview" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
            </svg>
          )}
        </div>
        <div>
          <button type="button" className="glass-btn" onClick={() => fileInputRef.current?.click()}>
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

      <div className="input-group">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="input-group">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <button type="submit" className="glass-btn" disabled={saving}>
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
    <form className="settings-section" onSubmit={handleSubmit}>
      <h2>Change Password</h2>
      {error && <div className="settings-message settings-message-error">{error}</div>}
      {success && <div className="settings-message settings-message-success">{success}</div>}

      <div className="input-group">
        <label>Current Password</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </div>
      <div className="input-group">
        <label>New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
      </div>
      <div className="input-group">
        <label>Confirm New Password</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
      </div>

      <button type="submit" className="glass-btn" disabled={saving}>
        {saving ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}

function AppearanceSection({ isLightMode, toggleTheme }) {
  return (
    <div className="settings-section">
      <h2>Appearance</h2>
      <p className="settings-section-desc">Choose how Program looks on this device.</p>

      <div className="appearance-options">
        <button
          type="button"
          className={`appearance-option ${!isLightMode ? 'active' : ''}`}
          onClick={() => { if (isLightMode) toggleTheme(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          Dark
        </button>
        <button
          type="button"
          className={`appearance-option ${isLightMode ? 'active' : ''}`}
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
    <div className="settings-section">
      <h2>Account</h2>
      <p className="settings-section-desc">Sign out of Program on this device.</p>
      <button type="button" className="glass-btn logout-btn" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
