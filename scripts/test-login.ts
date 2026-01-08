/**
 * Test Login Script
 * Run with: npx tsx scripts/test-login.ts
 * 
 * Tests if the admin login credentials work
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function testLogin() {
  console.log('🔐 Testing Admin Login...\n');

  const pNumber = 'P00166224';
  const password = '1234';

  try {
    // Find user
    const result = await sql`
      SELECT id, email, name, p_number, role, password_hash
      FROM users 
      WHERE p_number = ${pNumber}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const user = result[0] as any;
    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   P Number: ${user.p_number}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has Password: ${user.password_hash ? 'Yes' : 'No'}\n`);

    if (!user.password_hash) {
      console.error('❌ User has no password hash');
      process.exit(1);
    }

    // Test password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (isValid) {
      console.log('✅ Password is valid!');
      console.log('\n🎉 Login should work!');
      console.log(`\n📝 Credentials:`);
      console.log(`   P Number: ${pNumber}`);
      console.log(`   Password: ${password}\n`);
    } else {
      console.error('❌ Password is invalid');
      console.log('\n💡 Try running: npx tsx scripts/setup-database.ts\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();

