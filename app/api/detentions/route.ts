import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detentions, users } from '@/lib/db/schema';
import { generateDetentionId } from '@/lib/utils/ids';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

const createDetentionSchema = z.object({
  pNumber: z.string().min(1),
  studentName: z.string().min(2),
  studentId: z.string().min(1),
  reason: z.string().min(10),
  detentionDate: z.string(),
  detentionTime: z.string(),
  reportingStaff: z.string().min(2).optional(), // Will be filled from P number lookup
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createDetentionSchema.parse(body);

    // Look up staff name from P number
    let staffName = validatedData.reportingStaff;
    if (validatedData.pNumber && !staffName) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not set');
      }
      const neonSql = neon(process.env.DATABASE_URL);
      const userResult = await neonSql`
        SELECT name FROM users WHERE p_number = ${validatedData.pNumber.toUpperCase()} LIMIT 1
      `;
      
      if (userResult[0]) {
        staffName = (userResult[0] as any).name;
      } else {
        staffName = `P Number: ${validatedData.pNumber}`; // Fallback
      }
    }

    const detentionId = generateDetentionId();

    // Combine date and time for timestamp
    const detentionDateTime = new Date(`${validatedData.detentionDate}T${validatedData.detentionTime}`);

    const [newDetention] = await db
      .insert(detentions)
      .values({
        detentionId,
        studentName: validatedData.studentName,
        studentId: validatedData.studentId,
        reason: validatedData.reason,
        detentionDate: detentionDateTime,
        detentionTime: validatedData.detentionTime,
        pNumber: validatedData.pNumber?.toUpperCase() || null,
        reportingStaff: staffName || 'Unknown Staff',
        status: 'pending',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        detentionId: newDetention.detentionId,
        id: newDetention.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating detention:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create detention' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detentionId = searchParams.get('detentionId');

    if (detentionId) {
      // Get single detention by detentionId (public lookup)
      const detention = await db.query.detentions.findFirst({
        where: (detentions, { eq }) => eq(detentions.detentionId, detentionId),
        with: {
          updates: {
            orderBy: (updates, { asc }) => [asc(updates.createdAt)],
            where: (updates, { eq }) => eq(updates.isInternal, false), // Only show public updates
          },
        },
      });

      if (!detention) {
        return NextResponse.json(
          { success: false, error: 'Detention not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, detention });
    }

    // Get all detentions (staff only - should check auth)
    const allDetentions = await db.query.detentions.findMany({
      orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
      limit: 100,
    });

    return NextResponse.json({ success: true, detentions: allDetentions });
  } catch (error) {
    console.error('Error fetching detentions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detentions' },
      { status: 500 }
    );
  }
}

