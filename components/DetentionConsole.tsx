'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LiquidBackground } from '@/components/LiquidBackground';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HomeButton } from '@/components/HomeButton';
import { formatDateTime } from '@/lib/utils/format';

type Detention = {
  id: string;
  detentionId: string;
  studentName: string;
  studentId: string;
  reason: string;
  detentionDate: Date | string;
  detentionTime: string;
  reportingStaff: string;
  pNumber: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Stats = {
  total: number;
  pending: number;
  confirmed: number;
  attended: number;
  missed: number;
};

type DetentionConsoleProps = {
  detentions: Detention[];
  stats: Stats;
};

export default function DetentionConsole({ detentions: initialDetentions, stats }: DetentionConsoleProps) {
  const [detentions, setDetentions] = useState(initialDetentions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'status' | 'detentionDate'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'attended':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'missed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'attended':
        return <CheckCircle className="w-4 h-4" />;
      case 'confirmed':
        return <Clock className="w-4 h-4" />;
      case 'missed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredDetentions = detentions.filter((detention) => {
    const matchesSearch = 
      detention.detentionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detention.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detention.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detention.reportingStaff.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detention.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || detention.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedDetentions = [...filteredDetentions].sort((a, b) => {
    let aVal: any = a[sortColumn];
    let bVal: any = b[sortColumn];
    
    if (sortColumn === 'createdAt' || sortColumn === 'detentionDate') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const toggleSort = (column: 'createdAt' | 'status' | 'detentionDate') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const toggleRow = (detentionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(detentionId)) {
      newExpanded.delete(detentionId);
    } else {
      newExpanded.add(detentionId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-3 safe-area-inset pb-24" style={{ padding: '10px' }}>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl w-full">
        {/* Back to Admin Link */}
        <Link 
          href="/admin"
          className="inline-flex items-center gap-2 mb-4 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>←</span> Back to Admin
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden mb-4 sm:mb-6"
          style={{
            padding: '20px 16px',
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(0, 0, 0, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold mb-2 text-gray-900" style={{ letterSpacing: '-0.6px' }}>
                Detention Management Console
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Manage and track all student detentions
              </p>
            </div>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600">Attended</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.attended}</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Detention ID, Student Name, Student ID, Staff Name, or Reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                style={{ boxShadow: 'none' }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                style={{ boxShadow: 'none' }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="attended">Attended</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm mb-4 text-gray-600">
            Showing {sortedDetentions.length} of {detentions.length} detentions
            {statusFilter && (
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-semibold">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter(null)} className="ml-1 hover:text-gray-900">×</button>
              </span>
            )}
          </div>
        </motion.div>

        {/* Detentions Table */}
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
          {sortedDetentions.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2 text-gray-900">No detentions found</p>
              <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Detention ID
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors text-gray-700"
                      onClick={() => toggleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Reported
                        {sortColumn === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Student ID
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors text-gray-700"
                      onClick={() => toggleSort('detentionDate')}
                    >
                      <div className="flex items-center gap-1">
                        Detention Date
                        {sortColumn === 'detentionDate' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Reporting Staff
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Reason
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors text-gray-700"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDetentions.map((detention) => {
                    const isExpanded = expandedRows.has(detention.detentionId);
                    return (
                      <tr
                        key={detention.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                        onClick={() => toggleRow(detention.detentionId)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {detention.detentionId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDateTime(detention.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {detention.studentName}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-700">
                            {detention.studentId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDateTime(detention.detentionDate)} at {detention.detentionTime}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {detention.reportingStaff}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm line-clamp-2 text-gray-700">
                            {detention.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(detention.status)}`}>
                            {getStatusIcon(detention.status)}
                            {detention.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/detentions/${detention.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-all hover:shadow-md"
                            style={{
                              background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                              boxShadow: '0 2px 8px rgba(46, 117, 182, 0.3)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 117, 182, 0.4)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #1e5a8f 0%, #2E75B6 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = '';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 117, 182, 0.3)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)';
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
      <HomeButton />
    </main>
  );
}
