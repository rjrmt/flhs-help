'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface HomeButtonProps {
  variant?: 'fixed' | 'relative';
}

export function HomeButton({ variant }: HomeButtonProps = {}) {
  const pathname = usePathname();
  
  // Don't show on homepage
  if (pathname === '/') {
    return null;
  }

  // Check if we're on a light background page (dashboard/admin pages)
  const isLightBackground = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  
  // Determine variant based on pathname if not explicitly provided
  const buttonVariant = variant || (isLightBackground ? 'fixed' : 'relative');

  const containerClasses = buttonVariant === 'fixed' 
    ? 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]'
    : 'w-full flex justify-center mt-6';

  const containerStyle = buttonVariant === 'fixed' 
    ? {
        position: 'fixed' as const,
        bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        pointerEvents: 'auto' as const,
        width: 'auto' as const,
        maxWidth: 'calc(100vw - 32px)',
      }
    : {
        paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={containerClasses}
      style={containerStyle}
    >
      <Link
        href="/"
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 relative overflow-hidden group shadow-lg ${
          isLightBackground 
            ? 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50' 
            : 'bg-white/90 backdrop-blur-[40px] border-2 border-white/40 text-gray-800'
        }`}
        style={{
          ...(isLightBackground ? {
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
          } : {
            boxShadow: `
              0 6px 20px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.5) inset,
              0 2px 0 rgba(255, 255, 255, 0.6) inset,
              0 0 30px rgba(59, 130, 246, 0.2)
            `,
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#1e293b',
          }),
        }}
        onMouseEnter={(e) => {
          if (isLightBackground) {
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.borderColor = '#1e5a8f';
          } else {
            e.currentTarget.style.boxShadow = `
              0 8px 25px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.6) inset,
              0 2px 0 rgba(255, 255, 255, 0.7) inset,
              0 0 35px rgba(59, 130, 246, 0.3)
            `;
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.color = '#0f172a';
          }
        }}
        onMouseLeave={(e) => {
          if (isLightBackground) {
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.transform = '';
            e.currentTarget.style.borderColor = '';
          } else {
            e.currentTarget.style.boxShadow = `
              0 6px 20px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.5) inset,
              0 2px 0 rgba(255, 255, 255, 0.6) inset,
              0 0 30px rgba(59, 130, 246, 0.2)
            `;
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.transform = '';
            e.currentTarget.style.color = '#1e293b';
          }
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = isLightBackground ? 'translateY(-2px) scale(1.02)' : 'translateY(-2px) scale(1)';
        }}
      >
        <Home className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
        <span className="relative z-10">Home</span>
        <span 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: isLightBackground 
              ? 'linear-gradient(135deg, rgba(30, 90, 143, 0.1) 0%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, transparent 100%)',
          }}
        />
      </Link>
    </motion.div>
  );
}
