import sys

# 1. ThreeDotMenu.jsx
with open('client/src/components/common/ThreeDotMenu.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '      role="menu"\n    >\n      {options.map((opt, i) => (',
    '      role="menu"\n    >\n      <div className="custom-select-options" style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "300px", overflowY: "auto" }}>\n      {options.map((opt, i) => ('
)
content = content.replace(
    '      ))}\n    </div>\n  );',
    '      ))}\n      </div>\n    </div>\n  );'
)

with open('client/src/components/common/ThreeDotMenu.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. content.css (.global-dropdown-menu)
with open('client/src/styles/content.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '    border-radius: 16px;\n    padding: 8px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    z-index: var(--z-dropdown, 10000);',
    '    border-radius: 16px;\n    overflow: hidden;\n    z-index: var(--z-dropdown, 10000);'
)

with open('client/src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. AdminCourseManagementTab.jsx
with open('client/src/components/AdminCourseManagementTab.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''          background: "var(--bg-surface)",
          border: "none",
          borderRadius: "12px",
          padding: "8px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          boxShadow: "var(--outer-shadow)",
          maxHeight: "250px",
          overflowY: "auto"
        }}>
          {options.map(opt => (''',
'''          background: "var(--bg-surface)",
          border: "none",
          borderRadius: "12px",
          zIndex: 100,
          boxShadow: "var(--outer-shadow)",
          overflow: "hidden"
        }}>
          <div className="custom-select-options" style={{
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            maxHeight: "250px",
            overflowY: "auto"
          }}>
          {options.map(opt => ('''
)

content = content.replace(
'''              </button>
            ))}
          </div>
        )}''',
'''              </button>
            ))}
          </div>
          </div>
        )}'''
)

with open('client/src/components/AdminCourseManagementTab.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 4. student-layout.css (.profile-dropdown)
with open('client/src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10000;
  box-shadow: var(--outer-shadow), var(--outer-shadow);''',
'''  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  width: 200px;
  z-index: 10000;
  box-shadow: var(--outer-shadow), var(--outer-shadow);'''
)

with open('client/src/styles/student-layout.css', 'w', encoding='utf-8') as f:
    f.write(content)

# 5. StudentLayout.jsx (add padding back to an inner div for profile-dropdown)
with open('client/src/components/StudentLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '              <div className="profile-dropdown" style={{ width: "320px" }}>',
    '              <div className="profile-dropdown" style={{ width: "320px" }}>\n                <div style={{ padding: "8px", display: "flex", flexDirection: "column" }}>'
)

content = content.replace(
    '                )}\n              </div>\n            </div>\n\n            <div className="profile-wrapper desktop-only-icon">',
    '                )}\n                </div>\n              </div>\n            </div>\n\n            <div className="profile-wrapper desktop-only-icon">'
)

with open('client/src/components/StudentLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied to all menus")
