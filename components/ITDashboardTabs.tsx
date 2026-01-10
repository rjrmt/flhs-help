'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Ticket, TrendingUp, BarChart3, List } from 'lucide-react';
import Link from 'next/link';
import { DashboardAnalytics } from './analytics/DashboardAnalytics';

interface ITDashboardTabsProps {
  userRole: string;
  ticketStats: {
    total: number;
    submitted: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  recentTickets: any[];
}

export function ITDashboardTabs({ userRole, ticketStats, recentTickets }: ITDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'recent'>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: List },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'recent' as const, label: 'Recent Tickets', icon: Ticket },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats Grid - More Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{Number(ticketStats.total)}</p>
                  </div>
                  <Ticket className="w-8 h-8 text-gray-400" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">In Progress</p>
                    <p className="text-2xl font-bold" style={{ color: '#2E75B6' }}>{Number(ticketStats.inProgress)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8" style={{ color: '#2E75B6' }} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{Number(ticketStats.resolved)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{Number(ticketStats.submitted)}</p>
                  </div>
                  <Ticket className="w-8 h-8 text-yellow-600" />
                </div>
              </Card>
            </div>

            {/* Quick Actions & Summary - Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-900">Quick Actions</h3>
                <div className="space-y-1.5">
                  <Link href="/dashboard/tickets">
                    <Button 
                      variant="primary" 
                      className="w-full justify-start text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                      }}
                    >
                      View All Tickets
                    </Button>
                  </Link>
                  {userRole === 'admin' && (
                    <Link href="/admin/tickets">
                      <Button variant="secondary" className="w-full justify-start text-sm">
                        Admin Console
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-900">Summary</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resolved</span>
                    <span className="font-medium text-gray-900">{Number(ticketStats.resolved)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Closed</span>
                    <span className="font-medium text-gray-900">{Number(ticketStats.closed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active</span>
                    <span className="font-medium text-gray-900">{Number(ticketStats.inProgress) + Number(ticketStats.submitted)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <DashboardAnalytics />
          </div>
        )}

        {activeTab === 'recent' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
              <Link href="/dashboard/tickets">
                <Button variant="ghost" size="sm" className="text-sm">View All</Button>
              </Link>
            </div>
            <div className="space-y-2">
              {recentTickets.length === 0 ? (
                <p className="text-gray-600 text-sm py-4 text-center">No tickets yet</p>
              ) : (
                recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/tickets/${ticket.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-1 text-sm text-gray-900 truncate">
                          {ticket.subject || ticket.description?.substring(0, 60) || ticket.ticketId}
                        </p>
                        <p className="text-xs text-gray-600">
                          {ticket.ticketId} • {ticket.roomNumber && `Room ${ticket.roomNumber} • `}
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                        {ticket.requesterName && (
                          <p className="text-xs text-gray-500 mt-1">By {ticket.requesterName}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-700 border-green-300' :
                          ticket.status === 'closed' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-yellow-100 text-yellow-700 border-yellow-300'
                        }`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        {ticket.urgency && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            ticket.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                            ticket.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                            ticket.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {ticket.urgency}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
