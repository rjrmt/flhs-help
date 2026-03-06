'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Ticket, Users, BarChart3, Activity } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminPageClientProps {
  userName?: string | null;
}

const quickLinks = [
  { href: '/admin/tickets', label: 'Ticket Management', icon: Ticket, color: 'blue' },
  { href: '/admin/detentions', label: 'Detention Management', icon: Users, color: 'purple' },
  { href: '/dashboard/it', label: 'IT Dashboard', icon: BarChart3, color: 'green' },
  { href: '/dashboard/behavioral', label: 'Behavioral Dashboard', icon: Activity, color: 'purple' },
];

export function AdminPageClient({ userName }: AdminPageClientProps) {
  return (
    <ErrorBoundary>
      <div className="max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Welcome{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-gray-600 mb-8">
          Select an app from the left sidebar, or use the quick links below to get started.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer h-full border-gray-200 hover:border-primary/30">
                <div className="p-5 flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      item.color === 'blue'
                        ? 'bg-blue-50'
                        : item.color === 'green'
                        ? 'bg-green-50'
                        : 'bg-purple-50'
                    }`}
                  >
                    <item.icon
                      className={`w-6 h-6 ${
                        item.color === 'blue'
                          ? 'text-blue-600'
                          : item.color === 'green'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{item.label}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.href.includes('tickets') && 'View and manage IT tickets'}
                      {item.href.includes('detentions') && !item.href.includes('behavioral') && 'View and manage detentions'}
                      {item.href.includes('/it') && 'View analytics and metrics'}
                      {item.href.includes('behavioral') && 'View detention analytics'}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
