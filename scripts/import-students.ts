/**
 * Import Students Script
 * Run with: npx tsx scripts/import-students.ts
 *
 * Imports students from data/students.csv for 06# lookup when submitting IT tickets.
 * Format: Student ID, First Name, Last Name, Email
 *
 * Example: 0612345678,Jane,Doe,jane.doe@student.flhs.edu
 */

import './load-env';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { db } from '../lib/db';
import { students } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

interface StudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
}

async function importStudents() {
  console.log('👨‍🎓 Student Import Script\n');
  console.log('='.repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const csvPath = join(process.cwd(), 'data', 'students.csv');
  if (!existsSync(csvPath)) {
    console.log('⚠️  No data/students.csv found.');
    console.log('\n📝 Create data/students.csv with format:');
    console.log('   Student ID,First Name,Last Name,Email');
    console.log('   0612345678,Jane,Doe,jane.doe@student.flhs.edu\n');
    process.exit(0);
  }

  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  const rows: StudentRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.toLowerCase().includes('student id')) continue; // skip header
    const parts = line.split(',').map((p) => p.trim());
    const studentId = (parts[0] || '').replace(/\s/g, ''); // normalize: remove spaces
    if (!studentId || studentId.length < 2) continue;
    rows.push({
      studentId,
      firstName: parts[1] || '',
      lastName: parts[2] || '',
      email: parts[3] || undefined,
    });
  }

  if (rows.length === 0) {
    console.log('⚠️  No valid student rows in CSV.\n');
    process.exit(0);
  }

  console.log(`📄 Found ${rows.length} students to import\n`);

  for (const row of rows) {
    const [existing] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.studentId, row.studentId))
      .limit(1);

    if (existing) {
      await db
        .update(students)
        .set({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email || null,
          updatedAt: new Date(),
        })
        .where(eq(students.id, existing.id));
      console.log(`✅ Updated: ${row.firstName} ${row.lastName} (${row.studentId})`);
    } else {
      await db.insert(students).values({
        studentId: row.studentId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email || null,
      });
      console.log(`✅ Created: ${row.firstName} ${row.lastName} (${row.studentId})`);
    }
  }

  console.log(`\n✅ Imported ${rows.length} students.\n`);
  process.exit(0);
}

importStudents().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
