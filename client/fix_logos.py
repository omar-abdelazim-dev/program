import os
import re

files_to_check = [
    'src/components/AdminAuthPage.jsx',
    'src/components/AdminPortal.jsx',
    'src/components/AuthPage.jsx',
    'src/components/CourseCard.jsx'
]

for file_path in files_to_check:
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Revert back to the correct logic
    new_text = re.sub(
        r'isLightMode\s*\?\s*logoDark\s*:\s*logoLight',
        'isLightMode ? logoLight : logoDark',
        text
    )

    new_text = re.sub(
        r'isLightMode\s*\?\s*\$\{logoDark\}\?v=3\s*:\s*\$\{logoLight\}\?v=3',
        r'isLightMode ? ${logoLight}?v=3 : ${logoDark}?v=3',
        new_text
    )

    if new_text != text:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Updated {file_path}")

print("done")
