import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { detentions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { formatRelativeTime } from '@/lib/utils/format';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BehavioralSpecialistDashboardPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    const userRole = session.user?.role || 'staff';

    // Only behavioral specialists can access this
    if (userRole !== 'behavioral_specialist') {
      redirect('/dashboard');
    }

    // Initialize stats with defaults
    let detentionStats = { total: 0, pending: 0, confirmed: 0, attended: 0, missed: 0 };
    let recentDetentions: any[] = [];

    try {
      // Get detention stats - behavioral specialist sees all detentions
      const detentionStatsQuery = db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where ${detentions.status} = 'pending')`,
        confirmed: sql<number>`count(*) filter (where ${detentions.status} = 'confirmed')`,
        attended: sql<number>`count(*) filter (where ${detentions.status} = 'attended')`,
        missed: sql<number>`count(*) filter (where ${detentions.status} = 'missed')`,
      }).from(detentions);

      const detentionStatsResult = await detentionStatsQuery;
      detentionStats = detentionStatsResult[0] || detentionStats;

      // Get recent detentions
      recentDetentions = await db.query.detentions.findMany({
        orderBy: (detentions, { desc }) => [desc(detentions.createdAt)],
        limit: 10,
      });
    } catch (dbError: any) {
      console.error('Dashboard database error:', dbError);
      // Continue with empty data instead of crashing
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">Behavioral Specialist Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, {session.user?.name || 'Behavioral Specialist'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Detentions</p>
                  <p className="text-3xl font-bold text-gray-900">{Number(detentionStats.total)}</p>
                </div>
                <ClipboardList className="w-10 h-10 text-gray-400" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{Number(detentionStats.pending)}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Confirmed</p>
                  <p className="text-3xl font-bold" style={{ color: '#2E75B6' }}>{Number(detentionStats.confirmed)}</p>
                </div>
                <Clock className="w-10 h-10" style={{ color: '#2E75B6' }} />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Attended</p>
                  <p className="text-3xl font-bold text-green-600">{Number(detentionStats.attended)}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Missed</p>
                  <p className="text-3xl font-bold text-red-600">{Number(detentionStats.missed)}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                <ClipboardList className="w-5 h-5" style={{ color: '#2E75B6' }} />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link href="/dashboard/detentions">
                  <Button 
                    variant="primary" 
                    className="w-full justify-start"
                    style={{
                      background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                      boxShadow: '0 2px 8px rgba(46, 117, 182, 0.3)',
                    }}
                  >
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
                  <span className="text-gray-600">Total Detentions</span>
                  <span className="font-medium text-gray-900">{Number(detentionStats.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Attended</span>
                  <span className="font-medium text-gray-900">{Number(detentionStats.attended)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-medium text-gray-900">
                    {detentionStats.total > 0 
                      ? Math.round((detentionStats.attended / detentionStats.total) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Detentions */}
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
                        <p className="text-xs text-gray-500 mt-1">
                          Reported by {detention.reportingStaff}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border-2 ${
                        detention.status === 'attended' ? 'bg-green-100 text-green-700 border-green-300' :
                        detention.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        detention.status === 'missed' ? 'bg-red-100 text-red-700 border-red-300' :
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
        <HomeButton />
      </div>
    );
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the dashboard. Please try refreshing the page.
          </p>
          <div className="space-y-2">
            <a
              href="/login"
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }
}
