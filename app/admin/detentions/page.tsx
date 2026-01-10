import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { detentions } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { formatDateTime } from '@/lib/utils/format';
import DetentionConsole from '@/components/DetentionConsole';

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

    return <DetentionConsole detentions={allDetentions} stats={stats} />;
  } catch (error) {
    console.error('Admin detentions page error:', error);
    // Return error state instead of crashing
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Admin Console</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the detentions console. Please check:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set</li>
            <li>You are logged in as an admin user</li>
          </ul>
          <a
            href="/admin"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Admin
          </a>
        </div>
      </div>
    );
  }
}
