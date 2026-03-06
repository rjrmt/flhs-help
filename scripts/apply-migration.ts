/**
 * Apply database migration
 * Run with: npx tsx scripts/apply-migration.ts
 *
 * Applies the first migration file in drizzle/. For full setup, use: npx tsx scripts/setup-database.ts
 */

import './load-env';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import postgres from 'postgres';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const client = postgres(databaseUrl, { prepare: false });
  const drizzleDir = join(process.cwd(), 'drizzle');
  const files = readdirSync(drizzleDir).filter((f) => f.endsWith('.sql')).sort();
  const migrationFile = files[0];

  if (!migrationFile) {
    console.error('❌ No migration files in drizzle/');
    process.exit(1);
  }

  try {
    const migrationSQL = readFileSync(join(drizzleDir, migrationFile), 'utf-8');
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`📦 Applying ${migrationFile}...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;
      try {
        await client.unsafe(stmt);
        console.log(`✅ Statement ${i + 1}/${statements.length}`);
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
