import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { generateTicketId } from '@/lib/utils/ids';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const createTicketSchema = z.object({
  pNumber: z.string().min(1),
  roomNumber: z.string().min(1),
  description: z.string().min(10),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  requesterName: z.string().optional(),
  requesterEmail: z.string().email().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
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
        pNumber: validatedData.pNumber,
        roomNumber: validatedData.roomNumber,
        description: validatedData.description,
        urgency: validatedData.urgency,
        requesterName: validatedData.requesterName || null,
        requesterEmail: validatedData.requesterEmail || null,
        category: validatedData.category || null,
        subject: validatedData.subject || null,
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

    // Get all tickets (requires authentication)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userPNumber = (session.user as any)?.pNumber;
    const isAdmin = session.user?.role === 'admin';

    // Filter by user P number if not admin (staff see only their tickets)
    const allTickets = await db.query.tickets.findMany({
      where: isAdmin ? undefined : eq(tickets.pNumber, userPNumber || ''),
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

