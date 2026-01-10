import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { tickets } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql as any, { schema: { tickets } });

async function updateClosedToResolved() {
  try {
    console.log('🔄 Updating closed tickets to resolved...\n');
    
    // Find all closed tickets
    const closedTickets = await db.select().from(tickets).where(eq(tickets.status, 'closed'));
    
    console.log(`Found ${closedTickets.length} closed tickets`);
    
    if (closedTickets.length === 0) {
      console.log('✅ No closed tickets to update');
      return;
    }
    
    // Update all closed tickets to resolved
    let updated = 0;
    for (const ticket of closedTickets) {
      await db
        .update(tickets)
        .set({
          status: 'resolved',
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, ticket.id));
      updated++;
    }
    
    console.log(`\n✅ Successfully updated ${updated} tickets from 'closed' to 'resolved'`);
    console.log('\nUpdate complete!');
    
  } catch (error) {
    console.error('❌ Error updating tickets:', error);
    process.exit(1);
  }
}

updateClosedToResolved();
