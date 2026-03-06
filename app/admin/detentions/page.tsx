import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { detentions } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import DetentionConsole from '@/components/DetentionConsole';
import { PageError } from '@/components/PageError';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDetentionsPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    // Ensure user is admin (layout should catch this, but double-check)
    if (session.user.role !== 'admin') {
      redirect('/dashboard');
    }

    // Get detentions - all for admin
    const allDetentions = await db.query.detentions.findMany({
      orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
    });

    // Get stats with error handling
    let stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      attended: 0,
      missed: 0,
    };

    try {
      const statsResult = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`count(*) filter (where ${detentions.status} = 'pending')`,
          confirmed: sql<number>`count(*) filter (where ${detentions.status} = 'confirmed')`,
          attended: sql<number>`count(*) filter (where ${detentions.status} = 'attended')`,
          missed: sql<number>`count(*) filter (where ${detentions.status} = 'missed')`,
        })
        .from(detentions);
      
      stats = statsResult[0] || stats;
    } catch (statsError) {
      console.error('Error fetching stats:', statsError);
      // Continue with default stats if query fails
    }

    const serializedStats = {
      total: Number(stats.total) || 0,
      pending: Number(stats.pending) || 0,
      confirmed: Number(stats.confirmed) || 0,
      attended: Number(stats.attended) || 0,
      missed: Number(stats.missed) || 0,
    };
    return <DetentionConsole detentions={allDetentions} stats={serializedStats} />;
  } catch (error) {
    console.error('Admin detentions page error:', error);
    return (
      <PageError
        title="Error Loading Admin Console"
        message="There was an error loading the detentions console. Please check:"
        details={
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set</li>
            <li>You are logged in as an admin user</li>
          </ul>
        }
        errorMessage={error instanceof Error ? error.message : undefined}
        links={[{ href: '/admin', label: 'Back to Admin' }]}
      />
    );
  }
}
