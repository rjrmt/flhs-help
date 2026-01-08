import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  glass = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300 bg-white border border-gray-200 shadow-sm',
        hover && 'hover:shadow-md hover:border-gray-300 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

