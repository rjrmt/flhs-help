import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Use postgres.js for Supabase/standard PostgreSQL (prepare: false for Supabase pooler)
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Required for Supabase connection pooler (PgBouncer)
});

export const db = drizzle(client, { schema });

// Export schema for use in other files
export { schema };

