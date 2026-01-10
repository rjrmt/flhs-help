import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, Clock, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets, detentions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatRelativeTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    const userPNumber = (session.user as any)?.pNumber || '';
    const userRole = session.user?.role || 'staff';

    // If no P Number in session, redirect to login
    if (!userPNumber) {
      console.error('No P Number in session for user:', session.user);
      redirect('/login');
    }

    // Route based on role
    if (userRole === 'it_technician' || userRole === 'admin') {
      redirect('/dashboard/it');
    }
    if (userRole === 'behavioral_specialist') {
      redirect('/dashboard/behavioral');
    }

    // Staff dashboard - show their own tickets and detentions
    let ticketStats = { total: 0, submitted: 0, inProgress: 0, resolved: 0 };
    let detentionStats = { total: 0, pending: 0, confirmed: 0, attended: 0 };
    let recentTickets: any[] = [];
    let recentDetentions: any[] = [];

    try {
      if (!userPNumber) {
        console.error('No P Number available for dashboard queries');
        // Continue with empty stats
      } else {
        // Get ticket stats - filtered by user P number
        const ticketStatsQuery = db.select({
          total: sql<number>`count(*)`,
          submitted: sql<number>`count(*) filter (where ${tickets.status} = 'submitted')`,
          inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`,
          resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
        }).from(tickets).where(eq(tickets.pNumber, userPNumber));

        const ticketStatsResult = await ticketStatsQuery;
        ticketStats = ticketStatsResult[0] || ticketStats;

        // Get detention stats - filtered by user P number
        const detentionStatsQuery = db.select({
          total: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${detentions.status} = 'pending')`,
          confirmed: sql<number>`count(*) filter (where ${detentions.status} = 'confirmed')`,
          attended: sql<number>`count(*) filter (where ${detentions.status} = 'attended')`,
        }).from(detentions).where(eq(detentions.pNumber, userPNumber));

        const detentionStatsResult = await detentionStatsQuery;
        detentionStats = detentionStatsResult[0] || detentionStats;

        // Get recent tickets - filtered by user P number
        recentTickets = await db.query.tickets.findMany({
          where: eq(tickets.pNumber, userPNumber),
          orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
          limit: 5,
        });

        // Get recent detentions - filtered by user P number
        recentDetentions = await db.query.detentions.findMany({
          where: eq(detentions.pNumber, userPNumber),
          orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
          limit: 5,
        });
      }
    } catch (dbError: any) {
      console.error('Dashboard database error:', dbError);
      console.error('Database error details:', {
        message: dbError?.message,
        code: dbError?.code,
        stack: dbError?.stack,
      });
      // Continue with empty data instead of crashing
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">My Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, {session.user?.name || 'Staff Member'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">My Tickets</p>
                  <p className="text-3xl font-bold text-gray-900">{Number(ticketStats.total)}</p>
                </div>
                <Ticket className="w-10 h-10 text-gray-400" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">In Progress</p>
                  <p className="text-3xl font-bold" style={{ color: '#2E75B6' }}>{Number(ticketStats.inProgress)}</p>
                </div>
                <Clock className="w-10 h-10" style={{ color: '#2E75B6' }} />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">My Detentions</p>
                  <p className="text-3xl font-bold text-gray-900">{Number(detentionStats.total)}</p>
                </div>
                <ClipboardList className="w-10 h-10 text-gray-400" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{Number(detentionStats.pending)}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-yellow-600" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                <Ticket className="w-5 h-5" style={{ color: '#2E75B6' }} />
                My Tickets
              </h2>
              <div className="space-y-3">
                <Link href="/dashboard/tickets">
                  <Button 
                    variant="primary" 
                    className="w-full justify-start"
                    style={{
                      background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                      boxShadow: '0 2px 8px rgba(46, 117, 182, 0.3)',
                    }}
                  >
                    View All My Tickets
                  </Button>
                </Link>
                <Link href="/submit-ticket">
                  <Button variant="secondary" className="w-full justify-start">
                    Submit New Ticket
                  </Button>
                </Link>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                <ClipboardList className="w-5 h-5" style={{ color: '#2E75B6' }} />
                My Detentions
              </h2>
              <div className="space-y-3">
                <Link href="/dashboard/detentions">
                  <Button 
                    variant="primary" 
                    className="w-full justify-start"
                    style={{
                      background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                      boxShadow: '0 2px 8px rgba(46, 117, 182, 0.3)',
                    }}
                  >
                    View All My Detentions
                  </Button>
                </Link>
                <Link href="/report-detention">
                  <Button variant="secondary" className="w-full justify-start">
                    Report New Detention
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Recent Items */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Tickets</h2>
                <Link href="/dashboard/tickets">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {recentTickets.length === 0 ? (
                  <p className="text-gray-600 text-sm">No tickets yet</p>
                ) : (
                  recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/dashboard/tickets/${ticket.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1 text-gray-900">
                            {ticket.subject || ticket.description?.substring(0, 50) || ticket.ticketId}
                          </p>
                          <p className="text-sm text-gray-600">
                            {ticket.ticketId} • {formatRelativeTime(ticket.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-300' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Detentions</h2>
                <Link href="/dashboard/detentions">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-3">
                {recentDetentions.length === 0 ? (
                  <p className="text-gray-600 text-sm">No detentions yet</p>
                ) : (
                  recentDetentions.map((detention) => (
                    <Link
                      key={detention.id}
                      href={`/dashboard/detentions/${detention.id}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1 text-gray-900">{detention.studentName}</p>
                          <p className="text-sm text-gray-600">
                            {detention.detentionId} • {formatRelativeTime(detention.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${
                          detention.status === 'attended' ? 'bg-green-100 text-green-700 border-green-300' :
                          detention.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {detention.status}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
        <HomeButton />
      </div>
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the dashboard. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && error?.message && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-mono text-red-700">{error.message}</p>
            </div>
          )}
          <div className="space-y-2">
            <a
              href="/login"
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
            >
              Go to Login
            </a>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
