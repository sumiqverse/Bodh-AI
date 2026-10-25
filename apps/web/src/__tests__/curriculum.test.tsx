import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KatexRenderer } from '../components/katex-renderer';

describe('KatexRenderer', () => {
  it('renders plain text without math delimiters', () => {
    render(<KatexRenderer content="This is a simple arithmetic question." />);
    expect(screen.getByText(/This is a simple arithmetic question/i)).toBeInTheDocument();
  });

  it('renders inline math expressions with KaTeX markup', () => {
    const { container } = render(
      <KatexRenderer content="Find the value of $x^2 + 1$ when $x = 3$." />,
    );
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });

  it('renders display block math expressions', () => {
    const { container } = render(
      <KatexRenderer content="Solve:\n$$\\frac{a}{b} = \\frac{c}{d}$$" />,
    );
    expect(container.querySelector('.katex-display')).toBeInTheDocument();
  });
});
