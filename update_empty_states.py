import json

files = {
    'en': 'client/src/locales/en.json',
    'ar': 'client/src/locales/ar.json'
}

for lang, filepath in files.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'student' not in data: data['student'] = {}
    if 'explore' not in data['student']: data['student']['explore'] = {}
    
    if lang == 'en':
        data['student']['explore']['no_instructors_for'] = 'No instructors found for "{{query}}".'
        data['student']['explore']['no_instructors_yet'] = 'No instructors yet.'
        data['student']['explore']['no_courses_search_category'] = 'No courses found for "{{query}}" in {{category}}.'
        data['student']['explore']['no_courses_search'] = 'No courses found for "{{query}}".'
        data['student']['explore']['no_courses_category'] = 'No courses found in {{category}}.'
    else:
        data['student']['explore']['no_instructors_for'] = 'لم يتم العثور على محاضرين باسم "{{query}}".'
        data['student']['explore']['no_instructors_yet'] = 'لا يوجد محاضرون بعد.'
        data['student']['explore']['no_courses_search_category'] = 'لم يتم العثور على دورات باسم "{{query}}" في {{category}}.'
        data['student']['explore']['no_courses_search'] = 'لم يتم العثور على دورات باسم "{{query}}".'
        data['student']['explore']['no_courses_category'] = 'لا توجد دورات في {{category}}.'

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Translation files updated.")
