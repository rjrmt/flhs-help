import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LiquidBackground } from '@/components/LiquidBackground';

// Force dynamic rendering (prevents static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      redirect('/login');
    }

    return (
      <div className="min-h-screen relative">
        <LiquidBackground />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Staff layout error:', error);
    redirect('/login');
  }
}

