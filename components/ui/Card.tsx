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
  glass = true,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        glass ? 'glass-strong' : 'bg-surface border border-surface-light',
        hover && 'hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

