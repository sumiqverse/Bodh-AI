import { describe, expect, it, vi } from 'vitest';
import { BodhaiApiClient } from '../client';

describe('BodhaiApiClient', () => {
  it('successfully fetches health status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', app: 'BodhAI API', version: '0.1.0' }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const response = await client.getHealth();
    expect(response.status).toBe('ok');
    expect(response.app).toBe('BodhAI API');
  });

  it('successfully fetches readiness status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ready',
        database: true,
        redis: true,
        timestamp: '2026-10-25T18:00:00Z',
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const response = await client.getReady();
    expect(response.status).toBe('ready');
    expect(response.database).toBe(true);
    expect(response.redis).toBe(true);
  });

  it('submits attempt and receives evaluation with p_mastery', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        attempt_id: '30000000-0000-0000-0000-000000000001',
        is_correct: true,
        p_mastery_after: 0.65,
        explanation: 'Place value is 70,000.',
        is_duplicate: false,
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await client.submitAttempt(
      {
        question_id: '20000000-0000-0000-0000-000000000001',
        skill_id: '10000000-0000-0000-0000-000000000001',
        selected_answer: 'C',
        idempotency_key: 'idem-test-key-12345678',
        time_spent_ms: 15400,
        client_timestamp: '2026-10-25T18:00:00Z',
      },
      'student-uuid-1',
    );

    expect(result.is_correct).toBe(true);
    expect(result.p_mastery_after).toBe(0.65);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/attempts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
      }),
    );
  });

  it('parses RFC 7807 problem details on error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        type: 'urn:bodhai:error:not-found',
        title: 'Resource Not Found',
        status: 404,
        detail: 'Skill with identifier 9999 was not found.',
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getSkill('9999')).rejects.toThrowError(
      /API Error \[404\]: Skill with identifier 9999 was not found/,
    );
  });

  it('throws on non-200 HTTP response when body is not JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getHealth()).rejects.toThrowError(/HTTP Error 503: Service Unavailable/);
  });

  it('authenticates teacher with credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        user: { id: 'u-1', email: 'teacher@bodhai.org', role: 'teacher' },
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.teacherLogin({
      email: 'teacher@bodhai.org',
      password: 'SecurePassword123!',
    });
    expect(res.access_token).toBe('fake-jwt-token');
    expect(res.user.role).toBe('teacher');
  });

  it('handles student joining a class with join code and PIN', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        access_token: 'fake-student-jwt',
        token_type: 'bearer',
        user: { id: 's-1', username: 'student_rahul', role: 'student' },
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const res = await client.studentJoin({
      join_code: 'EQZXR2',
      username: 'student_rahul',
      pin: '1234',
      full_name: 'Rahul Sharma',
      preferred_language: 'hi',
    });
    expect(res.access_token).toBe('fake-student-jwt');
    expect(res.user.role).toBe('student');
  });

  it('manages classes: creation and stats retrieval', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'c-1',
        name: 'Grade 8 Science',
        grade: 8,
        section: 'A',
        academic_year: '2024-2025',
        join_code: 'SCI801',
        school_id: 'sch-1',
        teacher_id: 't-1',
        created_at: '2026-10-25T18:00:00Z',
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const classroom = await client.createClass(
      {
        name: 'Grade 8 Science',
        grade: 8,
        section: 'A',
        academic_year: '2024-2025',
      },
      'teacher-token',
    );
    expect(classroom.name).toBe('Grade 8 Science');
    expect(classroom.join_code).toBe('SCI801');
  });

  it('records verifiable guardian consent under DPDP Act', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => [
        {
          id: 'con-1',
          student_id: 's-1',
          scope: 'diagnostic',
          version: '2024.1',
          is_granted: true,
          timestamp: '2026-10-25T18:00:00Z',
          guardian_name: 'Suresh Sharma',
        },
      ],
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const consents = await client.recordGuardianConsent(
      {
        guardian_name: 'Suresh Sharma',
        guardian_phone: '+919876543210',
        guardian_relationship: 'Father',
        scopes: ['diagnostic'],
        version: '2024.1',
      },
      'student-token',
    );
    expect(consents).toHaveLength(1);
    expect(consents[0]?.guardian_name).toBe('Suresh Sharma');
  });

  it('retrieves aggregate admin stats without PII', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        total_schools: 3,
        total_classes: 12,
        total_students: 450,
        total_attempts: 12500,
        average_mastery: 0.72,
        grade_distribution: { '8': 200, '9': 250 },
      }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const stats = await client.getSchoolStats('admin-token');
    expect(stats.total_schools).toBe(3);
    expect(stats.total_students).toBe(450);
  });
});
