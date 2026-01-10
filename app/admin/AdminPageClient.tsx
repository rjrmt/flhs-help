'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { SignOutButton } from '@/components/SignOutButton';
import { HomeButton } from '@/components/HomeButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AdminPageClientProps {
  userName?: string | null;
}

export function AdminPageClient({ userName }: AdminPageClientProps) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
        <div className="container mx-auto px-4 py-4 sm:py-8 w-full max-w-7xl flex-1 flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">System Administration</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome, {userName || 'Admin'}
              </p>
            </div>
            <SignOutButton />
          </div>

          {/* Admin Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/admin/tickets">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Ticket className="w-8 h-8" style={{ color: '#2E75B6' }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Ticket Management</h2>
                      <p className="text-sm text-gray-600">View and manage all IT tickets</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                    }}
                  >
                    Open Ticket Console
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/admin/detentions">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Detention Management</h2>
                      <p className="text-sm text-gray-600">View and manage all detentions</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    }}
                  >
                    Open Detention Console
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/dashboard/it">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">IT Dashboard</h2>
                      <p className="text-sm text-gray-600">View analytics and metrics</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    }}
                  >
                    View IT Dashboard
                  </Button>
                </div>
              </Card>
            </Link>
          </div>

          {/* Quick Links */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-gray-900">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/admin/tickets">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5" style={{ color: '#2E75B6' }} />
                    <div>
                      <p className="font-medium text-gray-900">Ticket Console</p>
                      <p className="text-sm text-gray-600">Manage all IT tickets</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/admin/detentions">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Detention Console</p>
                      <p className="text-sm text-gray-600">Manage all detentions</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/it">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5" style={{ color: '#2E75B6' }} />
                    <div>
                      <p className="font-medium text-gray-900">IT Dashboard</p>
                      <p className="text-sm text-gray-600">View analytics</p>
                    </div>
                  </div>
                </div>
              </Link>
              <Link href="/dashboard/behavioral">
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-gray-900">Behavioral Dashboard</p>
                      <p className="text-sm text-gray-600">View detention analytics</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        </div>
        <HomeButton />
      </div>
    </ErrorBoundary>
  );
}
