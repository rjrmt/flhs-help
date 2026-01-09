/**
 * Production Diagnostic Script
 * Run with: npx tsx scripts/diagnose-production.ts
 * 
 * This script checks:
 * - Database connection
 * - Environment variables
 * - User authentication data
 * - Ticket/detention data
 * - NextAuth configuration
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/db/schema';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function diagnoseProduction() {
  console.log('🔍 Production Diagnostic Tool\n');
  console.log('='.repeat(60));

  // 1. Check Environment Variables
  console.log('\n1️⃣ Checking Environment Variables...');
  const dbUrl = process.env.DATABASE_URL;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL is NOT set');
    console.error('   This is REQUIRED for database connection');
  } else {
    console.log('✅ DATABASE_URL is set');
    // Mask sensitive parts
    const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`   ${masked.substring(0, 50)}...`);
  }

  if (!nextAuthSecret) {
    console.error('❌ NEXTAUTH_SECRET is NOT set');
    console.error('   This is REQUIRED for session encryption');
    console.error('   Generate with: openssl rand -base64 32');
  } else {
    console.log('✅ NEXTAUTH_SECRET is set');
    console.log(`   Length: ${nextAuthSecret.length} characters`);
  }

  if (!nextAuthUrl) {
    console.warn('⚠️  NEXTAUTH_URL is NOT set');
    console.warn('   Should be set to: https://flhs-help.vercel.app');
  } else {
    console.log('✅ NEXTAUTH_URL is set');
    console.log(`   ${nextAuthUrl}`);
  }

  // 2. Test Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  if (!dbUrl) {
    console.error('❌ Cannot test database - DATABASE_URL not set');
    return;
  }

  try {
    const sql = neon(dbUrl);
    const db = drizzle(sql as any, { schema });

    // Test basic connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Check if tables exist
    console.log('\n3️⃣ Checking Database Tables...');
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tableNames = tablesResult.map((r: any) => r.table_name);
    const requiredTables = ['users', 'tickets', 'detentions', 'sessions', 'accounts'];
    
    console.log(`   Found ${tableNames.length} tables:`);
    tableNames.forEach((name: string) => {
      const required = requiredTables.includes(name);
      console.log(`   ${required ? '✅' : '  '} ${name}`);
    });

    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    if (missingTables.length > 0) {
      console.error(`\n❌ Missing required tables: ${missingTables.join(', ')}`);
      console.error('   Run migrations: npm run db:push');
    }

    // 4. Check Users
    console.log('\n4️⃣ Checking Users...');
    const usersResult = await sql`
      SELECT 
        p_number, 
        name, 
        role, 
        password_hash IS NOT NULL as has_password,
        created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    if (usersResult.length === 0) {
      console.error('❌ No users found in database');
      console.error('   Run: npx tsx scripts/create-admin.ts');
    } else {
      console.log(`✅ Found ${usersResult.length} user(s):`);
      usersResult.forEach((user: any) => {
        console.log(`   - ${user.p_number}: ${user.name} (${user.role}) ${user.has_password ? '🔐' : '⚠️  no password'}`);
      });
    }

    // 5. Check Tickets
    console.log('\n5️⃣ Checking Tickets...');
    const ticketsResult = await sql`
      SELECT 
        ticket_id,
        p_number,
        room_number,
        description,
        status,
        created_at
      FROM tickets 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    if (ticketsResult.length === 0) {
      console.log('ℹ️  No tickets found (this is okay if none have been created)');
    } else {
      console.log(`✅ Found ${ticketsResult.length} ticket(s):`);
      ticketsResult.forEach((ticket: any) => {
        const desc = ticket.description?.substring(0, 40) || 'No description';
        console.log(`   - ${ticket.ticket_id}: ${desc}... (${ticket.status})`);
        console.log(`     Staff: ${ticket.p_number || 'N/A'}, Room: ${ticket.room_number || 'N/A'}`);
      });
    }

    // 6. Check Detentions
    console.log('\n6️⃣ Checking Detentions...');
    try {
      const detentionsResult = await sql`
        SELECT 
          detention_id,
          reporting_staff,
          student_name,
          student_id,
          status,
          created_at
        FROM detentions 
        ORDER BY created_at DESC
        LIMIT 10
      `;
    
      if (detentionsResult.length === 0) {
        console.log('ℹ️  No detentions found (this is okay if none have been created)');
      } else {
        console.log(`✅ Found ${detentionsResult.length} detention(s):`);
        detentionsResult.forEach((detention: any) => {
          console.log(`   - ${detention.detention_id}: ${detention.student_name} (${detention.status})`);
          console.log(`     Staff: ${detention.reporting_staff || 'N/A'}`);
        });
      }
    } catch (detentionError: any) {
      console.error(`❌ Error checking detentions: ${detentionError.message}`);
    }

    // 7. Test Authentication Query
    console.log('\n7️⃣ Testing Authentication Query...');
    const testPNumber = 'P00166224';
    const authTest = await sql`
      SELECT id, email, name, p_number, role, password_hash IS NOT NULL as has_password
      FROM users 
      WHERE p_number = ${testPNumber}
      LIMIT 1
    `;
    
    if (authTest.length === 0) {
      console.error(`❌ Test user ${testPNumber} not found`);
      console.error('   Create admin: npx tsx scripts/create-admin.ts');
    } else {
      const user = authTest[0] as any;
      console.log(`✅ Test user found: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has password: ${user.has_password ? 'Yes' : 'No'}`);
      if (!user.has_password) {
        console.error('   ⚠️  User has no password - cannot login');
      }
    }

    // 8. Check NextAuth Tables
    console.log('\n8️⃣ Checking NextAuth Tables...');
    const sessionsCount = await sql`SELECT COUNT(*) as count FROM sessions`;
    const accountsCount = await sql`SELECT COUNT(*) as count FROM accounts`;
    
    console.log(`   Sessions: ${(sessionsCount[0] as any).count}`);
    console.log(`   Accounts: ${(accountsCount[0] as any).count}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Diagnostic Summary:\n');
    
    const issues: string[] = [];
    if (!dbUrl) issues.push('DATABASE_URL not set');
    if (!nextAuthSecret) issues.push('NEXTAUTH_SECRET not set');
    if (missingTables.length > 0) issues.push(`Missing tables: ${missingTables.join(', ')}`);
    if (usersResult.length === 0) issues.push('No users in database');
    
    if (issues.length === 0) {
      console.log('✅ All checks passed!');
      console.log('\n💡 If login still fails, check:');
      console.log('   1. Environment variables are set in Vercel');
      console.log('   2. Vercel has redeployed after adding variables');
      console.log('   3. Browser cookies are enabled');
      console.log('   4. Check Vercel function logs for errors');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

  } catch (error: any) {
    console.error('\n❌ Database connection failed:');
    console.error(`   ${error.message}`);
    console.error('\n💡 Common issues:');
    console.error('   1. DATABASE_URL is incorrect');
    console.error('   2. Database server is not accessible');
    console.error('   3. SSL connection required (add ?sslmode=require)');
    console.error('   4. Database credentials are wrong');
  }
}

diagnoseProduction().catch(console.error);

