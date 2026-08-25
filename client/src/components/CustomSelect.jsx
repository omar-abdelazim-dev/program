import { useState, useEffect, useRef } from 'react';

const CustomSelect = ({ options = [], value, onChange, placeholder, icon, triggerClassName = "", triggerStyle = {}, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(o => o?.value === value);
  const hasEmptyOption = safeOptions.some(o => o?.value === '');
  const optionsRef = useRef(null);

  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const selectedEl = optionsRef.current.querySelector('.custom-select-option.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      } else {
        optionsRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  return (
    <div className={`custom-select-wrapper ${disabled ? 'disabled' : ''}`} ref={wrapperRef} style={{ zIndex: isOpen ? 100 : 1, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <div 
        className={`icon-input-wrapper custom-select-trigger ${isOpen ? 'focus' : ''} ${!icon ? 'no-icon' : ''} ${triggerClassName}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ ...(!icon ? { paddingInlineStart: '16px' } : {}), cursor: disabled ? 'not-allowed' : 'pointer', ...triggerStyle }}
      >
        {icon}
        <div 
          className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}
          title={selectedOption ? selectedOption.label : placeholder}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        {!disabled && <svg className={`custom-select-chevron ${isOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>}
      </div>
      
      
        <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`}>
          <div className="custom-select-options" ref={optionsRef}>
            {placeholder && !hasEmptyOption && (
              <div className="custom-select-option disabled" title={placeholder}>{placeholder}</div>
            )}
            {safeOptions.map(opt => (
              <div 
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                title={opt.label}
              >
                <span className="option-text" title={opt.label}>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};

export default CustomSelect;
