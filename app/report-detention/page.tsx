'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LiquidBackground } from '@/components/LiquidBackground';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/forms/Input';
import { Textarea } from '@/components/forms/Textarea';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const detentionSchema = z.object({
  studentName: z.string().min(2, 'Student name must be at least 2 characters'),
  studentId: z.string().min(1, 'Student ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  detentionDate: z.string().min(1, 'Detention date is required'),
  detentionTime: z.string().min(1, 'Detention time is required'),
  reportingStaff: z.string().min(2, 'Reporting staff name is required'),
});

type DetentionFormData = z.infer<typeof detentionSchema>;

export default function ReportDetentionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetentionFormData>({
    resolver: zodResolver(detentionSchema),
    defaultValues: {
      detentionTime: '15:30',
    },
  });

  const onSubmit = async (data: DetentionFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/detentions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit detention');
      }

      const result = await response.json();
      setSubmitSuccess(result.detentionId);
      
      // Redirect to status page after 3 seconds
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

  // Get today's date for min attribute
  const today = new Date().toISOString().split('T')[0];

  if (submitSuccess) {
    return (
      <main className="min-h-screen relative">
        <LiquidBackground />
        <div className="relative z-10 container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Detention Reported</h1>
              <p className="text-text-secondary mb-4">
                The detention has been successfully reported.
              </p>
              <div className="bg-surface-light rounded-lg p-4 mb-6">
                <p className="text-sm text-text-secondary mb-1">Detention ID:</p>
                <p className="text-2xl font-bold text-primary font-mono">{submitSuccess}</p>
                <p className="text-xs text-text-secondary mt-2">
                  Please save this ID to check the detention status.
                </p>
              </div>
              <p className="text-text-secondary text-sm">
                Redirecting to status page...
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      <LiquidBackground />
      <div className="relative z-10 container mx-auto px-4 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="max-w-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Report a Detention</h1>
            </div>
            <p className="text-text-secondary">
              Submit detention information for student record keeping.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Student Name *"
                placeholder="John Doe"
                error={errors.studentName?.message}
                {...register('studentName')}
              />
              <Input
                label="Student ID *"
                placeholder="12345"
                error={errors.studentId?.message}
                {...register('studentId')}
              />
            </div>

            <Input
              label="Reporting Staff Name *"
              placeholder="Staff Member Name"
              error={errors.reportingStaff?.message}
              {...register('reportingStaff')}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Detention Date *"
                type="date"
                min={today}
                error={errors.detentionDate?.message}
                {...register('detentionDate')}
              />
              <Input
                label="Detention Time *"
                type="time"
                error={errors.detentionTime?.message}
                {...register('detentionTime')}
              />
            </div>

            <Textarea
              label="Reason *"
              placeholder="Please provide detailed reason for the detention..."
              rows={6}
              error={errors.reason?.message}
              {...register('reason')}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Detention'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}

