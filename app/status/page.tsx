'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiquidBackground } from '@/components/LiquidBackground';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { Ticket, AlertCircle, Search, CheckCircle, Clock, XCircle } from 'lucide-react';
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

export default function StatusPage() {
  const searchParams = useSearchParams();
  const [type, setType] = useState<StatusType>(null);
  const [ticketId, setTicketId] = useState(searchParams.get('ticketId') || '');
  const [detentionId, setDetentionId] = useState(searchParams.get('detentionId') || '');
  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [detentionData, setDetentionData] = useState<DetentionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-load if ID is in URL
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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-primary" />;
      case 'closed':
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      submitted: 'bg-yellow-500/20 text-yellow-500',
      in_progress: 'bg-primary/20 text-primary',
      resolved: 'bg-green-500/20 text-green-500',
      closed: 'bg-gray-500/20 text-gray-400',
      pending: 'bg-yellow-500/20 text-yellow-500',
      confirmed: 'bg-blue-500/20 text-blue-400',
      attended: 'bg-green-500/20 text-green-500',
      missed: 'bg-red-500/20 text-red-500',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status.toLowerCase()] || 'bg-surface-light text-text-secondary'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <main className="min-h-screen relative">
      <LiquidBackground />
      <div className="relative z-10 container mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          ← Back to Home
        </Link>

        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Search className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Check Status</h1>
              </div>
              <p className="text-text-secondary">
                Enter your Ticket ID or Detention ID to check the current status.
              </p>
            </div>

            <div className="flex gap-4 mb-6">
              <Button
                variant={type === 'ticket' ? 'primary' : 'outline'}
                onClick={() => {
                  setType('ticket');
                  setDetentionData(null);
                  setError(null);
                }}
              >
                <Ticket className="w-4 h-4 mr-2" />
                Ticket
              </Button>
              <Button
                variant={type === 'detention' ? 'primary' : 'outline'}
                onClick={() => {
                  setType('detention');
                  setTicketData(null);
                  setError(null);
                }}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Detention
              </Button>
            </div>

            {type && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={type === 'ticket' ? 'Ticket ID' : 'Detention ID'}
                  placeholder={type === 'ticket' ? 'TICKET-2024-XXXXX' : 'DET-2024-XXXXX'}
                  value={type === 'ticket' ? ticketId : detentionId}
                  onChange={(e) => {
                    if (type === 'ticket') {
                      setTicketId(e.target.value);
                    } else {
                      setDetentionId(e.target.value);
                    }
                  }}
                />
                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Checking...' : 'Check Status'}
                </Button>
              </form>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500">
                {error}
              </div>
            )}
          </Card>

          {/* Ticket Status Result */}
          {ticketData && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{ticketData.subject}</h2>
                  <p className="text-text-secondary font-mono">{ticketData.ticketId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticketData.status)}
                  {getStatusBadge(ticketData.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Category</p>
                    <p className="font-medium">{ticketData.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Urgency</p>
                    <p className="font-medium capitalize">{ticketData.urgency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Submitted</p>
                    <p className="font-medium">{formatDateTime(ticketData.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Last Updated</p>
                    <p className="font-medium">{formatDateTime(ticketData.updatedAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-text-secondary mb-2">Description</p>
                  <p className="text-text-primary">{ticketData.description}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Detention Status Result */}
          {detentionData && (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{detentionData.studentName}</h2>
                  <p className="text-text-secondary font-mono">{detentionData.detentionId}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(detentionData.status)}
                  {getStatusBadge(detentionData.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Student ID</p>
                    <p className="font-medium">{detentionData.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Date & Time</p>
                    <p className="font-medium">
                      {formatDateTime(detentionData.detentionDate)} at {detentionData.detentionTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Reported</p>
                    <p className="font-medium">{formatDateTime(detentionData.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-text-secondary mb-2">Reason</p>
                  <p className="text-text-primary">{detentionData.reason}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

