import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithIntl } from '../test-utils';
import { ClassHeatmapView } from '@/components/teacher/ClassHeatmapView';
import type { ClassHeatmapResponse } from '@bodhai/api-client';

describe('ClassHeatmapView Component', () => {
  const mockHeatmapData: ClassHeatmapResponse = {
    class_id: 'class-123',
    total_students: 3,
    total_skills: 3,
    students: [
      { student_id: 's-1', student_name: 'Aarav Patel', roll_number: '101' },
      { student_id: 's-2', student_name: 'Diya Sharma', roll_number: '102' },
      { student_id: 's-3', student_name: 'Kabir Khan', roll_number: '103' },
    ],
    skills: [
      {
        skill_id: 'sk-1',
        skill_code: 'M-INT-01',
        skill_name: 'Integer Addition',
        topic_name: 'Number Systems',
        difficulty: 1,
      },
      {
        skill_id: 'sk-2',
        skill_code: 'M-INT-02',
        skill_name: 'Integer Multiplication',
        topic_name: 'Number Systems',
        difficulty: 2,
      },
      {
        skill_id: 'sk-3',
        skill_code: 'M-ALG-01',
        skill_name: 'Linear Expressions',
        topic_name: 'Algebra',
        difficulty: 2,
      },
    ],
    matrix: [
      // Aarav: sk-1 mastered, sk-2 partial, sk-3 not_learned
      {
        student_id: 's-1',
        skill_id: 'sk-1',
        state: 'mastered',
        p_mastery: 0.95,
        confidence: 0.9,
        attempts_count: 5,
      },
      {
        student_id: 's-1',
        skill_id: 'sk-2',
        state: 'partial',
        p_mastery: 0.65,
        confidence: 0.8,
        attempts_count: 3,
      },
      {
        student_id: 's-1',
        skill_id: 'sk-3',
        state: 'not_learned',
        p_mastery: 0.15,
        confidence: 0.7,
        attempts_count: 0,
      },
      // Diya: sk-1 mastered, sk-2 mastered, sk-3 partial
      {
        student_id: 's-2',
        skill_id: 'sk-1',
        state: 'mastered',
        p_mastery: 0.92,
        confidence: 0.9,
        attempts_count: 4,
      },
      {
        student_id: 's-2',
        skill_id: 'sk-2',
        state: 'mastered',
        p_mastery: 0.88,
        confidence: 0.85,
        attempts_count: 4,
      },
      {
        student_id: 's-2',
        skill_id: 'sk-3',
        state: 'partial',
        p_mastery: 0.55,
        confidence: 0.75,
        attempts_count: 2,
      },
      // Kabir: sk-1 partial, sk-2 not_learned, sk-3 not_learned
      {
        student_id: 's-3',
        skill_id: 'sk-1',
        state: 'partial',
        p_mastery: 0.5,
        confidence: 0.8,
        attempts_count: 2,
      },
      {
        student_id: 's-3',
        skill_id: 'sk-2',
        state: 'not_learned',
        p_mastery: 0.2,
        confidence: 0.7,
        attempts_count: 1,
      },
      {
        student_id: 's-3',
        skill_id: 'sk-3',
        state: 'not_learned',
        p_mastery: 0.1,
        confidence: 0.6,
        attempts_count: 0,
      },
    ],
    summary: {
      mastered: 3,
      partial: 3,
      not_learned: 3,
    },
  };

  it('renders summary statistics and accessible pattern legend correctly', () => {
    const handleSelect = vi.fn();
    renderWithIntl(<ClassHeatmapView heatmap={mockHeatmapData} onSelectStudent={handleSelect} />);

    // Check KPI counts
    expect(screen.getAllByText('3').length).toBe(3);

    // Check accessible visual symbols are present
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks.length).toBeGreaterThan(0);

    const splitMoons = screen.getAllByText('◐');
    expect(splitMoons.length).toBeGreaterThan(0);

    const circles = screen.getAllByText('○');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('renders student rows and skill columns with accessible aria-labels (not color alone)', () => {
    const handleSelect = vi.fn();
    renderWithIntl(<ClassHeatmapView heatmap={mockHeatmapData} onSelectStudent={handleSelect} />);

    expect(screen.getByText('Aarav Patel')).toBeDefined();
    expect(screen.getByText('Diya Sharma')).toBeDefined();
    expect(screen.getByText('Kabir Khan')).toBeDefined();

    // Find cell button by accessible aria label
    const cellBtn = screen.getByRole('button', {
      name: /Aarav Patel: Integer Addition is Mastered/i,
    });
    expect(cellBtn).toBeDefined();

    // Clicking cell calls onSelectStudent with the student id
    fireEvent.click(cellBtn);
    expect(handleSelect).toHaveBeenCalledWith('s-1');
  });

  it('filters students by search input', () => {
    const handleSelect = vi.fn();
    renderWithIntl(<ClassHeatmapView heatmap={mockHeatmapData} onSelectStudent={handleSelect} />);

    const searchInput = screen.getByPlaceholderText(/search student/i);
    fireEvent.change(searchInput, { target: { value: 'Diya' } });

    expect(screen.getByText('Diya Sharma')).toBeDefined();
    expect(screen.queryByText('Aarav Patel')).toBeNull();
    expect(screen.queryByText('Kabir Khan')).toBeNull();
  });

  it('filters skills by topic selection', () => {
    const handleSelect = vi.fn();
    renderWithIntl(<ClassHeatmapView heatmap={mockHeatmapData} onSelectStudent={handleSelect} />);

    // Select "Algebra" topic
    const topicSelect = screen.getByLabelText(/filter by topic/i);
    fireEvent.change(topicSelect, { target: { value: 'Algebra' } });

    // Should display Linear Expressions (Algebra) and hide Integer Addition / Multiplication
    expect(screen.getByText('Linear Expressions')).toBeDefined();
    expect(screen.queryByText('Integer Addition')).toBeNull();
  });
});
