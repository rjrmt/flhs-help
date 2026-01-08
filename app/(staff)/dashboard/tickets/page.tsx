import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { Ticket, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';

export default async function TicketsPage() {
  const allTickets = await db.query.tickets.findMany({
    orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    limit: 100,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500/20 text-green-500';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500/20 text-red-500';
      case 'high':
        return 'bg-orange-500/20 text-orange-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-500';
      default:
        return 'bg-blue-500/20 text-blue-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">IT Tickets</h1>
          <p className="text-text-secondary">
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
            <Ticket className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-50" />
            <p className="text-text-secondary">No tickets found</p>
          </Card>
        ) : (
          allTickets.map((ticket) => (
            <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{ticket.subject}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(ticket.urgency)}`}>
                        {ticket.urgency.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-text-secondary mb-2">{ticket.description.substring(0, 150)}...</p>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="font-mono">{ticket.ticketId}</span>
                      <span>•</span>
                      <span>{ticket.requesterName} ({ticket.requesterEmail})</span>
                      <span>•</span>
                      <span>{ticket.category}</span>
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
  );
}

