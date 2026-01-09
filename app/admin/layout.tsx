import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      redirect('/dashboard');
    }

    return <>{children}</>;
  } catch (error) {
    console.error('Admin layout error:', error);
    redirect('/login');
  }
}

