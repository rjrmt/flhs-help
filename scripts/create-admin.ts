/**
 * Helper script to create an admin user
 * Run with: npx tsx scripts/create-admin.ts
 * 
 * This will prompt you for email, name, and password to create a staff/admin user
 */

import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('=== Create Admin User ===\n');

    const email = await question('Email: ');
    const name = await question('Name: ');
    const password = await question('Password: ');
    const role = await question('Role (staff/admin) [default: admin]: ') || 'admin';

    if (!email || !name || !password) {
      console.error('All fields are required!');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email,
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

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    rl.close();
    process.exit(1);
  }
}

createAdmin();

