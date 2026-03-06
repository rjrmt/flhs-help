/**
 * Supabase Schema Check & Ticket Verification
 * Run with: npx tsx scripts/check-supabase-schema.ts
 *
 * 1. Lists ALL tables in public schema
 * 2. Verifies tickets table structure matches app schema
 * 3. Shows ticket counts and sample data
 * 4. Identifies mismatches or missing tables
 */
import './load-env';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

const EXPECTED_TICKETS_COLUMNS = [
  'id',
  'ticket_id',
  'requester_name',
  'requester_email',
  'p_number',
  'room_number',
  'category',
  'subject',
  'description',
  'urgency',
  'status',
  'assigned_to',
  'created_at',
  'updated_at',
];

async function checkSchema() {
  console.log('🔍 Supabase Schema & Tickets Verification\n');
  console.log('='.repeat(60));

  try {
    // 1. List ALL tables in public schema
    console.log('\n1️⃣ All tables in public schema:');
    const allTables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    if (allTables.length === 0) {
      console.log('   ❌ No tables found in public schema!');
    } else {
      allTables.forEach((t: { table_name: string }) => console.log(`   - ${t.table_name}`));
    }

    // 2. Check if tickets table exists
    console.log('\n2️⃣ Tickets table:');
    const ticketsExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tickets'
      ) as exists
    `;
    const hasTickets = ticketsExists[0]?.exists ?? false;

    if (!hasTickets) {
      console.log('   ❌ Table "tickets" does NOT exist');
      console.log('   → The IT Ticket Console expects a "tickets" table.');
      console.log('   → Run: npm run db:generate  (then apply migrations)');
      console.log('   → Or run: npx tsx scripts/setup-database.ts');
    } else {
      // 3. Tickets table structure
      console.log('   ✅ Table "tickets" exists');
      const ticketColumns = await client`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tickets'
        ORDER BY ordinal_position
      `;
      console.log('   Columns:');
      ticketColumns.forEach((c: { column_name: string; data_type: string }) => {
        const expected = EXPECTED_TICKETS_COLUMNS.includes(c.column_name);
        console.log(`     ${expected ? '✅' : '⚠️'} ${c.column_name} (${c.data_type})`);
      });

      const actualCols = ticketColumns.map((c: { column_name: string }) => c.column_name);
      const missing = EXPECTED_TICKETS_COLUMNS.filter((col) => !actualCols.includes(col));
      if (missing.length > 0) {
        console.log('   ⚠️  Missing columns:', missing.join(', '));
      }

      // 4. Ticket count and sample
      const countResult = await client`SELECT COUNT(*)::int as count FROM tickets`;
      const count = countResult[0]?.count ?? 0;
      console.log(`\n   📊 Total tickets: ${count}`);

      if (count > 0) {
        const sample = await client`
          SELECT id, ticket_id, requester_name, status, urgency, created_at
          FROM tickets
          ORDER BY created_at DESC
          LIMIT 5
        `;
        console.log('   Sample (most recent 5):');
        sample.forEach((row: Record<string, unknown>) => {
          console.log(`     - ${row.ticket_id} | ${row.requester_name || 'N/A'} | ${row.status} | ${row.urgency}`);
        });
      } else {
        console.log('   ℹ️  No tickets in database yet.');
        console.log('   → Submit a ticket via /submit-ticket');
        console.log('   → Or import from CSV: npx tsx scripts/import-tickets-from-csv.ts');
      }
    }

    // 5. Check for alternative ticket tables (Microsoft List, etc.)
    console.log('\n3️⃣ Other tables that might contain ticket data:');
    const ticketLike = allTables.filter(
      (t: { table_name: string }) =>
        t.table_name.toLowerCase().includes('ticket') ||
        t.table_name.toLowerCase().includes('it_') ||
        t.table_name.toLowerCase().includes('issue')
    );
    if (ticketLike.length > 0) {
      ticketLike.forEach((t: { table_name: string }) => {
        if (t.table_name !== 'tickets') {
          console.log(`   ⚠️  Found "${t.table_name}" - may need to migrate data into "tickets"`);
        }
      });
    } else if (!hasTickets) {
      console.log('   No other ticket-like tables found.');
    }

    // 6. Roster tables (for P# lookup)
    console.log('\n4️⃣ Roster tables (staff_roster, student_roster):');
    for (const name of ['staff_roster', 'student_roster']) {
      const [r] = await client`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${name}) as exists
      `;
      let cnt = 0;
      if (r?.exists) {
        const res = name === 'staff_roster'
          ? await client`SELECT COUNT(*)::int as c FROM staff_roster`
          : await client`SELECT COUNT(*)::int as c FROM student_roster`;
        cnt = res[0]?.c ?? 0;
      }
      console.log(`   ${r?.exists ? '✅' : '❌'} ${name} ${r?.exists ? `(${cnt} rows)` : '(missing)'}`);
    }

    // 7. ticket_updates (for comments)
    console.log('\n5️⃣ ticket_updates table:');
    const [updatesExists] = await client`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_updates') as exists
    `;
    console.log(`   ${updatesExists?.exists ? '✅' : '❌'} ticket_updates ${updatesExists?.exists ? 'exists' : 'missing'}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Next steps if tickets are missing:');
    console.log('   1. Ensure "tickets" table exists with correct columns');
    console.log('   2. Run: npm run db:generate && npx tsx scripts/setup-database.ts');
    console.log('   3. Import from CSV: npx tsx scripts/import-tickets-from-csv.ts');
    console.log('   4. Or submit new tickets via the app at /submit-ticket\n');
  } catch (error: unknown) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
