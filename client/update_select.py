import os
import re

file_path = 'src/components/CustomSelect.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace conditionally rendered dropdown with permanently rendered one
new_text = text.replace(
    '{isOpen && (',
    ''
).replace(
    '<div className="custom-select-dropdown">',
    '<div className={custom-select-dropdown }>'
).replace(
    '        </div>\n      )}\n    </div>',
    '        </div>\n    </div>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_text)
print("Updated CustomSelect.jsx")
