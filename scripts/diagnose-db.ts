/**
 * Database Diagnostic Script
 * Run with: npx tsx scripts/diagnose-db.ts
 * 
 * This script checks:
 * - Database connection
 * - Table existence
 * - Admin user existence
 * - Schema integrity
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please create a .env.local file with your DATABASE_URL');
  process.exit(1);
}

const neonSql = neon(process.env.DATABASE_URL);
const db = drizzle(neonSql as any, { schema });

async function diagnose() {
  console.log('🔍 Starting Database Diagnostic...\n');
  console.log('='.repeat(60));

  try {
    // 1. Test connection
    console.log('\n1️⃣ Testing database connection...');
    try {
      await neonSql`SELECT 1 as test`;
      console.log('✅ Database connection successful');
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    // 2. Check if tables exist
    console.log('\n2️⃣ Checking table existence...');
    const tables = [
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'tickets',
      'ticket_updates',
      'detentions',
      'detention_updates',
    ];

    for (const table of tables) {
      try {
        const result = await neonSql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          );
        `;
        const exists = result[0]?.exists;
        if (exists) {
          console.log(`  ✅ Table '${table}' exists`);
        } else {
          console.log(`  ❌ Table '${table}' does NOT exist`);
        }
      } catch (error: any) {
        console.log(`  ⚠️  Error checking table '${table}': ${error.message}`);
      }
    }

    // 3. Check users table structure
    console.log('\n3️⃣ Checking users table structure...');
    try {
      const columns = await neonSql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position;
      `;
      
      if (columns.length > 0) {
        console.log('  Users table columns:');
        columns.forEach((col: any) => {
          console.log(`    - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });
        
        // Check for p_number column
        const hasPNumber = columns.some((col: any) => col.column_name === 'p_number');
        if (!hasPNumber) {
          console.log('  ⚠️  Missing p_number column!');
        }
      } else {
        console.log('  ❌ Users table does not exist');
      }
    } catch (error: any) {
      console.log(`  ⚠️  Error checking users structure: ${error.message}`);
    }

    // 4. Check for admin user
    console.log('\n4️⃣ Checking for admin user...');
    try {
      const users = await neonSql`
        SELECT id, email, name, p_number, role 
        FROM users 
        WHERE role = 'admin' OR p_number = 'P00166224';
      `;
      
      if (users.length > 0) {
        console.log('  ✅ Found admin/staff users:');
        users.forEach((user: any) => {
          console.log(`    - ${user.name} (${user.email || 'no email'})`);
          console.log(`      P Number: ${user.p_number || 'NOT SET'}`);
          console.log(`      Role: ${user.role}`);
        });
      } else {
        console.log('  ❌ No admin user found');
        console.log('  💡 Run: npx tsx scripts/create-admin.ts');
      }
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('  ❌ Users table does not exist - need to run migrations');
      } else {
        console.log(`  ⚠️  Error checking users: ${error.message}`);
      }
    }

    // 5. Check NextAuth tables
    console.log('\n5️⃣ Checking NextAuth tables...');
    const nextAuthTables = ['accounts', 'sessions', 'verification_tokens'];
    let nextAuthComplete = true;
    
    for (const table of nextAuthTables) {
      try {
        const result = await neonSql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${table}
          );
        `;
        if (!result[0]?.exists) {
          nextAuthComplete = false;
          console.log(`  ❌ Table '${table}' missing`);
        }
      } catch (error: any) {
        nextAuthComplete = false;
        console.log(`  ⚠️  Error checking '${table}': ${error.message}`);
      }
    }
    
    if (nextAuthComplete) {
      console.log('  ✅ All NextAuth tables exist');
    }

    // 6. Summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Summary & Recommendations:\n');
    
    const tablesExist = await Promise.all(
      tables.map(async (table) => {
        try {
          const result = await neonSql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = ${table}
            );
          `;
          return result[0]?.exists;
        } catch {
          return false;
        }
      })
    );

    const allTablesExist = tablesExist.every(exists => exists);
    
    if (!allTablesExist) {
      console.log('❌ Some tables are missing. Run migrations:');
      console.log('   1. npm run db:generate');
      console.log('   2. npx tsx scripts/apply-migration.ts');
    } else {
      console.log('✅ All required tables exist');
    }

    const adminExists = await neonSql`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR p_number = 'P00166224';
    `.then((result: any) => result[0]?.count > 0).catch(() => false);

    if (!adminExists) {
      console.log('❌ Admin user not found. Create one:');
      console.log('   npx tsx scripts/create-admin.ts');
    } else {
      console.log('✅ Admin user exists');
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error: any) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

diagnose();

