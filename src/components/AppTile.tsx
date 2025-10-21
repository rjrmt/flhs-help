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
      <div className="group cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/40">
        <div className="soft-card flex flex-col items-center justify-center text-center gap-0.5 aspect-square p-1 rounded-md transition-transform duration-200 ease-out hover:scale-[1.02]">
          <Icon className="h-6 w-6 text-cyan-600 dark:text-cyan-300 transition-colors duration-200 group-hover:text-cyan-500 dark:group-hover:text-cyan-200 icon-glow" />
          <h3 className="font-semibold text-[9px] text-slate-800 dark:text-slate-100 leading-tight">{label}</h3>
          <p className="text-[7px] text-slate-500 dark:text-neutral-400 leading-tight hidden sm:block">{hint}</p>
        </div>
      </div>
    </Link>
  );
}
