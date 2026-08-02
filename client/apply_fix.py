import os

with open('src/styles/student-layout.css', 'r', encoding='utf-8') as f:
    text = f.read().replace('\r', '')

old_tooltip = """.sidebar-icon-btn[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 16px);
  top: 50%;
  transform: translateY(-50%) scale(0.95);
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-card);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  z-index: 1000;
}

.sidebar-icon-btn[data-tooltip]:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) scale(1);
}"""

new_tooltip = """.sidebar-icon-btn[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 16px);
  top: 50%;
  transform: translate(-10px, -50%);
  background: var(--bg-surface);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-card);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.sidebar-icon-btn[data-tooltip]:hover::after {
  opacity: 1;
  visibility: visible;
  transform: translate(0, -50%);
}"""

if old_tooltip in text:
    text = text.replace(old_tooltip, new_tooltip)
    with open('src/styles/student-layout.css', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully!")
else:
    print("Could not find the exact old_tooltip text block. Windows line endings maybe?")

