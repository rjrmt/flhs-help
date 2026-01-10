'use client';

import { LiquidBackground } from '@/components/LiquidBackground';
import { MessageCircle, FileText, ClipboardList, Mail, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { DaySchedule } from '@/components/DaySchedule';
import { BellSchedule } from '@/components/BellSchedule';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function HomePage() {
  return (
    <main className="h-screen relative flex items-center justify-center p-2.5 safe-area-inset overflow-x-hidden" style={{ padding: '10px' }}>
      {/* Background - Match testing hub exactly */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.28) 0, transparent 38%),
            radial-gradient(circle at 82% 20%, rgba(99, 102, 241, 0.28) 0, transparent 38%),
            radial-gradient(circle at 30% 80%, rgba(234, 179, 8, 0.22) 0, transparent 32%),
            radial-gradient(circle at 60% 50%, rgba(59, 130, 246, 0.18) 0, transparent 42%),
            radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.18) 0, transparent 38%),
            linear-gradient(145deg, #0a1c3c 0%, #0f2f5d 45%, #09172f 100%)
          `,
        }}
      />
      
      {/* Main Container - Compact and centered */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 max-w-[420px] w-full bg-white/12 backdrop-blur-[50px] rounded-3xl border border-white/22 shadow-2xl overflow-hidden flex flex-col mx-auto my-auto"
        style={{
          padding: '16px 18px',
          boxShadow: `
            0 12px 40px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.25) inset,
            0 2px 0 rgba(255, 255, 255, 0.35) inset,
            0 0 60px rgba(59, 130, 246, 0.1)
          `,
          WebkitBackdropFilter: 'blur(50px) saturate(200%)',
        }}
      >
        {/* Container background overlay */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-85"
          style={{
            background: `
              radial-gradient(circle at 12% 8%, rgba(59, 130, 246, 0.25) 0, transparent 38%),
              radial-gradient(circle at 88% 18%, rgba(99, 102, 241, 0.25) 0, transparent 38%),
              radial-gradient(circle at 20% 90%, rgba(234, 179, 8, 0.18) 0, transparent 32%),
              radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.18) 0, transparent 32%),
              linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)
            `,
            animation: 'backgroundShift 20s ease-in-out infinite',
          }}
        />

        {/* Top shimmer bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] z-[1] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.7) 15%, rgba(255, 255, 255, 0.6) 30%, rgba(99, 102, 241, 0.7) 50%, rgba(255, 255, 255, 0.6) 70%, rgba(59, 130, 246, 0.7) 85%, transparent 100%)',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.4), 0 0 12px rgba(99, 102, 241, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)',
            animation: 'shimmer 3s ease-in-out infinite',
          }}
        />
        
        {/* Content */}
        <div className="relative z-[2] flex flex-col">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-[60px] h-[60px] mx-auto mb-3"
          style={{
            filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.35))',
          }}
        >
          <Image
            src="/logo.png"
            alt="Fort Lauderdale High School Logo"
            fill
            className="object-contain"
            priority
            sizes="60px"
          />
        </motion.div>
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-2xl font-extrabold mb-1 text-white leading-tight"
          style={{
            letterSpacing: '-0.6px',
            textShadow: '0 3px 12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.15)',
          }}
        >
          FLHS IT Help Desk Hub
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-white mb-3 font-medium"
          style={{
            letterSpacing: '0.2px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          Fort Lauderdale High School
        </motion.p>

        {/* Day Schedule */}
        <ErrorBoundary>
          <div className="relative z-[2] w-full">
            <DaySchedule />
          </div>
        </ErrorBoundary>

        {/* Bell Schedule */}
        <ErrorBoundary>
          <div className="relative z-[2] w-full">
            <BellSchedule />
          </div>
        </ErrorBoundary>

        {/* Contact Info */}
        <motion.a
          href="mailto:rajesh.ramautar@browardschools.com"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-4 py-2 mx-auto mb-4 w-full max-w-full bg-black/75 backdrop-blur-[35px] rounded-2xl border border-white/25 text-white text-sm font-semibold transition-all duration-300 relative overflow-hidden group"
          style={{
            boxShadow: `
              0 6px 20px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.18) inset,
              0 2px 0 rgba(255, 255, 255, 0.25) inset,
              0 0 25px rgba(59, 130, 246, 0.35)
            `,
            WebkitBackdropFilter: 'blur(35px) saturate(200%)',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `
              0 10px 30px rgba(0, 0, 0, 0.45),
              0 0 0 1px rgba(255, 255, 255, 0.25) inset,
              0 2px 0 rgba(255, 255, 255, 0.35) inset,
              0 0 40px rgba(59, 130, 246, 0.5)
            `;
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `
              0 6px 20px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.18) inset,
              0 2px 0 rgba(255, 255, 255, 0.25) inset,
              0 0 25px rgba(59, 130, 246, 0.35)
            `;
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
        >
          <Mail className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
          <span className="relative z-10">Email RJ</span>
          <span 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, transparent 100%)',
            }}
          />
        </motion.a>

        {/* Action Cards - More spacing */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid grid-cols-3 gap-4 mb-4 w-full flex-shrink-0"
        >
          {/* Submit Ticket */}
          <Link href="/submit-ticket" className="group block w-full">
            <motion.div
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="flex flex-col items-center justify-center p-4 bg-white/15 backdrop-blur-[40px] rounded-[20px] border border-white/20 text-white min-h-[95px] transition-all duration-300 relative overflow-hidden"
              style={{
                boxShadow: `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 8px 25px rgba(0, 0, 0, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.3),
                  0 0 30px rgba(46, 0, 223, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <MessageCircle className="w-7 h-7 text-primary mb-2 drop-shadow-md group-hover:drop-shadow-lg transition-all duration-300" />
              </motion.div>
              <span 
                className="text-xs font-semibold text-center leading-tight line-clamp-2 px-1 relative z-10"
                style={{ wordBreak: 'break-word', textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}
              >
                Submit Ticket
              </span>
            </motion.div>
          </Link>

          {/* Report Detention */}
          <Link href="/report-detention" className="group block w-full">
            <motion.div
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="flex flex-col items-center justify-center p-4 bg-white/15 backdrop-blur-[40px] rounded-[20px] border border-white/20 text-white min-h-[95px] transition-all duration-300 relative overflow-hidden"
              style={{
                boxShadow: `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 8px 25px rgba(0, 0, 0, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.3),
                  0 0 30px rgba(46, 0, 223, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3
                }}
              >
                <ClipboardList className="w-7 h-7 text-primary mb-2 drop-shadow-md group-hover:drop-shadow-lg transition-all duration-300" />
              </motion.div>
              <span 
                className="text-xs font-semibold text-center leading-tight line-clamp-2 px-1 relative z-10"
                style={{ wordBreak: 'break-word', textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}
              >
                Report Detention
              </span>
            </motion.div>
          </Link>

          {/* Check Status */}
          <Link href="/status" className="group block w-full">
            <motion.div
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="flex flex-col items-center justify-center p-4 bg-white/15 backdrop-blur-[40px] rounded-[20px] border border-white/20 text-white min-h-[95px] transition-all duration-300 relative overflow-hidden"
              style={{
                boxShadow: `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 8px 25px rgba(0, 0, 0, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.3),
                  0 0 30px rgba(46, 0, 223, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6
                }}
              >
                <FileText className="w-7 h-7 text-primary mb-2 drop-shadow-md group-hover:drop-shadow-lg transition-all duration-300" />
              </motion.div>
              <span 
                className="text-xs font-semibold text-center leading-tight line-clamp-2 px-1 relative z-10"
                style={{ wordBreak: 'break-word', textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}
              >
                Check Status
              </span>
            </motion.div>
          </Link>
        </motion.div>

        {/* Admin Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="w-full"
        >
          <Link href="/admin" className="group block w-full">
            <motion.div
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02, y: -3 }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-[40px] rounded-xl border border-white/20 text-white transition-all duration-300 relative overflow-hidden"
              style={{
                boxShadow: `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 8px 25px rgba(0, 0, 0, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.3),
                  0 0 30px rgba(46, 0, 223, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.4)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = `
                  0 4px 16px rgba(0, 0, 0, 0.3),
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `;
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <Shield className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-semibold relative z-10" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)' }}>
                Admin Console
              </span>
            </motion.div>
          </Link>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-xs text-white/85 mt-auto pt-1.5 leading-relaxed"
          style={{
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
          }}
        >
          <p className="mb-0.5">FLHS IT Department</p>
          <p className="text-white/75">
            designed by{' '}
            <span className="underline decoration-white/60 underline-offset-[2px] font-bold">
              RJ
            </span>
          </p>
        </motion.footer>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes welcomeFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes buttonFadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backgroundShift {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </main>
  );
}
