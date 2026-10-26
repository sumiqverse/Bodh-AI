import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguageChoice, SUPPORTED_LANGUAGES } from '../../hooks/useLanguageChoice';

const mockReplace = vi.fn();

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => '/student',
}));

describe('useLanguageChoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides supported languages including English and Hindi', () => {
    const { result } = renderHook(() => useLanguageChoice());
    expect(result.current.languages).toEqual(SUPPORTED_LANGUAGES);
    expect(result.current.currentLocale).toBe('en');
  });

  it('selects language, sets preference in localStorage, and navigates', () => {
    const { result } = renderHook(() => useLanguageChoice());

    act(() => {
      result.current.selectLanguage('hi', '/diagnostic');
    });

    expect(localStorage.getItem('bodhai_preferred_language')).toBe('hi');
    expect(mockReplace).toHaveBeenCalledWith('/diagnostic', { locale: 'hi' });
  });
});
