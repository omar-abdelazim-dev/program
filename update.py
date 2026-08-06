import sys

def modify_jsx():
    with open('client/src/components/StudentLayout.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    if 'ThreeDotMenu' not in content:
        content = content.replace('import CustomSelect from "./CustomSelect";', 'import CustomSelect from "./CustomSelect";\nimport ThreeDotMenu from "./common/ThreeDotMenu";')

    if 'mobileMenuOptions' not in content:
        # Insert mobileMenuOptions before return
        insert_idx = content.find('return (')
        options_str = '''
  const mobileMenuOptions = [
    {
      label: i18n.language === "ar" ? "English" : "عربي",
      action: toggleLanguage,
    },
    {
      label: isLightMode ? t('student.nav.dark_mode', 'Dark Mode') : t('student.nav.light_mode', 'Light Mode'),
      action: toggleTheme,
    }
  ];

  '''
        content = content[:insert_idx] + options_str + content[insert_idx:]

    # Add desktop-only-icon class to Language button
    if 'className="utility-icon-btn"' in content:
        content = content.replace('className="utility-icon-btn"\\n              onClick={toggleLanguage}', 'className="utility-icon-btn desktop-only-icon"\\n              onClick={toggleLanguage}', 1)
    
    # Add desktop-only-icon class to Theme button
    if 'className="utility-icon-btn theme-toggle-btn"' in content:
        content = content.replace('className="utility-icon-btn theme-toggle-btn"', 'className="utility-icon-btn theme-toggle-btn desktop-only-icon"')

    # Insert mobile menu before cart
    if '<div className="mobile-only-menu">' not in content:
        content = content.replace('            <Link', '            <div className="mobile-only-menu">\\n              <ThreeDotMenu options={mobileMenuOptions} placement="bottom-end" />\\n            </div>\\n\\n            <Link')

    with open('client/src/components/StudentLayout.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

def modify_css():
    css_str = '''
.mobile-only-menu {
  display: none;
}

@media (max-width: 850px) {
  .desktop-only-icon {
    display: none !important;
  }
  .mobile-only-menu {
    display: block;
  }
}
'''
    with open('client/src/styles/student-layout.css', 'a', encoding='utf-8') as f:
        f.write(css_str)

modify_jsx()
modify_css()
print("Done")
