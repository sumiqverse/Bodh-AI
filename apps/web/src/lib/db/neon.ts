import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Returns a Neon serverless SQL query function configured with DATABASE_URL.
 * Supports connection pooling and edge/serverless execution.
 */
export function getNeonSql(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined in the environment.');
  }
  return neon(databaseUrl);
}
