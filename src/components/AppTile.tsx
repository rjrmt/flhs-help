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
    <Link href={href}>
      <div className="group transition-[transform,shadow,filter] duration-200 ease-out cursor-pointer hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blue-400/50">
        <div className="flex flex-col items-center text-center space-y-3 p-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 flex items-center justify-center group-hover:from-blue-900 group-hover:via-blue-700 group-hover:to-blue-500 transition-all duration-200 shadow-lg group-hover:shadow-xl pulse-glow">
            <Icon className="h-6 w-6 text-white transition-colors duration-200" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-100 transition-colors">{label}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{hint}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
