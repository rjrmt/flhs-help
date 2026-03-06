/**
 * Inspect it_tickets table structure and sample data
 * Run with: npx tsx scripts/inspect-it-tickets.ts
 */
import './load-env';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

async function inspect() {
  console.log('🔍 Inspecting it_tickets table...\n');

  try {
    const columns = await client`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'it_tickets'
      ORDER BY ordinal_position
    `;
    console.log('Columns:');
    columns.forEach((c: { column_name: string; data_type: string }) => {
      console.log(`  - ${c.column_name} (${c.data_type})`);
    });

    const count = await client`SELECT COUNT(*)::int as c FROM it_tickets`;
    console.log(`\nTotal rows: ${count[0]?.c ?? 0}`);

    const sample = await client`SELECT * FROM it_tickets LIMIT 3`;
    if (sample.length > 0) {
      console.log('\nSample row (first):');
      console.log(JSON.stringify(sample[0], null, 2));
    }
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

inspect();
