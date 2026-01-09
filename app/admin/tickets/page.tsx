import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import TicketConsole from '@/components/TicketConsole';

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

    // Get stats with error handling
    let stats = {
      total: 0,
      open: 0,
      resolved: 0,
      closed: 0,
    };

    try {
      const statsResult = await db
        .select({
          total: sql<number>`count(*)`,
          open: sql<number>`count(*) filter (where ${tickets.status} = 'submitted' or ${tickets.status} = 'in_progress')`,
          resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
          closed: sql<number>`count(*) filter (where ${tickets.status} = 'closed')`,
        })
        .from(tickets);
      
      stats = statsResult[0] || stats;
    } catch (statsError) {
      console.error('Error fetching stats:', statsError);
      // Continue with default stats if query fails
    }

    return <TicketConsole tickets={allTickets} stats={stats} />;
  } catch (error) {
    console.error('Admin tickets page error:', error);
    // Return error state instead of crashing
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Admin Console</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the admin console. Please check:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set in Vercel</li>
            <li>You are logged in as an admin user</li>
          </ul>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
}

