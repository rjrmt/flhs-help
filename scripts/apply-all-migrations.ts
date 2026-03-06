/**
 * Apply all migrations
 * Run with: npx tsx scripts/apply-all-migrations.ts
 *
 * For full setup (migrations + admin), use: npx tsx scripts/setup-database.ts
 */

import './load-env';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

async function applyAll() {
  const migrationsDir = join(process.cwd(), 'drizzle');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('⚠️  No migration files. Run: npm run db:generate');
    process.exit(0);
  }

  console.log('📦 Applying migrations...\n');

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await client.unsafe(stmt);
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (!msg.includes('already exists') && !msg.includes('duplicate') && !msg.includes('does not exist')) {
          throw err;
        }
      }
    }
    console.log(`✅ ${file}`);
  }

  console.log('\n✅ All migrations applied!');
  await client.end();
}

applyAll().catch((e) => {
  console.error('❌', (e as Error).message);
  process.exit(1);
});
