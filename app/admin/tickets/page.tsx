import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import TicketConsole from '@/components/TicketConsole';
import { PageError } from '@/components/PageError';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminTicketsPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    // Ensure user is admin (layout should catch this, but double-check)
    if (session.user.role !== 'admin') {
      redirect('/dashboard');
    }

    // Get tickets - all for admin
    const allTickets = await db.query.tickets.findMany({
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    });

    // Get stats with error handling (triage metrics + legacy)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let stats = {
      total: 0,
      open: 0,
      resolved: 0,
      closed: 0,
      critical: 0,
      aging: 0,
      resolvedToday: 0,
    };

    try {
      const statsResult = await db
        .select({
          total: sql<number>`count(*)`,
          open: sql<number>`count(*) filter (where ${tickets.status} in ('submitted', 'in_progress'))`,
          resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
          closed: sql<number>`count(*) filter (where ${tickets.status} = 'closed')`,
          critical: sql<number>`count(*) filter (where ${tickets.urgency} = 'critical' and ${tickets.status} in ('submitted', 'in_progress'))`,
          aging: sql<number>`count(*) filter (where ${tickets.status} in ('submitted', 'in_progress') and ${tickets.createdAt} < ${fortyEightHoursAgo})`,
          resolvedToday: sql<number>`count(*) filter (where ${tickets.status} = 'resolved' and ${tickets.updatedAt} >= ${startOfToday})`,
        })
        .from(tickets);

      stats = statsResult[0] || stats;
    } catch (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    const serializedStats = {
      total: Number(stats.total) || 0,
      open: Number(stats.open) || 0,
      resolved: Number(stats.resolved) || 0,
      closed: Number(stats.closed) || 0,
      critical: Number(stats.critical) || 0,
      aging: Number(stats.aging) || 0,
      resolvedToday: Number(stats.resolvedToday) || 0,
    };
    return <TicketConsole tickets={allTickets} stats={serializedStats} />;
  } catch (error) {
    console.error('Admin tickets page error:', error);
    return (
      <PageError
        title="Error Loading Admin Console"
        message="There was an error loading the admin console. Please check:"
        details={
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set in Vercel</li>
            <li>You are logged in as an admin user</li>
          </ul>
        }
        errorMessage={error instanceof Error ? error.message : undefined}
        links={[{ href: '/login', label: 'Go to Login' }]}
      />
    );
  }
}

