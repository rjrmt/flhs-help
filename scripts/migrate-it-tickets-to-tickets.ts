/**
 * Migrate tickets from it_tickets (Microsoft List / Supabase) into tickets table
 * Run with: npx tsx scripts/migrate-it-tickets-to-tickets.ts
 *
 * Maps:
 *   it_tickets.staff_name -> tickets.requester_name
 *   it_tickets.building + room_number -> tickets.room_number
 *   it_tickets.issue_description -> tickets.description
 *   it_tickets.legacy_ticket_id -> tickets.ticket_id (or generate TICKET-2026-XXXXX)
 *   it_tickets.status -> tickets.status
 *   it_tickets.urgency -> tickets.urgency
 */
import './load-env';
import postgres from 'postgres';
import { db } from '../lib/db';
import { tickets } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

function mapStatus(s: string | null): 'submitted' | 'in_progress' | 'resolved' | 'closed' {
  if (!s) return 'submitted';
  const lower = s.toLowerCase();
  if (lower.includes('closed') || lower.includes('resolved')) return 'resolved';
  if (lower.includes('progress') || lower.includes('working')) return 'in_progress';
  if (lower.includes('open') || lower.includes('submitted')) return 'submitted';
  return 'resolved'; // default old tickets to resolved
}

function mapUrgency(s: string | null): 'low' | 'medium' | 'high' | 'critical' {
  if (!s) return 'medium';
  const lower = s.toLowerCase();
  if (lower.includes('asap') || lower.includes('critical') || lower.includes('same')) return 'critical';
  if (lower.includes('1_2') || lower.includes('1-2') || lower.includes('high') || lower.includes('important')) return 'high';
  if (lower.includes('week') || lower.includes('low') || lower.includes('routine')) return 'low';
  return 'medium';
}

function buildRoomNumber(building: string | null, room: string | null): string | null {
  const b = building?.trim();
  const r = room?.trim();
  if (!b && !r) return null;
  if (b && r) return `${b}-${r}`;
  return b || r || null;
}

async function migrate() {
  console.log('🔄 Migrating it_tickets → tickets\n');
  console.log('='.repeat(60));

  try {
    const rows = await client`
      SELECT id, staff_name, building, room_number, issue_description,
             status, urgency, submitted_at, updated_at, legacy_ticket_id
      FROM it_tickets
      ORDER BY submitted_at ASC
    `;

    console.log(`Found ${rows.length} tickets in it_tickets\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        let ticketId = (row.legacy_ticket_id?.trim() || `IT-${row.id}`).slice(0, 50);
        if (!ticketId) ticketId = `IT-${row.id}`;

        const existing = await db.select().from(tickets).where(eq(tickets.ticketId, ticketId)).limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        const status = mapStatus(row.status);
        const urgency = mapUrgency(row.urgency);
        const roomNum = buildRoomNumber(row.building, row.room_number);
        const roomNumber = roomNum ? roomNum.slice(0, 50) : null;
        const createdAt = row.submitted_at ? new Date(row.submitted_at) : new Date();
        const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;

        await db.insert(tickets).values({
          ticketId,
          requesterName: row.staff_name?.trim()?.slice(0, 255) || null,
          requesterEmail: null,
          pNumber: null,
          roomNumber: roomNumber || null,
          category: null,
          subject: null,
          description: (row.issue_description?.trim() || 'No description').slice(0, 5000),
          urgency,
          status,
          assignedTo: null,
          createdAt,
          updatedAt,
        });

        imported++;
        if (imported % 20 === 0) console.log(`   Imported ${imported}...`);
      } catch (err) {
        console.error(`   Error on row ${row.id}:`, (err as Error).message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped (already in tickets): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✅ Migration complete! Check /admin/tickets to see your tickets.\n');
  } catch (e) {
    console.error('\n❌', (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
