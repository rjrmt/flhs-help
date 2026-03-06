'use client';

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Ticket,
  Search,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Play,
  ChevronDown,
} from 'lucide-react';
import { HomeButton } from '@/components/HomeButton';
import { formatRelativeTime } from '@/lib/utils/format';
import { fetchWithTimeout } from '@/lib/utils/fetchWithTimeout';
import { UpdateTicketForm } from '@/components/forms/UpdateTicketForm';

type TicketType = {
  id: string;
  ticketId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  pNumber: string | null;
  roomNumber: string | null;
  description: string;
  status: string;
  urgency: string;
  subject: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: string | null;
  assignedTo?: string | null;
};

type Stats = {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  critical?: number;
  aging?: number;
  resolvedToday?: number;
};

type TicketConsoleProps = {
  tickets: TicketType[];
  stats: Stats;
};

const URGENCY_BORDER = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-blue-500',
  low: 'border-l-slate-400',
};

const ROOM_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];

function getRoomTagColor(roomNumber: string | null): string {
  if (!roomNumber) return 'bg-gray-100 text-gray-700 border-gray-200';
  const hash = roomNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ROOM_COLORS[hash % ROOM_COLORS.length];
}

function getBuildingLabel(roomNumber: string | null): string {
  if (!roomNumber) return '—';
  if (roomNumber.includes('-')) {
    const [bld, rm] = roomNumber.split('-');
    return `BLD ${bld} · RM ${rm}`;
  }
  return `RM ${roomNumber}`;
}

const TicketConsole = memo(function TicketConsole({ tickets: initialTickets, stats }: TicketConsoleProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null);
  const [drawerTicket, setDrawerTicket] = useState<TicketType | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  useEffect(() => {
    if (drawerTicketId && initialTickets.length) {
      const updated = initialTickets.find((t) => t.id === drawerTicketId);
      if (updated) setDrawerTicket(updated);
    }
  }, [drawerTicketId, initialTickets]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const openDrawer = useCallback(async (ticket: TicketType) => {
    setDrawerTicketId(ticket.id);
    setDrawerTicket(ticket);
    setDrawerLoading(true);
    try {
      const res = await fetchWithTimeout(`/api/tickets/${ticket.id}`, { timeout: 10000 });
      const data = await res.json();
      if (data.success && data.ticket) {
        setDrawerTicket(data.ticket);
      }
    } catch {
      // keep local ticket data on timeout/error
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerTicketId(null);
    setDrawerTicket(null);
  }, []);

  const handleStartWorking = useCallback(
    async (e: React.MouseEvent, ticketId: string) => {
      e.stopPropagation();
      try {
        const res = await fetchWithTimeout(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress', note: 'Started working on this ticket' }),
        } as RequestInit & { timeout?: number });
        if (res.ok) {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, status: 'in_progress' } : t))
          );
          if (drawerTicketId === ticketId) {
            setDrawerTicket((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
          }
          router.refresh();
        }
      } catch {
        alert('Failed to update ticket');
      }
    },
    [drawerTicketId, router]
  );

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        ticket.ticketId.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (ticket.requesterName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (ticket.requesterEmail?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (ticket.pNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        ticket.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (ticket.roomNumber?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (ticket.subject?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesRoom =
        !roomFilter ||
        (ticket.roomNumber && ticket.roomNumber.toLowerCase().includes(roomFilter.toLowerCase()));

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [tickets, debouncedSearchTerm, statusFilter, roomFilter]);

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [filteredTickets]);

  const uniqueRooms = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => t.roomNumber && set.add(t.roomNumber));
    return Array.from(set).sort();
  }, [tickets]);

  const critical = stats.critical ?? 0;
  const aging = stats.aging ?? 0;
  const resolvedToday = stats.resolvedToday ?? 0;

  return (
    <main className="min-h-screen bg-gray-100 font-sans antialiased pb-24">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 mb-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>←</span> Back to Admin
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">IT Ticket Console</h1>
          <p className="text-gray-600 text-sm mt-1">Manage and track all IT support tickets</p>
        </div>

        {/* 3-Metric Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Critical Now
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">{critical}</p>
                <p className="text-xs text-gray-500 mt-1">ASAP tickets</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Aging</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{aging}</p>
                <p className="text-xs text-gray-500 mt-1">Open &gt; 48h</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Resolved Today
                </p>
                <p className="text-2xl font-bold text-green-600 mt-1">{resolvedToday}</p>
                <p className="text-xs text-gray-500 mt-1">Completed today</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID, staff, room, or issue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={roomFilter || ''}
              onChange={(e) => setRoomFilter(e.target.value || null)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Rooms</option>
              {uniqueRooms.map((r) => (
                <option key={r} value={r}>
                  {getBuildingLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {sortedTickets.length} of {tickets.length} tickets
          </p>
        </div>

        {/* Ticket Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedTickets.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900">No tickets found</p>
              <p className="text-sm text-gray-600 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            sortedTickets.map((ticket) => {
              const borderClass =
                URGENCY_BORDER[ticket.urgency as keyof typeof URGENCY_BORDER] || URGENCY_BORDER.low;
              const roomTagClass = getRoomTagColor(ticket.roomNumber);

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${borderClass} overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => openDrawer(ticket)}
                >
                  <div className="p-4">
                    {/* Who & Where */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {ticket.requesterName || (ticket.pNumber ? `P-${ticket.pNumber}` : 'N/A')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{getBuildingLabel(ticket.roomNumber)}</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${roomTagClass}`}
                      >
                        {ticket.roomNumber || '—'}
                      </span>
                    </div>

                    {/* What */}
                    <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">
                      {ticket.subject || ticket.description?.slice(0, 50) || ticket.ticketId}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {ticket.description?.slice(0, 120)}
                      {(ticket.description?.length ?? 0) > 120 ? '…' : ''}
                    </p>

                    {/* When & Action */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(ticket.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            ticket.status === 'resolved'
                              ? 'bg-green-100 text-green-700'
                              : ticket.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : ticket.status === 'closed'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>
                        {ticket.status === 'submitted' && (
                          <button
                            onClick={(e) => handleStartWorking(e, ticket.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {drawerTicketId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeDrawer}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Ticket Details</h2>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {drawerLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : drawerTicket ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Ticket ID
                      </p>
                      <p className="font-mono font-bold text-gray-900">{drawerTicket.ticketId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Requester
                      </p>
                      <p className="font-medium text-gray-900">
                        {drawerTicket.requesterName || drawerTicket.pNumber || 'N/A'}
                      </p>
                      {drawerTicket.requesterEmail && (
                        <p className="text-sm text-gray-600">{drawerTicket.requesterEmail}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Location
                      </p>
                      <p className="font-medium text-gray-900">
                        {getBuildingLabel(drawerTicket.roomNumber)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Issue
                      </p>
                      <p className="text-gray-900 whitespace-pre-wrap">{drawerTicket.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          drawerTicket.urgency === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : drawerTicket.urgency === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {drawerTicket.urgency}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          drawerTicket.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : drawerTicket.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {drawerTicket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        Submitted {formatRelativeTime(drawerTicket.createdAt)}
                      </p>
                    </div>
                    <UpdateTicketForm
                      ticketId={drawerTicket.id}
                      currentStatus={drawerTicket.status}
                    />
                    <Link
                      href={`/dashboard/tickets/${drawerTicket.id}`}
                      className="block text-center py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open full ticket page →
                    </Link>
                  </>
                ) : (
                  <p className="text-gray-600">Failed to load ticket</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HomeButton />
    </main>
  );
});

export default TicketConsole;
