#!/usr/bin/env npx ts-node
/**
 * Generate a full academic calendar CSV with A/B day rotation.
 *
 * Usage: npx ts-node scripts/generate-academic-calendar.ts
 *
 * Run this at the start of each school year to populate data/academic-calendar.csv
 * with every school day. Your existing special days (PSD, ERD, exams) will be
 * preserved and override the generated regular days.
 */

import * as fs from 'fs';
import * as path from 'path';

// Edit these to match your school year
const SCHOOL_YEAR_START = new Date(2025, 7, 18);  // Aug 18, 2025
const SCHOOL_YEAR_END = new Date(2026, 5, 5);     // June 5, 2026

// Mon=A, Tue=B, Wed=A, Thu=B, Fri=A (adjust if your school differs)
const DAY_CODE: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'A', 4: 'B', 5: 'A',
  0: '', 6: '',  // weekend
};

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let val = '';
    let inQ = false;
    for (let j = 0; j < lines[i].length; j++) {
      const c = lines[i][j];
      if (c === '"') inQ = !inQ;
      else if ((c === ',' || c === '\n') && !inQ) {
        values.push(val.trim());
        val = '';
      } else val += c;
    }
    values.push(val.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function main() {
  const csvPath = path.join(process.cwd(), 'data', 'academic-calendar.csv');

  // Load existing special days (PSD, ERD, exam, midterm, closed - anything not "Normal")
  const specialByDate = new Map<string, { day_code: string; school_status: string; notes: string }>();
  if (fs.existsSync(csvPath)) {
    const { rows } = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
    for (const r of rows) {
      const status = (r.school_status || '').toLowerCase();
      if (status && status !== 'normal') {
        specialByDate.set(r.date, {
          day_code: r.day_code || '',
          school_status: r.school_status || '',
          notes: r.notes || '',
        });
      }
    }
  }

  // Generate all school days
  const byDate = new Map<string, { day_code: string; school_status: string; notes: string }>();
  const d = new Date(SCHOOL_YEAR_START);

  while (d <= SCHOOL_YEAR_END) {
    const dow = d.getDay();
    const code = DAY_CODE[dow];
    if (code) {
      const dateStr = formatDate(d);
      const special = specialByDate.get(dateStr);
      if (special) {
        byDate.set(dateStr, special);
      } else {
        byDate.set(dateStr, {
          day_code: code,
          school_status: 'Normal',
          notes: code === 'A' ? 'White Day' : 'Blue Day',
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }

  // Add any special days outside the generated range
  for (const [dateStr, special] of specialByDate) {
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, special);
    }
  }

  const entries = Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  const header = 'date,day_code,school_status,notes,background_color,text_color,shape_type,shape_position,text_overlay';
  const lines = [header, ...entries.map(e => `${e.date},${e.day_code},${e.school_status},${e.notes},,,,`)];
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`Wrote ${entries.length} days to data/academic-calendar.csv`);
}

main();
