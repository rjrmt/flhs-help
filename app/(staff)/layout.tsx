import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { LiquidBackground } from '@/components/LiquidBackground';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
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
}

