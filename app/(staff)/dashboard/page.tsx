import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, AlertCircle, LogOut, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets, detentions } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { formatRelativeTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userPNumber = (session.user as any)?.pNumber;
  const isAdmin = session.user?.role === 'admin';

  // Get ticket stats - filter by user P number if not admin
  const ticketStatsQuery = isAdmin 
    ? db.select({
        total: sql<number>`count(*)`,
        submitted: sql<number>`count(*) filter (where ${tickets.status} = 'submitted')`,
        inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`,
        resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
      }).from(tickets)
    : db.select({
        total: sql<number>`count(*)`,
        submitted: sql<number>`count(*) filter (where ${tickets.status} = 'submitted')`,
        inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`,
        resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
      }).from(tickets).where(eq(tickets.pNumber, userPNumber || ''));

  const ticketStats = await ticketStatsQuery;

  // Get detention stats - filter by user P number if not admin
  const detentionStatsQuery = isAdmin
    ? db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${detentions.status} = 'pending')`,
        confirmed: sql<number>`count(*) filter (where ${detentions.status} = 'confirmed')`,
        attended: sql<number>`count(*) filter (where ${detentions.status} = 'attended')`,
      }).from(detentions)
    : db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${detentions.status} = 'pending')`,
        confirmed: sql<number>`count(*) filter (where ${detentions.status} = 'confirmed')`,
        attended: sql<number>`count(*) filter (where ${detentions.status} = 'attended')`,
      }).from(detentions).where(eq(detentions.pNumber, userPNumber || ''));

  const detentionStats = await detentionStatsQuery;

  // Get recent tickets - filter by user P number if not admin
  const recentTickets = await db.query.tickets.findMany({
    where: isAdmin ? undefined : eq(tickets.pNumber, userPNumber || ''),
    orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    limit: 5,
  });

  // Get recent detentions - filter by user P number if not admin
  const recentDetentions = await db.query.detentions.findMany({
    where: isAdmin ? undefined : eq(detentions.pNumber, userPNumber || ''),
    orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
    limit: 5,
  });

  const stats = {
    tickets: ticketStats[0] || { total: 0, submitted: 0, inProgress: 0, resolved: 0 },
    detentions: detentionStats[0] || { total: 0, pending: 0, confirmed: 0, attended: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {session.user?.name || 'Staff Member'}
            </p>
          </div>
          <SignOutButton />
        </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900">{Number(stats.tickets.total)}</p>
            </div>
            <Ticket className="w-10 h-10 text-gray-400" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">In Progress</p>
              <p className="text-3xl font-bold" style={{ color: '#2E75B6' }}>{Number(stats.tickets.inProgress)}</p>
            </div>
            <Clock className="w-10 h-10" style={{ color: '#2E75B6' }} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Detentions</p>
              <p className="text-3xl font-bold text-gray-900">{Number(stats.detentions.total)}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-gray-400" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{Number(stats.detentions.pending)}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
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
            <Link href="/dashboard/detentions">
              <Button variant="secondary" className="w-full justify-start">
                View All Detentions
              </Button>
            </Link>
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
              <span className="font-medium text-gray-900">{Number(stats.tickets.resolved)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Confirmed Detentions</span>
              <span className="font-medium text-gray-900">{Number(stats.detentions.confirmed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Attended Detentions</span>
              <span className="font-medium text-gray-900">{Number(stats.detentions.attended)}</span>
            </div>
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
                        <p className="font-medium mb-1 text-gray-900">{ticket.description?.substring(0, 50) || ticket.ticketId}</p>
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
    </div>
  );
}

