'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { LiquidBackground } from '@/components/LiquidBackground';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const detentionSchema = z.object({
  pNumber: z.string().min(1, 'P Number is required'),
  studentId: z.string().length(10, 'Student ID must be exactly 10 digits').regex(/^\d+$/, 'Student ID must contain only numbers'),
  studentFirstName: z.string().min(1, 'Student first name is required'),
  studentLastName: z.string().min(1, 'Student last name is required'),
  detentionReason: z.array(z.string()).min(1, 'Please select at least one detention reason'),
  details: z.string().optional(),
  parentContacted: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge that you have called the parent/guardian',
  }),
});

type DetentionFormData = z.infer<typeof detentionSchema>;

const DETENTION_REASONS = [
  'Academic Integrity (cheating/plagiarism)',
  'Disruption in Class (talking out, off-task, interrupting)',
  'Defiance / Not Following Directions',
  'Dress Code',
  'Electronic Devices (after warning)',
  'Profanity / Inappropriate Language',
  'Safety/Major Conduct Issue',
  'Skipping / Out of Class Without Permission',
];

export default function ReportDetentionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DetentionFormData>({
    resolver: zodResolver(detentionSchema),
    defaultValues: {
      detentionReason: [],
      parentContacted: false,
    },
  });

  const selectedReasons = watch('detentionReason');
  const parentContacted = watch('parentContacted');

  const toggleReason = (reason: string) => {
    const current = selectedReasons || [];
    if (current.includes(reason)) {
      setValue('detentionReason', current.filter((r) => r !== reason), { shouldValidate: true });
    } else {
      setValue('detentionReason', [...current, reason], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: DetentionFormData) => {
    setIsSubmitting(true);
    try {
      // For now, we'll send the data as-is. Backend will need to be updated
      const response = await fetch('/api/detentions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          studentName: `${data.studentFirstName} ${data.studentLastName}`,
          reason: data.detentionReason.join(', ') + (data.details ? ` | Details: ${data.details}` : ''),
          detentionDate: new Date().toISOString().split('T')[0],
          detentionTime: new Date().toTimeString().slice(0, 5),
          reportingStaff: 'Staff', // Will be filled from P Number lookup
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit detention');
      }

      const result = await response.json();
      setSubmitSuccess(result.detentionId);
      
      setTimeout(() => {
        router.push(`/status?detentionId=${result.detentionId}`);
      }, 3000);
    } catch (error) {
      console.error('Error submitting detention:', error);
      alert('Failed to submit detention. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <main className="h-screen relative overflow-hidden flex items-center justify-center p-3 safe-area-inset" style={{ padding: '10px' }}>
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
        
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-[420px] w-full bg-white/12 backdrop-blur-[50px] rounded-3xl border border-white/22 shadow-2xl overflow-hidden flex flex-col mx-auto my-auto"
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
              <ClipboardList className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-extrabold mb-2 text-white" style={{ textShadow: '0 3px 12px rgba(0, 0, 0, 0.5)' }}>
              Detention Reported
            </h1>
            <p className="text-sm text-white/90 mb-6">
              The detention has been successfully reported.
            </p>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 mb-4 border border-white/20">
              <p className="text-xs text-white/80 mb-1">Detention ID:</p>
              <p className="text-xl font-bold text-primary font-mono">{submitSuccess}</p>
              <p className="text-xs text-white/70 mt-2">
                Please save this ID to check the detention status.
              </p>
            </div>
            <p className="text-xs text-white/80">
              Redirecting to status page...
            </p>
          </div>
        </motion.div>
      </main>
    );
  }

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
          className="relative bg-white/95 backdrop-blur-[20px] rounded-3xl shadow-xl overflow-hidden"
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
                  <ClipboardList className="w-9 h-9 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#1e5a8f', letterSpacing: '-0.6px' }}>
                Report a Detention
              </h1>
              <p className="text-sm" style={{ color: '#666' }}>
                Submit detention information for student record keeping
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  Your name will be auto-filled
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Student ID *
                </label>
                <input
                  type="text"
                  placeholder="Enter the 10-digit student ID number"
                  maxLength={10}
                  {...register('studentId')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                  style={{ 
                    boxShadow: 'none',
                  }}
                />
                {errors.studentId && (
                  <p className="text-xs text-red-500 mt-2">{errors.studentId.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                    Student First Name *
                  </label>
                  <input
                    type="text"
                    placeholder="As it appears on roster"
                    {...register('studentFirstName')}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                    style={{ 
                      boxShadow: 'none',
                    }}
                  />
                  {errors.studentFirstName && (
                    <p className="text-xs text-red-500 mt-2">{errors.studentFirstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                    Student Last Name *
                  </label>
                  <input
                    type="text"
                    placeholder="As it appears on roster"
                    {...register('studentLastName')}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all"
                    style={{ 
                      boxShadow: 'none',
                    }}
                  />
                  {errors.studentLastName && (
                    <p className="text-xs text-red-500 mt-2">{errors.studentLastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Detention Reason * <span className="font-normal text-xs" style={{ color: '#666' }}>(select all that apply)</span>
                </label>
                <p className="text-xs mb-4" style={{ color: '#666' }}>
                  Select the main reason for detention. Use your best judgment
                </p>
                <div className="space-y-2.5">
                  {DETENTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-start gap-3 p-3.5 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-xl cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons?.includes(reason) || false}
                        onChange={() => toggleReason(reason)}
                        className="mt-0.5 w-5 h-5 rounded border-gray-300 bg-white text-primary focus:ring-primary/50 focus:ring-offset-0 focus:ring-2 cursor-pointer accent-primary"
                      />
                      <span className="text-sm flex-1 leading-relaxed" style={{ color: '#1a1a1a' }}>
                        {reason}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.detentionReason && (
                  <p className="text-xs text-red-500 mt-3">{errors.detentionReason.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#333' }}>
                  Details <span className="font-normal text-xs" style={{ color: '#666' }}>(optional)</span>
                </label>
                <textarea
                  placeholder="Add any quick notes if needed (1–2 sentences max)"
                  rows={3}
                  {...register('details')}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 text-base font-medium focus:outline-none focus:border-primary focus:ring-0 transition-all resize-none"
                  style={{ 
                    boxShadow: 'none',
                  }}
                />
                {errors.details && (
                  <p className="text-xs text-red-500 mt-2">{errors.details.message}</p>
                )}
              </div>

              <div className="pt-1 pb-1">
                <label 
                  className="flex items-start gap-3 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-xl cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={parentContacted || false}
                    onChange={(e) => setValue('parentContacted', e.target.checked, { shouldValidate: true })}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 bg-white text-primary focus:ring-primary/50 focus:ring-offset-0 focus:ring-2 cursor-pointer accent-primary"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold block mb-1 leading-relaxed" style={{ color: '#1a1a1a' }}>
                      I Acknowledge that I have called the parent/guardian before submitting this detention.
                    </span>
                    <span className="text-xs" style={{ color: '#666' }}>
                      Yes, I have called the parent/guardian
                    </span>
                  </div>
                </label>
                {errors.parentContacted && (
                  <p className="text-xs text-red-500 mt-3">{errors.parentContacted.message}</p>
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
                  <span className="relative z-10">{isSubmitting ? 'Submitting...' : 'Submit Detention'}</span>
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
        </motion.div>
      </div>
    </main>
  );
}
