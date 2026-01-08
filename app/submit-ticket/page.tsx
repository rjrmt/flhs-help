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
import { Select } from '@/components/forms/Select';
import { ArrowLeft, Ticket } from 'lucide-react';
import Link from 'next/link';

const ticketSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters'),
  requesterEmail: z.string().email('Invalid email address'),
  category: z.string().min(1, 'Please select a category'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
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
      
      // Redirect to status page after 3 seconds
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

  if (submitSuccess) {
    return (
      <main className="min-h-screen relative">
        <LiquidBackground />
        <div className="relative z-10 container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                <Ticket className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Ticket Submitted!</h1>
              <p className="text-text-secondary mb-4">
                Your ticket has been successfully submitted.
              </p>
              <div className="bg-surface-light rounded-lg p-4 mb-6">
                <p className="text-sm text-text-secondary mb-1">Ticket ID:</p>
                <p className="text-2xl font-bold text-primary font-mono">{submitSuccess}</p>
                <p className="text-xs text-text-secondary mt-2">
                  Please save this ID to check your ticket status.
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
              <Ticket className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">Submit an IT Ticket</h1>
            </div>
            <p className="text-text-secondary">
              Having tech trouble? Fill out the form below and we&apos;ll help you out.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Your Name *"
                placeholder="John Doe"
                error={errors.requesterName?.message}
                {...register('requesterName')}
              />
              <Input
                label="Email Address *"
                type="email"
                placeholder="john@example.com"
                error={errors.requesterEmail?.message}
                {...register('requesterEmail')}
              />
            </div>

            <Select
              label="Category *"
              options={[
                { value: '', label: 'Select a category' },
                { value: 'hardware', label: 'Hardware Issue' },
                { value: 'software', label: 'Software Issue' },
                { value: 'network', label: 'Network/Internet' },
                { value: 'account', label: 'Account Access' },
                { value: 'printer', label: 'Printer Issue' },
                { value: 'other', label: 'Other' },
              ]}
              error={errors.category?.message}
              {...register('category')}
            />

            <Input
              label="Subject *"
              placeholder="Brief description of the issue"
              error={errors.subject?.message}
              {...register('subject')}
            />

            <Select
              label="Urgency *"
              options={[
                { value: 'low', label: 'Low - Can wait a few days' },
                { value: 'medium', label: 'Medium - Need help soon' },
                { value: 'high', label: 'High - Urgent, blocking work' },
                { value: 'critical', label: 'Critical - System down' },
              ]}
              error={errors.urgency?.message}
              {...register('urgency')}
            />

            <Textarea
              label="Description *"
              placeholder="Please provide detailed information about your issue..."
              rows={6}
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
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

