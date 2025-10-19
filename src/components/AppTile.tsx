import { ComponentType } from 'react';
import Link from 'next/link';

interface AppTileProps {
  href: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}

export function AppTile({ href, Icon, label, hint }: AppTileProps) {
  return (
    <Link href={href} className="block">
      <div className="group transition-[transform,shadow,filter] duration-200 ease-out cursor-pointer hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500/40">
        <div className="flex flex-col items-center text-center space-y-3 min-h-[116px] p-3 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/90 dark:hover:bg-slate-700/90 shadow-lg hover:shadow-xl">
          <div className="grid place-items-center h-11 w-11 sm:h-12 sm:w-12 rounded-2xl border border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/10 bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 group-hover:from-blue-900 group-hover:via-blue-700 group-hover:to-blue-500 transition-all duration-200 shadow-lg group-hover:shadow-xl pulse-glow">
            <Icon className="h-6 w-6 text-white transition-colors duration-200" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-[14px] sm:text-[15px] text-slate-700 dark:text-slate-200 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">{label}</h3>
            <p className="text-[11.5px] sm:text-[12.5px] text-slate-500 dark:text-neutral-400/95 leading-tight group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors line-clamp-1 sm:line-clamp-none">{hint}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
