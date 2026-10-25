import * as React from 'react';
import { render as rtlRender, type RenderResult } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messagesEn from '../../messages/en.json';

export function renderWithIntl(ui: React.ReactElement, locale = 'en'): RenderResult {
  return rtlRender(
    <NextIntlClientProvider locale={locale} messages={messagesEn}>
      {ui}
    </NextIntlClientProvider>,
  );
}
