import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import noTranslations from './locales/no.json';
import plTranslations from './locales/pl.json';
import uaTranslations from './locales/ua.json';

const resources = {
  no: {
    translation: noTranslations
  },
  pl: {
    translation: plTranslations
  },
  ua: {
    translation: uaTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'no', // Default to Norwegian
    debug: false,
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Namespace configuration
    defaultNS: 'translation',
    ns: ['translation'],
  });

export default i18n;