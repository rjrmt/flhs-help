import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, ticketUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const updateTicketSchema = z.object({
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
    const validatedData = updateTicketSchema.parse(body);

    // Check if ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, params.id),
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Update ticket status if provided
    if (validatedData.status) {
      await db
        .update(tickets)
        .set({
          status: validatedData.status,
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, params.id));
    }

    // Create update record
    await db.insert(ticketUpdates).values({
      ticketId: params.id,
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

    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
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

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, params.id),
      with: {
        updates: {
          orderBy: (updates, { desc }) => [desc(updates.createdAt)],
          with: {
            user: true,
          },
        },
        assignedUser: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

