import { describe, expect, it, vi } from 'vitest';
import { BodhaiApiClient } from '../client';

describe('BodhaiApiClient', () => {
  it('successfully fetches health status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const response = await client.getHealth();
    expect(response.status).toBe('ok');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('throws on non-200 HTTP response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const client = new BodhaiApiClient({
      baseUrl: 'http://localhost:8000',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(client.getHealth()).rejects.toThrowError(/HTTP Error 503/);
  });
});
