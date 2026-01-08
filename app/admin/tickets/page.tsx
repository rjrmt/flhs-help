import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import TicketConsole from '@/components/TicketConsole';

export default async function AdminTicketsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Get all tickets
  const allTickets = await db.query.tickets.findMany({
    orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
  });

  // Get stats
  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      open: sql<number>`count(*) filter (where ${tickets.status} = 'submitted' or ${tickets.status} = 'in_progress')`,
      resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
      closed: sql<number>`count(*) filter (where ${tickets.status} = 'closed')`,
    })
    .from(tickets);

  return <TicketConsole tickets={allTickets} stats={stats[0]} />;
}

