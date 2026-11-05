import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassPedagogicalSeoGuide } from '@/components/teacher/ClassPedagogicalSeoGuide';

describe('ClassPedagogicalSeoGuide Component', () => {
  it('renders AEO Direct Answer signals and definition', () => {
    render(<ClassPedagogicalSeoGuide locale="en" grade={9} subject="Science" />);

    // Direct Answer keyword appears in main section and FAQs
    expect(screen.getAllByText(/Direct Answer:/i).length).toBeGreaterThanOrEqual(1);

    // Definition keyword
    expect(screen.getByText(/Definition:/i)).toBeDefined();
    expect(screen.getByText(/Competency-based education \(CBE\) is defined as/i)).toBeDefined();
  });

  it('renders GEO Proof, Empirical Evidence, and First-Hand Testing signals', () => {
    render(<ClassPedagogicalSeoGuide locale="en" grade={9} subject="Science" />);

    // Proof and original experience signals
    expect(
      screen.getByText(/Empirical Evidence, First-Hand Testing & Classroom Proof/i),
    ).toBeDefined();
    expect(
      screen.getByText(/rigorous first-hand testing across 12 Indian secondary schools/i),
    ).toBeDefined();

    // Real data benchmark uplift
    expect(screen.getByText('+34%')).toBeDefined();
    expect(screen.getByText(/Mastery Uplift/i)).toBeDefined();
  });

  it('renders Concrete Worked Example signals', () => {
    render(<ClassPedagogicalSeoGuide locale="en" grade={9} subject="Science" />);

    expect(screen.getAllByText(/Concrete Worked Example/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Classroom Example Scenario:/i)).toBeDefined();
    expect(screen.getByText(/Latent Heat & Phase Transitions/i)).toBeDefined();
  });

  it('renders Authoritative External Sources with explicit "Source:" attribution', () => {
    render(<ClassPedagogicalSeoGuide locale="en" grade={9} subject="Science" />);

    expect(screen.getByText(/Source: NCERT National Curriculum Framework/i)).toBeDefined();
    expect(screen.getByText(/Source: CBSE Assessment & Examination Framework/i)).toBeDefined();
    expect(
      screen.getByText(/Source: Ministry of Education National Education Policy/i),
    ).toBeDefined();
    expect(screen.getByText(/Source: Digital Personal Data Protection/i)).toBeDefined();
  });
});
