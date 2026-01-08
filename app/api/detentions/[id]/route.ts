import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detentions, detentionUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const updateDetentionSchema = z.object({
  status: z.string().optional(),
  note: z.string().min(5),
  isInternal: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateDetentionSchema.parse(body);

    // Check if detention exists
    const detention = await db.query.detentions.findFirst({
      where: eq(detentions.id, params.id),
    });

    if (!detention) {
      return NextResponse.json(
        { success: false, error: 'Detention not found' },
        { status: 404 }
      );
    }

    // Update detention status if provided
    if (validatedData.status) {
      await db
        .update(detentions)
        .set({
          status: validatedData.status,
          updatedAt: new Date(),
        })
        .where(eq(detentions.id, params.id));
    }

    // Create update record
    await db.insert(detentionUpdates).values({
      detentionId: params.id,
      userId: session.user.id,
      note: validatedData.note,
      statusChange: validatedData.status || null,
      isInternal: validatedData.isInternal || false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating detention:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update detention' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const detention = await db.query.detentions.findFirst({
      where: eq(detentions.id, params.id),
      with: {
        updates: {
          orderBy: (updates, { desc }) => [desc(updates.createdAt)],
          with: {
            user: true,
          },
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
  } catch (error) {
    console.error('Error fetching detention:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detention' },
      { status: 500 }
    );
  }
}

