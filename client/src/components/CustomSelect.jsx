import { useState, useEffect, useRef } from 'react';

const CustomSelect = ({ options, value, onChange, placeholder, icon }) => {
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

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="custom-select-wrapper" ref={wrapperRef}>
      <div 
        className={`icon-input-wrapper custom-select-trigger ${isOpen ? 'focus' : ''} ${!icon ? 'no-icon' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={!icon ? { paddingLeft: '14px' } : undefined}
      >
        {icon}
        <div className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </div>
        <svg className={`custom-select-chevron ${isOpen ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      
      {isOpen && (
        <div className="custom-select-dropdown animate-entrance">
          <div className="custom-select-options">
            <div className="custom-select-option disabled">{placeholder}</div>
            {options.map(opt => (
              <div 
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
