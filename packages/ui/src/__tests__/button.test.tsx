import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeDefined();
    expect(button.getAttribute('type')).toBe('button');
  });

  it('applies variant and size classes properly', () => {
    render(
      <Button variant="secondary" size="lg">
        Continue
      </Button>,
    );
    const button = screen.getByRole('button', { name: /continue/i });
    expect(button.className).toContain('bg-slate-100');
    expect(button.className).toContain('h-12');
  });
});
