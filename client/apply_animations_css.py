import re

# 1. Update sideBar.css
with open('src/styles/sideBar.css', 'r', encoding='utf-8') as f:
    sidebar_css = f.read()

sidebar_css = re.sub(
    r'\.sideBar\.collapsed \.sideBarButton::after \{([^\}]+)transform: translateY\(-50%\);([^\}]+)opacity: 0;\s*transition: opacity \.15s;([^\}]+)\}',
    r'.sideBar.collapsed .sideBarButton::after {\1transform: translate(10px, -50%);\2opacity: 0;\n    visibility: hidden;\n    transition: all 0.3s ease;\3}',
    sidebar_css
)

sidebar_css = re.sub(
    r'\.sideBar\.collapsed \.sideBarButton:hover::after \{\s*opacity: 1;\s*\}',
    r'.sideBar.collapsed .sideBarButton:hover::after {\n    opacity: 1;\n    visibility: visible;\n    transform: translate(0, -50%);\n}',
    sidebar_css
)

with open('src/styles/sideBar.css', 'w', encoding='utf-8') as f:
    f.write(sidebar_css)

# 2. Update student-layout.css tooltips
with open('src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    student_layout = f.read()

student_layout = re.sub(
    r'(\.sidebar-icon-btn\[data-tooltip\]::after \{[^\}]+)transform: translateY\(-50%\) scale\(0\.95\);([^\}]+)\}',
    r'\1transform: translate(-10px, -50%);\2opacity: 0;\n  visibility: hidden;\n  transition: all 0.3s ease;\n}',
    student_layout
)

student_layout = re.sub(
    r'(\.sidebar-icon-btn\[data-tooltip\]:hover::after \{[^\}]+)transform: translateY\(-50%\) scale\(1\);([^\}]+)\}',
    r'\1transform: translate(0, -50%);\2}',
    student_layout
)

print("done")
