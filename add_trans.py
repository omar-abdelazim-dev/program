import sys
import json

def add_translation(file_path, key_path, value):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    keys = key_path.split('.')
    current = data
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

add_translation('client/src/locales/en.json', 'student.instructors_matching', 'Instructors matching')
add_translation('client/src/locales/ar.json', 'student.instructors_matching', 'المدربين المطابقين لـ')
print("Translations added")
