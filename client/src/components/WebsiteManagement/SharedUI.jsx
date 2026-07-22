import React from 'react';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

export const notyf = new Notyf({
  position: { x: 'right', y: 'bottom' },
  types: [{ type: 'info', background: '#3B82F6', icon: false }]
});
export const InputField = ({ label, type = "text", value, onChange, disabled, placeholder, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      className="glass-input"
      style={{ width: '100%', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

export const TextareaField = ({ label, value, onChange, disabled, placeholder, required, rows = 4 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} title={disabled ? "Super Admin permission required" : ""}>
    <label style={{ fontSize: '0.85rem', color: 'var(--c-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      rows={rows}
      className="glass-input"
      style={{ width: '100%', minHeight: `${rows * 25}px`, resize: 'vertical', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
    />
  </div>
);

export const SelectField = ({ label, value, onChange, options, disabled }) => (
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
          <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
        ))}
      </select>
      <i className="lucide-chevron-down" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', pointerEvents: 'none' }}>
        ▼
      </i>
    </div>
  </div>
);

export const Button = ({ children, onClick, variant = 'primary', type = "button", disabled, style, title }) => {
  let bg = 'rgba(var(--c-accent-rgb), 0.1)';
  let color = 'var(--c-accent)';
  let border = 'rgba(var(--c-accent-rgb), 0.3)';

  if (variant === 'danger') {
    bg = 'rgba(239,68,68,0.1)'; color = '#EF4444'; border = 'rgba(239,68,68,0.3)';
  } else if (variant === 'success') {
    bg = 'rgba(16,185,129,0.1)'; color = '#10B981'; border = 'rgba(16,185,129,0.3)';
  } else if (variant === 'warning') {
    bg = 'rgba(245,158,11,0.1)'; color = '#F59E0B'; border = 'rgba(245,158,11,0.3)';
  } else if (variant === 'secondary') {
    bg = 'rgba(255,255,255,0.05)'; color = 'var(--text-1)'; border = 'rgba(255,255,255,0.1)';
  } else if (variant === 'primary') {
    bg = 'rgba(59,130,246,0.1)'; color = '#3B82F6'; border = 'rgba(59,130,246,0.3)';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="glass-input"
      style={{
        padding: '10px 20px',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: 'auto',
        ...style
      }}
    >
      {children}
    </button>
  );
};
