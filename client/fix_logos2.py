import os
import re

files_to_check = [
    'src/components/AdminAuthPage.jsx',
    'src/components/AuthPage.jsx'
]

for file_path in files_to_check:
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    new_text = text.replace('isLightMode ? ${logoDark}?v=3 : ${logoLight}?v=3', 'isLightMode ? ${logoLight}?v=3 : ${logoDark}?v=3')

    if new_text != text:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Updated {file_path}")

print("done")
