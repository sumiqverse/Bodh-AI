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
    'offline.status.online': 'Online',
    'offline.status.offline': 'Offline Mode',
    'offline.status.syncing': 'Syncing...',
    'offline.sync.pending': 'unsynced attempts pending',
    'offline.sync.now': 'Sync Now',
    'offline.sync.synced': 'All changes saved & synced',
    'offline.sync.error': 'Sync failed. Will retry automatically.',
    'offline.badge': 'Offline Ready',
    'offline.download.title': 'Offline Lesson Packs',
    'offline.download.chapter': 'Chapter',
    'offline.download.action': 'Download for Offline',
    'offline.download.downloading': 'Downloading...',
    'offline.download.ready': 'Downloaded',
    'offline.download.delete': 'Remove Download',
    'offline.download.storage_used': 'Storage Used',
    'offline.download.storage_quota': 'Storage Quota',
    'offline.download.quota_exceeded': 'Storage quota exceeded. Please free up space.',
    'offline.download.available_offline': 'Available Offline',
    'offline.download.progress': 'Progress',
    'offline.logout.warning_title': 'Unsynced Attempts Detected',
    'offline.logout.warning_desc':
      'You have unsynced practice attempts. Logging out on a shared device will wipe local data to protect your privacy.',
    'offline.logout.sync_first': 'Sync & Log Out',
    'offline.logout.wipe_confirm': 'Discard & Log Out',
    'offline.logout.cancel': 'Stay Logged In',
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
    'offline.status.online': 'ऑनलाइन',
    'offline.status.offline': 'ऑफ़लाइन मोड',
    'offline.status.syncing': 'सिंक हो रहा है...',
    'offline.sync.pending': 'असिंक किए गए प्रयास लंबित हैं',
    'offline.sync.now': 'अभी सिंक करें',
    'offline.sync.synced': 'सभी परिवर्तन सुरक्षित और सिंक हैं',
    'offline.sync.error': 'सिंक विफल। स्वचालित रूप से पुनः प्रयास होगा।',
    'offline.badge': 'ऑफ़लाइन उपलब्ध',
    'offline.download.title': 'ऑफ़लाइन पाठ सामग्री',
    'offline.download.chapter': 'अध्याय',
    'offline.download.action': 'ऑफ़लाइन के लिए डाउनलोड करें',
    'offline.download.downloading': 'डाउनलोड हो रहा है...',
    'offline.download.ready': 'डाउनलोड पूर्ण',
    'offline.download.delete': 'डाउनलोड हटाएं',
    'offline.download.storage_used': 'प्रयुक्त संग्रहण',
    'offline.download.storage_quota': 'कुल संग्रहण कोटा',
    'offline.download.quota_exceeded': 'संग्रहण कोटा समाप्त हो गया है। कृपया स्थान खाली करें।',
    'offline.download.available_offline': 'ऑफ़लाइन उपलब्ध',
    'offline.download.progress': 'प्रगति',
    'offline.logout.warning_title': 'असिंक किए गए प्रयास मौजूद हैं',
    'offline.logout.warning_desc':
      'आपके कुछ अभ्यास प्रयास अभी सर्वर पर सिंक नहीं हुए हैं। साझा डिवाइस पर लॉग आउट करने से डेटा साफ़ हो जाएगा।',
    'offline.logout.sync_first': 'सिंक करें और लॉग आउट करें',
    'offline.logout.wipe_confirm': 'हटाएं और लॉग आउट करें',
    'offline.logout.cancel': 'लॉग इन रहें',
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
