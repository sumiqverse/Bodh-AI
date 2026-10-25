import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

describe('Home Page', () => {
  it('renders platform heading and class selection buttons', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 1, name: /welcome to bodhai/i });
    expect(heading).toBeInTheDocument();

    const startButton = screen.getByRole('button', { name: /start diagnostic assessment/i });
    expect(startButton).toBeInTheDocument();

    const class6Btn = screen.getByRole('button', { name: /class 6/i });
    expect(class6Btn).toBeInTheDocument();
  });
});
