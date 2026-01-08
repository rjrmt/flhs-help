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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard/detentions" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
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
                <h1 className="text-2xl font-bold mb-2 text-gray-900">{detention.studentName}</h1>
                <p className="text-gray-500 font-mono text-sm">{detention.detentionId}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${
                detention.status === 'attended' ? 'bg-green-100 text-green-700 border-green-300' :
                detention.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                detention.status === 'missed' ? 'bg-red-100 text-red-700 border-red-300' :
                'bg-yellow-100 text-yellow-700 border-yellow-300'
              }`}>
                {detention.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-gray-600">Reason</p>
                <p className="text-gray-700 whitespace-pre-wrap">{detention.reason}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Student ID</p>
                  <p className="font-medium text-gray-900">{detention.studentId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Detention Date & Time</p>
                  <p className="font-medium text-gray-900">{formatDateTime(detention.detentionDate)} at {detention.detentionTime}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Reported By</p>
                  <p className="font-medium text-gray-900">{detention.reportingStaff}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Created</p>
                  <p className="font-medium text-gray-900">{formatDateTime(detention.createdAt)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
              <MessageSquare className="w-5 h-5" style={{ color: '#2E75B6' }} />
              Updates
            </h2>
            <div className="space-y-4">
              {detention.updates.length === 0 ? (
                <p className="text-gray-600 text-sm">No updates yet</p>
              ) : (
                detention.updates.map((update) => (
                  <div key={update.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      {update.user && (
                        <>
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{update.user.name}</span>
                        </>
                      )}
                      <span className="text-gray-500 text-sm">
                        • {formatDateTime(update.createdAt)}
                      </span>
                      {update.isInternal && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-semibold">
                          Internal
                        </span>
                      )}
                    </div>
                    {update.statusChange && (
                      <p className="text-sm mb-2 font-semibold" style={{ color: '#2E75B6' }}>
                        Status changed to: {update.statusChange}
                      </p>
                    )}
                    <p className="text-gray-700">{update.note}</p>
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
    </div>
  );
}

