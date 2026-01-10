import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { AlertCircle, Filter } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { detentions } from '@/lib/db/schema';
import { formatDateTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

export default async function DetentionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userPNumber = (session.user as any)?.pNumber;
  const isAdmin = session.user?.role === 'admin';

  // Filter detentions by user P number if not admin
  const allDetentions = await db.query.detentions.findMany({
    where: isAdmin ? undefined : eq(detentions.pNumber, userPNumber || ''),
    orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
    limit: 100,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'missed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Detentions</h1>
            <p className="text-gray-600">
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
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No detentions found</p>
          </Card>
        ) : (
          allDetentions.map((detention) => (
            <Link key={detention.id} href={`/dashboard/detentions/${detention.id}`}>
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{detention.studentName}</h3>
                      <span className="text-gray-600 text-sm">ID: {detention.studentId}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${getStatusColor(detention.status)}`}>
                        {detention.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2 text-sm">{detention.reason.substring(0, 150)}...</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
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
      <HomeButton />
    </div>
  );
}

