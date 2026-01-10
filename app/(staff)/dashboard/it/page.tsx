import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatRelativeTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';
import { ITDashboardTabs } from '@/components/ITDashboardTabs';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ITTechnicianDashboardPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    const userRole = session.user?.role || 'staff';

    // Only IT technicians and admins can access this
    if (userRole !== 'it_technician' && userRole !== 'admin') {
      redirect('/dashboard');
    }

    // Initialize stats with defaults
    let ticketStats = { total: 0, submitted: 0, inProgress: 0, resolved: 0, closed: 0 };
    let recentTickets: any[] = [];

    try {
      // Get ticket stats - IT technician sees all tickets
      const ticketStatsQuery = db.select({
        total: sql<number>`count(*)`,
        submitted: sql<number>`count(*) filter (where ${tickets.status} = 'submitted')`,
        inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`,
        resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
        closed: sql<number>`count(*) filter (where ${tickets.status} = 'closed')`,
      }).from(tickets);

      const ticketStatsResult = await ticketStatsQuery;
      ticketStats = ticketStatsResult[0] || ticketStats;

      // Get recent tickets
      recentTickets = await db.query.tickets.findMany({
        orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
        limit: 5,
      });
    } catch (dbError: any) {
      console.error('Dashboard database error:', dbError);
      // Continue with empty data instead of crashing
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="container mx-auto px-4 py-4 sm:py-6 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header - More Compact */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
            <div>
              <h1 className="text-2xl font-bold mb-1 text-gray-900">IT Technician Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome back, {session.user?.name || 'IT Technician'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Tabbed Content */}
          <ITDashboardTabs 
            userRole={userRole}
            ticketStats={ticketStats}
            recentTickets={recentTickets}
          />
          
          {/* Home Button at bottom of content */}
          <div className="mt-8 mb-6 flex justify-center">
            <HomeButton variant="relative" />
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the dashboard. Please try refreshing the page.
          </p>
          <div className="space-y-2">
            <a
              href="/login"
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }
}
