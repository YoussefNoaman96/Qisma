import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { readPreference } from './lib/preferences';

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: readPreference('expenseSplitterLanguage', 'ar') === 'en' ? 'en' : 'ar',
  fallbackLng: 'ar',
  supportedLngs: ['ar', 'en'],
  interpolation: { escapeValue: false }, // React escapes text for us.
});

export default i18n;
