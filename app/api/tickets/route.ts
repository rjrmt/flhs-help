import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
import { db } from '@/lib/db';
import { tickets, users, staffRoster, studentRoster } from '@/lib/db/schema';
import { generateTicketId } from '@/lib/utils/ids';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

/** Normalize ID for lookup: trim, remove spaces. P# stays uppercase, 06# stays as-is. */
function normalizeId(id: string): { normalized: string; isStaff: boolean } {
  const trimmed = id.trim().replace(/\s/g, '');
  const isStaff = /^p\d+/i.test(trimmed);
  return {
    normalized: isStaff ? trimmed.toUpperCase() : trimmed,
    isStaff,
  };
}

const createTicketSchema = z.object({
  pNumber: z.string().min(1, 'Staff or Student ID is required').transform((v) => v.trim()),
  roomNumber: z.string().min(1, 'Room number is required').transform((v) => v.trim()),
  description: z.string().min(10, 'Description must be at least 10 characters').transform((v) => v.trim()),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  requesterName: z.string().optional(),
  requesterEmail: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  category: z.string().optional(),
  subject: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    const { normalized: idNormalized, isStaff } = normalizeId(validatedData.pNumber);

    // Look up in database: staff (P#) in users table, students (06#) in students table
    // Pull first name, last name, and email when found.
    let requesterName = validatedData.requesterName?.trim() || null;
    let requesterEmail = validatedData.requesterEmail?.trim() || null;
    if (validatedData.requesterEmail === '') requesterEmail = null;

    if (isStaff) {
      const [staff] = await db
        .select({ fullName: staffRoster.fullName, email: staffRoster.email })
        .from(staffRoster)
        .where(eq(staffRoster.pNumber, idNormalized))
        .limit(1);
      if (staff) {
        requesterName = staff.fullName || requesterName;
        requesterEmail = staff.email || requesterEmail;
      }
    } else {
      const [student] = await db
        .select({ fullName: studentRoster.fullName, email: studentRoster.email })
        .from(studentRoster)
        .where(eq(studentRoster.studentId, idNormalized))
        .limit(1);
      if (student) {
        requesterName = student.fullName || requesterName;
        requesterEmail = student.email || requesterEmail;
      }
    }

    const ticketId = generateTicketId();

    const [newTicket] = await db
      .insert(tickets)
      .values({
        ticketId,
        pNumber: idNormalized,
        roomNumber: validatedData.roomNumber,
        description: validatedData.description,
        urgency: validatedData.urgency,
        requesterName,
        requesterEmail,
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
      const firstError = error.errors[0];
      const message = firstError?.message || 'Please check your form and try again.';
      return NextResponse.json(
        { success: false, error: message, details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to submit ticket. Please try again or contact support.' },
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

