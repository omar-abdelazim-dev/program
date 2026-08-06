import sys

# 1. Update content.css
with open('client/src/styles/content.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace custom-select-dropdown
content = content.replace(
    '''    box-shadow: var(--outer-shadow), var(--outer-shadow);
    animation: smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: top;''',
    '''    box-shadow: var(--outer-shadow), var(--outer-shadow);
    transform-origin: top;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px) scale(0.95);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
}

.custom-select-dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);'''
)

# Replace global-dropdown-menu
content = content.replace(
    '''    padding: 8px;
    z-index: var(--z-dropdown, 10000);
    box-shadow: var(--outer-shadow), var(--outer-shadow);
    animation: smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}''',
    '''    padding: 8px;
    z-index: var(--z-dropdown, 10000);
    box-shadow: var(--outer-shadow), var(--outer-shadow);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px) scale(0.95);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
}

.global-dropdown-menu.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.inline-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    background: var(--bg-surface);
    border: none;
    border-radius: 12px;
    padding: 8px;
    z-index: 100;
    box-shadow: var(--outer-shadow);
    overflow: hidden;
    transform-origin: top;
    
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateY(-8px) scale(0.95);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
}

.inline-dropdown-menu.open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateY(0) scale(1);
}'''
)

with open('client/src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update CustomSelect.jsx
with open('client/src/components/CustomSelect.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''      {isOpen && (
        <div className="custom-select-dropdown">''',
    '''      <div className={custom-select-dropdown }>'''
)

content = content.replace(
    '''          </div>
        </div>
      )}
    </div>''',
    '''          </div>
      </div>
    </div>'''
)

with open('client/src/components/CustomSelect.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


# 3. Update ThreeDotMenu.jsx
with open('client/src/components/common/ThreeDotMenu.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add shouldRender state
content = content.replace(
    '  const [isOpen, setIsOpen] = useState(false);',
    '  const [isOpen, setIsOpen] = useState(false);\n  const [shouldRender, setShouldRender] = useState(false);'
)

# Add shouldRender effect
content = content.replace(
    '  const [focusedIndex, setFocusedIndex] = useState(-1);',
    '''  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
    else {
      const t = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);'''
)

# Change portal condition and opacity logic
content = content.replace(
    '  const portalContent = isOpen && (',
    '  const portalContent = shouldRender && ('
)

content = content.replace(
    '''      className={global-dropdown-menu }
      style={{
        position: 'fixed',
        top: ${coords.top}px,
        left: ${coords.left}px,
        width: width,
        transformOrigin: transformOrigin,
        opacity: coords.top === -9999 ? 0 : 1, // Hide until positioned
      }}''',
    '''      className={global-dropdown-menu  }
      style={{
        position: 'fixed',
        top: ${coords.top}px,
        left: ${coords.left}px,
        width: width,
        transformOrigin: transformOrigin
      }}'''
)

content = content.replace(
    '      {isOpen && createPortal(portalContent, document.body)}',
    '      {shouldRender && createPortal(portalContent, document.body)}'
)

with open('client/src/components/common/ThreeDotMenu.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


# 4. Update AdminCourseManagementTab.jsx
with open('client/src/components/AdminCourseManagementTab.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''      {isOpen && !disabled && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "8px",
          background: "var(--bg-surface)",
          border: "none",
          borderRadius: "12px",
          padding: "8px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden",
          animation: "smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformOrigin: "top"
        }}>''',
    '''      <div className={inline-dropdown-menu }>'''
)

content = content.replace(
    '''          </div>
          </div>
        )}
    </div>''',
    '''          </div>
          </div>
      </div>
    </div>'''
)

with open('client/src/components/AdminCourseManagementTab.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied slide back animations")
