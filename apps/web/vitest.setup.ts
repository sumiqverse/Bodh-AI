import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import messagesEn from './messages/en.json';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  Lora: () => ({ variable: '--font-lora' }),
  Noto_Sans_Devanagari: () => ({ variable: '--font-noto-devanagari' }),
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ namespace }: { namespace?: string }) => {
    return (key: string) => {
      const dict = namespace
        ? (messagesEn as unknown as Record<string, Record<string, unknown>>)[namespace]
        : null;
      return (dict?.[key] as string) ?? key;
    };
  },
  getMessages: async () => messagesEn,
}));
