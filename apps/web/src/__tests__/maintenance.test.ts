import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';

describe('Maintenance Mode Gating Middleware', () => {
  it('redirects to /maintenance when MAINTENANCE_MODE is true', () => {
    process.env.MAINTENANCE_MODE = 'true';

    const req = new NextRequest('http://localhost:3000/en/students');
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/en/maintenance');

    delete process.env.MAINTENANCE_MODE;
  });

  it('allows request when maintenance bypass header is present', () => {
    process.env.MAINTENANCE_MODE = 'true';

    const req = new NextRequest('http://localhost:3000/en/students', {
      headers: {
        'x-bodhai-bypass-maintenance': 'true',
      },
    });
    const res = middleware(req);

    // Should not redirect to maintenance
    expect(res.headers.get('location')).toBeNull();

    delete process.env.MAINTENANCE_MODE;
  });

  it('allows direct access to /maintenance without redirect loop', () => {
    process.env.MAINTENANCE_MODE = 'true';

    const req = new NextRequest('http://localhost:3000/en/maintenance');
    const res = middleware(req);

    expect(res.headers.get('location')).toBeNull();

    delete process.env.MAINTENANCE_MODE;
  });
});
