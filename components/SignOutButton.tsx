'use client';

import { signOut } from 'next-auth/react';
import { Button } from './ui/Button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SignOutButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SignOutButton({ className, size = 'md' }: SignOutButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={() => signOut({ callbackUrl: '/' })}
      className={cn(className)}
    >
      <LogOut className="w-4 h-4 mr-2 shrink-0" />
      <span className="whitespace-nowrap">Sign Out</span>
    </Button>
  );
}

