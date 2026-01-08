/**
 * Create admin user script
 * Run with: npx tsx scripts/create-admin.ts
 * 
 * Usage: Edit the credentials below and run the script
 */

import { config } from 'dotenv';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from '../lib/db/schema';

// Load environment variables from .env.local FIRST
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql as any, { schema: { users } });

async function createAdmin() {
  try {
    console.log('=== Creating Admin User ===\n');

    // Edit these values before running
    const email = 'rajesh.ramautar@browardschools.com';
    const name = 'RJ Ramautar';
    const password = '1234'; // Change this!
    const role = 'admin';
    const pNumber = 'P00166224';

    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`P Number: ${pNumber}`);
    console.log(`Role: ${role}\n`);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // First, ensure p_number column exists
    await sql(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS p_number VARCHAR(50);
      
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL;
      
      CREATE UNIQUE INDEX IF NOT EXISTS users_p_number_unique ON users(p_number) WHERE p_number IS NOT NULL;
    `);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
        pNumber,
        name,
        passwordHash,
        role: role as 'staff' | 'admin',
      })
      .returning();

    console.log('\n✅ Admin user created successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log(`\n📝 Login Credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      console.error('\n❌ Error: User with this email already exists!');
      console.error('If you want to update the password, you can do so manually in the database.');
    } else {
      console.error('\n❌ Error creating admin user:', error.message || error);
    }
    process.exit(1);
  }
}

createAdmin();
