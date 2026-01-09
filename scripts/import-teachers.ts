/**
 * Import Teachers Script
 * Run with: npx tsx scripts/import-teachers.ts
 * 
 * This script imports teachers from a CSV or JSON file
 * Format: P Number, Name, Email (optional)
 * 
 * Example CSV:
 * P00166224,RJ Ramautar,rajesh.ramautar@browardschools.com
 * P00166225,John Doe,john.doe@browardschools.com
 * P00166226,Jane Smith,jane.smith@browardschools.com
 */

import { config } from 'dotenv';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import { users } from '../lib/db/schema';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql as any, { schema: { users } });

interface Teacher {
  pNumber: string;
  name: string;
  email?: string;
  password?: string;
  role?: 'staff' | 'admin';
}

async function importTeachers() {
  console.log('👨‍🏫 Teacher Import Script\n');
  console.log('='.repeat(60));

  // Default password for all teachers (should be changed on first login)
  const defaultPassword = process.env.DEFAULT_TEACHER_PASSWORD || 'ChangeMe123!';
  const defaultRole = 'staff'; // All imported teachers are staff by default

  // Option 1: Import from data/teachers.csv file
  const csvPath = join(process.cwd(), 'data', 'teachers.csv');
  
    // Option 2: Use inline teachers list
  const inlineTeachers: Teacher[] = [
    // Test teachers for quick testing
    { pNumber: 'P001', name: 'Test Teacher One', email: 'test.teacher1@browardschools.com', role: 'staff' },
    { pNumber: 'P002', name: 'Test Teacher Two', email: 'test.teacher2@browardschools.com', role: 'staff' },
    { pNumber: 'P003', name: 'Test Teacher Three', email: 'test.teacher3@browardschools.com', role: 'staff' },
  ];

  let teachers: Teacher[] = [];

  // Try to read from CSV file
  if (existsSync(csvPath)) {
    console.log('📄 Reading from data/teachers.csv...\n');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const parsed = lines
      .map((line, index) => {
        // Skip header row
        if (index === 0 && line.toLowerCase().includes('p number')) {
          return null;
        }
        
        const parts = line.split(',').map(p => p.trim());
        const pNumber = parts[0]?.toUpperCase() || '';
        
        if (!pNumber) {
          return null;
        }
        
        return {
          pNumber,
          name: parts[1] || '',
          email: parts[2] || undefined,
          role: parts[3] === 'admin' ? ('admin' as const) : ('staff' as const),
        } as Teacher;
      })
      .filter((t): t is Teacher => t !== null && t.pNumber.length > 0);
    
    teachers = parsed;
  } else if (inlineTeachers.length > 0) {
    console.log('📝 Using inline teachers list...\n');
    teachers = inlineTeachers;
  } else {
    console.log('⚠️  No data/teachers.csv file found and no inline teachers defined.');
    console.log('\n📝 Create a data/teachers.csv file with format:');
    console.log('   P Number,Name,Email,Role');
    console.log('   P00166224,RJ Ramautar,rajesh.ramautar@browardschools.com,admin');
    console.log('   P00166225,John Doe,john.doe@browardschools.com,staff\n');
    console.log('OR edit this script and add teachers to the inlineTeachers array.\n');
    process.exit(0);
  }

  if (teachers.length === 0) {
    console.error('❌ No teachers to import');
    process.exit(1);
  }

  console.log(`📊 Found ${teachers.length} teachers to import\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const teacher of teachers) {
    try {
      const pNumber = teacher.pNumber.toUpperCase();
      const name = teacher.name;
      const email = teacher.email;
      const role = teacher.role || defaultRole;
      const password = teacher.password || defaultPassword;

      // Check if user already exists
      const existing = await sql`
        SELECT id, name, role FROM users WHERE p_number = ${pNumber} LIMIT 1
      `.then((result: any) => result[0]).catch(() => null);

      if (existing) {
        // Update existing user
        const passwordHash = await bcrypt.hash(password, 10);
        await sql`
          UPDATE users 
          SET 
            name = ${name},
            email = ${email || null},
            password_hash = ${passwordHash},
            role = ${role}
          WHERE id = ${existing.id}
        `;
        updated++;
        console.log(`✅ Updated: ${name} (${pNumber}) - ${role}`);
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(password, 10);
        await db
          .insert(users)
          .values({
            pNumber,
            name,
            email: email || null,
            passwordHash,
            role: role as 'staff' | 'admin',
          });
        created++;
        console.log(`✅ Created: ${name} (${pNumber}) - ${role}`);
      }
    } catch (error: any) {
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        skipped++;
        console.log(`⚠️  Skipped: ${teacher.name} (${teacher.pNumber}) - Already exists`);
      } else {
        console.error(`❌ Error importing ${teacher.name}:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Import Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${teachers.length}\n`);

  if (created > 0 || updated > 0) {
    console.log('✅ Import complete!');
    console.log(`\n📝 Default Password: ${defaultPassword}`);
    console.log('   (Teachers should change this on first login)\n');
  }
}

importTeachers();

