/**
 * Database Diagnostic Script
 * Run with: npx tsx scripts/diagnose-db.ts
 *
 * Checks: connection, tables, admin user, schema integrity
 */
import './load-env';
import postgres from 'postgres';
import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

async function diagnose() {
  console.log('🔍 Starting Database Diagnostic...\n');
  console.log('='.repeat(60));

  try {
    // 1. Test connection
    console.log('\n1️⃣ Testing database connection...');
    const [test] = await client`SELECT 1 as test`;
    if (test) {
      console.log('✅ Database connection successful');
    } else {
      throw new Error('Connection test failed');
    }

    // 2. Check tables
    console.log('\n2️⃣ Checking table existence...');
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens', 'tickets', 'ticket_updates', 'detentions', 'detention_updates'];

    for (const table of tables) {
      const [result] = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${table}
        ) as exists
      `;
      console.log(`  ${result?.exists ? '✅' : '❌'} Table '${table}' ${result?.exists ? 'exists' : 'does NOT exist'}`);
    }

    // 3. Users table structure
    console.log('\n3️⃣ Checking users table structure...');
    const columns = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    if (columns.length > 0) {
      columns.forEach((col: { column_name: string; data_type: string; is_nullable: string }) => {
        console.log(`    - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
      const hasPNumber = columns.some((c: { column_name: string }) => c.column_name === 'p_number');
      if (!hasPNumber) console.log('  ⚠️  Missing p_number column!');
    } else {
      console.log('  ❌ Users table does not exist');
    }

    // 4. Admin user
    console.log('\n4️⃣ Checking for admin user...');
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    const pNumberUsers = await db.select().from(users).where(eq(users.pNumber, 'P00166224'));
    const found = [...new Map([...adminUsers, ...pNumberUsers].map((u) => [u.id, u])).values()];

    if (found.length > 0) {
      console.log('  ✅ Found admin/staff users:');
      found.forEach((u) => console.log(`    - ${u.name} (${u.email || 'no email'}) P: ${u.pNumber} Role: ${u.role}`));
    } else {
      console.log('  ❌ No admin user found. Run: npx tsx scripts/create-admin.ts');
    }

    // 5. NextAuth tables
    console.log('\n5️⃣ Checking NextAuth tables...');
    const nextAuthTables = ['accounts', 'sessions', 'verification_tokens'];
    for (const table of nextAuthTables) {
      const [r] = await client`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${table}) as exists`;
      console.log(`  ${r?.exists ? '✅' : '❌'} ${table}`);
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Summary:');
    const tableChecks = await Promise.all(
      tables.map(async (t) => {
        const [r] = await client`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${t}) as exists`;
        return r?.exists ?? false;
      })
    );
    const allExist = tableChecks.every(Boolean);
    console.log(allExist ? '✅ All required tables exist' : '❌ Some tables missing. Run: npx tsx scripts/setup-database.ts');
    console.log(found.length > 0 ? '✅ Admin user exists' : '❌ Create admin: npx tsx scripts/create-admin.ts');
    console.log('\n✅ Diagnostic complete!\n');
  } catch (error: unknown) {
    console.error('\n❌ Diagnostic failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

diagnose();
