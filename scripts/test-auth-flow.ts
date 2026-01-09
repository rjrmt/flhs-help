/**
 * Test Authentication Flow Script
 * Simulates the login flow to identify where it fails
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: join(process.cwd(), '.env.local') });

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow\n');
  console.log('='.repeat(60));

  // 1. Check environment variables
  console.log('\n1️⃣ Environment Variables:');
  const dbUrl = process.env.DATABASE_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  console.log(`DATABASE_URL: ${dbUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`NEXTAUTH_SECRET: ${nextAuthSecret ? `✅ Set (${nextAuthSecret.length} chars)` : '❌ Missing'}`);
  console.log(`NEXTAUTH_URL: ${nextAuthUrl || '❌ Missing'}`);

  if (!dbUrl) {
    console.error('\n❌ DATABASE_URL not set - cannot continue');
    return;
  }

  // 2. Test database connection
  console.log('\n2️⃣ Database Connection:');
  try {
    const sql = neon(dbUrl);
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error: any) {
    console.error(`❌ Database connection failed: ${error.message}`);
    return;
  }

  // 3. Test user lookup (simulating authorize function)
  console.log('\n3️⃣ User Lookup Test:');
  try {
    const sql = neon(dbUrl);
    const testPNumber = 'P00166224';
    const result = await sql`
      SELECT id, email, name, p_number, role, password_hash IS NOT NULL as has_password
      FROM users 
      WHERE p_number = ${testPNumber}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.error(`❌ User ${testPNumber} not found`);
    } else {
      const user = result[0] as any;
      console.log(`✅ User found: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has password: ${user.has_password ? 'Yes' : 'No'}`);
      if (!user.has_password) {
        console.error('   ⚠️  User has no password - cannot login');
      }
    }
  } catch (error: any) {
    console.error(`❌ User lookup failed: ${error.message}`);
  }

  // 4. Check NextAuth configuration
  console.log('\n4️⃣ NextAuth Configuration:');
  if (!nextAuthSecret) {
    console.error('❌ NEXTAUTH_SECRET not set - sessions will fail!');
    console.error('   Generate with: openssl rand -base64 32');
  } else {
    console.log('✅ NEXTAUTH_SECRET is set');
  }

  if (!nextAuthUrl || nextAuthUrl.includes('localhost')) {
    console.warn('⚠️  NEXTAUTH_URL is not set to production URL');
    console.warn('   Should be: https://flhs-help.vercel.app');
    console.warn('   Current: ' + (nextAuthUrl || 'not set'));
  } else {
    console.log(`✅ NEXTAUTH_URL is set: ${nextAuthUrl}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');

  const issues: string[] = [];
  if (!dbUrl) issues.push('DATABASE_URL not set');
  if (!nextAuthSecret) issues.push('NEXTAUTH_SECRET not set');
  if (!nextAuthUrl || nextAuthUrl.includes('localhost')) {
    issues.push('NEXTAUTH_URL not set to production URL');
  }

  if (issues.length === 0) {
    console.log('✅ All configuration looks good!');
    console.log('\n💡 If login still fails on Vercel:');
    console.log('   1. Verify environment variables are set in Vercel dashboard');
    console.log('   2. Make sure NEXTAUTH_URL = https://flhs-help.vercel.app');
    console.log('   3. Redeploy after adding variables');
    console.log('   4. Check Vercel function logs for specific errors');
  } else {
    console.log('❌ Configuration issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

testAuthFlow().catch(console.error);

