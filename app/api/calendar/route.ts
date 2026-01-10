import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// CSV Parser
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  
  return rows;
}

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'academic-calendar.csv');
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Calendar file not found' },
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(fileContent);
    
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Calendar file is empty or invalid' },
        { status: 400 }
      );
    }
    
    // Extract headers
    const headers = rows[0].map(h => h.replace(/^\uFEFF/, "").trim());
    
    // Convert to objects
    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.some(v => v && v.trim())) continue; // Skip empty rows
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (row[idx] || "").trim();
      });
      data.push(obj);
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading calendar file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read calendar file' },
      { status: 500 }
    );
  }
}
