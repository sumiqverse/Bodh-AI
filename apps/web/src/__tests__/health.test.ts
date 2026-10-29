import { describe, it, expect } from 'vitest';
import { GET } from '../app/api/health/route';

describe('Web Healthcheck Route', () => {
  it('returns HTTP 200 with healthy status payload', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      app: string;
      timestamp: string;
      uptime_seconds: number;
    };
    expect(body.status).toBe('healthy');
    expect(body.app).toBe('bodhai-web');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime_seconds).toBe('number');
  });
});
