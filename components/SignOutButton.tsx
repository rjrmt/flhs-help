'use client';

import { signOut } from 'next-auth/react';
import { Button } from './ui/Button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  );
}

