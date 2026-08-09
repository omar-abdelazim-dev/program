import os
import re

# 1. Replace title= with data-tooltip= in all JSX files
directory = 'client/src'
for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # This regex replaces 'title=' with 'data-tooltip=' but only when it is an attribute
            # We match whitespace + title=
            new_content = re.sub(r'(\s)title=(?=[{"\'])', r'\1data-tooltip=', content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Updated {filepath}')

# 2. Add global [data-tooltip] CSS to content.css
css_to_add = '''

/* Global Tooltip Styles */
[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translate(-50%, 10px);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s ease;
  z-index: 9999;
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

[data-tooltip]:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0);
}
'''

with open('client/src/styles/content.css', 'a', encoding='utf-8') as f:
    f.write(css_to_add)

print('Done applying global CSS.')
