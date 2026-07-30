import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import arTranslation from './locales/ar.json';

i18n
  // Detects user language
  .use(LanguageDetector)
  // Passes i18n down to react-i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      ar: {
        translation: arTranslation
      }
    },
    fallbackLng: 'en',
    
    // interpolation: escapeValue: false is safe for React
    interpolation: {
      escapeValue: false, 
    },
    
    // We want to update HTML lang and dir when language changes
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Update the document dir and lang immediately on load based on detected language
const applyRtlLayout = (lang) => {
  if (lang === 'ar') {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }
};

applyRtlLayout(i18n.language);

// Listen for language changes and update layout
i18n.on('languageChanged', (lng) => {
  applyRtlLayout(lng);
});

export default i18n;
