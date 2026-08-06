import sys

# 1. Update content.css
with open('client/src/styles/content.css', 'r', encoding='utf-8') as f:
    content = f.read()

# For custom-select-dropdown: add padding back to parent, remove from options
content = content.replace(
    '''    border-radius: 16px;
    box-shadow: var(--outer-shadow), var(--outer-shadow);
    animation: smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: top;''',
    '''    border-radius: 16px;
    padding: 8px;
    box-shadow: var(--outer-shadow), var(--outer-shadow);
    animation: smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: top;'''
)

content = content.replace(
    '''    max-height: 250px;
    overflow-y: auto;
    padding: 8px;''',
    '''    max-height: 250px;
    overflow-y: auto;
    padding-right: 4px;''' # add a small padding-right so scrollbar doesn't hug items
)

# For global-dropdown-menu: add padding back to parent
content = content.replace(
    '''    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    z-index: var(--z-dropdown, 10000);''',
    '''    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    padding: 8px;
    z-index: var(--z-dropdown, 10000);'''
)

with open('client/src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(content)


# 2. Update ThreeDotMenu.jsx
with open('client/src/components/common/ThreeDotMenu.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''      <div className="custom-select-options" style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>''',
    '''      <div className="custom-select-options" style={{ padding: 0, paddingRight: "4px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>'''
)

with open('client/src/components/common/ThreeDotMenu.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


# 3. Update AdminCourseManagementTab.jsx
with open('client/src/components/AdminCourseManagementTab.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''          border: "none",
          borderRadius: "12px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden",
          animation: "smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformOrigin: "top"
        }}>
          <div className="custom-select-options" style={{
            padding: "8px",''',
    '''          border: "none",
          borderRadius: "12px",
          padding: "8px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden",
          animation: "smoothDropdownEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transformOrigin: "top"
        }}>
          <div className="custom-select-options" style={{
            padding: 0, paddingRight: "4px",'''
)

with open('client/src/components/AdminCourseManagementTab.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


# 4. Update student-layout.css (.profile-dropdown)
with open('client/src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  width: 200px;
  z-index: 10000;''',
    '''  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  padding: 8px;
  width: 200px;
  z-index: 10000;'''
)

with open('client/src/styles/student-layout.css', 'w', encoding='utf-8') as f:
    f.write(content)

# 5. Update StudentLayout.jsx
with open('client/src/components/StudentLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '''              <div className="profile-dropdown" style={{ width: "320px" }}>
                <div style={{ padding: "8px", display: "flex", flexDirection: "column" }}>''',
    '''              <div className="profile-dropdown" style={{ width: "320px" }}>
                <div style={{ padding: 0, paddingRight: "4px", display: "flex", flexDirection: "column" }}>'''
)

with open('client/src/components/StudentLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)


print("Moved padding back to parent")
