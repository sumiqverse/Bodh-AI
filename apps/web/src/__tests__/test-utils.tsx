import * as React from 'react';
import {
  render as rtlRender,
  renderHook as rtlRenderHook,
  type RenderResult,
  type RenderHookResult,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import messagesEn from '../../messages/en.json';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

export function renderWithIntl(ui: React.ReactElement, locale = 'en'): RenderResult {
  const queryClient = createTestQueryClient();
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messagesEn}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options?: { queryClient?: QueryClient; locale?: string },
): RenderHookResult<Result, Props> {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const locale = options?.locale ?? 'en';

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale={locale} messages={messagesEn}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return rtlRenderHook(hook, { wrapper });
}
