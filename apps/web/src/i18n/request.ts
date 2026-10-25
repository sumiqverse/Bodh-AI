import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';
import enMessages from '../../messages/en.json';
import hiMessages from '../../messages/hi.json';

const messageMap: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  hi: hiMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const messages = messageMap[locale as Locale] || enMessages;

  return {
    locale,
    messages,
  };
});
