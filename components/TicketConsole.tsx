'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { 
  Ticket, 
  Search, 
  Filter, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils/format';

type Ticket = {
  id: string;
  ticketId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  pNumber: string | null;
  roomNumber: string | null;
  description: string;
  status: string;
  urgency: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: string | null;
  subject?: string | null;
  assignedTo?: string | null;
};

type Stats = {
  total: number;
  open: number;
  resolved: number;
  closed: number;
};

type TicketConsoleProps = {
  tickets: Ticket[];
  stats: Stats;
};

export default function TicketConsole({ tickets: initialTickets, stats }: TicketConsoleProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'status' | 'urgency'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'closed':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'closed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.requesterName && ticket.requesterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.requesterEmail && ticket.requesterEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.pNumber && ticket.pNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.roomNumber && ticket.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesUrgency = !urgencyFilter || ticket.urgency === urgencyFilter;
    
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];
    
    if (sortColumn === 'createdAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const toggleSort = (column: 'createdAt' | 'status' | 'urgency') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const toggleRow = (ticketId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <main className="min-h-screen relative overflow-hidden p-3 safe-area-inset" style={{ padding: '10px' }}>
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.28) 0, transparent 38%),
            radial-gradient(circle at 82% 20%, rgba(99, 102, 241, 0.28) 0, transparent 38%),
            radial-gradient(circle at 30% 80%, rgba(234, 179, 8, 0.22) 0, transparent 32%),
            radial-gradient(circle at 60% 50%, rgba(59, 130, 246, 0.18) 0, transparent 42%),
            radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.18) 0, transparent 38%),
            linear-gradient(145deg, #0a1c3c 0%, #0f2f5d 45%, #09172f 100%)
          `,
        }}
      />
      <LiquidBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-6 transition-colors text-sm font-medium"
          style={{ color: '#1e5a8f' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden mb-6"
          style={{
            padding: '24px',
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(0, 0, 0, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1e5a8f', letterSpacing: '-0.6px' }}>
                IT Ticket Console
              </h1>
              <p className="text-sm" style={{ color: '#666' }}>
                Manage and track all IT support tickets
              </p>
            </div>
            <div className="flex gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#666' }}>Total</p>
                <p className="text-2xl font-bold" style={{ color: '#1e5a8f' }}>{stats.total}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#666' }}>Open</p>
                <p className="text-2xl font-bold" style={{ color: '#2E75B6' }}>{stats.open}</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#999' }} />
              <input
                type="text"
                placeholder="Search by Ticket ID, Staff Name, Email, Room, or Issue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                style={{ boxShadow: 'none' }}
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                style={{ boxShadow: 'none' }}
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={urgencyFilter || ''}
                onChange={(e) => setUrgencyFilter(e.target.value || null)}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                style={{ boxShadow: 'none' }}
              >
                <option value="">All Urgency</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm mb-4" style={{ color: '#666' }}>
            Showing {sortedTickets.length} of {tickets.length} tickets
            {statusFilter && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter(null)} className="ml-1">×</button>
              </span>
            )}
            {urgencyFilter && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                Urgency: {urgencyFilter}
                <button onClick={() => setUrgencyFilter(null)} className="ml-1">×</button>
              </span>
            )}
          </div>
        </motion.div>

        {/* Tickets Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden"
          style={{
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(0, 0, 0, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          {sortedTickets.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket className="w-16 h-16 mx-auto mb-4" style={{ color: '#999' }} />
              <p className="text-lg font-semibold mb-2" style={{ color: '#333' }}>No tickets found</p>
              <p className="text-sm" style={{ color: '#666' }}>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-primary/20">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#1e5a8f' }}>
                      Ticket ID
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ color: '#1e5a8f' }}
                      onClick={() => toggleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Submission Time
                        {sortColumn === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#1e5a8f' }}>
                      Staff Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#1e5a8f' }}>
                      Room Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#1e5a8f' }}>
                      IT Issue
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ color: '#1e5a8f' }}
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ color: '#1e5a8f' }}
                      onClick={() => toggleSort('urgency')}
                    >
                      <div className="flex items-center gap-1">
                        Urgency
                        {sortColumn === 'urgency' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#1e5a8f' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTickets.map((ticket) => {
                    const isExpanded = expandedRows.has(ticket.ticketId);
                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(ticket.ticketId)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold" style={{ color: '#1e5a8f' }}>
                            {ticket.ticketId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#333' }}>
                          {formatDateTime(ticket.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                              {ticket.requesterName || (ticket.pNumber ? `P-${ticket.pNumber}` : 'N/A')}
                            </p>
                            {ticket.requesterEmail && (
                              <p className="text-xs" style={{ color: '#666' }}>{ticket.requesterEmail}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#333' }}>
                          {ticket.roomNumber || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm line-clamp-2" style={{ color: '#333' }}>
                            {ticket.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)}
                            {ticket.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border-2 ${getUrgencyColor(ticket.urgency)}`}>
                            {ticket.urgency.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/tickets/${ticket.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                            style={{
                              background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}

