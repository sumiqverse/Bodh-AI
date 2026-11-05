import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketingFaq } from '@/components/marketing-faq';
import { JsonLd } from '@/components/json-ld';

const items = [
  {
    question: 'What is BodhAI?',
    answer: 'An adaptive mastery-learning platform for Classes 6–10.',
  },
];

describe('MarketingFaq', () => {
  it('renders the question and direct answer as visible page content', () => {
    render(<MarketingFaq locale="en" items={items} />);

    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeDefined();
    expect(screen.getByText(items[0]!.question)).toBeDefined();
    expect(screen.getByText(items[0]!.answer)).toBeDefined();
  });

  it('renders nothing when there are no FAQ items', () => {
    const { container } = render(<MarketingFaq locale="hi" items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('JsonLd', () => {
  it('serializes schema without allowing a closing script tag to break out', () => {
    const { container } = render(<JsonLd data={{ name: '</script><script>alert(1)</script>' }} />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script?.innerHTML).toContain('\\u003c/script>');
    expect(script?.innerHTML).not.toContain('</script><script>');
  });
});
