import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { generateTicketId } from '@/lib/utils/ids';
import { z } from 'zod';

const createTicketSchema = z.object({
  requesterName: z.string().min(2),
  requesterEmail: z.string().email(),
  category: z.string().min(1),
  subject: z.string().min(5),
  description: z.string().min(10),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    const ticketId = generateTicketId();

    const [newTicket] = await db
      .insert(tickets)
      .values({
        ticketId,
        requesterName: validatedData.requesterName,
        requesterEmail: validatedData.requesterEmail,
        category: validatedData.category,
        subject: validatedData.subject,
        description: validatedData.description,
        urgency: validatedData.urgency,
        status: 'submitted',
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        ticketId: newTicket.ticketId,
        id: newTicket.id,
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

    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (ticketId) {
      // Get single ticket by ticketId (public lookup)
      const ticket = await db.query.tickets.findFirst({
        where: (tickets, { eq }) => eq(tickets.ticketId, ticketId),
        with: {
          updates: {
            orderBy: (updates, { asc }) => [asc(updates.createdAt)],
            where: (updates, { eq }) => eq(updates.isInternal, false), // Only show public updates
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Ticket not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, ticket });
    }

    // Get all tickets (staff only - should check auth)
    const allTickets = await db.query.tickets.findMany({
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
      limit: 100,
    });

    return NextResponse.json({ success: true, tickets: allTickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

