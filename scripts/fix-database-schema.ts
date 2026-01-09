/**
 * Fix Database Schema Script
 * Adds missing p_number columns to tickets and detentions tables
 * Run with: npx tsx scripts/fix-database-schema.ts
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function fixDatabaseSchema() {
  console.log('🔧 Fixing Database Schema\n');
  console.log('='.repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('\n1️⃣ Checking current schema...');

    // Check if p_number exists in tickets table
    const ticketsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'p_number'
    `;

    // Check if p_number exists in detentions table
    const detentionsCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'detentions' 
      AND column_name = 'p_number'
    `;

    console.log(`   Tickets table: ${ticketsCheck.length > 0 ? '✅ p_number exists' : '❌ p_number missing'}`);
    console.log(`   Detentions table: ${detentionsCheck.length > 0 ? '✅ p_number exists' : '❌ p_number missing'}`);

    console.log('\n2️⃣ Adding missing columns...');

    // Add p_number to tickets table if missing
    if (ticketsCheck.length === 0) {
      console.log('   Adding p_number to tickets table...');
      await sql`
        ALTER TABLE tickets 
        ADD COLUMN IF NOT EXISTS p_number VARCHAR(50);
      `;
      console.log('   ✅ Added p_number to tickets table');
    } else {
      console.log('   ⏭️  p_number already exists in tickets table');
    }

    // Add p_number to detentions table if missing
    if (detentionsCheck.length === 0) {
      console.log('   Adding p_number to detentions table...');
      await sql`
        ALTER TABLE detentions 
        ADD COLUMN IF NOT EXISTS p_number VARCHAR(50);
      `;
      console.log('   ✅ Added p_number to detentions table');
    } else {
      console.log('   ⏭️  p_number already exists in detentions table');
    }

    // Add room_number to tickets if missing
    const roomNumberCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name = 'room_number'
    `;

    if (roomNumberCheck.length === 0) {
      console.log('   Adding room_number to tickets table...');
      await sql`
        ALTER TABLE tickets 
        ADD COLUMN IF NOT EXISTS room_number VARCHAR(50);
      `;
      console.log('   ✅ Added room_number to tickets table');
    }

    console.log('\n3️⃣ Verifying schema...');

    // Verify tickets table
    const ticketsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' 
      AND column_name IN ('p_number', 'room_number')
      ORDER BY column_name
    `;
    console.log('   Tickets table columns:');
    ticketsColumns.forEach((col: any) => {
      console.log(`     ✅ ${col.column_name} (${col.data_type})`);
    });

    // Verify detentions table
    const detentionsColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'detentions' 
      AND column_name = 'p_number'
    `;
    console.log('   Detentions table columns:');
    detentionsColumns.forEach((col: any) => {
      console.log(`     ✅ ${col.column_name} (${col.data_type})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Database schema fixed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Redeploy your Vercel application');
    console.log('   2. Test login again');
    console.log('   3. The dashboard should now work');

  } catch (error: any) {
    console.error('\n❌ Error fixing schema:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

fixDatabaseSchema().catch(console.error);

