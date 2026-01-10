import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AdminPageClient } from './AdminPageClient';

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
    const userRole = session.user.role;
    if (userRole !== 'admin') {
      redirect('/dashboard');
    }

    return <AdminPageClient userName={session.user?.name || null} />;
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
          <p className="text-sm text-red-600 mb-4 font-mono">
            Error: {error?.message || 'Unknown error'}
          </p>
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
