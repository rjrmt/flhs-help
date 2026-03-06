'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/components/SignOutButton';
import {
  LayoutDashboard,
  Ticket,
  Users,
  BarChart3,
  Activity,
  ChevronRight,
  Home,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, description: 'Home' },
  { href: '/admin/tickets', label: 'Ticket Management', icon: Ticket, description: 'IT tickets' },
  { href: '/admin/detentions', label: 'Detention Management', icon: Users, description: 'Detentions' },
  { href: '/dashboard/it', label: 'IT Dashboard', icon: BarChart3, description: 'Analytics' },
  { href: '/dashboard/behavioral', label: 'Behavioral Dashboard', icon: Activity, description: 'Detention analytics' },
];

interface StaffConsoleShellProps {
  userName?: string | null;
  children: React.ReactNode;
}

export function StaffConsoleShell({ userName, children }: StaffConsoleShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar - Supabase-style */}
      <aside
        className={cn(
          'w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col',
          'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto',
          'transform transition-transform duration-200 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Brand */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-gray-900 text-base">Staff Console</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Apps
            </p>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors',
                        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-700 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 text-primary" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Home link at bottom */}
          <div className="p-3 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-4 h-16 px-4 sm:px-6 lg:px-8 bg-white/98 backdrop-blur-md border-b border-gray-200"
          style={{
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)',
            borderTop: '2px solid rgb(46 0 223 / 0.15)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-4 shrink-0 min-w-0">
            {userName && (
              <>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                    {userName}
                  </span>
                </div>
                <div className="hidden sm:block w-px h-5 bg-gray-200" aria-hidden />
              </>
            )}
            <div className="flex-shrink-0">
              <SignOutButton size="sm" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
