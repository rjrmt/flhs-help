/**
 * Apply All Migrations Script
 * Reads all migration files and applies them to the database
 * Run with: npx tsx scripts/apply-all-migrations.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function applyAllMigrations() {
  console.log('📦 Applying Database Migrations\n');
  console.log('='.repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const migrationsDir = join(process.cwd(), 'drizzle');

  try {
    // Get all SQL migration files
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s):\n`);

    for (const file of files) {
      console.log(`📄 Applying ${file}...`);
      const filePath = join(migrationsDir, file);
      const migrationSQL = readFileSync(filePath, 'utf-8');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await sql(statement);
          } catch (error: any) {
            // Ignore "already exists" errors
            if (error.message?.includes('already exists') || 
                error.message?.includes('duplicate') ||
                error.message?.includes('does not exist')) {
              console.log(`   ⏭️  Skipped (already applied or not needed)`);
            } else {
              throw error;
            }
          }
        }
      }

      console.log(`   ✅ Applied ${file}\n`);
    }

    console.log('='.repeat(60));
    console.log('\n✅ All migrations applied successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Redeploy your Vercel application');
    console.log('   2. Test login again');
    console.log('   3. The dashboard should now work');

  } catch (error: any) {
    console.error('\n❌ Error applying migrations:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

applyAllMigrations().catch(console.error);

