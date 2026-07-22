import { useState, useRef } from 'react';
import api from '../api/axios';
import CustomSelect from './CustomSelect';

const DEPARTMENTS = [
  "Computer Science", "Information Technology", "Software Engineering", 
  "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
  "Business Administration", "Accounting", "Marketing",
  "Medicine", "Pharmacy", "Dentistry", "Architecture",
  "Arts & Humanities", "Law", "Sciences", "Education"
];

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'account', label: 'Account' },
];

export default function SettingsPage({ user, setUser, isLightMode, toggleTheme, onLogout }) {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="settings-page animate-entrance" style={{ width: '100%' }}>
      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px', alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, paddingLeft: '24px' }}>Settings</h1>
          <nav className="settings-nav solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: '24px', right: '24px', height: '48px',
              background: 'var(--bg-main)', borderRadius: '8px',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `translateY(${SECTIONS.findIndex(s => s.id === activeSection) * (48 + 8)}px)`,
              pointerEvents: 'none', zIndex: 0
            }} />
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
              style={{
                position: 'relative', zIndex: 1,
                textAlign: 'left', height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center',
                borderRadius: '8px', border: 'none', background: 'transparent',
                color: activeSection === s.id ? 'var(--color-accent)' : 'var(--text-secondary)',
                fontWeight: activeSection === s.id ? '700' : '500',
                boxShadow: 'none', cursor: 'pointer', transition: 'color 0.3s ease, font-weight 0.3s ease'
              }}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        </div>
        <div className="settings-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeSection === 'profile' && <ProfileSection user={user} setUser={setUser} />}
          {activeSection === 'appearance' && <AppearanceSection isLightMode={isLightMode} toggleTheme={toggleTheme} />}
          {activeSection === 'account' && <AccountSection user={user} setUser={setUser} onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [goalsText, setGoalsText] = useState(user?.goalsText || '');
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
        lastName,
        phone,
        goalsText,
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
    <form className="settings-section solid-card" onSubmit={handleSave} style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>First Name</label>
          <input type="text" className="solid-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John" required />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Name</label>
          <input type="text" className="solid-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Doe" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Phone Number</label>
          <input type="tel" className="solid-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1 234 567 890" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bio / Goals</label>
          <textarea className="solid-input" value={goalsText} onChange={(e) => setGoalsText(e.target.value)} rows="1" style={{ resize: 'vertical', minHeight: '46px' }} placeholder="Write a short bio or your goals..." />
        </div>
      </div>

      <button type="submit" className="solid-btn" disabled={saving} style={{ marginTop: '16px', alignSelf: 'flex-start', width: 'auto', padding: '12px 32px' }}>
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function AccountSection({ user, setUser, onLogout }) {
  const [email, setEmail] = useState(user?.email || '');
  const [college, setCollege] = useState(user?.college || '');
  const [providedCourses, setProvidedCourses] = useState(user?.providedCourses || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [socialUrl, setSocialUrl] = useState(user?.socialUrl || '');
  
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsSuccess, setDetailsSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError('');
    setDetailsSuccess('');
    try {
      const res = await api.patch('/auth/profile', {
        email,
        college,
        providedCourses,
        linkedinUrl,
        socialUrl
      });
      setUser(res.data.user);
      setDetailsSuccess('Account details updated successfully.');
    } catch (err) {
      setDetailsError(err.response?.data?.message || 'Failed to update account details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, marginBottom: '8px' }}>Account</h2>
        <p className="settings-section-desc" style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your account details and security.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <form onSubmit={handleSaveDetails} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Account Information</h3>
          {detailsError && <div className="settings-message settings-message-error" style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{detailsError}</div>}
          {detailsSuccess && <div className="settings-message settings-message-success" style={{ color: '#10B981', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>{detailsSuccess}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Email Address</label>
            <input type="email" className="solid-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Department / College</label>
            <CustomSelect 
              options={[
                ...DEPARTMENTS.map(d => ({ value: d, label: d })),
                { value: 'Other', label: 'Other' }
              ]}
              value={college}
              onChange={setCollege}
              placeholder="e.g. Computer Science, Engineering"
            />
          </div>
            {user?.role === 'instructor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Course Provided</label>
                <input type="text" className="solid-input" value={providedCourses} onChange={(e) => setProvidedCourses(e.target.value)} placeholder="E.g. Web Development 101" />
              </div>
            )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>LinkedIn URL</label>
            <input type="url" className="solid-input" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Other Social / Website</label>
            <input type="url" className="solid-input" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="https://yourwebsite.com" />
          </div>
        </div>
        <button type="submit" className="solid-btn" disabled={savingDetails} style={{ marginTop: 'auto', alignSelf: 'flex-start', width: 'auto', padding: '12px 32px', borderRadius: '50px' }}>
          {savingDetails ? 'Saving...' : 'Save Account Info'}
        </button>
      </form>

      <form onSubmit={handleSavePassword} className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Change Password</h3>
        {passwordError && <div className="settings-message settings-message-error" style={{ color: '#ef4444', padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{passwordError}</div>}
        {passwordSuccess && <div className="settings-message settings-message-success" style={{ color: '#10B981', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>{passwordSuccess}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Password</label>
          <input type="password" className="solid-input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter your current password" required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>New Password</label>
            <input type="password" className="solid-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter a new password" required minLength={6} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Confirm New Password</label>
            <input type="password" className="solid-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" required minLength={6} />
          </div>
        </div>
        <button type="submit" className="solid-btn" disabled={savingPassword} style={{ marginTop: 'auto', alignSelf: 'flex-start', width: 'auto', padding: '12px 32px', borderRadius: '50px', background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)' }}>
          {savingPassword ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <div className="solid-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Device Sessions</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>Sign out of Program on this device. You will need to log back in to access your dashboard.</p>
        <button type="button" className="solid-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', boxShadow: 'none', alignSelf: 'flex-start', width: 'auto', padding: '10px 24px', marginTop: 'auto', borderRadius: '50px' }} onClick={onLogout}>
          Log out
        </button>
      </div>

      <div className="solid-card" style={{ background: 'rgba(239, 68, 68, 0.05)', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#ef4444' }}>Danger Zone</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>Permanently delete your account and all of your data. This action cannot be undone.</p>
        <button type="button" className="solid-btn" style={{ background: '#ef4444', color: '#fff', border: 'none', boxShadow: 'none', alignSelf: 'flex-start', width: 'auto', padding: '10px 24px', marginTop: 'auto', borderRadius: '50px' }}>
          Delete Account
        </button>
      </div>
      </div>
    </div>
  );
}

function AppearanceSection({ isLightMode, toggleTheme }) {
  return (
    <div className="settings-section solid-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>Appearance</h2>
      <p className="settings-section-desc" style={{ color: 'var(--text-secondary)' }}>Choose how Program looks on this device.</p>

      <div className="appearance-options" style={{ display: 'flex', gap: '16px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 'calc(50% - 8px)',
          background: 'var(--bg-main)', borderRadius: '12px', border: 'none',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isLightMode ? 'translateX(calc(100% + 16px))' : 'translateX(0)',
          pointerEvents: 'none', zIndex: 0
        }} />
        <button
          type="button"
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: 1, padding: '16px', borderRadius: '12px', border: 'none',
            background: 'transparent',
            color: !isLightMode ? 'var(--color-accent)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
            boxShadow: 'none'
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
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            flex: 1, padding: '16px', borderRadius: '12px', border: 'none',
            background: 'transparent',
            color: isLightMode ? 'var(--color-accent)' : 'var(--text-secondary)',
            fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
            boxShadow: 'none'
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
