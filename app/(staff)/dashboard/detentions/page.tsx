import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { AlertCircle, Filter } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { detentions } from '@/lib/db/schema';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';

export default async function DetentionsPage() {
  const allDetentions = await db.query.detentions.findMany({
    orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
    limit: 100,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-green-500/20 text-green-500';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-400';
      case 'missed':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Detentions</h1>
          <p className="text-text-secondary">
            Manage and track all student detentions
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
              placeholder="Search detentions by ID, student name, or student ID..."
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
        {allDetentions.length === 0 ? (
          <Card className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-50" />
            <p className="text-text-secondary">No detentions found</p>
          </Card>
        ) : (
          allDetentions.map((detention) => (
            <Link key={detention.id} href={`/dashboard/detentions/${detention.id}`}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{detention.studentName}</h3>
                      <span className="text-text-secondary text-sm">ID: {detention.studentId}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(detention.status)}`}>
                        {detention.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-text-secondary mb-2">{detention.reason.substring(0, 150)}...</p>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <span className="font-mono">{detention.detentionId}</span>
                      <span>•</span>
                      <span>{formatDateTime(detention.detentionDate)} at {detention.detentionTime}</span>
                      <span>•</span>
                      <span>Reported by: {detention.reportingStaff}</span>
                      <span>•</span>
                      <span>Created: {formatDateTime(detention.createdAt)}</span>
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

