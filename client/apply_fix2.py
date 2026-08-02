import os
import re

with open('src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    text = f.read()

# Desktop tooltip base
text = re.sub(
    r'\.sidebar-icon-btn\[data-tooltip\]::after\s*\{([^\}]+)transform:\s*translateY\(-50%\)\s*scale\(0\.95\);([^\}]+)\}',
    r'.sidebar-icon-btn[data-tooltip]::after {\1transform: translate(-10px, -50%);\2opacity: 0;\n  visibility: hidden;\n  transition: all 0.3s ease;\n}',
    text,
    count=1
)

# Desktop tooltip hover
text = re.sub(
    r'\.sidebar-icon-btn\[data-tooltip\]:hover::after\s*\{([^\}]+)transform:\s*translateY\(-50%\)\s*scale\(1\);([^\}]+)\}',
    r'.sidebar-icon-btn[data-tooltip]:hover::after {\1transform: translate(0, -50%);\2}',
    text,
    count=1
)

# Mobile tooltip base
text = re.sub(
    r'(\.sidebar-icon-btn\[data-tooltip\]::after\s*\{[^\}]+)transform:\s*translateX\(-50%\)\s*scale\(0\.95\)\s*!important;([^\}]+)\}',
    r'\1transform: translate(-50%, 10px) !important;\n    opacity: 0;\n    visibility: hidden;\n    transition: all 0.3s ease;\2}',
    text,
    count=1
)

# Mobile tooltip hover
text = re.sub(
    r'(\.sidebar-icon-btn\[data-tooltip\]:hover::after\s*\{[^\}]+)transform:\s*translateX\(-50%\)\s*scale\(1\)\s*!important;([^\}]+)\}',
    r'\1transform: translate(-50%, 0) !important;\n    opacity: 1;\n    visibility: visible;\2}',
    text,
    count=1
)

with open('src/styles/student-layout.css', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
