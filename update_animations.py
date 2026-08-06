import sys

# 1. Update content.css
with open('client/src/styles/content.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace menuEntrance with smoothDropdownEnter and add transform-origin
content = content.replace(
    'animation: menuEntrance 180ms ease forwards;',
    'animation: smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n    transform-origin: top;'
)

# Replace the keyframes
content = content.replace(
    '''@keyframes menuEntrance {
    from {
        opacity: 0;
        transform: scale(0.96);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}''',
    '''@keyframes smoothDropdownEnter {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}'''
)

with open('client/src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update CustomSelect.jsx (remove animate-entrance to avoid overriding)
with open('client/src/components/CustomSelect.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="custom-select-dropdown animate-entrance"',
    'className="custom-select-dropdown"'
)

with open('client/src/components/CustomSelect.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update AdminCourseManagementTab.jsx (add animation)
with open('client/src/components/AdminCourseManagementTab.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''          border: "none",
          borderRadius: "12px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden"''',
    '''          border: "none",
          borderRadius: "12px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden",
          animation: "smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformOrigin: "top"'''
)

with open('client/src/components/AdminCourseManagementTab.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 4. Update student-layout.css (.profile-dropdown)
with open('client/src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;''',
    '''  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.95);
  transform-origin: top right;
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;'''
)

content = content.replace(
    '''.profile-wrapper:hover .profile-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}''',
    '''.profile-wrapper:hover .profile-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}'''
)

with open('client/src/styles/student-layout.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("Animations updated successfully")
