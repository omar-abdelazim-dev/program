import os
import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    def replacer(match):
        fields = match.group(2).split(' ')
        if 'isProgramInstructor' not in fields:
            fields.append('isProgramInstructor')
        new_fields = ' '.join(fields)
        return match.group(1) + new_fields + match.group(3)

    text = re.sub(r'(\.populate\(\s*\'instructor\'\s*,\s*\')([^\']+)(\'\s*\))', replacer, text)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    
    print(f"Updated {filepath}")

update_file('../server/controllers/courseController.js')
update_file('../server/controllers/instructorController.js')
update_file('../server/controllers/adminController.js')
update_file('../server/controllers/exploreController.js')
