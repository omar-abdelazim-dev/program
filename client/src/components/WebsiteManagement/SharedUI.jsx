import React from 'react';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

export const notyf = new Notyf({
  position: { x: 'right', y: 'bottom' },
  types: [{ type: 'info', background: '#3B82F6', icon: false }]
});
export const InputField = ({ label, type = "text", value, onChange, disabled, placeholder, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      className="solid-input"
      style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

export const TextareaField = ({ label, value, onChange, disabled, placeholder, required, rows = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className="solid-input"
      style={{ width: '100%', minHeight: `${rows * 25}px`, resize: 'vertical', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

export const SelectField = ({ label, value, onChange, options, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="solid-input"
        style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', appearance: 'none', paddingRight: '40px' }}
      >
        {options.map(opt => (
          <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
      <i className="lucide-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
        ▼
      </i>
    </div>
  </div>
);

export const CheckboxField = ({ label, checked, onChange, disabled }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={onChange} 
      disabled={disabled} 
      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} 
    />
    <div style={{
      width: '22px',
      height: '22px',
      borderRadius: '6px',
      border: `2px solid ${checked ? '#f97316' : 'var(--border)'}`,
      backgroundColor: checked ? '#f97316' : 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: checked ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'inset 0 2px 4px rgba(0,0,0,0.5)'
    }}>
      {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
    </div>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </span>
  </label>
);


export const Button = ({ children, onClick, variant = 'primary', type = "button", disabled, style, title }) => {
  let btnStyle = { ...style };
  
  if (variant === 'primary') {
    btnStyle.background = 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)';
    btnStyle.color = '#fff';
    btnStyle.border = 'none';
  } else if (variant === 'danger') {
    btnStyle.background = '#ef4444';
    btnStyle.color = '#fff';
    btnStyle.border = 'none';
    btnStyle.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.5)';
  } else if (variant === 'success') {
    btnStyle.background = '#10b981';
    btnStyle.color = '#fff';
    btnStyle.border = 'none';
  } else if (variant === 'warning') {
    btnStyle.background = '#f59e0b';
    btnStyle.color = '#fff';
    btnStyle.border = 'none';
  } else if (variant === 'secondary') {
    btnStyle.background = 'var(--bg-surface)';
    btnStyle.color = 'var(--text-primary)';
    btnStyle.border = '1px solid var(--border)';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="solid-btn"
      style={{
        width: 'auto',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...btnStyle
      }}
    >
      {children}
    </button>
  );
};
