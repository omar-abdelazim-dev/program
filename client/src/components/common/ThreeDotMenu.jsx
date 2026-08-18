import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const ThreeDotMenu = ({
  options: optionsProp,
  items: itemsProp,
  className = "",
  menuClassName = "",
  placement = "bottom-end",
  width = "180px",
  disabled = false
}) => {
  const rawOptions = optionsProp || itemsProp || [];
  const options = rawOptions.map(opt => ({
    ...opt,
    action: opt.action || opt.onClick || (() => {}),
    danger: Boolean(opt.danger || opt.intent === 'danger')
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 }); // Render off-screen initially
  const [transformOrigin, setTransformOrigin] = useState("top right");
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const t = setTimeout(() => {
        setShouldRender(false);
        setCoords({ top: -9999, left: -9999 }); // Reset coords so it hides initially next time
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();

    const padding = 8; // Margin from the trigger
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.bottom + padding;
    let left = triggerRect.right - dropdownRect.width;
    let origin = "top right";

    // Detect bottom overflow
    if (top + dropdownRect.height > viewportHeight - padding) {
      // Flip upward
      top = triggerRect.top - dropdownRect.height - padding;
      origin = "bottom right";
      
      // If flipping upward also overflows the top, fallback to bottom (or center if you want, but bottom is standard fallback)
      if (top < padding) {
        top = triggerRect.bottom + padding;
        origin = "top right";
      }
    }

    // Detect left overflow
    if (left < padding) {
      left = triggerRect.left; // Align to left edge of trigger instead
      origin = origin.replace("right", "left");
      
      if (left + dropdownRect.width > viewportWidth - padding) {
          left = padding; // Absolute fallback
      }
    }

    // Detect right overflow
    if (left + dropdownRect.width > viewportWidth - padding) {
      left = viewportWidth - dropdownRect.width - padding;
      origin = origin.replace("left", "right");
    }

    setCoords({ top, left });
    setTransformOrigin(origin);
  }, [isOpen]);

  // Initial positioning after first render
  useLayoutEffect(() => {
    if (isOpen && shouldRender) {
        // The portal is now in the DOM. Calculate position.
        // We use requestAnimationFrame to ensure the browser has painted the portal content
        // so getBoundingClientRect returns correct dimensions.
        requestAnimationFrame(() => {
            updatePosition();
        });
    }
  }, [isOpen, shouldRender, updatePosition]);

  useEffect(() => {
    if (isOpen) {
      const handleScroll = (e) => {
        // Only update if scrolling happened outside the dropdown itself
        if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
        updatePosition();
      };
      
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', handleScroll, true); // Capture phase to catch all scrollable containers

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(e.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target);
      
      if (isOutsideTrigger && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard Navigation
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const selectedOpt = options[focusedIndex];
        if (selectedOpt && !selectedOpt.disabled) {
          selectedOpt.action();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      } else if (e.key === 'Tab') {
        // Trap focus
        e.preventDefault();
        setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, focusedIndex]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) {
      if (!isOpen) {
        setShouldRender(true); // Sync update for immediate rendering
      }
      setIsOpen(!isOpen);
    }
  };

  const portalContent = shouldRender && (
    <div
      ref={dropdownRef}
      className={`global-dropdown-menu ${menuClassName} ${!isOpen ? 'exiting' : ''}`}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: width,
        transformOrigin: transformOrigin,
        visibility: coords.top === -9999 ? 'hidden' : 'visible',
      }}
      role="menu"
    >
      <div className="custom-select-options" style={{ padding: 0, paddingRight: "4px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>
      {options.map((opt, i) => (
        <button
          key={i}
          role="menuitem"
          className={`global-dropdown-item ${focusedIndex === i ? 'focused' : ''} ${opt.disabled ? 'disabled' : ''} ${opt.danger ? 'danger' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!opt.disabled) {
              opt.action();
              setIsOpen(false);
              triggerRef.current?.focus();
            }
          }}
          onMouseEnter={() => setFocusedIndex(i)}
          tabIndex={-1}
        >
          {opt.icon && <span className="dropdown-item-icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        className={`global-three-dot-trigger ${className} ${isOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {shouldRender && createPortal(portalContent, document.body)}
    </>
  );
};

export default ThreeDotMenu;
