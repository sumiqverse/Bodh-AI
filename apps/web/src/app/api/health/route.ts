import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  let dbStatus = 'disconnected';
  let dbVersion: string | null = null;

  try {
    if (process.env.DATABASE_URL) {
      const sql = getNeonSql();
      const rows = await sql`SELECT version();`;
      if (rows.length > 0) {
        dbStatus = 'connected';
        dbVersion = (rows[0] as { version: string }).version;
      }
    }
  } catch (err: unknown) {
    dbStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json(
    {
      status: 'healthy',
      app: 'bodhai-web',
      neon: {
        database: dbStatus,
        version: dbVersion,
        branch: process.env.NEON_BRANCH || 'production',
        authConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
        authBaseUrl: process.env.NEON_AUTH_BASE_URL || null,
      },
      timestamp: new Date().toISOString(),
      uptime_seconds: process.uptime(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
