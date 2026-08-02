import re

with open('src/styles/content.css', 'r', encoding='utf-8') as f:
    text = f.read()

# Update smoothDropdownEnter
text = re.sub(
    r'@keyframes smoothDropdownEnter\s*\{\s*from\s*\{\s*opacity: 0;\s*transform: scale\(0\.95\) translateY\(-4px\);\s*\}\s*to\s*\{\s*opacity: 1;\s*transform: scale\(1\) translateY\(0\);\s*\}\s*\}',
    r'@keyframes smoothDropdownEnter {\n    from {\n        opacity: 0;\n        transform: translateY(10px);\n    }\n    to {\n        opacity: 1;\n        transform: translateY(0);\n    }\n}',
    text
)

# Update smoothDropdownExit
text = re.sub(
    r'@keyframes smoothDropdownExit\s*\{\s*from\s*\{\s*opacity: 1;\s*transform: scale\(1\) translateY\(0\);\s*\}\s*to\s*\{\s*opacity: 0;\s*transform: scale\(0\.95\) translateY\(-4px\);\s*\}\s*\}',
    r'@keyframes smoothDropdownExit {\n    from {\n        opacity: 1;\n        transform: translateY(0);\n    }\n    to {\n        opacity: 0;\n        transform: translateY(10px);\n    }\n}',
    text
)

with open('src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
