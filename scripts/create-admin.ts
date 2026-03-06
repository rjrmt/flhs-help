/**
 * Create admin user script
 * Run with: npx tsx scripts/create-admin.ts
 * 
 * Usage: Edit the credentials below and run the script
 */

import './load-env';
import * as bcrypt from 'bcryptjs';
import { users } from '../lib/db/schema';
import { db } from '../lib/db';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

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

    // Create user (run setup-database.ts first if schema needs p_number column)
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
