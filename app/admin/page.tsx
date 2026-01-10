import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, Users, Settings, BarChart3, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      redirect('/dashboard');
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">System Administration</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome, {session.user?.name || 'Admin'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Admin Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/admin/tickets">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Ticket className="w-8 h-8" style={{ color: '#2E75B6' }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Ticket Management</h2>
                      <p className="text-sm text-gray-600">View and manage all IT tickets</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                    }}
                  >
                    Open Ticket Console
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/admin/detentions">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Detention Management</h2>
                      <p className="text-sm text-gray-600">View and manage all detentions</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    }}
                  >
                    Open Detention Console
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/dashboard/it">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">IT Dashboard</h2>
                      <p className="text-sm text-gray-600">View analytics and metrics</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    }}
                  >
                    View IT Dashboard
                  </Button>
                </div>
              </Card>
            </Link>
          </div>

          {/* Quick Links */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/tickets">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5" style={{ color: '#2E75B6' }} />
                    <div>
                      <p className="font-medium text-gray-900">Ticket Console</p>
                      <p className="text-sm text-gray-600">Manage all IT tickets</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/admin/detentions">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Detention Console</p>
                      <p className="text-sm text-gray-600">Manage all detentions</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/it">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5" style={{ color: '#2E75B6' }} />
                    <div>
                      <p className="font-medium text-gray-900">IT Dashboard</p>
                      <p className="text-sm text-gray-600">View analytics</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/behavioral">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Behavioral Dashboard</p>
                      <p className="text-sm text-gray-600">View detention analytics</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        </div>
        <HomeButton />
      </div>
    );
  } catch (error: any) {
    console.error('Admin page error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Admin Console</h1>
          <p className="text-gray-600 mb-4">
            There was an error loading the admin console. Please check:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>You are logged in as an admin user</li>
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set</li>
          </ul>
          <div className="space-y-2">
            <a
              href="/login"
              className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
            >
              Go to Login
            </a>
            <a
              href="/dashboard"
              className="inline-block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
