/**
 * Complete Database Setup Script
 * Run with: npx tsx scripts/setup-database.ts
 *
 * 1. Applies all migrations
 * 2. Creates admin user if needed
 * 3. Verifies everything works
 */
import './load-env';
import { join } from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readFileSync, readdirSync } from 'fs';
import * as bcrypt from 'bcryptjs';
import { users } from '../lib/db/schema';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema: { users } });

async function setupDatabase() {
  console.log('🚀 Starting Complete Database Setup...\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Test connection
    console.log('\n1️⃣ Testing database connection...');
    await client`SELECT 1`;
    console.log('✅ Connection successful\n');

    // Step 2: Apply migrations
    console.log('2️⃣ Applying database migrations...');
    const drizzleDir = join(process.cwd(), 'drizzle');
    
    try {
      const migrationFiles = readdirSync(drizzleDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('⚠️  No migration files found. Generating migrations...');
        console.log('   Run: npm run db:generate');
        console.log('   Then run this script again.');
        process.exit(1);
      }

      for (const file of migrationFiles) {
        console.log(`   Applying ${file}...`);
        const migrationPath = join(drizzleDir, file);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        
        const statements = migrationSQL
          .split('--> statement-breakpoint')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (statement.trim()) {
            try {
              await client.unsafe(statement);
            } catch (error: any) {
              // Ignore "already exists" errors
              if (!error.message?.includes('already exists') && 
                  !error.message?.includes('duplicate') &&
                  !error.message?.includes('does not exist')) {
                console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
                throw error;
              }
            }
          }
        }
        console.log(`   ✅ ${file} applied`);
      }
      console.log('✅ All migrations applied\n');
    } catch (error: any) {
      console.error('❌ Migration error:', error.message);
      throw error;
    }

    // Step 3: Ensure p_number column exists
    console.log('3️⃣ Ensuring p_number column exists...');
    try {
      await client`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS p_number VARCHAR(50);
      `;
      await client`
        ALTER TABLE users 
        ALTER COLUMN email DROP NOT NULL;
      `;
      try {
        await client`
          CREATE UNIQUE INDEX IF NOT EXISTS users_p_number_unique 
          ON users(p_number) 
          WHERE p_number IS NOT NULL;
        `;
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          throw e;
        }
      }
      console.log('✅ p_number column ready\n');
    } catch (error: any) {
      console.error('⚠️  Error setting up p_number:', error.message);
    }

    // Step 3b: Ensure students table exists (for 06# lookup)
    console.log('3b️⃣ Ensuring students table exists...');
    try {
      await client.unsafe(`
        CREATE TABLE IF NOT EXISTS students (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id VARCHAR(50) NOT NULL UNIQUE,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ students table ready\n');
    } catch (error: any) {
      console.error('⚠️  Error setting up students:', error.message);
    }

    // Step 4: Create admin user
    console.log('4️⃣ Creating admin user...');
    const email = 'rajesh.ramautar@browardschools.com';
    const name = 'RJ Ramautar';
    const password = '1234';
    const pNumber = 'P00166224';
    const role = 'admin';

    // Check if user already exists
    const existingUser = await client`
      SELECT id, p_number FROM users 
      WHERE p_number = ${pNumber} OR email = ${email}
      LIMIT 1;
    `.then((result: any) => result[0]).catch(() => null);

    if (existingUser) {
      console.log('   ⚠️  User already exists, updating password...');
      const passwordHash = await bcrypt.hash(password, 10);
      await client`
        UPDATE users 
        SET 
          password_hash = ${passwordHash},
          role = ${role},
          p_number = ${pNumber},
          name = ${name}
        WHERE id = ${existingUser.id};
      `;
      console.log('✅ Admin user updated\n');
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          pNumber,
          name,
          passwordHash,
          role: role as 'staff' | 'admin',
        })
        .returning();
      
      console.log('✅ Admin user created');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   P Number: ${pNumber}`);
      console.log(`   Password: ${password}\n`);
    }

    // Step 5: Verify setup
    console.log('5️⃣ Verifying setup...');
    const userCount = await client`
      SELECT COUNT(*) as count FROM users;
    `.then((result: any) => parseInt(result[0]?.count || '0')).catch(() => 0);

    const adminCount = await client`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin';
    `.then((result: any) => parseInt(result[0]?.count || '0')).catch(() => 0);

    console.log(`   Users in database: ${userCount}`);
    console.log(`   Admin users: ${adminCount}`);

    // Check tables
    const tables = ['users', 'tickets', 'detentions', 'accounts', 'sessions', 'students'];
    let allTablesExist = true;
    for (const table of tables) {
      const exists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        );
      `.then((result: any) => result[0]?.exists).catch(() => false);
      
      if (!exists) {
        console.log(`   ❌ Table '${table}' missing`);
        allTablesExist = false;
      }
    }

    if (allTablesExist && adminCount > 0) {
      console.log('\n✅ Database setup complete!');
      console.log('\n📝 Login Credentials:');
      console.log(`   P Number: ${pNumber}`);
      console.log(`   Password: ${password}`);
      console.log('\n🚀 You can now log in to the admin console!\n');
    } else {
      console.log('\n⚠️  Setup completed with warnings. Check above for issues.\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupDatabase();

