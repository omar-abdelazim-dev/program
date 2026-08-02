import os
import re

files_to_update = {
    'src/App.jsx': [
        (r'<Route path="/student/explore" element={<DiscoverTab searchQuery=\{searchQuery\} activeCategory=\{exploreCategory\} />} />',
         r'<Route path="/student/explore" element={<DiscoverTab searchQuery={searchQuery} activeCategory={exploreCategory} isLightMode={isLightMode} />} />'),
        (r'<Route path="/instructor/:id" element={<InstructorProfilePage />} />',
         r'<Route path="/instructor/:id" element={<InstructorProfilePage isLightMode={isLightMode} />} />'),
    ],
    'src/components/DiscoverTab.jsx': [
        (r'export default function DiscoverTab\(\{ searchQuery = "", activeCategory: activeTab = ALL_TAB \}\) \{',
         r'export default function DiscoverTab({ searchQuery = "", activeCategory: activeTab = ALL_TAB, isLightMode }) {'),
        (r'<CourseCard key=\{course._id \|\| idx\} course=\{course\} idx=\{idx\} />',
         r'<CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />')
    ],
    'src/components/InstructorProfilePage.jsx': [
        (r'export default function InstructorProfilePage\(\) \{',
         r'export default function InstructorProfilePage({ isLightMode }) {'),
        (r'<CourseCard key=\{course._id \|\| idx\} course=\{course\} idx=\{idx\} />',
         r'<CourseCard key={course._id || idx} course={course} idx={idx} isLightMode={isLightMode} />')
    ]
}

for file_path, replacements in files_to_update.items():
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    for old, new in replacements:
        text = re.sub(old, new, text)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Updated {file_path}")

print("done")
