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
        <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 min-h-[110px] sm:min-h-[116px] p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/30 dark:border-white/20 hover:bg-white/95 dark:hover:bg-slate-700/95 shadow-md hover:shadow-lg">
          <div className="grid place-items-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 group-hover:from-blue-900 group-hover:via-blue-700 group-hover:to-blue-500 transition-all duration-200 shadow-md group-hover:shadow-lg">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white transition-colors duration-200" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-[13px] sm:text-[15px] text-slate-700 dark:text-slate-200 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">{label}</h3>
            <p className="text-[11px] sm:text-[12.5px] text-slate-500 dark:text-neutral-400/95 leading-tight group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors line-clamp-2 sm:line-clamp-none">{hint}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
