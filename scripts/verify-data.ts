/**
 * Verify Data Script
 * Run with: npx tsx scripts/verify-data.ts
 * 
 * This script verifies that:
 * - Tickets are being saved to the database
 * - Detentions are being saved to the database
 * - Authentication is working
 * - User data is correct
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function verifyData() {
  console.log('🔍 Verifying Database Data...\n');
  console.log('='.repeat(60));

  try {
    // 1. Verify Users
    console.log('\n1️⃣ Verifying Users...');
    const userCount = await sql`
      SELECT COUNT(*) as count FROM users;
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    const staffCount = await sql`
      SELECT COUNT(*) as count FROM users WHERE role = 'staff';
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    const adminCount = await sql`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin';
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    console.log(`   Total Users: ${userCount}`);
    console.log(`   Staff: ${staffCount}`);
    console.log(`   Admins: ${adminCount}`);

    if (userCount === 0) {
      console.log('   ⚠️  No users found! Run: npx tsx scripts/import-teachers.ts');
    } else {
      console.log('   ✅ Users table is populated');
    }

    // 2. Verify Tickets
    console.log('\n2️⃣ Verifying Tickets...');
    const ticketCount = await sql`
      SELECT COUNT(*) as count FROM tickets;
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    const recentTickets = await sql`
      SELECT ticket_id, p_number, room_number, status, created_at
      FROM tickets
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    console.log(`   Total Tickets: ${ticketCount}`);
    if (ticketCount > 0) {
      console.log('   Recent Tickets:');
      recentTickets.forEach((ticket: any) => {
        console.log(`     - ${ticket.ticket_id} (${ticket.p_number || 'No P Number'}) - ${ticket.status}`);
        console.log(`       Room: ${ticket.room_number || 'N/A'}, Created: ${ticket.created_at}`);
      });
      console.log('   ✅ Tickets are being saved to database');
    } else {
      console.log('   ℹ️  No tickets yet (this is okay)');
    }

    // 3. Verify Detentions
    console.log('\n3️⃣ Verifying Detentions...');
    const detentionCount = await sql`
      SELECT COUNT(*) as count FROM detentions;
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    const recentDetentions = await sql`
      SELECT detention_id, student_name, student_id, status, created_at
      FROM detentions
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    console.log(`   Total Detentions: ${detentionCount}`);
    if (detentionCount > 0) {
      console.log('   Recent Detentions:');
      recentDetentions.forEach((detention: any) => {
        console.log(`     - ${detention.detention_id} (${detention.student_name}) - ${detention.status}`);
        console.log(`       Student ID: ${detention.student_id}, Created: ${detention.created_at}`);
      });
      console.log('   ✅ Detentions are being saved to database');
    } else {
      console.log('   ℹ️  No detentions yet (this is okay)');
    }

    // 4. Verify Ticket-User Relationship
    console.log('\n4️⃣ Verifying Ticket-User Relationships...');
    const ticketsWithUsers = await sql`
      SELECT t.ticket_id, t.p_number, u.name as staff_name, u.role
      FROM tickets t
      LEFT JOIN users u ON t.p_number = u.p_number
      ORDER BY t.created_at DESC
      LIMIT 10;
    `;

    if (ticketCount > 0) {
      const matchedTickets = ticketsWithUsers.filter((t: any) => t.staff_name);
      const unmatchedTickets = ticketsWithUsers.filter((t: any) => !t.staff_name);

      console.log(`   Tickets with matched users: ${matchedTickets.length}/${ticketsWithUsers.length}`);
      
      if (unmatchedTickets.length > 0) {
        console.log('   ⚠️  Tickets without matched users:');
        unmatchedTickets.forEach((ticket: any) => {
          console.log(`     - ${ticket.ticket_id} (P Number: ${ticket.p_number || 'N/A'})`);
        });
        console.log('   💡 Import teachers with matching P numbers: npx tsx scripts/import-teachers.ts');
      } else {
        console.log('   ✅ All tickets have matched users');
      }
    }

    // 5. Verify Authentication Setup
    console.log('\n5️⃣ Verifying Authentication Setup...');
    const usersWithPasswords = await sql`
      SELECT COUNT(*) as count FROM users WHERE password_hash IS NOT NULL;
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    const usersWithoutPasswords = await sql`
      SELECT COUNT(*) as count FROM users WHERE password_hash IS NULL;
    `.then((result: any) => parseInt(result[0]?.count || '0'));

    console.log(`   Users with passwords: ${usersWithPasswords}`);
    console.log(`   Users without passwords: ${usersWithoutPasswords}`);

    if (usersWithPasswords === 0) {
      console.log('   ⚠️  No users have passwords! Authentication will not work.');
      console.log('   💡 Run: npx tsx scripts/import-teachers.ts');
    } else {
      console.log('   ✅ Authentication is set up correctly');
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Verification Summary:\n');
    console.log(`   Users: ${userCount > 0 ? '✅' : '❌'} ${userCount} users`);
    console.log(`   Tickets: ${ticketCount > 0 ? '✅' : 'ℹ️ '} ${ticketCount} tickets`);
    console.log(`   Detentions: ${detentionCount > 0 ? '✅' : 'ℹ️ '} ${detentionCount} detentions`);
    console.log(`   Auth: ${usersWithPasswords > 0 ? '✅' : '❌'} ${usersWithPasswords} users can login\n`);

    if (userCount > 0 && usersWithPasswords > 0) {
      console.log('✅ Database is set up correctly!');
      console.log('\n💡 Next steps:');
      console.log('   1. Test login: npx tsx scripts/test-login.ts');
      console.log('   2. Submit a test ticket from the web app');
      console.log('   3. Submit a test detention from the web app');
      console.log('   4. Run this script again to verify data is saving\n');
    } else {
      console.log('⚠️  Some setup is incomplete. See recommendations above.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyData();

