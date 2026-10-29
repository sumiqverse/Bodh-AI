import { beforeEach, describe, expect, it } from 'vitest';
import { clearAnalyticsBuffer, getBufferedEvents, trackEvent } from '../lib/analytics';

describe('Privacy-Preserving Analytics Engine', () => {
  beforeEach(() => {
    clearAnalyticsBuffer();
  });

  it('tracks pedagogical events without PII', () => {
    const event = trackEvent('diagnostic_question_answered', 'assessment', {
      subject: 'mathematics',
      grade: 8,
      isCorrect: true,
      timeSpentSec: 24,
    });

    expect(event.eventName).toBe('diagnostic_question_answered');
    expect(event.category).toBe('assessment');
    expect(event.properties?.subject).toBe('mathematics');
    expect(event.properties?.sessionHash).toBeDefined();

    const buffer = getBufferedEvents();
    expect(buffer).toHaveLength(1);
  });

  it('drops sensitive keys like email, phone, name, roll number, and user_id', () => {
    const event = trackEvent('quiz_completed', 'assessment', {
      student_email: 'aaditya.verma@school.in',
      student_phone: '+919988776655',
      student_name: 'Aaditya Verma',
      roll_no: '24',
      user_id: 'usr-12345',
      score: 90,
      totalQuestions: 10,
    });

    expect(event.properties?.score).toBe(90);
    expect(event.properties?.totalQuestions).toBe(10);
    expect(event.properties?.student_email).toBeUndefined();
    expect(event.properties?.student_phone).toBeUndefined();
    expect(event.properties?.student_name).toBeUndefined();
    expect(event.properties?.roll_no).toBeUndefined();
    expect(event.properties?.user_id).toBeUndefined();
  });
});
