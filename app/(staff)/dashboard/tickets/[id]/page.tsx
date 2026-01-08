import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/forms/Textarea';
import { Select } from '@/components/forms/Select';
import { Ticket, ArrowLeft, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { tickets, ticketUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { UpdateTicketForm } from '@/components/UpdateTicketForm';

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const ticket = await db.query.tickets.findFirst({
    where: (tickets, { eq }) => eq(tickets.id, params.id),
    with: {
      updates: {
        orderBy: (updates, { desc }) => [desc(updates.createdAt)],
        with: {
          user: true,
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/tickets" className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>
        <SignOutButton />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{ticket.subject}</h1>
                <p className="text-text-secondary font-mono">{ticket.ticketId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                ticket.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                ticket.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                'bg-yellow-500/20 text-yellow-500'
              }`}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">Description</p>
                <p className="text-text-primary whitespace-pre-wrap">{ticket.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-surface-light">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Requester</p>
                  <p className="font-medium">{ticket.requesterName}</p>
                  <p className="text-sm text-text-secondary">{ticket.requesterEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Category</p>
                  <p className="font-medium capitalize">{ticket.category}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Urgency</p>
                  <p className="font-medium capitalize">{ticket.urgency}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Created</p>
                  <p className="font-medium">{formatDateTime(ticket.createdAt)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Updates
            </h2>
            <div className="space-y-4">
              {ticket.updates.length === 0 ? (
                <p className="text-text-secondary text-sm">No updates yet</p>
              ) : (
                ticket.updates.map((update) => (
                  <div key={update.id} className="p-4 bg-surface rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {update.user && (
                        <>
                          <User className="w-4 h-4 text-text-secondary" />
                          <span className="font-medium">{update.user.name}</span>
                        </>
                      )}
                      <span className="text-text-secondary text-sm">
                        • {formatDateTime(update.createdAt)}
                      </span>
                    </div>
                    {update.statusChange && (
                      <p className="text-sm text-primary mb-2">
                        Status changed to: {update.statusChange}
                      </p>
                    )}
                    <p className="text-text-primary">{update.note}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <UpdateTicketForm ticketId={ticket.id} currentStatus={ticket.status} />
        </div>
      </div>
    </div>
  );
}

