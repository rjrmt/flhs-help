/**
 * Verify Data Script
 * Run with: npx tsx scripts/verify-data.ts
 *
 * Verifies: users, tickets, detentions, auth setup
 */
import './load-env';
import postgres from 'postgres';
import { db } from '../lib/db';
import { users, tickets, detentions } from '../lib/db/schema';
import { desc } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

async function verifyData() {
  console.log('🔍 Verifying Database Data...\n');
  console.log('='.repeat(60));

  try {
    // 1. Users
    console.log('\n1️⃣ Verifying Users...');
    const allUsers = await db.select().from(users);
    const userCount = allUsers.length;
    const staffCount = allUsers.filter((u) => u.role === 'staff').length;
    const adminCount = allUsers.filter((u) => u.role === 'admin').length;

    console.log(`   Total Users: ${userCount}`);
    console.log(`   Staff: ${staffCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(userCount > 0 ? '   ✅ Users table is populated' : '   ⚠️  No users. Run: npx tsx scripts/import-teachers.ts');

    // 2. Tickets
    console.log('\n2️⃣ Verifying Tickets...');
    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(5);
    const ticketRows = await db.select().from(tickets);
    const ticketCount = ticketRows.length;
    console.log(`   Total Tickets: ${ticketCount}`);
    if (allTickets.length > 0) {
      allTickets.forEach((t) => console.log(`     - ${t.ticketId} (${t.pNumber || 'No P#'}) - ${t.status}`));
      console.log('   ✅ Tickets are being saved');
    } else {
      console.log('   ℹ️  No tickets yet');
    }

    // 3. Detentions
    console.log('\n3️⃣ Verifying Detentions...');
    const allDetentions = await db.select().from(detentions).orderBy(desc(detentions.createdAt)).limit(5);
    const detentionRows = await db.select().from(detentions);
    const detentionCount = detentionRows.length;
    console.log(`   Total Detentions: ${detentionCount}`);
    if (allDetentions.length > 0) {
      allDetentions.forEach((d) => console.log(`     - ${d.detentionId} (${d.studentName}) - ${d.status}`));
      console.log('   ✅ Detentions are being saved');
    } else {
      console.log('   ℹ️  No detentions yet');
    }

    // 4. Auth setup
    console.log('\n4️⃣ Verifying Authentication...');
    const withPassword = allUsers.filter((u) => u.passwordHash).length;
    console.log(`   Users with passwords: ${withPassword}`);
    console.log(withPassword > 0 ? '   ✅ Authentication is set up' : '   ⚠️  No users have passwords. Run: npx tsx scripts/import-teachers.ts');

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Users: ${userCount > 0 ? '✅' : '❌'} ${userCount}`);
    console.log(`   Tickets: ${ticketCount > 0 ? '✅' : 'ℹ️ '} ${ticketCount}`);
    console.log(`   Detentions: ${detentionCount > 0 ? '✅' : 'ℹ️ '} ${detentionCount}`);
    console.log(`   Auth: ${withPassword > 0 ? '✅' : '❌'}\n`);

    if (userCount > 0 && withPassword > 0) {
      console.log('✅ Database is set up correctly!\n');
    } else {
      console.log('⚠️  Some setup incomplete. See above.\n');
    }
  } catch (error: unknown) {
    console.error('\n❌ Verification failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyData();
