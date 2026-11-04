import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassroomContentResponse } from '@bodhai/api-client';
import { ClassLessonEditor } from '@/components/teacher/ClassLessonEditor';

const api = vi.hoisted(() => ({
  listClassLessons: vi.fn(),
  saveClassLesson: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  getWebApiClient: () => api,
  getAuthToken: () => 'test-token',
}));

const defaultTitle = 'Kinetic Theory of Matter and Phase Changes';
const defaultBody =
  'Chapter: Matter in Our Surroundings\n\nLearning outcome\nExplain phase changes.';

const content: ClassroomContentResponse = {
  class_id: 'class-9-science',
  class_name: 'Class 9 Science',
  grade: 9,
  subject: 'science',
  curriculum_code: 'NCERT-SCIE-C9',
  custom_questions_count: 0,
  topics: [
    {
      id: 'topic-1',
      code: 'TOPIC-S9-01',
      name: 'Matter in Our Surroundings',
      description: 'States of matter and phase changes.',
      sequence_order: 1,
      skills: [
        {
          id: 'skill-1',
          code: 'SKILL-S9-01-01',
          name: defaultTitle,
          description: 'Intermolecular forces and phase changes.',
          difficulty: 0.5,
          blooms_level: 'understand',
          questions: [],
          default_lesson: {
            title: defaultTitle,
            body: defaultBody,
          },
        },
      ],
    },
  ],
};

function renderEditor(): void {
  render(<ClassLessonEditor classId="class-9-science" content={content} />);
}

describe('ClassLessonEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listClassLessons.mockResolvedValue([]);
    api.saveClassLesson.mockResolvedValue({
      id: 'lesson-1',
      skill_id: 'skill-1',
      language: 'en',
      difficulty: 1,
      title: defaultTitle,
      body: defaultBody,
    });
  });

  it('preloads the NCERT-aligned default when a teacher has not authored a lesson', async () => {
    renderEditor();

    await screen.findByDisplayValue(defaultTitle);
    expect((screen.getByLabelText('Lesson title') as HTMLInputElement).value).toBe(defaultTitle);
    expect((screen.getByLabelText('Lesson content') as HTMLTextAreaElement).value).toBe(
      defaultBody,
    );
    expect(screen.getByText('NCERT-aligned default')).toBeTruthy();
  });

  it('saves a teacher-edited version for the selected class and level', async () => {
    renderEditor();

    await screen.findByDisplayValue(defaultTitle);
    fireEvent.change(screen.getByLabelText('Lesson content'), {
      target: { value: 'Extra teacher activity: demonstrate diffusion with warm water.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save lesson' }));

    await waitFor(() => expect(api.saveClassLesson).toHaveBeenCalledTimes(1));
    expect(api.saveClassLesson).toHaveBeenCalledWith(
      'class-9-science',
      expect.objectContaining({
        skill_id: 'skill-1',
        language: 'en',
        difficulty: 1,
        body: 'Extra teacher activity: demonstrate diffusion with warm water.',
      }),
      'test-token',
    );
    expect(await screen.findByText('Lesson saved for this class.')).toBeTruthy();
  });

  it('loads a saved teacher version instead of the default', async () => {
    api.listClassLessons.mockResolvedValue([
      {
        id: 'lesson-1',
        skill_id: 'skill-1',
        language: 'en',
        difficulty: 1,
        title: 'My class version',
        body: 'Teacher-authored explanation.',
      },
    ]);
    renderEditor();

    await screen.findByDisplayValue('My class version');
    expect((screen.getByLabelText('Lesson content') as HTMLTextAreaElement).value).toBe(
      'Teacher-authored explanation.',
    );
    expect(screen.getByText('Your class version')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restore NCERT default' })).toBeTruthy();
  });
});
