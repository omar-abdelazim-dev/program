import sys

# 1. Update ThreeDotMenu.jsx
with open('client/src/components/common/ThreeDotMenu.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace opacity with visibility to avoid conflicting with the CSS animation, and add exiting class
content = content.replace(
    '''  const portalContent = shouldRender && (
    <div
      ref={dropdownRef}
      className={global-dropdown-menu }
      style={{
        position: 'fixed',
        top: ${coords.top}px,
        left: ${coords.left}px,
        width: width,
        transformOrigin: transformOrigin,
        opacity: coords.top === -9999 ? 0 : 1, // Hide until positioned
      }}''',
    '''  const portalContent = shouldRender && (
    <div
      ref={dropdownRef}
      className={global-dropdown-menu  }
      style={{
        position: 'fixed',
        top: ${coords.top}px,
        left: ${coords.left}px,
        width: width,
        transformOrigin: transformOrigin,
        visibility: coords.top === -9999 ? 'hidden' : 'visible', // Hide until positioned without conflicting with opacity animation
      }}'''
)

with open('client/src/components/common/ThreeDotMenu.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update content.css to add exiting animation
with open('client/src/styles/content.css', 'r', encoding='utf-8') as f:
    content = f.read()

exit_css = '''
.global-dropdown-menu.exiting {
    animation: smoothDropdownExit 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes smoothDropdownExit {
    from {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    to {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
    }
}
'''

if 'smoothDropdownExit' not in content:
    content = content.replace(
        '@keyframes smoothDropdownEnter {',
        exit_css + '\n@keyframes smoothDropdownEnter {'
    )

with open('client/src/styles/content.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("ThreeDotMenu updated successfully")
