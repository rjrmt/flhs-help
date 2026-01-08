/**
 * Apply database migration using Node.js
 * Run with: npx tsx scripts/apply-migration.ts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  try {
    const sql = neon(databaseUrl);
    
    // Read the migration file
    const migrationFile = join(process.cwd(), 'drizzle', '0000_glossy_raider.sql');
    const migrationSQL = readFileSync(migrationFile, 'utf-8');
    
    console.log('📦 Applying migration...');
    console.log('Migration file: drizzle/0000_glossy_raider.sql\n');
    
    // Split by statement breakpoints and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await sql(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();

