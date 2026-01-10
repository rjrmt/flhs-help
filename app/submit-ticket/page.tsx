'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { MessageCircle } from 'lucide-react';
import { HomeButton } from '@/components/HomeButton';

const ticketSchema = z.object({
  pNumber: z.string().min(1, 'P Number is required'),
  roomNumber: z.string().min(1, 'Room number is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function SubmitTicketPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      urgency: 'medium',
    },
  });

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }

      const result = await response.json();
      setSubmitSuccess(result.ticketId);
      
      setTimeout(() => {
        router.push(`/status?ticketId=${result.ticketId}`);
      }, 3000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitSuccess) {
    return (
      <main className="h-screen relative flex items-center justify-center p-3 safe-area-inset overflow-x-hidden" style={{ padding: '10px' }}>
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
        
        <div className="relative z-10 w-full max-w-[420px] px-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative w-full bg-white/12 backdrop-blur-[50px] rounded-3xl border border-white/22 shadow-2xl overflow-hidden flex flex-col"
            style={{
              padding: '24px',
              boxShadow: `
                0 12px 40px rgba(0, 0, 0, 0.35),
                0 0 0 1px rgba(255, 255, 255, 0.25) inset,
                0 2px 0 rgba(255, 255, 255, 0.35) inset,
                0 0 60px rgba(59, 130, 246, 0.1)
              `,
              WebkitBackdropFilter: 'blur(50px) saturate(200%)',
            }}
          >
            <div className="relative z-[2] text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center"
              >
                <MessageCircle className="w-8 h-8 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-extrabold mb-2 text-white" style={{ textShadow: '0 3px 12px rgba(0, 0, 0, 0.5)' }}>
                Ticket Submitted!
              </h1>
              <p className="text-sm text-white/90 mb-6">
                Your ticket has been successfully submitted.
              </p>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4 border border-white/20">
                <p className="text-xs text-white/80 mb-1">Ticket ID:</p>
                <p className="text-xl font-bold text-primary font-mono">{submitSuccess}</p>
                <p className="text-xs text-white/70 mt-2">
                  Please save this ID to check your ticket status.
                </p>
              </div>
              <p className="text-xs text-white/80">
                Redirecting to status page...
              </p>
            </div>
            <HomeButton variant="relative" />
          </motion.div>
        </div>
    </main>
    );
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-3 safe-area-inset overflow-x-hidden" style={{ padding: '10px' }}>
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
      
      <div className="relative z-10 w-full max-w-[500px] px-4 py-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden w-full max-h-[90vh] overflow-y-auto"
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
                  <MessageCircle className="w-9 h-9 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1e5a8f', letterSpacing: '-0.6px' }}>
                Submit an IT Ticket
              </h1>
              <p className="text-sm" style={{ color: '#666' }}>
                Having tech trouble? Fill out the form below and we&apos;ll help you out.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                    P Number *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your P Number"
                    {...register('pNumber')}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                    style={{ 
                      boxShadow: 'none',
                    }}
                  />
                  {errors.pNumber && (
                    <p className="text-xs text-red-500 mt-2">{errors.pNumber.message}</p>
                  )}
                  <p className="text-xs mt-1.5" style={{ color: '#666' }}>
                    Your name and email will be auto-filled
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                    Room Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 101, 205, Library"
                    {...register('roomNumber')}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                    style={{ 
                      boxShadow: 'none',
                    }}
                  />
                  {errors.roomNumber && (
                    <p className="text-xs text-red-500 mt-2">{errors.roomNumber.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Urgency *
                </label>
                <select
                  {...register('urgency')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                  style={{ 
                    boxShadow: 'none',
                  }}
                >
                  <option value="low">Low - Can wait a few days</option>
                  <option value="medium">Medium - Need help soon</option>
                  <option value="high">High - Urgent, blocking work</option>
                  <option value="critical">Critical - System down</option>
                </select>
                {errors.urgency && (
                  <p className="text-xs text-red-500 mt-2">{errors.urgency.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Description *
                </label>
                <textarea
                  placeholder="Please provide detailed information about your issue..."
                  rows={6}
                  {...register('description')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all resize-none"
                  style={{ 
                    boxShadow: 'none',
                  }}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-2">{errors.description.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-xl text-white font-semibold text-base transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
                    boxShadow: '0 4px 15px rgba(46, 117, 182, 0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
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
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    }
                  }}
                >
                  <span className="relative z-10">{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl font-semibold text-base transition-all duration-300 relative overflow-hidden group"
                  style={{ color: '#1e5a8f' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.borderColor = '#1e5a8f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  }}
                >
                  <span className="relative z-10">Cancel</span>
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(30, 90, 143, 0.1) 0%, transparent 100%)',
                    }}
                  />
                </button>
              </div>
            </form>
          </div>
          <HomeButton variant="relative" />
        </motion.div>
      </div>
    </main>
  );
}
