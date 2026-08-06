import json
import os

files = {
    'en': 'client/src/locales/en.json',
    'ar': 'client/src/locales/ar.json'
}

categories_en = {
  "computer_science": "Computer Science",
  "web_development": "Web Development",
  "business": "Business",
  "cybersecurity": "Cybersecurity",
  "ai": "AI",
  "data_science": "Data Science",
  "anatomy": "Anatomy",
  "medicine": "Medicine",
  "design": "Design",
  "marketing": "Marketing"
}

categories_ar = {
  "computer_science": "علوم الحاسوب",
  "web_development": "تطوير الويب",
  "business": "أعمال",
  "cybersecurity": "أمن سيبراني",
  "ai": "ذكاء اصطناعي",
  "data_science": "علم البيانات",
  "anatomy": "علم التشريح",
  "medicine": "الطب",
  "design": "التصميم",
  "marketing": "التسويق"
}

for lang, filepath in files.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'categories' not in data:
        data['categories'] = {}
    
    if lang == 'en':
        data['categories'].update(categories_en)
        if 'student' not in data: data['student'] = {}
        if 'explore' not in data['student']: data['student']['explore'] = {}
        data['student']['explore']['all'] = "All"
        data['student']['explore']['instructors'] = "Instructors"
        data['student']['explore']['select_category'] = "Select Category"
    else:
        data['categories'].update(categories_ar)
        if 'student' not in data: data['student'] = {}
        if 'explore' not in data['student']: data['student']['explore'] = {}
        data['student']['explore']['all'] = "الكل"
        data['student']['explore']['instructors'] = "المحاضرون"
        data['student']['explore']['select_category'] = "اختر الفئة"

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Translation files updated.")
