import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
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

// Normalize text: proper capitalization and word format
function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Remove extra whitespace and newlines, but preserve intentional line breaks
  let normalized = text.trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
  
  // Capitalize first letter of the text if it's lowercase
  if (normalized.length > 0 && normalized[0] === normalized[0].toLowerCase()) {
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  // Fix common capitalization issues (only if they're lowercase)
  normalized = normalized.replace(/\bi\b/g, 'I');
  normalized = normalized.replace(/\bim\b/g, "I'm");
  normalized = normalized.replace(/\bid\b/g, "I'd");
  normalized = normalized.replace(/\bive\b/g, "I've");
  
  // Capitalize proper nouns and common IT terms (case-insensitive replacement)
  const properNouns = [
    'FLHS', 'IT', 'Windows', 'Mac', 'Excel', 'PowerPoint', 'PPT', 
    'Teams', 'Canvas', 'Clever', 'Focus', 'OneNote', 'FileMaker',
    'Promethean', 'Recordex', 'Polycom', 'Lexmark', 'Dell', 'HP',
    'USB', 'HDMI', 'Ethernet', 'WiFi', 'VCR', 'DVD',
    'AED', 'CPST', 'SAC', 'SAF', 'SOAR', 'AICE', 'BCPS'
  ];
  
  properNouns.forEach(noun => {
    const regex = new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, noun);
  });
  
  return normalized;
}

// Normalize name: proper capitalization
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Remove extra whitespace
  let normalized = name.trim().replace(/\s+/g, ' ');
  
  // Capitalize each word
  normalized = normalized.split(' ').map(word => {
    if (!word) return '';
    // Handle special cases like "da Silva", "de Sousa", etc.
    if (word.toLowerCase() === 'da' || word.toLowerCase() === 'de' || 
        word.toLowerCase() === 'dos' || word.toLowerCase() === 'das') {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  return normalized;
}

// Map CSV urgency to database urgency
function mapUrgency(csvUrgency: string): 'low' | 'medium' | 'high' | 'critical' {
  const urgency = csvUrgency.toLowerCase().trim();
  
  if (urgency.includes('asap') || urgency.includes('same-day')) {
    return 'critical';
  }
  if (urgency.includes('1-2 days') || urgency.includes('1–2 days') || urgency.includes('important')) {
    return 'high';
  }
  if (urgency.includes('week') || urgency.includes('routine') || urgency.includes('any time')) {
    return 'low';
  }
  // Default to medium for any other cases
  return 'medium';
}

// Map CSV status to database status
function mapStatus(csvStatus: string): 'submitted' | 'in_progress' | 'resolved' | 'closed' {
  const status = csvStatus.toLowerCase().trim();
  
  // CSV tickets marked as "closed" were actually resolved
  if (status.includes('closed')) {
    return 'resolved';
  }
  if (status.includes('in progress') || status.includes('progress')) {
    return 'in_progress';
  }
  if (status.includes('open')) {
    return 'submitted';
  }
  // Default to resolved for old completed tickets
  return 'resolved';
}

// Parse date from CSV format (e.g., "4/1/2025 7:59 AM")
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Handle formats like "4/1/2025 7:59 AM" or "4/1/2025 7:59:00 AM"
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateStr}`);
      return null;
    }
    return date;
  } catch (error) {
    console.warn(`Error parsing date ${dateStr}:`, error);
    return null;
  }
}

// Build room number from building and room (max 50 chars for database)
function buildRoomNumber(building: string | null | undefined, roomNumber: string | null | undefined): string {
  const bld = building?.trim() || '';
  let room = roomNumber?.trim() || '';
  
  // If room number already contains building info, use it as-is
  if (room.toLowerCase().includes('bld') || room.toLowerCase().includes('building')) {
    return room.length > 50 ? room.substring(0, 47) + '...' : room;
  }
  
  // If room number contains multiple rooms (e.g., "2134, 2138" or "1st - 2158 5th - 2144")
  // just use it as-is, but truncate if too long
  if (room.includes(',') || room.includes('-') || room.includes('/')) {
    if (room.length > 50) {
      // Try to keep the most important part (usually the first room)
      const firstPart = room.split(/[,/]/)[0].trim();
      if (firstPart.length <= 50) {
        return firstPart;
      }
      return room.substring(0, 47) + '...';
    }
    return room;
  }
  
  // Combine building and room if both exist
  if (bld && room) {
    const combined = `${bld}-${room}`;
    return combined.length > 50 ? combined.substring(0, 47) + '...' : combined;
  }
  if (room) {
    return room.length > 50 ? room.substring(0, 47) + '...' : room;
  }
  if (bld) {
    return `BLD ${bld}`;
  }
  return '';
}

interface CSVRow {
  '🆔 Ticket ID': string;
  '👤 Staff Name': string;
  '🏢 BLD': string;
  '🏫 Room Number': string;
  '🧰 IT Issue': string;
  '🚦 Urgency': string;
  '📌 Status': string;
  '📅 Submission Time': string;
  '📅 Completed Time': string;
}

async function importTickets() {
  try {
    console.log('🎫 Ticket Import Script\n');
    console.log('='.repeat(60));
    console.log('Starting ticket import from CSV...\n');
    
    // Read CSV file
    const csvPath = join(process.cwd(), 'data', 'FLHS IT Tickets.csv');
    let csvContent = readFileSync(csvPath, 'utf-8');
    
    // Remove UTF-8 BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    
    // Parse CSV
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      quote: '"',
      escape: '"',
      relax_quotes: true,
      relax_column_count: true,
    });
    
    console.log(`Found ${records.length} tickets in CSV`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        const ticketId = record['🆔 Ticket ID']?.trim();
        if (!ticketId) {
          console.warn('Skipping row with no ticket ID');
          skipped++;
          continue;
        }
        
        // Check if ticket already exists
        const existing = await db.select().from(tickets).where(eq(tickets.ticketId, ticketId)).limit(1);
        
        if (existing && existing.length > 0) {
          console.log(`Ticket ${ticketId} already exists, skipping...`);
          skipped++;
          continue;
        }
        
        // Normalize data
        const requesterName = normalizeName(record['👤 Staff Name']);
        const building = normalizeText(record['🏢 BLD']);
        const roomNumber = buildRoomNumber(building, normalizeText(record['🏫 Room Number']));
        const description = normalizeText(record['🧰 IT Issue']);
        const urgency = mapUrgency(record['🚦 Urgency']);
        const status = mapStatus(record['📌 Status']);
        const submissionTime = parseDate(record['📅 Submission Time']);
        const completedTime = parseDate(record['📅 Completed Time']);
        
        // Use submission time as createdAt, or current time if not available
        const createdAt = submissionTime || new Date();
        // Use completed time as updatedAt if available and status is resolved, otherwise use createdAt
        const updatedAt = (status === 'resolved' && completedTime) ? completedTime : createdAt;
        
        // Insert ticket
        await db.insert(tickets).values({
          ticketId,
          requesterName: requesterName || null,
          requesterEmail: null, // Old tickets don't have email
          pNumber: null, // Old tickets don't have P numbers
          roomNumber: roomNumber || null,
          category: null,
          subject: null,
          description: description || 'No description provided',
          urgency,
          status,
          assignedTo: null,
          createdAt,
          updatedAt,
        });
        
        imported++;
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} tickets...`);
        }
      } catch (error) {
        console.error(`Error importing ticket ${record['🆔 Ticket ID']}:`, error);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Import Summary:');
    console.log(`   Total records: ${records.length}`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✅ Import completed!\n');
    
  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import
importTickets();
