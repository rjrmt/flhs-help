'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from './Textarea';
import { Select } from './Select';
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
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
        <Settings className="w-5 h-5" style={{ color: '#2E75B6' }} />
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
            className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isInternal" className="text-sm text-gray-700">
            Internal note (not visible to requester)
          </label>
        </div>

        <Button 
          type="submit" 
          variant="primary" 
          className="w-full" 
          disabled={loading}
          style={{
            background: loading ? 'gray' : 'linear-gradient(135deg, #2E75B6 0%, #1e5a8f 100%)',
            boxShadow: '0 2px 8px rgba(46, 117, 182, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 117, 182, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(46, 117, 182, 0.3)';
            }
          }}
        >
          {loading ? 'Updating...' : 'Update Detention'}
        </Button>
      </form>
    </Card>
  );
}

