import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AdminPageClient } from './AdminPageClient';
import { PageError } from '@/components/PageError';

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
      <PageError
        title="Error Loading Admin Console"
        message="There was an error loading the admin console. Please check:"
        details={
          <ul className="list-disc list-inside text-gray-600 space-y-2 mb-6">
            <li>You are logged in as an admin user</li>
            <li>Database connection is configured correctly</li>
            <li>Environment variables are set</li>
          </ul>
        }
        errorMessage={error?.message || 'Unknown error'}
        links={[
          { href: '/login', label: 'Go to Login' },
          { href: '/dashboard', label: 'Go to Dashboard' },
        ]}
      />
    );
  }
}
