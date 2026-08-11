import React from 'react';
import ReactDOM from 'react-dom';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

export const notyf = new Notyf({
  position: { x: 'right', y: 'bottom' },
  types: [{ type: 'info', background: '#3B82F6', icon: false }]
});
export const InputField = ({ label, type = "text", value, onChange, disabled, placeholder, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} data-tooltip={disabled ? "Super Admin permission required" : ""}>
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} data-tooltip={disabled ? "Super Admin permission required" : ""}>
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

export const SelectField = ({ label, value, onChange, options, disabled }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [rect, setRect] = React.useState({ top: 0, left: 0, bottom: 0, width: 0 });

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // If click is outside both the button AND the portal menu
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleScroll = (e) => {
      // Don't close if scrolling INSIDE the menu itself
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (isOpen) setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener("scroll", handleScroll, { capture: true });
      window.addEventListener("resize", handleScroll);
    }
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && dropdownRef.current) {
      const r = dropdownRef.current.getBoundingClientRect();
      setRect({
        top: r.top + window.scrollY,
        bottom: r.bottom + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const getLabel = (val) => {
    const found = options.find(opt => (opt.value || opt) === val);
    return found ? (found.label || found.value || found) : val;
  };

  // Determine if it should open upwards or downwards based on screen space
  const spaceBelow = window.innerHeight - (rect.bottom - window.scrollY);
  const openUpwards = spaceBelow < 250 && (rect.top - window.scrollY) > spaceBelow;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }} data-tooltip={disabled ? "Super Admin permission required" : ""}>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={toggleOpen}
          className="solid-input"
          style={{
            width: '100%',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingRight: '16px',
            background: 'var(--bg-main)',
            border: isOpen ? '1px solid #f97316' : '1px solid transparent',
            boxShadow: isOpen ? 'var(--outer-shadow), 0 0 0 3px rgba(249, 115, 22, 0.2)' : 'var(--inner-shadow)',
            color: 'var(--c-light)',
          }}
        >
          <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {getLabel(value) || 'Select...'}
          </span>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", transition: "transform 0.2s", transform: isOpen ? (openUpwards ? "rotate(0)" : "rotate(180deg)") : "rotate(0)" }}>▼</span>
        </button>
        
        {isOpen && !disabled && ReactDOM.createPortal(
          <div ref={menuRef} style={{
            position: "absolute",
            top: openUpwards ? 'auto' : `${rect.bottom + 8}px`,
            bottom: openUpwards ? `${window.innerHeight - rect.top + 8}px` : 'auto',
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            background: "var(--bg-surface)",
            border: "none",
            borderRadius: "12px",
            padding: "8px",
            zIndex: 999999, // Ensure it's above everything including modals
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "var(--outer-shadow)",
            maxHeight: "250px",
            overflowY: "auto"
          }}>
            {options.map(opt => {
              const optValue = opt.value || opt;
              const optLabel = opt.label || opt;
              const isSelected = value === optValue;
              
              return (
                <button
                  key={optValue}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: optValue } });
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    background: isSelected ? "var(--bg-main)" : "transparent",
                    boxShadow: isSelected ? "var(--inner-shadow)" : "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    transition: "all 0.2s ease",
                    color: isSelected ? "transparent" : "var(--c-sub)",
                    ...(isSelected ? {
                      backgroundImage: "linear-gradient(90deg, #f97316, #fbad41)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      fontWeight: "600"
                    } : {})
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.target.style.background = "var(--bg-main)";
                      e.target.style.boxShadow = "var(--inner-shadow)";
                      e.target.style.color = "var(--c-light)";
                      e.target.style.WebkitTextFillColor = "var(--c-light)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.target.style.background = "transparent";
                      e.target.style.boxShadow = "none";
                      e.target.style.color = "var(--c-sub)";
                      e.target.style.WebkitTextFillColor = "var(--c-sub)";
                    }
                  }}
                >
                  {optLabel}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

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
    btnStyle.boxShadow = 'var(--inner-shadow)';
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
      data-tooltip={title}
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
