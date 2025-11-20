'use client';
import { Bell, Sun, Moon, Search } from "lucide-react";
import Image from "next/image";
import { useTheme } from 'next-themes';
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SiteHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { theme, setTheme } = useTheme();
  const [notifications] = useState(3);

  // Bind Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); onOpenSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenSearch]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 dark:border-white/10 glass-header shadow-lg pt-[env(safe-area-inset-top)]">
      <div className="container flex h-12 py-2 items-center justify-between px-4 mx-auto max-w-7xl">
        
        {/* Left: Logo & Brand */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl shadow-xl">
              <Image 
                src="/images/logo.svg" 
                alt="App Logo" 
                width={32} 
                height={32} 
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">EduHub</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Faculty Portal</p>
            </div>
          </div>
        </div>

        {/* Center: Search (Desktop) */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <Button 
            variant="outline" 
            onClick={onOpenSearch}
            className="w-full justify-start text-muted-foreground bg-muted/50 border-muted-foreground/20 hover:bg-muted hover:text-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Search tools and features...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
          {/* Mobile Search Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onOpenSearch}
            className="md:hidden min-h-[44px] min-w-[44px]"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative min-h-[44px] min-w-[44px]">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notifications}
              </Badge>
            )}
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="min-h-[44px] min-w-[44px]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User Auth */}
          <div className="ml-2">
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <>
                <SignedIn>
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8"
                      }
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                    <SignInButton mode="modal" />
                  </Button>
                  <Button variant="outline" size="sm" className="sm:hidden rounded-full px-3 py-1.5 text-[12.5px]">
                    Sign in
                  </Button>
                </SignedOut>
              </>
            ) : (
              <Button variant="outline" size="sm" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-full px-3 py-1.5 text-[12.5px]">
                Demo Mode
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
