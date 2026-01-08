import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { Ticket, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userPNumber = (session.user as any)?.pNumber;
  const isAdmin = session.user?.role === 'admin';

  // Filter tickets by user P number if not admin
  const allTickets = await db.query.tickets.findMany({
    where: isAdmin ? undefined : eq(tickets.pNumber, userPNumber || ''),
    orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    limit: 100,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'closed':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">IT Tickets</h1>
            <p className="text-gray-600">
              Manage and track all IT support tickets
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <SignOutButton />
          </div>
        </div>

      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search tickets by ID, subject, or requester..."
              className="w-full"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {allTickets.length === 0 ? (
          <Card className="text-center py-12">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No tickets found</p>
          </Card>
        ) : (
          allTickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{ticket.description?.substring(0, 60) || ticket.ticketId}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getUrgencyColor(ticket.urgency)}`}>
                        {ticket.urgency.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2 text-sm">{ticket.description.substring(0, 150)}...</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-mono">{ticket.ticketId}</span>
                      <span>•</span>
                      <span>{ticket.requesterName || ticket.pNumber || 'N/A'}</span>
                      {ticket.roomNumber && (
                        <>
                          <span>•</span>
                          <span>Room {ticket.roomNumber}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDateTime(ticket.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

