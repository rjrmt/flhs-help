'use client';

import { LiquidBackground } from '@/components/LiquidBackground';
import { Ticket, FileText, AlertCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden safe-area-inset">
      {/* Enhanced Gradient Background - Optimized for mobile */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-900/30 via-background to-background -z-10" />
      <LiquidBackground />
      
      {/* Main Content Container - Mobile optimized padding and spacing */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 py-8 sm:py-12 md:py-16 safe-area-inset">
        {/* Header Section - Improved mobile spacing */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center mb-10 sm:mb-12 md:mb-16 max-w-4xl mx-auto w-full"
        >
          {/* Logo - Better mobile sizing */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="mb-6 sm:mb-8 flex justify-center"
          >
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40">
              <Image
                src="/logo.png"
                alt="Fort Lauderdale High School Logo"
                fill
                className="object-contain drop-shadow-2xl"
                priority
                sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 160px"
              />
            </div>
          </motion.div>
          
          {/* Title - Mobile optimized font sizes and line height */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 sm:mb-4 text-white drop-shadow-lg leading-tight sm:leading-tight"
          >
            FLHS IT Help Desk Hub
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/95 mb-6 sm:mb-8 font-normal leading-relaxed"
          >
            Fort Lauderdale High School
          </motion.p>

          {/* Contact Info - Larger touch target for mobile */}
          <motion.a
            href="tel:+19548046428"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-4 sm:px-8 sm:py-4 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-base sm:text-lg font-medium min-h-[52px] active:bg-white/20 active:scale-95 transition-all duration-200 shadow-lg"
          >
            <Phone className="w-5 h-5 sm:w-6 sm:h-5 flex-shrink-0" />
            <span>RJ: (954) 804-6428</span>
          </motion.a>
        </motion.div>

        {/* Main Action Cards - Better mobile stacking and spacing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
          className="w-full max-w-5xl mx-auto mb-10 sm:mb-12"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8 w-full">
            {/* Submit Ticket Card - Enhanced mobile design */}
            <Link href="/submit-ticket" className="group block w-full">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="h-full bg-white/12 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-7 md:p-8 border border-white/25 shadow-2xl active:bg-white/18 active:border-primary/60 transition-all duration-200 min-h-[180px] sm:min-h-[200px] flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-primary/25 flex items-center justify-center mb-5 sm:mb-6 group-active:bg-primary/35 transition-colors">
                    <Ticket className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">Submit an IT Ticket</h2>
                  <p className="text-white/75 text-sm sm:text-base">Tech Trouble?</p>
                </div>
              </motion.div>
            </Link>

            {/* Report Detention Card */}
            <Link href="/report-detention" className="group block w-full">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="h-full bg-white/12 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-7 md:p-8 border border-white/25 shadow-2xl active:bg-white/18 active:border-primary/60 transition-all duration-200 min-h-[180px] sm:min-h-[200px] flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-primary/25 flex items-center justify-center mb-5 sm:mb-6 group-active:bg-primary/35 transition-colors">
                    <AlertCircle className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">Report a Detention</h2>
                  <p className="text-white/75 text-sm sm:text-base">Submit detention information</p>
                </div>
              </motion.div>
            </Link>

            {/* Check Status Card */}
            <Link href="/status" className="group block w-full">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="h-full bg-white/12 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-7 md:p-8 border border-white/25 shadow-2xl active:bg-white/18 active:border-primary/60 transition-all duration-200 min-h-[180px] sm:min-h-[200px] flex flex-col justify-center"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-primary/25 flex items-center justify-center mb-5 sm:mb-6 group-active:bg-primary/35 transition-colors">
                    <FileText className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">Check Status</h2>
                  <p className="text-white/75 text-sm sm:text-base">View ticket or detention status</p>
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Footer - Better mobile readability */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
          className="text-center text-white/70 text-sm sm:text-base mt-auto pt-6 sm:pt-8 w-full max-w-4xl mx-auto px-5"
        >
          <p className="mb-2 leading-relaxed">Fort Lauderdale High School IT Department</p>
          <p className="text-xs sm:text-sm text-white/60">
            designed by{' '}
            <span className="underline decoration-white/50 underline-offset-2 active:text-white/80 transition-colors">
              RJ
            </span>
          </p>
        </motion.footer>
      </div>
    </main>
  );
}

