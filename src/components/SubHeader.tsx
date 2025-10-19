'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface SubHeaderProps {
  title: string;
  right?: ReactNode;
}

export function SubHeader({ title, right }: SubHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10 safe-area-inset-top overflow-hidden">
      {/* Left: Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 flex-shrink-0"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-white" />
      </button>

      {/* Center: Title */}
      <h1 className="flex-1 text-center text-[15px] sm:text-[16px] font-semibold text-white truncate px-4 min-w-0">
        {title}
      </h1>

      {/* Right: Actions or Spacer */}
      <div className="min-w-[44px] flex justify-end flex-shrink-0">
        {right || <div className="w-[44px]" />}
      </div>
    </header>
  );
}
