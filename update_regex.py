with open('client/src/components/StudentLayout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(r'/\\s+/g', r'/\s+/g')

with open('client/src/components/StudentLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
