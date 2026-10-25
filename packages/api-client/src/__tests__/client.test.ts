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
});
