import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, Clock, CheckCircle, TrendingUp, Users, Building2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatRelativeTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';
import { DashboardAnalytics } from '@/components/analytics/DashboardAnalytics';

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
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">IT Technician Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, {session.user?.name || 'IT Technician'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Tickets</p>
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
                  <p className="text-gray-600 text-sm mb-1">Resolved</p>
                  <p className="text-3xl font-bold text-green-600">{Number(ticketStats.resolved)}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{Number(ticketStats.submitted)}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
            </Card>
          </div>

          {/* Analytics Section */}
          <DashboardAnalytics />

          {/* Quick Actions & Recent Tickets */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                <Ticket className="w-5 h-5" style={{ color: '#2E75B6' }} />
                Quick Actions
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
                    View All Tickets
                  </Button>
                </Link>
                {userRole === 'admin' && (
                  <Link href="/admin/tickets">
                    <Button variant="secondary" className="w-full justify-start">
                      Admin Console
                    </Button>
                  </Link>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                <TrendingUp className="w-5 h-5" style={{ color: '#2E75B6' }} />
                Overview
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Resolved Tickets</span>
                  <span className="font-medium text-gray-900">{Number(ticketStats.resolved)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closed Tickets</span>
                  <span className="font-medium text-gray-900">{Number(ticketStats.closed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Tickets</span>
                  <span className="font-medium text-gray-900">{Number(ticketStats.inProgress) + Number(ticketStats.submitted)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Tickets */}
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
                          {ticket.subject || ticket.description?.substring(0, 60) || ticket.ticketId}
                        </p>
                        <p className="text-sm text-gray-600">
                          {ticket.ticketId} • {ticket.roomNumber && `Room ${ticket.roomNumber} • `}
                          {formatRelativeTime(ticket.createdAt)}
                        </p>
                        {ticket.requesterName && (
                          <p className="text-xs text-gray-500 mt-1">By {ticket.requesterName}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-300' :
                          ticket.status === 'closed' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {ticket.status}
                        </span>
                        {ticket.urgency && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                            ticket.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                            ticket.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {ticket.urgency}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
        <HomeButton />
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
