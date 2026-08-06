import sys

def modify_jsx():
    # StudentLayout.jsx
    with open('client/src/components/StudentLayout.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace("t('student.nav.dark_mode', 'Dark Mode')", "t('settings.appearance.dark', 'Dark Mode')")
    content = content.replace("t('student.nav.light_mode', 'Light Mode')", "t('settings.appearance.light', 'Light Mode')")
    content = content.replace("t('student.nav.cart', 'Cart')", "t('nav.cart', 'Cart')")
    content = content.replace("t('student.nav.settings', 'Settings')", "t('nav.settings', 'Settings')")
    content = content.replace("t('student.nav.logout', 'Logout')", "t('nav.logout', 'Logout')")

    with open('client/src/components/StudentLayout.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

    # DiscoverTab.jsx
    with open('client/src/components/DiscoverTab.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("t('student.nav.explore', 'Explore')", "t('nav.explore', 'Explore')")
    
    with open('client/src/components/DiscoverTab.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

modify_jsx()
print("Translations fixed")
