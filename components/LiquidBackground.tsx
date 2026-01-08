'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

export function LiquidBackground() {
  const shouldReduceMotion = useReducedMotion();

  // Subtle background like testing hub - radial gradients instead of large blobs
  const baseAnimation = {
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* More vibrant blue gradients */}
      <motion.div
        className="absolute top-[12%] left-[12%] w-[38%] h-[38%] bg-primary/45 rounded-full blur-[38px]"
        animate={shouldReduceMotion ? {} : {
          opacity: [0.9, 1, 0.9],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 20,
          ...baseAnimation,
        }}
      />
      <motion.div
        className="absolute top-[20%] right-[20%] w-[38%] h-[38%] bg-primary-light/45 rounded-full blur-[38px]"
        animate={shouldReduceMotion ? {} : {
          opacity: [0.9, 1, 0.9],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 25,
          ...baseAnimation,
        }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[20%] w-[32%] h-[32%] bg-primary/40 rounded-full blur-[32px]"
        animate={shouldReduceMotion ? {} : {
          opacity: [0.9, 1, 0.9],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 30,
          ...baseAnimation,
        }}
      />
      <motion.div
        className="absolute top-[70%] right-[30%] w-[32%] h-[32%] bg-primary-light/35 rounded-full blur-[32px]"
        animate={shouldReduceMotion ? {} : {
          opacity: [0.9, 1, 0.9],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 28,
          ...baseAnimation,
        }}
      />
    </div>
  );
}

