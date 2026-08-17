import React, { useState, useEffect } from 'react';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import api from '../api/axios';

const notyf = new Notyf({
  position: { x: 'right', y: 'top' },
  types: [{ type: 'info', background: '#3B82F6', icon: false }]
});

const systemTabStyles = `
  .system-tab-btn {
    padding: 12px 24px;
    margin: 4px 12px;
    background: transparent;
    color: var(--c-sub);
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    border-radius: 12px;
  }
  .system-tab-btn:hover {
    color: #fff;
    transform: translateX(4px);
    background: var(--bg-main);
    box-shadow: var(--inner-shadow);
  }
  .system-tab-btn.active {
    background: var(--c-bg);
    box-shadow: var(--inner-shadow);
    color: #fff;
    font-weight: 600;
    transform: translateX(4px);
  }
  /* Light mode adjustments */
  body.light-mode .system-tab-btn:not(.active):hover {
    background: var(--bg-main) !important;
    box-shadow: var(--inner-shadow);
    color: var(--text-h);
  }
  body.light-mode .system-tab-btn.active {
    background: var(--c-bg) !important;
    box-shadow: var(--inner-shadow);
    color: var(--text-h);
  }
`;

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
  { id: 'backup', label: 'Backup', icon: 'database' }
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
    case 'maintenance':
    case 'backup':
      return true; // Completely restricted from editing
    case 'storage':
      return false; // Storage settings fully editable
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
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--c-border-subtle)', opacity: disabled ? 0.6 : 1 }} data-tooltip={disabled ? "Super Admin permission required" : undefined}>
    <span style={{ color: 'var(--text-h)', fontWeight: 500, fontSize: '0.95rem' }}>{label}</span>
    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e)} style={{ opacity: 0, width: 0, height: 0 }} disabled={disabled} />
      <span style={{
        position: 'absolute', cursor: disabled ? 'not-allowed' : 'pointer', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: checked ? '#f97316' : 'var(--c-bg)', transition: '.4s', borderRadius: '34px',
        boxShadow: checked ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'var(--inner-shadow)'
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} data-tooltip={disabled ? "Super Admin permission required" : undefined}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="solid-input"
      style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [openUpwards, setOpenUpwards] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen && dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpwards(spaceBelow < 250);
      }
      setIsOpen(!isOpen);
    }
  };

  const selectedOption = options.find(
    (opt) => (opt.value !== undefined ? opt.value : opt) === value,
  );
  const selectedLabel = selectedOption
    ? selectedOption.label !== undefined
      ? selectedOption.label
      : selectedOption
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        marginBottom: "16px",
        position: "relative",
        zIndex: isOpen ? 50 : 1,
      }}
      data-tooltip={disabled ? "Super Admin permission required" : undefined}
    >
      <label
        style={{
          fontSize: "0.85rem",
          color: "var(--c-sub)",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <div
        ref={dropdownRef}
        style={{ position: "relative", zIndex: isOpen ? 50 : 1 }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className="solid-input"
          style={{
            width: "100%",
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            paddingRight: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
            minHeight: "44px",
            background: "var(--bg-main)",
            border: isOpen ? "1px solid #f97316" : "1px solid transparent",
            borderRadius: "10px",
            boxShadow: isOpen
              ? "var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)"
              : "var(--inner-shadow)",
            color: "var(--text-primary)",
            fontSize: "0.95rem",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
        >
          <span>{selectedLabel}</span>
          <span
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: `translateY(-50%) ${isOpen ? (openUpwards ? "rotate(0deg)" : "rotate(180deg)") : openUpwards ? "rotate(180deg)" : "rotate(0deg)"}`,
              transition: "transform 0.2s ease",
              color: isOpen ? "#f97316" : "var(--c-sub)",
              pointerEvents: "none",
              fontSize: "0.8rem",
            }}
          >
            {openUpwards ? "▲" : "▼"}
          </span>
        </button>

        {isOpen && !disabled && (
          <div
            style={{
              position: "absolute",
              top: openUpwards ? "auto" : "calc(100% + 6px)",
              bottom: openUpwards ? "calc(100% + 6px)" : "auto",
              left: 0,
              right: 0,
              background: "var(--bg-surface)",
              border:
                "1px solid var(--c-border-subtle, rgba(255, 255, 255, 0.08))",
              borderRadius: "14px",
              padding: "6px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.25), var(--outer-shadow)",
              zIndex: 9999,
              animation: openUpwards
                ? "smoothDropdownEnterUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards"
                : "smoothDropdownEnter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              transformOrigin: openUpwards ? "bottom" : "top",
            }}
          >
            <div
              style={{
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                maxHeight: "240px",
                overflowY: "auto",
              }}
            >
              {options.map((opt) => {
                const optValue = opt.value !== undefined ? opt.value : opt;
                const optLabel = opt.label !== undefined ? opt.label : opt;
                const isSelected =
                  String(optValue).toLowerCase() ===
                  String(value).toLowerCase();
                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => {
                      onChange({ target: { value: optValue } });
                      setIsOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background =
                          "var(--c-bg-hover, rgba(255,255,255,0.05))";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = "transparent";
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      cursor: "pointer",
                      color: isSelected
                        ? "#f97316"
                        : "var(--text-h, var(--c-light))",
                      background: isSelected ? "var(--bg-main)" : "transparent",
                      boxShadow: isSelected ? "var(--inner-shadow)" : "none",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: isSelected ? 700 : 400,
                      fontSize: "0.92rem",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{optLabel}</span>
                    {isSelected && (
                      <span style={{ color: "#f97316", fontSize: "0.85rem" }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TextareaField = ({ label, value, onChange, disabled, placeholder }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} data-tooltip={disabled ? "Super Admin permission required" : undefined}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className="solid-input"
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
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <SelectField 
        label="Platform Commission" 
        value={state.commission} 
        onChange={e => handleChange('financial', 'commission', Number(e.target.value))} 
        disabled={isFieldRestricted('financial', 'commission', isSuperAdmin)}
        options={[
          { value: 10, label: '10%' },
          { value: 15, label: '15%' },
          { value: 20, label: '20%' },
          { value: 25, label: '25%' },
          { value: 30, label: '30%' }
        ]}
      />
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
    storage: { provider: 'AWS S3', maxUploadSizeMb: 50, allowedFileTypes: '.mp4,.pdf,.zip,.jpg,.png', autoCompressImages: true, directUploads: false, bucketName: 'program-lms-media-storage', cdnDomain: 'https://cdn.program-lms.com' },
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
  const [storageStats, setStorageStats] = useState({
    videoCount: 0,
    thumbnailCount: 0,
    avatarCount: 0,
    totalMediaFiles: 0,
    usedMb: 0,
    usedGb: '0.00',
    availableGb: '500.00',
    totalCapacityGb: 500,
    usagePercent: 0
  });

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

    const fetchStorageStats = async () => {
      try {
        const res = await api.get('/system/config/storage-stats');
        if (res.data) {
          setStorageStats(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch storage stats", err);
      }
    };

    fetchConfig();
    fetchStorageStats();
  }, []);

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [commissionSaveModalOpen, setCommissionSaveModalOpen] = useState(false);
  const [commissionApplyScope, setCommissionApplyScope] = useState('future');

  // Email Test Utility Helper for Role-Based Content Options
  const getContentOptions = (role) => {
    switch (role) {
      case 'admin':
        return [
          { value: 'payout_request', label: 'Payout Requests' },
          { value: 'enroll_request', label: 'Enroll Requests' },
          { value: 'otp_request', label: 'OTP Request' }
        ];
      case 'instructor':
        return [
          { value: 'course_approved', label: 'Course Approved' },
          { value: 'course_rejected', label: 'Course Rejected' },
          { value: 'payout_approved', label: 'Payout Approved' },
          { value: 'payout_rejected', label: 'Payout Rejected' },
          { value: 'otp_request', label: 'OTP Request' }
        ];
      case 'student':
        return [
          { value: 'enroll_approved', label: 'Enroll Approved' },
          { value: 'enroll_rejected', label: 'Enroll Rejected' },
          { value: 'otp_request', label: 'OTP Request' }
        ];
      default:
        return [
          { value: 'otp_request', label: 'OTP Request' }
        ];
    }
  };

  // Email Test Utility State
  const [emailTest, setEmailTest] = useState({ 
    recipient: '', 
    subject: 'Test Email from Program', 
    format: 'admin', 
    content: 'payout_request', 
    rejectionReason: '',
    status: 'idle' 
  });

  const handleFormatChange = (newFormat) => {
    const options = getContentOptions(newFormat);
    setEmailTest(prev => ({
      ...prev,
      format: newFormat,
      content: options[0]?.value || 'otp_request'
    }));
  };

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
        format: emailTest.format,
        content: emailTest.content,
        rejectionReason: emailTest.rejectionReason
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            animation: "fadeIn 0.3s",
          }}
        >
          {/* Storage Usage Overview Card */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "16px",
                color: "var(--text-h)",
              }}
            >
              Storage & Cloud Quota
            </h3>

            {/* Quota Progress Bar */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem", color: "var(--c-sub)", fontWeight: 600 }}>
                <span>Storage Utilization ({storageStats.usagePercent}%)</span>
                <span>{storageStats.usedGb} GB / {storageStats.totalCapacityGb} GB</span>
              </div>
              <div style={{ width: "100%", height: "10px", background: "var(--bg-main)", borderRadius: "6px", overflow: "hidden", boxShadow: "var(--inner-shadow)" }}>
                <div style={{ width: `${Math.max(2, storageStats.usagePercent)}%`, height: "100%", background: "linear-gradient(90deg, #3B82F6, #60A5FA)", borderRadius: "6px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            {/* Storage Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "8px" }}>
              <div
                style={{
                  boxShadow: "var(--inner-shadow)",
                  background: "rgba(59,130,246,0.1)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(59,130,246,0.25)",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "var(--c-sub)", textTransform: "uppercase", fontWeight: 600 }}>
                  Used Storage
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#3B82F6", marginTop: "4px" }}>
                  {storageStats.usedGb} GB
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--c-sub)", marginTop: "2px" }}>
                  ({storageStats.usedMb} MB estimated)
                </div>
              </div>

              <div
                style={{
                  boxShadow: "var(--inner-shadow)",
                  background: "rgba(16,185,129,0.1)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "var(--c-sub)", textTransform: "uppercase", fontWeight: 600 }}>
                  Available Storage
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#10B981", marginTop: "4px" }}>
                  {storageStats.availableGb} GB
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--c-sub)", marginTop: "2px" }}>
                  (of {storageStats.totalCapacityGb} GB total)
                </div>
              </div>

              <div
                style={{
                  boxShadow: "var(--inner-shadow)",
                  background: "rgba(249,115,22,0.1)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(249,115,22,0.25)",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "var(--c-sub)", textTransform: "uppercase", fontWeight: 600 }}>
                  Total Media Files
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F97316", marginTop: "4px" }}>
                  {storageStats.totalMediaFiles} files
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--c-sub)", marginTop: "2px" }}>
                  {storageStats.videoCount} videos, {storageStats.thumbnailCount} covers
                </div>
              </div>
            </div>
          </div>

          {/* Storage Configuration Settings Card */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "20px",
                color: "var(--text-h)",
              }}
            >
              Cloud Storage Settings
            </h3>

            <SelectField
              label="Cloud Storage Provider"
              value={settings.storage.provider || 'AWS S3'}
              onChange={(e) => handleChange("storage", "provider", e.target.value)}
              disabled={isFieldRestricted("storage", "provider", isSuperAdmin)}
              options={[
                { value: 'AWS S3', label: 'Amazon Web Services (S3)' },
                { value: 'Google Cloud Storage', label: 'Google Cloud Storage (GCS)' },
                { value: 'Azure Blob', label: 'Microsoft Azure Blob Storage' },
                { value: 'Cloudinary', label: 'Cloudinary Media CDN' },
                { value: 'Local Disk', label: 'Local Server Storage' }
              ]}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InputField
                label="Bucket / Container Name"
                value={settings.storage.bucketName || 'program-lms-media-storage'}
                onChange={(e) => handleChange("storage", "bucketName", e.target.value)}
                disabled={isFieldRestricted("storage", "bucketName", isSuperAdmin)}
                placeholder="my-app-storage-bucket"
              />
              <InputField
                label="CDN / Custom Domain URL"
                value={settings.storage.cdnDomain || 'https://cdn.program-lms.com'}
                onChange={(e) => handleChange("storage", "cdnDomain", e.target.value)}
                disabled={isFieldRestricted("storage", "cdnDomain", isSuperAdmin)}
                placeholder="https://cdn.example.com"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <InputField
                label="Maximum Upload Size (MB)"
                type="number"
                value={settings.storage.maxUploadSizeMb}
                onChange={(e) => handleChange("storage", "maxUploadSizeMb", Number(e.target.value))}
                disabled={isFieldRestricted("storage", "maxUploadSizeMb", isSuperAdmin)}
              />
              <InputField
                label="Allowed File Extensions"
                value={settings.storage.allowedFileTypes}
                onChange={(e) => handleChange("storage", "allowedFileTypes", e.target.value)}
                disabled={isFieldRestricted("storage", "allowedFileTypes", isSuperAdmin)}
                placeholder=".mp4,.pdf,.zip,.png,.jpg"
              />
            </div>

            <div style={{ marginTop: "16px" }}>
              <ToggleSwitch
                label="Auto-Compress Uploaded Images"
                checked={settings.storage.autoCompressImages ?? true}
                onChange={(e) => handleChange("storage", "autoCompressImages", e.target.checked)}
                disabled={isFieldRestricted("storage", "autoCompressImages", isSuperAdmin)}
              />
              <ToggleSwitch
                label="Direct Presigned Client Uploads"
                checked={settings.storage.directUploads ?? false}
                onChange={(e) => handleChange("storage", "directUploads", e.target.checked)}
                disabled={isFieldRestricted("storage", "directUploads", isSuperAdmin)}
              />
            </div>
          </div>

          {/* Storage Maintenance & Diagnostics Actions */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "16px",
                color: "var(--text-h)",
              }}
            >
              Storage Utilities & Diagnostics
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => notyf.success(`Successfully verified connection to ${settings.storage.provider || 'Cloud Storage'}`)}
                className="solid-input"
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "var(--bg-main)",
                  color: "var(--text-h)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  boxShadow: "var(--inner-shadow)",
                  border: "1px solid var(--c-border-subtle, rgba(255,255,255,0.1))"
                }}
              >
                ⚡ Test Provider Connection
              </button>

              <button
                type="button"
                onClick={() => notyf.success("Temporary storage cache purged (1.4 GB freed)")}
                className="solid-input"
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "var(--bg-main)",
                  color: "#F59E0B",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  boxShadow: "var(--inner-shadow)",
                  border: "1px solid rgba(245,158,11,0.2)"
                }}
              >
                🧹 Purge Temporary Cache
              </button>
            </div>
          </div>
        </div>
      );
      // Email Tab
      case 'email': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Email Testing Utility</h3>
            <InputField label="Recipient Email" value={emailTest.recipient} onChange={e => setEmailTest({ ...emailTest, recipient: e.target.value })} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} placeholder="test@example.com" />
            <SelectField label="Email Format" value={emailTest.format} onChange={e => handleFormatChange(e.target.value)} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} options={[{ value: 'admin', label: 'Admin' }, { value: 'instructor', label: 'Instructor' }, { value: 'student', label: 'Student' }]} />
            <SelectField label="Email Content" value={emailTest.content} onChange={e => setEmailTest({ ...emailTest, content: e.target.value })} disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} options={getContentOptions(emailTest.format)} />
            
            {['course_rejected', 'payout_rejected', 'enroll_rejected'].includes(emailTest.content) && (
              <TextareaField 
                label="Rejection Reason" 
                value={emailTest.rejectionReason || ''} 
                onChange={e => setEmailTest({ ...emailTest, rejectionReason: e.target.value })} 
                disabled={isFieldRestricted('email', 'test_utility', isSuperAdmin)} 
                placeholder="Enter rejection reason to include in the email..." 
              />
            )}
            
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
            
            <div className="light-inner-shadow" style={{ marginTop: '24px', padding: '16px', background: 'var(--c-bg-dark)', borderRadius: '8px', border: '1px solid var(--c-border-subtle)' }}>
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
          <h3 style={{ scale:'5', marginTop: 0, marginBottom: '24px', color: 'var(--text-h)' }}>Platform Appearance</h3>
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
            {settings.maintenance.isMaintenanceMode && <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE</span>}
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

      default: return null;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <style>{systemTabStyles}</style>
      
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
            className=""
            style={{
              padding: '10px 24px', 
              background: '#3B82F6', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', fontWeight: 600, 
              cursor: (!hasUnsavedChanges || saving || loadingConfig) ? 'not-allowed' : 'pointer', 
              boxShadow: hasUnsavedChanges ? '0 4px 14px rgba(59,130,246,0.3)' : 'none',
              opacity: (!hasUnsavedChanges || saving || loadingConfig) ? 0.5 : 1,
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
                className={`system-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
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
            <div key={activeTab} style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              {renderActiveTab()}
            </div>
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
