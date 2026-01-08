'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { MessageCircle, ClipboardList, Search, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils/format';

type StatusType = 'ticket' | 'detention' | null;
type TicketData = {
  ticketId: string;
  subject: string;
  status: string;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  category: string;
};

type DetentionData = {
  detentionId: string;
  studentName: string;
  status: string;
  detentionDate: string;
  detentionTime: string;
  createdAt: string;
  reason: string;
};

function StatusPageContent() {
  const searchParams = useSearchParams();
  const [type, setType] = useState<StatusType>(null);
  const [ticketId, setTicketId] = useState(searchParams.get('ticketId') || '');
  const [detentionId, setDetentionId] = useState(searchParams.get('detentionId') || '');
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [detentionData, setDetentionData] = useState<DetentionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticket = searchParams.get('ticketId');
    const detention = searchParams.get('detentionId');
    if (ticket) {
      setType('ticket');
      setTicketId(ticket);
      checkStatus('ticket', ticket);
    } else if (detention) {
      setType('detention');
      setDetentionId(detention);
      checkStatus('detention', detention);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = async (statusType: StatusType, id: string) => {
    if (!id) {
      setError('Please enter an ID');
      return;
    }

    setLoading(true);
    setError(null);
    setTicketData(null);
    setDetentionData(null);

    try {
      const endpoint = statusType === 'ticket' ? '/api/tickets' : '/api/detentions';
      const paramName = statusType === 'ticket' ? 'ticketId' : 'detentionId';
      const response = await fetch(`${endpoint}?${paramName}=${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Not found');
      }

      const data = await response.json();
      
      if (statusType === 'ticket') {
        setTicketData(data.ticket);
      } else {
        setDetentionData(data.detention);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'ticket' && ticketId) {
      checkStatus('ticket', ticketId);
    } else if (type === 'detention' && detentionId) {
      checkStatus('detention', detentionId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
      case 'attended':
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-5 h-5" style={{ color: '#2E75B6' }} />;
      case 'closed':
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      submitted: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
      resolved: 'bg-green-100 text-green-700 border-green-300',
      closed: 'bg-gray-100 text-gray-700 border-gray-300',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
      attended: 'bg-green-100 text-green-700 border-green-300',
      missed: 'bg-red-100 text-red-700 border-red-300',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
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
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-6 transition-colors text-sm font-medium"
          style={{ color: '#1e5a8f' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden mb-6"
          style={{
            padding: '32px 24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(0, 0, 0, 0.1) inset
            `,
            border: '1px solid rgba(255, 255, 255, 0.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
        >
          <div className="relative z-[2]">
            <div className="mb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center" style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))' }}>
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                  <Search className="w-9 h-9 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1e5a8f', letterSpacing: '-0.6px' }}>
                Check Status
              </h1>
              <p className="text-sm" style={{ color: '#666' }}>
                Enter your Ticket ID or Detention ID to check the current status.
              </p>
            </div>

            <div className="flex gap-3 mb-6">
              <button
                onClick={() => {
                  setType('ticket');
                  setDetentionData(null);
                  setError(null);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group ${
                  type === 'ticket'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                }`}
                style={{
                  background: type === 'ticket' ? 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)' : undefined,
                  boxShadow: type === 'ticket' ? '0 4px 12px rgba(46, 117, 182, 0.4)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (type !== 'ticket') {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.borderColor = '#1e5a8f';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(46, 117, 182, 0.6), 0 0 20px rgba(46, 117, 182, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e5a8f 0%, #2E75B6 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  if (type === 'ticket') {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 117, 182, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)';
                  } else {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                <MessageCircle className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                <span className="relative z-10">Ticket</span>
                {type === 'ticket' && (
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                    }}
                  />
                )}
              </button>
              <button
                onClick={() => {
                  setType('detention');
                  setTicketData(null);
                  setError(null);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group ${
                  type === 'detention'
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                }`}
                style={{
                  background: type === 'detention' ? 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)' : undefined,
                  boxShadow: type === 'detention' ? '0 4px 12px rgba(46, 117, 182, 0.4)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (type !== 'detention') {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.borderColor = '#1e5a8f';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(46, 117, 182, 0.6), 0 0 20px rgba(46, 117, 182, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e5a8f 0%, #2E75B6 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  if (type === 'detention') {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 117, 182, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)';
                  } else {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }
                }}
              >
                <ClipboardList className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                <span className="relative z-10">Detention</span>
                {type === 'detention' && (
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                    }}
                  />
                )}
              </button>
            </div>

            {type && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                    {type === 'ticket' ? 'Ticket ID' : 'Detention ID'}
                  </label>
                  <input
                    type="text"
                    placeholder={type === 'ticket' ? 'TICKET-2024-XXXXX' : 'DET-2024-XXXXX'}
                    value={type === 'ticket' ? ticketId : detentionId}
                    onChange={(e) => {
                      if (type === 'ticket') {
                        setTicketId(e.target.value);
                      } else {
                        setDetentionId(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                    style={{ 
                      boxShadow: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 rounded-xl text-white font-semibold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                    boxShadow: '0 4px 15px rgba(46, 117, 182, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(46, 117, 182, 0.6), 0 0 20px rgba(46, 117, 182, 0.3)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #1e5a8f 0%, #2E75B6 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(46, 117, 182, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)';
                  }}
                  onMouseDown={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    }
                  }}
                >
                  <span className="relative z-10">{loading ? 'Checking...' : 'Check Status'}</span>
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                    }}
                  />
                </button>
              </form>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-sm" style={{ color: '#dc2626' }}>
                {error}
              </div>
            )}
          </div>
        </motion.div>

        {/* Ticket Status Result */}
        {ticketData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden border-2 border-primary/30"
            style={{
              padding: '32px 24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: `
                0 12px 40px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(0, 0, 0, 0.1) inset
              `,
              border: '1px solid rgba(255, 255, 255, 0.5)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-primary/20">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1e5a8f' }}>
                  {ticketData.subject}
                </h2>
                <p className="text-xs font-mono" style={{ color: '#666' }}>{ticketData.ticketId}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(ticketData.status)}
                {getStatusBadge(ticketData.status)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Category</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{ticketData.category}</p>
                </div>
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Urgency</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: '#1a1a1a' }}>{ticketData.urgency}</p>
                </div>
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Submitted</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{formatDateTime(ticketData.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Last Updated</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{formatDateTime(ticketData.updatedAt)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs mb-2 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: '#333' }}>{ticketData.description}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Detention Status Result */}
        {detentionData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden border-2 border-primary/30"
            style={{
              padding: '32px 24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: `
                0 12px 40px rgba(0, 0, 0, 0.25),
                0 0 0 1px rgba(0, 0, 0, 0.1) inset
              `,
              border: '1px solid rgba(255, 255, 255, 0.5)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-primary/20">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#1e5a8f' }}>
                  {detentionData.studentName}
                </h2>
                <p className="text-xs font-mono" style={{ color: '#666' }}>{detentionData.detentionId}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(detentionData.status)}
                {getStatusBadge(detentionData.status)}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Student ID</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{detentionData.studentName}</p>
                </div>
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Date & Time</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                    {formatDateTime(detentionData.detentionDate)} at {detentionData.detentionTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Reported</p>
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{formatDateTime(detentionData.createdAt)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs mb-2 font-semibold uppercase tracking-wide" style={{ color: '#666' }}>Reason</p>
                <p className="text-sm leading-relaxed" style={{ color: '#333' }}>{detentionData.reason}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen relative overflow-hidden p-3 safe-area-inset flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </main>
    }>
      <StatusPageContent />
    </Suspense>
  );
}
