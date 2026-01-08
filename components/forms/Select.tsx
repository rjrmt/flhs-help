import React from 'react';
import { cn } from '@/lib/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200',
          'text-gray-900',
          'focus:outline-none focus:border-blue-500 focus:ring-0',
          'transition-all duration-200 text-base font-medium',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        style={{ boxShadow: 'none' }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

