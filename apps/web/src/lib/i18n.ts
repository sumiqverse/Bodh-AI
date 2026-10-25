export type Locale = 'en' | 'hi';

export const DEFAULT_LOCALE: Locale = 'en';

export const translations = {
  en: {
    'platform.title': 'BodhAI',
    'platform.tagline': 'Adaptive Learning for Classes 6–10',
    'platform.welcome': 'Welcome to BodhAI',
    'platform.description':
      'An adaptive learning platform designed to support curriculum-aligned mastery for middle and high school students.',
    'platform.classes': 'Target Classes: 6, 7, 8, 9, 10',
    'platform.cta.start': 'Start Diagnostic Assessment',
    'platform.cta.explore': 'Explore Syllabus',
    'platform.status.healthy': 'System Status: Operational',
    'nav.home': 'Home',
    'nav.curriculum': 'Curriculum',
    'nav.diagnostic': 'Diagnostic',
    'grade.select': 'Select Your Class',
    'grade.class6': 'Class 6',
    'grade.class7': 'Class 7',
    'grade.class8': 'Class 8',
    'grade.class9': 'Class 9',
    'grade.class10': 'Class 10',
  },
  hi: {
    'platform.title': 'बोधAI (BodhAI)',
    'platform.tagline': 'कक्षा 6–10 के लिए अनुकूलित शिक्षण मंच',
    'platform.welcome': 'बोधAI में आपका स्वागत है',
    'platform.description':
      'कक्षा 6 से 10 के विद्यार्थियों के लिए व्यक्तिगत एवं अनुकूलित शिक्षण प्रणाली।',
    'platform.classes': 'लक्षित कक्षाएं: 6, 7, 8, 9, 10',
    'platform.cta.start': 'निदानात्मक मूल्यांकन शुरू करें',
    'platform.cta.explore': 'पाठ्यक्रम देखें',
    'platform.status.healthy': 'प्रणाली स्थिति: सक्रिय',
    'nav.home': 'होम',
    'nav.curriculum': 'पाठ्यक्रम',
    'nav.diagnostic': 'मूल्यांकन',
    'grade.select': 'अपनी कक्षा चुनें',
    'grade.class6': 'कक्षा 6',
    'grade.class7': 'कक्षा 7',
    'grade.class8': 'कक्षा 8',
    'grade.class9': 'कक्षा 9',
    'grade.class10': 'कक्षा 10',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, locale: Locale = DEFAULT_LOCALE): string {
  const dictionary = translations[locale] ?? translations[DEFAULT_LOCALE];
  const value = dictionary[key];
  if (!value) {
    return key;
  }
  return value;
}
