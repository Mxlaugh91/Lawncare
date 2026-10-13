import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import noTranslations from './locales/no.json';
import plTranslations from './locales/pl.json';
import ukTranslations from './locales/uk.json';

const resources = {
  no: {
    translation: noTranslations
  },
  pl: {
    translation: plTranslations
  },
  uk: {
    translation: ukTranslations
  }
};

// Ukrainian is "uk" (a valid BCP-47 tag). Older builds cached the invalid "ua"
// code in localStorage, so migrate it once before detection runs.
if (typeof localStorage !== 'undefined') {
  try {
    const cached = localStorage.getItem('i18nextLng');
    if (cached === 'ua' || cached?.startsWith('ua-')) {
      localStorage.setItem('i18nextLng', 'uk');
    }
  } catch {
    // Ignore storage errors (private mode, disabled cookies, ...).
  }
}

// Keep <html lang> in sync with the language that is actually used.
const syncDocumentLanguage = () => {
  if (typeof document === 'undefined') return;
  const resolved = i18n.resolvedLanguage;
  if (resolved) {
    document.documentElement.lang = resolved;
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Valid, supported language tags. nonExplicitSupportedLngs lets region
    // variants such as "uk-UA" fall back to the base language "uk".
    supportedLngs: ['no', 'pl', 'uk'],
    nonExplicitSupportedLngs: true,
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
  })
  .then(syncDocumentLanguage)
  .catch((error) => {
    console.error('i18n initialization failed:', error);
  });

i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
