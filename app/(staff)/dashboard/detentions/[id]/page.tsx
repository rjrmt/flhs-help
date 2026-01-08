import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AlertCircle, ArrowLeft, MessageSquare, User } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { detentions, detentionUpdates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { UpdateDetentionForm } from '@/components/UpdateDetentionForm';

export default async function DetentionDetailPage({ params }: { params: { id: string } }) {
  const detention = await db.query.detentions.findFirst({
    where: (detentions, { eq }) => eq(detentions.id, params.id),
    with: {
      updates: {
        orderBy: (updates, { desc }) => [desc(updates.createdAt)],
        with: {
          user: true,
        },
      },
    },
  });

  if (!detention) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard/detentions" className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Detentions
        </Link>
        <SignOutButton />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{detention.studentName}</h1>
                <p className="text-text-secondary font-mono">{detention.detentionId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                detention.status === 'attended' ? 'bg-green-500/20 text-green-500' :
                detention.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                detention.status === 'missed' ? 'bg-red-500/20 text-red-500' :
                'bg-yellow-500/20 text-yellow-500'
              }`}>
                {detention.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-1">Reason</p>
                <p className="text-text-primary whitespace-pre-wrap">{detention.reason}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-surface-light">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Student ID</p>
                  <p className="font-medium">{detention.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Detention Date & Time</p>
                  <p className="font-medium">{formatDateTime(detention.detentionDate)} at {detention.detentionTime}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Reported By</p>
                  <p className="font-medium">{detention.reportingStaff}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Created</p>
                  <p className="font-medium">{formatDateTime(detention.createdAt)}</p>
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
              {detention.updates.length === 0 ? (
                <p className="text-text-secondary text-sm">No updates yet</p>
              ) : (
                detention.updates.map((update) => (
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
          <UpdateDetentionForm detentionId={detention.id} currentStatus={detention.status} />
        </div>
      </div>
    </div>
  );
}

