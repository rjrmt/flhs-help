'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Textarea } from './forms/Textarea';
import { Select } from './forms/Select';
import { Settings } from 'lucide-react';

const updateSchema = z.object({
  status: z.string().min(1),
  note: z.string().min(5, 'Note must be at least 5 characters'),
  isInternal: z.boolean().default(false),
});

type UpdateFormData = z.infer<typeof updateSchema>;

export function UpdateDetentionForm({ detentionId, currentStatus }: { detentionId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: currentStatus,
      isInternal: false,
    },
  });

  const onSubmit = async (data: UpdateFormData) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/detentions/${detentionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update detention');
      }

      reset();
      router.refresh();
    } catch (error) {
      console.error('Error updating detention:', error);
      alert('Failed to update detention. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        Update Detention
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Status"
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'attended', label: 'Attended' },
            { value: 'missed', label: 'Missed' },
          ]}
          error={errors.status?.message}
          {...register('status')}
        />

        <Textarea
          label="Add Note"
          placeholder="Add an update or note..."
          rows={4}
          error={errors.note?.message}
          {...register('note')}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isInternal"
            {...register('isInternal')}
            className="w-4 h-4 rounded bg-surface border-surface-light"
          />
          <label htmlFor="isInternal" className="text-sm text-text-secondary">
            Internal note
          </label>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Updating...' : 'Update Detention'}
        </Button>
      </form>
    </Card>
  );
}

