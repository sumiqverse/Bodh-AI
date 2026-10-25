import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const messagesModule = (await import(`../../messages/${locale}.json`)) as {
    default: Record<string, Record<string, string>>;
  };

  return {
    locale,
    messages: messagesModule.default,
  };
});
