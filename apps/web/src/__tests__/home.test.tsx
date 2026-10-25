import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import HomePage from '../app/[locale]/page';
import { renderWithIntl } from './test-utils';

describe('BodhAI Home Page', () => {
  it('renders hero title and curriculum coverage', async () => {
    const page = await HomePage({
      params: Promise.resolve({ locale: 'en' }),
    });

    renderWithIntl(page);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /adaptive mastery learning for middle & secondary school/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('10.09 Crore')).toBeInTheDocument();
    expect(screen.getByText('45.8%')).toBeInTheDocument();
    expect(
      screen.getByText(/UDISE\+ 2024-25, Ministry of Education, Govt\. of India/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Annual Status of Education Report \(ASER\) 2024/i),
    ).toBeInTheDocument();
  });
});
