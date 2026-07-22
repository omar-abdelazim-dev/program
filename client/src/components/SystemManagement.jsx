import React, { useState, useEffect } from 'react';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import api from '../api/axios';
import CommissionSlider from './CommissionSlider';

const notyf = new Notyf({
  position: { x: 'right', y: 'top' },
  types: [{ type: 'info', background: '#3B82F6', icon: false }]
});

const TABS = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'financial', label: 'Financial', icon: 'dollar-sign' },
  { id: 'registration', label: 'Registration', icon: 'user-plus' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'storage', label: 'Storage', icon: 'hard-drive' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'appearance', label: 'Appearance', icon: 'layout' },
  { id: 'maintenance', label: 'Maintenance', icon: 'tool' },
  { id: 'backup', label: 'Backup', icon: 'database' },
  { id: 'logs', label: 'Logs', icon: 'file-text' },
  { id: 'api', label: 'API & Webhooks', icon: 'code' },
  { id: 'features', label: 'Feature Flags', icon: 'toggle-right' },
  { id: 'ai', label: 'AI Settings', icon: 'cpu' },
  { id: 'audit', label: 'Audit Logs', icon: 'list' }
];

// Helper to check if field should be disabled for Admin
const isFieldRestricted = (tab, field, isSuperAdmin) => {
  if (isSuperAdmin) return false;
  
  // Rules for standard Admin
  switch (tab) {
    case 'general':
      // Admin can edit contact email, support email, homepage announcement
      return !['contactEmail', 'supportEmail', 'homepageAnnouncement'].includes(field);
    case 'financial':
    case 'registration':
    case 'security':
    case 'api':
    case 'features':
    case 'ai':
    case 'audit':
    case 'maintenance':
    case 'backup':
      return true; // Completely restricted from editing
    case 'storage':
    case 'logs':
      return true; // Read only
    case 'email':
      // Only Test Utility is allowed, configuration is restricted
      return field !== 'test_utility';
    case 'notifications':
      // Admins may edit notification preferences that affect communications but not system-level infrastructure
      return ['pushNotifications', 'systemAlerts'].includes(field);
    case 'appearance':
      // Admins may edit branding content except core platform identity
      return ['platformLogo', 'favicon'].includes(field);
    default:
      return true;
  }
};

const ToggleSwitch = ({ label, checked, onChange, disabled }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--c-border-subtle)', opacity: disabled ? 0.6 : 1 }} title={disabled ? "Super Admin permission required" : ""}>
    <span style={{ color: 'var(--text-h)', fontWeight: 500, fontSize: '0.95rem' }}>{label}</span>
    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e)} style={{ opacity: 0, width: 0, height: 0 }} disabled={disabled} />
      <span style={{
        position: 'absolute', cursor: disabled ? 'not-allowed' : 'pointer', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: checked ? '#3B82F6' : 'var(--c-border)', transition: '.4s', borderRadius: '34px'
      }}>
        <span style={{
          position: 'absolute', content: '""', height: '18px', width: '18px', left: checked ? '22px' : '3px', bottom: '3px',
          backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
        }} />
      </span>
    </label>
  </div>
);

const InputField = ({ label, type = "text", value, onChange, disabled, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="glass-input"
      style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="glass-input"
        style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', appearance: 'none', paddingRight: '40px' }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: 'var(--c-bg)', color: 'var(--text-h)' }}>{opt.label}</option>
        ))}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-h)' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  </div>
);

const TextareaField = ({ label, value, onChange, disabled, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="glass-input"
      style={{ width: '100%', minHeight: '100px', resize: 'vertical', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

// Sub-Panels
const GeneralPanel = ({ state, handleChange, isSuperAdmin }) => (
  <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
    <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>General Settings</h3>
    <InputField label="Platform Name" value={state.platformName} onChange={e => handleChange('general', 'platformName', e.target.value)} disabled={isFieldRestricted('general', 'platformName', isSuperAdmin)} />
    <InputField label="Contact Email" value={state.contactEmail} onChange={e => handleChange('general', 'contactEmail', e.target.value)} disabled={isFieldRestricted('general', 'contactEmail', isSuperAdmin)} />
    <InputField label="Support Email" value={state.supportEmail} onChange={e => handleChange('general', 'supportEmail', e.target.value)} disabled={isFieldRestricted('general', 'supportEmail', isSuperAdmin)} />
    <TextareaField label="Homepage Announcement" value={state.homepageAnnouncement} onChange={e => handleChange('general', 'homepageAnnouncement', e.target.value)} disabled={isFieldRestricted('general', 'homepageAnnouncement', isSuperAdmin)} placeholder="Enter a global announcement to display on the homepage" />
  </div>
);

const FinancialPanel = ({ state, handleChange, isSuperAdmin }) => (
  <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
    <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Financial Configuration</h3>
    
    <CommissionSlider 
      value={state.commission} 
      onChange={val => handleChange('financial', 'commission', val)} 
      disabled={isFieldRestricted('financial', 'commission', isSuperAdmin)} 
    />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <InputField label="Tax Percentage (%)" type="number" value={state.tax} onChange={e => handleChange('financial', 'tax', e.target.value)} disabled={isFieldRestricted('financial', 'tax', isSuperAdmin)} />
      <SelectField label="Currency" value={state.currency} onChange={e => handleChange('financial', 'currency', e.target.value)} disabled={isFieldRestricted('financial', 'currency', isSuperAdmin)} options={[{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }, { value: 'EGP', label: 'EGP (E£)' }]} />
      <InputField label="Refund Window (Days)" type="number" value={state.refundWindow} onChange={e => handleChange('financial', 'refundWindow', e.target.value)} disabled={isFieldRestricted('financial', 'refundWindow', isSuperAdmin)} />
      <InputField label="Minimum Withdrawal Amount" type="number" value={state.minWithdrawal} onChange={e => handleChange('financial', 'minWithdrawal', e.target.value)} disabled={isFieldRestricted('financial', 'minWithdrawal', isSuperAdmin)} />
    </div>
    <div style={{ marginTop: '16px' }}>
      <ToggleSwitch label="Stripe Payments Integration" checked={state.stripeEnabled} onChange={e => handleChange('financial', 'stripeEnabled', e.target.checked)} disabled={isFieldRestricted('financial', 'stripeEnabled', isSuperAdmin)} />
      <ToggleSwitch label="PayPal Integration" checked={state.paypalEnabled} onChange={e => handleChange('financial', 'paypalEnabled', e.target.checked)} disabled={isFieldRestricted('financial', 'paypalEnabled', isSuperAdmin)} />
    </div>
  </div>
);

export default function SystemManagement({ user }) {
  const [activeTab, setActiveTab] = useState('general');
  const isSuperAdmin = user?.role === 'superadmin';
  
  // Fallback default state while loading
  const defaultSettings = {
    general: { platformName: '', contactEmail: '', supportEmail: '', homepageAnnouncement: '' },
    financial: { commission: 15, tax: 0, currency: 'USD', refundWindow: 14, minWithdrawal: 50, stripeEnabled: true, paypalEnabled: false },
    registration: { studentRegistration: true, instructorRegistration: true, eduEmailOnly: false, emailVerification: true, phoneVerification: false, inviteOnly: false, autoApproveInstructors: false },
    security: { passwordPolicy: 'strong', sessionTimeout: 60, maxLoginAttempts: 5, twoFactorAuth: false, jwtExpiration: 7, allowedDomains: '', maintenanceLock: false },
    storage: { provider: 'AWS S3', maxUploadSizeMb: 50, allowedFileTypes: '' },
    email: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '' },
    notifications: { studentEmails: true, instructorEmails: true, adminAlerts: true, marketingEmails: false, pushNotifications: false, systemAlerts: true },
    appearance: { platformLogo: '', favicon: '', defaultTheme: 'system', accentColor: '#3B82F6', landingBanner: '', footerInfo: '' },
    maintenance: { isMaintenanceMode: false, message: '', estimatedCompletion: '', whitelist: '' },
    backup: { lastBackup: '', frequency: 'daily' },
    logs: { retentionDays: 30 },
    api: { status: 'active', version: 'v1', webhookUrl: '', rateLimit: 100 },
    features: { notebook: true, community: false, marketplace: false, aiTutor: false, referral: true, betaFeatures: false },
    ai: { provider: 'OpenAI', model: 'gpt-4o', temperature: 0.7, dailyTokenLimit: 100000, prompts: '' },
    audit: { retentionDays: 90, trackUsers: true, trackAdmins: true, trackFinancial: true, trackSettings: true }
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/system/config');
        if (res.data) {
          // Merge fetched data with defaults to ensure nested objects exist
          setSettings(prev => ({ ...prev, ...res.data }));
          setOriginalSettings(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch system config", err);
        notyf.error("Failed to load configuration from backend");
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [commissionSaveModalOpen, setCommissionSaveModalOpen] = useState(false);
  const [commissionApplyScope, setCommissionApplyScope] = useState('future');

  // Email Test Utility State
  const [emailTest, setEmailTest] = useState({ recipient: '', subject: 'Test Email from Program', template: 'Welcome', status: 'idle' });

  const handleChange = (category, field, value) => {
    setSettings(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
    setHasUnsavedChanges(true);
  };

  const handleSaveInit = () => {
    // If commission changed, show modal. Otherwise save immediately.
    if (originalSettings && originalSettings.financial?.commission !== settings.financial.commission) {
      setCommissionSaveModalOpen(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      // For now, save the active tab's settings
      await api.patch(`/system/config/${activeTab}`, settings[activeTab]);
      setHasUnsavedChanges(false);
      setOriginalSettings(prev => ({ ...prev, [activeTab]: settings[activeTab] }));
      notyf.success("Settings saved successfully");
      setCommissionSaveModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        notyf.error("You do not have permission to modify this section.");
      } else {
        notyf.error("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emailTest.recipient) {
      notyf.error("Please enter a recipient email");
      return;
    }
    setEmailTest(prev => ({ ...prev, status: 'loading' }));
    
    try {
      await api.post('/system/config/email/test', {
        recipient: emailTest.recipient,
        subject: emailTest.subject,
        template: emailTest.template
      });
      setEmailTest(prev => ({ ...prev, status: 'success' }));
      notyf.success("Test email dispatched successfully");
    } catch (err) {
      console.error(err);
      setEmailTest(prev => ({ ...prev, status: 'idle' }));
      notyf.error("Failed to send test email");
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'general': return <GeneralPanel state={settings.general} handleChange={handleChange} isSuperAdmin={isSuperAdmin} />;
      case 'financial': return <FinancialPanel state={settings.financial} handleChange={handleChange} isSuperAdmin={isSuperAdmin} />;
      // Registration Tab
      case 'registration': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Registration Policies</h3>
          <ToggleSwitch label="Enable Student Registration" checked={settings.registration.studentRegistration} onChange={e => handleChange('registration', 'studentRegistration', e.target.checked)} disabled={isFieldRestricted('registration', 'studentRegistration', isSuperAdmin)} />
          <ToggleSwitch label="Enable Instructor Registration" checked={settings.registration.instructorRegistration} onChange={e => handleChange('registration', 'instructorRegistration', e.target.checked)} disabled={isFieldRestricted('registration', 'instructorRegistration', isSuperAdmin)} />
          <ToggleSwitch label="Require University Email (.edu)" checked={settings.registration.eduEmailOnly} onChange={e => handleChange('registration', 'eduEmailOnly', e.target.checked)} disabled={isFieldRestricted('registration', 'eduEmailOnly', isSuperAdmin)} />
          <ToggleSwitch label="Require Email Verification" checked={settings.registration.emailVerification} onChange={e => handleChange('registration', 'emailVerification', e.target.checked)} disabled={isFieldRestricted('registration', 'emailVerification', isSuperAdmin)} />
          <ToggleSwitch label="Require Phone Verification" checked={settings.registration.phoneVerification} onChange={e => handleChange('registration', 'phoneVerification', e.target.checked)} disabled={isFieldRestricted('registration', 'phoneVerification', isSuperAdmin)} />
          <ToggleSwitch label="Invitation Only Mode" checked={settings.registration.inviteOnly} onChange={e => handleChange('registration', 'inviteOnly', e.target.checked)} disabled={isFieldRestricted('registration', 'inviteOnly', isSuperAdmin)} />
          <ToggleSwitch label="Auto-Approve Instructors" checked={settings.registration.autoApproveInstructors} onChange={e => handleChange('registration', 'autoApproveInstructors', e.target.checked)} disabled={isFieldRestricted('registration', 'autoApproveInstructors', isSuperAdmin)} />
        </div>
      );
      // Security Tab
      case 'security': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Security Policies</h3>
          <SelectField label="Password Policy" value={settings.security.passwordPolicy} onChange={e => handleChange('security', 'passwordPolicy', e.target.value)} disabled={isFieldRestricted('security', 'passwordPolicy', isSuperAdmin)} options={[{ value: 'standard', label: 'Standard (8 chars)' }, { value: 'strong', label: 'Strong (12 chars, symbols, upper/lower)' }]} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <InputField label="Session Timeout (Minutes)" type="number" value={settings.security.sessionTimeout} onChange={e => handleChange('security', 'sessionTimeout', e.target.value)} disabled={isFieldRestricted('security', 'sessionTimeout', isSuperAdmin)} />
            <InputField label="Max Login Attempts" type="number" value={settings.security.maxLoginAttempts} onChange={e => handleChange('security', 'maxLoginAttempts', e.target.value)} disabled={isFieldRestricted('security', 'maxLoginAttempts', isSuperAdmin)} />
            <InputField label="JWT Expiration (Days)" type="number" value={settings.security.jwtExpiration} onChange={e => handleChange('security', 'jwtExpiration', e.target.value)} disabled={isFieldRestricted('security', 'jwtExpiration', isSuperAdmin)} />
          </div>
          <InputField label="Allowed CORS Domains (Comma separated)" value={settings.security.allowedDomains} onChange={e => handleChange('security', 'allowedDomains', e.target.value)} disabled={isFieldRestricted('security', 'allowedDomains', isSuperAdmin)} placeholder="e.g. https://example.com" />
          <ToggleSwitch label="Require Two-Factor Authentication" checked={settings.security.twoFactorAuth} onChange={e => handleChange('security', 'twoFactorAuth', e.target.checked)} disabled={isFieldRestricted('security', 'twoFactorAuth', isSuperAdmin)} />
          <ToggleSwitch label="Force Maintenance Lock (Kills all active sessions)" checked={settings.security.maintenanceLock} onChange={e => handleChange('security', 'maintenanceLock', e.target.checked)} disabled={isFieldRestricted('security', 'maintenanceLock', isSuperAdmin)} />
        </div>
      );
      // Storage Tab
      case 'storage': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Storage Information</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
              <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', textTransform: 'uppercase' }}>Used Storage</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6' }}>120 GB</div>
              </div>
              <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', textTransform: 'uppercase' }}>Available Storage</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>380 GB</div>
              </div>
            </div>
            
            <InputField label="Cloud Provider" value={settings.storage.provider} disabled={true} />
            <InputField label="Maximum Upload Size (MB)" type="number" value={settings.storage.maxUploadSizeMb} onChange={e => handleChange('storage', 'maxUploadSizeMb', e.target.value)} disabled={isFieldRestricted('storage', 'maxUploadSizeMb', isSuperAdmin)} />
            <InputField label="Allowed File Types" value={settings.storage.allowedFileTypes} onChange={e => handleChange('storage', 'allowedFileTypes', e.target.value)} disabled={isFieldRestricted('storage', 'allowedFileTypes', isSuperAdmin)} />
          </div>
        </div>
      );
      // Email Tab
      case 'email': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>SMTP Configuration</h3>
            <InputField label="SMTP Host" value={settings.email.smtpHost} onChange={e => handleChange('email', 'smtpHost', e.target.value)} disabled={isFieldRestricted('email', 'smtpHost', isSuperAdmin)} />
            <InputField label="SMTP Port" type="number" value={settings.email.smtpPort} onChange={e => handleChange('email', 'smtpPort', e.target.value)} disabled={isFieldRestricted('email', 'smtpPort', isSuperAdmin)} />
            <InputField label="SMTP Username" value={settings.email.smtpUser} onChange={e => handleChange('email', 'smtpUser', e.target.value)} disabled={isFieldRestricted('email', 'smtpUser', isSuperAdmin)} />
            <InputField label="SMTP Password" type="password" value={settings.email.smtpPass} onChange={e => handleChange('email', 'smtpPass', e.target.value)} disabled={isFieldRestricted('email', 'smtpPass', isSuperAdmin)} placeholder="********" />
          </div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Email Testing Utility</h3>
            <InputField label="Recipient Email" value={emailTest.recipient} onChange={e => setEmailTest({ ...emailTest, recipient: e.target.value })} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} placeholder="test@example.com" />
            <InputField label="Email Subject" value={emailTest.subject} onChange={e => setEmailTest({ ...emailTest, subject: e.target.value })} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} />
            <SelectField label="Email Template" value={emailTest.template} onChange={e => setEmailTest({ ...emailTest, template: e.target.value })} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} options={[{ value: 'Welcome', label: 'Welcome Email' }, { value: 'PasswordReset', label: 'Password Reset' }, { value: 'PurchaseReceipt', label: 'Purchase Receipt' }]} />
            
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={handleTestEmail} 
                disabled={emailTest.status === 'loading' || isFieldRestricted('email', 'test_utility', isSuperAdmin)}
                style={{ padding: '10px 24px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: emailTest.status === 'loading' || isFieldRestricted('email', 'test_utility', isSuperAdmin) ? 'not-allowed' : 'pointer', opacity: emailTest.status === 'loading' ? 0.7 : 1 }}
              >
                {emailTest.status === 'loading' ? 'Sending...' : 'Send Test Email'}
              </button>
              
              {emailTest.status === 'success' && (
                <div style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                  <i className="lucide-check-circle" /> Delivery Successful
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--c-bg-dark)', borderRadius: '8px', border: '1px solid var(--c-border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>SMTP Connection: <strong style={{ color: '#10B981' }}>Connected</strong></span>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-sub)' }}>Last Test: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      );
      // Notifications Tab
      case 'notifications': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Notification Preferences</h3>
          <ToggleSwitch label="Enable Student Emails" checked={settings.notifications.studentEmails} onChange={e => handleChange('notifications', 'studentEmails', e.target.checked)} disabled={isFieldRestricted('notifications', 'studentEmails', isSuperAdmin)} />
          <ToggleSwitch label="Enable Instructor Emails" checked={settings.notifications.instructorEmails} onChange={e => handleChange('notifications', 'instructorEmails', e.target.checked)} disabled={isFieldRestricted('notifications', 'instructorEmails', isSuperAdmin)} />
          <ToggleSwitch label="Enable Admin Alerts" checked={settings.notifications.adminAlerts} onChange={e => handleChange('notifications', 'adminAlerts', e.target.checked)} disabled={isFieldRestricted('notifications', 'adminAlerts', isSuperAdmin)} />
          <ToggleSwitch label="Marketing Emails" checked={settings.notifications.marketingEmails} onChange={e => handleChange('notifications', 'marketingEmails', e.target.checked)} disabled={isFieldRestricted('notifications', 'marketingEmails', isSuperAdmin)} />
          <ToggleSwitch label="Mobile Push Notifications Infrastructure" checked={settings.notifications.pushNotifications} onChange={e => handleChange('notifications', 'pushNotifications', e.target.checked)} disabled={isFieldRestricted('notifications', 'pushNotifications', isSuperAdmin)} />
          <ToggleSwitch label="Critical System Alerts" checked={settings.notifications.systemAlerts} onChange={e => handleChange('notifications', 'systemAlerts', e.target.checked)} disabled={isFieldRestricted('notifications', 'systemAlerts', isSuperAdmin)} />
        </div>
      );
      // Appearance Tab
      case 'appearance': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Platform Appearance</h3>
          <InputField label="Platform Logo URL" value={settings.appearance.platformLogo} onChange={e => handleChange('appearance', 'platformLogo', e.target.value)} disabled={isFieldRestricted('appearance', 'platformLogo', isSuperAdmin)} />
          <InputField label="Favicon URL" value={settings.appearance.favicon} onChange={e => handleChange('appearance', 'favicon', e.target.value)} disabled={isFieldRestricted('appearance', 'favicon', isSuperAdmin)} />
          <SelectField label="Default Theme" value={settings.appearance.defaultTheme} onChange={e => handleChange('appearance', 'defaultTheme', e.target.value)} disabled={isFieldRestricted('appearance', 'defaultTheme', isSuperAdmin)} options={[{ value: 'system', label: 'System Preference' }, { value: 'light', label: 'Light Mode' }, { value: 'dark', label: 'Dark Mode' }]} />
          <InputField label="Accent Color (HEX)" value={settings.appearance.accentColor} onChange={e => handleChange('appearance', 'accentColor', e.target.value)} disabled={isFieldRestricted('appearance', 'accentColor', isSuperAdmin)} />
          <TextareaField label="Landing Page Banner Message" value={settings.appearance.landingBanner} onChange={e => handleChange('appearance', 'landingBanner', e.target.value)} disabled={isFieldRestricted('appearance', 'landingBanner', isSuperAdmin)} />
          <InputField label="Footer Information" value={settings.appearance.footerInfo} onChange={e => handleChange('appearance', 'footerInfo', e.target.value)} disabled={isFieldRestricted('appearance', 'footerInfo', isSuperAdmin)} />
        </div>
      );
      // Maintenance Tab
      case 'maintenance': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s', border: settings.maintenance.isMaintenanceMode ? '1px solid rgba(245,158,11,0.5)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Maintenance Mode</h3>
            {settings.maintenance.isMaintenanceMode && <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE</span>}
          </div>
          <ToggleSwitch label="Enable Maintenance Mode" checked={settings.maintenance.isMaintenanceMode} onChange={e => handleChange('maintenance', 'isMaintenanceMode', e.target.checked)} disabled={isFieldRestricted('maintenance', 'isMaintenanceMode', isSuperAdmin)} />
          <TextareaField label="Maintenance Message" value={settings.maintenance.message} onChange={e => handleChange('maintenance', 'message', e.target.value)} disabled={isFieldRestricted('maintenance', 'message', isSuperAdmin)} />
          <InputField label="Estimated Completion Time" value={settings.maintenance.estimatedCompletion} onChange={e => handleChange('maintenance', 'estimatedCompletion', e.target.value)} disabled={isFieldRestricted('maintenance', 'estimatedCompletion', isSuperAdmin)} />
          <InputField label="Admin Whitelist (Emails)" value={settings.maintenance.whitelist} onChange={e => handleChange('maintenance', 'whitelist', e.target.value)} disabled={isFieldRestricted('maintenance', 'whitelist', isSuperAdmin)} />
        </div>
      );
      // Backup Tab
      case 'backup': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Database Backups</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--c-bg-dark)', borderRadius: '8px', border: '1px solid var(--c-border-subtle)', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', textTransform: 'uppercase', marginBottom: '4px' }}>Last Successful Backup</div>
              <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{new Date(settings.backup.lastBackup).toLocaleString()}</div>
            </div>
            <button className="glass-input" style={{ padding: '8px 16px', cursor: isFieldRestricted('backup', 'execute', isSuperAdmin) ? 'not-allowed' : 'pointer' }} disabled={isFieldRestricted('backup', 'execute', isSuperAdmin)}>
              Download Latest
            </button>
          </div>
          <SelectField label="Automated Backup Frequency" value={settings.backup.frequency} onChange={e => handleChange('backup', 'frequency', e.target.value)} disabled={isFieldRestricted('backup', 'frequency', isSuperAdmin)} options={[{ value: 'hourly', label: 'Hourly' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} />
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--c-border-subtle)' }}>
            <button className="glass-input" style={{ padding: '10px 20px', cursor: isFieldRestricted('backup', 'execute', isSuperAdmin) ? 'not-allowed' : 'pointer', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }} disabled={isFieldRestricted('backup', 'execute', isSuperAdmin)}>
              Execute Manual Backup Now
            </button>
            <button className="glass-input" style={{ padding: '10px 20px', cursor: isFieldRestricted('backup', 'execute', isSuperAdmin) ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }} disabled={isFieldRestricted('backup', 'execute', isSuperAdmin)}>
              Restore from Backup
            </button>
          </div>
        </div>
      );
      // Logs, API, Feature Flags, AI, Audit (Placeholder Panels to demonstrate architecture)
      case 'logs': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>System Logs</h3>
          <InputField label="Log Retention (Days)" type="number" value={settings.logs.retentionDays} onChange={e => handleChange('logs', 'retentionDays', e.target.value)} disabled={isFieldRestricted('logs', 'retentionDays', isSuperAdmin)} />
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--c-sub)', background: 'var(--c-bg-dark)', borderRadius: '8px', border: '1px solid var(--c-border-subtle)' }}>
            Log viewer interface will be integrated here in future phases.
            <div style={{ marginTop: '16px' }}>
              <button className="glass-input" style={{ padding: '8px 16px', cursor: 'pointer' }}>Export Logs (CSV)</button>
            </div>
          </div>
        </div>
      );
      case 'api': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>API & Webhooks</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--c-sub)', textTransform: 'uppercase' }}>API Status</div>
            <span style={{ padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>{settings.api.status.toUpperCase()}</span>
          </div>
          <InputField label="API Version" value={settings.api.version} disabled={true} />
          <InputField label="Global Webhook URL" value={settings.api.webhookUrl} onChange={e => handleChange('api', 'webhookUrl', e.target.value)} disabled={isFieldRestricted('api', 'webhookUrl', isSuperAdmin)} placeholder="https://" />
          <InputField label="Rate Limit (req/min)" type="number" value={settings.api.rateLimit} onChange={e => handleChange('api', 'rateLimit', e.target.value)} disabled={isFieldRestricted('api', 'rateLimit', isSuperAdmin)} />
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--c-border-subtle)' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>API Keys</label>
            <div className="user-search-input" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', opacity: isFieldRestricted('api', 'keys', isSuperAdmin) ? 0.6 : 1 }}>
              <span style={{ fontFamily: 'monospace' }}>pk_live_**********************</span>
              <button style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: isFieldRestricted('api', 'keys', isSuperAdmin) ? 'not-allowed' : 'pointer' }} disabled={isFieldRestricted('api', 'keys', isSuperAdmin)}>Regenerate</button>
            </div>
          </div>
        </div>
      );
      case 'features': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Feature Flags</h3>
          <ToggleSwitch label="Notebook Module" checked={settings.features.notebook} onChange={e => handleChange('features', 'notebook', e.target.checked)} disabled={isFieldRestricted('features', 'notebook', isSuperAdmin)} />
          <ToggleSwitch label="Community Discussions" checked={settings.features.community} onChange={e => handleChange('features', 'community', e.target.checked)} disabled={isFieldRestricted('features', 'community', isSuperAdmin)} />
          <ToggleSwitch label="Marketplace" checked={settings.features.marketplace} onChange={e => handleChange('features', 'marketplace', e.target.checked)} disabled={isFieldRestricted('features', 'marketplace', isSuperAdmin)} />
          <ToggleSwitch label="AI Tutor Bot" checked={settings.features.aiTutor} onChange={e => handleChange('features', 'aiTutor', e.target.checked)} disabled={isFieldRestricted('features', 'aiTutor', isSuperAdmin)} />
          <ToggleSwitch label="Referral Program" checked={settings.features.referral} onChange={e => handleChange('features', 'referral', e.target.checked)} disabled={isFieldRestricted('features', 'referral', isSuperAdmin)} />
          <ToggleSwitch label="Enable Beta Features" checked={settings.features.betaFeatures} onChange={e => handleChange('features', 'betaFeatures', e.target.checked)} disabled={isFieldRestricted('features', 'betaFeatures', isSuperAdmin)} />
        </div>
      );
      case 'ai': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>AI Configuration</h3>
          <SelectField label="AI Provider" value={settings.ai.provider} onChange={e => handleChange('ai', 'provider', e.target.value)} disabled={isFieldRestricted('ai', 'provider', isSuperAdmin)} options={[{ value: 'OpenAI', label: 'OpenAI' }, { value: 'Anthropic', label: 'Anthropic' }, { value: 'Google', label: 'Google Gemini' }]} />
          <InputField label="Model Name" value={settings.ai.model} onChange={e => handleChange('ai', 'model', e.target.value)} disabled={isFieldRestricted('ai', 'model', isSuperAdmin)} />
          <InputField label="Temperature (0.0 - 1.0)" type="number" value={settings.ai.temperature} onChange={e => handleChange('ai', 'temperature', e.target.value)} disabled={isFieldRestricted('ai', 'temperature', isSuperAdmin)} />
          <InputField label="Daily Token Limit (Global)" type="number" value={settings.ai.dailyTokenLimit} onChange={e => handleChange('ai', 'dailyTokenLimit', e.target.value)} disabled={isFieldRestricted('ai', 'dailyTokenLimit', isSuperAdmin)} />
          <TextareaField label="System Prompt Template overrides" value={settings.ai.prompts} onChange={e => handleChange('ai', 'prompts', e.target.value)} disabled={isFieldRestricted('ai', 'prompts', isSuperAdmin)} placeholder="Leave blank to use defaults" />
        </div>
      );
      case 'audit': return (
        <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Audit Trails</h3>
          <InputField label="Audit Log Retention (Days)" type="number" value={settings.audit.retentionDays} onChange={e => handleChange('audit', 'retentionDays', e.target.value)} disabled={isFieldRestricted('audit', 'retentionDays', isSuperAdmin)} />
          <ToggleSwitch label="Track User Actions" checked={settings.audit.trackUsers} onChange={e => handleChange('audit', 'trackUsers', e.target.checked)} disabled={isFieldRestricted('audit', 'trackUsers', isSuperAdmin)} />
          <ToggleSwitch label="Track Admin Actions" checked={settings.audit.trackAdmins} onChange={e => handleChange('audit', 'trackAdmins', e.target.checked)} disabled={isFieldRestricted('audit', 'trackAdmins', isSuperAdmin)} />
          <ToggleSwitch label="Track Financial Changes" checked={settings.audit.trackFinancial} onChange={e => handleChange('audit', 'trackFinancial', e.target.checked)} disabled={isFieldRestricted('audit', 'trackFinancial', isSuperAdmin)} />
          <ToggleSwitch label="Track Settings Changes" checked={settings.audit.trackSettings} onChange={e => handleChange('audit', 'trackSettings', e.target.checked)} disabled={isFieldRestricted('audit', 'trackSettings', isSuperAdmin)} />
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header & Save Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-h)' }}>System Management</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--c-sub)', fontSize: '0.9rem' }}>Configure global settings and platform behavior</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={handleSaveInit}
            disabled={!hasUnsavedChanges || saving || loadingConfig}
            style={{ 
              padding: '10px 24px', 
              background: hasUnsavedChanges ? '#3B82F6' : 'var(--c-bg-dark)', 
              color: hasUnsavedChanges ? '#fff' : 'var(--c-sub)', 
              border: hasUnsavedChanges ? 'none' : '1px solid var(--c-border-subtle)', 
              borderRadius: '8px', fontWeight: 600, 
              cursor: (!hasUnsavedChanges || saving || loadingConfig) ? 'not-allowed' : 'pointer', 
              boxShadow: hasUnsavedChanges ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <i className="lucide-save" style={{ fontSize: '1rem' }} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideDown 0.2s' }}>
          <i className="lucide-alert-circle" />
          <span style={{ fontWeight: 500 }}>You have unsaved changes. Please save to apply them.</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 250px) 1fr', gap: '32px', alignItems: 'start' }} className="system-settings-grid">
        
        {/* Left Sidebar Navigation */}
        <div className="glass-card" style={{ padding: '12px 0', position: 'sticky', top: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 24px',
                  background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: activeTab === tab.id ? '#3B82F6' : 'var(--text-h)',
                  border: 'none',
                  borderRight: activeTab === tab.id ? '3px solid #3B82F6' : '3px solid transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'var(--c-bg-hover)' }}
                onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
              >
                <i className={`lucide-${tab.icon}`} style={{ fontSize: '1.1rem', opacity: activeTab === tab.id ? 1 : 0.6 }} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div style={{ minHeight: '600px', position: 'relative' }}>
          {loadingConfig ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '12px' }} />
              <div className="skeleton-pulse" style={{ height: '300px', borderRadius: '12px' }} />
            </div>
          ) : (
            renderActiveTab()
          )}
        </div>

      </div>

      {/* Commission Save Confirmation Modal */}
      {commissionSaveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card animate-entrance" style={{ padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2 style={{ marginTop: 0, color: 'var(--text-h)', marginBottom: '16px' }}>Confirm Commission Change</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>
              <div style={{ color: 'var(--c-sub)', textDecoration: 'line-through' }}>{originalSettings?.financial?.commission}%</div>
              <i className="lucide-arrow-right" style={{ color: 'var(--text-body)' }} />
              <div style={{ color: '#EF4444' }}>{settings.financial.commission}%</div>
            </div>
            
            <p style={{ color: 'var(--text-body)', marginBottom: '24px', lineHeight: '1.6' }}>
              This change will significantly affect revenue calculations. Please select how this new rate should be applied:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: commissionApplyScope === 'future' ? 'rgba(59,130,246,0.1)' : 'var(--c-bg-dark)', border: commissionApplyScope === 'future' ? '1px solid #3B82F6' : '1px solid var(--c-border-subtle)', borderRadius: '8px' }}>
                <input type="radio" name="scope" value="future" checked={commissionApplyScope === 'future'} onChange={() => setCommissionApplyScope('future')} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>Future Enrollments Only (Recommended)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>Does not affect existing payouts.</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: commissionApplyScope === 'existing' ? 'rgba(59,130,246,0.1)' : 'var(--c-bg-dark)', border: commissionApplyScope === 'existing' ? '1px solid #3B82F6' : '1px solid var(--c-border-subtle)', borderRadius: '8px' }}>
                <input type="radio" name="scope" value="existing" checked={commissionApplyScope === 'existing'} onChange={() => setCommissionApplyScope('existing')} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>Existing Enrollments</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>Retroactively changes pending payouts.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: commissionApplyScope === 'platform' ? 'rgba(59,130,246,0.1)' : 'var(--c-bg-dark)', border: commissionApplyScope === 'platform' ? '1px solid #3B82F6' : '1px solid var(--c-border-subtle)', borderRadius: '8px' }}>
                <input type="radio" name="scope" value="platform" checked={commissionApplyScope === 'platform'} onChange={() => setCommissionApplyScope('platform')} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>Entire Platform</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-sub)' }}>Overwrites all instructor custom rates.</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setCommissionSaveModalOpen(false)}
                className="user-search-input"
                style={{ padding: '10px 20px', cursor: 'pointer' }}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={executeSave}
                style={{ padding: '10px 20px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for responsive stacking */}
      <style>{`
        @media (max-width: 900px) {
          .system-settings-grid {
            grid-template-columns: 1fr !important;
          }
          .system-settings-grid > .glass-card {
            position: relative !important;
            top: 0 !important;
            display: flex;
            overflow-x: auto;
          }
          .system-settings-grid > .glass-card > div {
            flex-direction: row !important;
          }
          .system-settings-grid > .glass-card button {
            border-right: none !important;
            border-bottom: 3px solid transparent;
            white-space: nowrap;
          }
        }
      `}</style>
    </div>
  );
}
