'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

export function LiquidBackground() {
  const shouldReduceMotion = useReducedMotion();

  // Optimized for mobile - fewer/smaller blobs
  const baseAnimation = {
    repeat: Infinity,
    ease: 'easeInOut' as const,
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Optimized liquid effects - smaller on mobile for better performance */}
      <motion.div
        className="absolute -top-1/2 -left-1/4 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] bg-primary/35 sm:bg-primary/40 rounded-full blur-[100px] sm:blur-[120px]"
        animate={shouldReduceMotion ? {} : {
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 20,
          ...baseAnimation,
        }}
      />
      <motion.div
        className="absolute top-1/2 -right-1/4 w-[350px] h-[350px] sm:w-[450px] sm:h-[450px] md:w-[500px] md:h-[500px] bg-primary/25 sm:bg-primary/30 rounded-full blur-[90px] sm:blur-[100px]"
        animate={shouldReduceMotion ? {} : {
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 0.9, 1],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 25,
          ...baseAnimation,
        }}
      />
      <motion.div
        className="absolute -bottom-1/4 left-1/3 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] bg-primary/30 sm:bg-primary/35 rounded-full blur-[80px] sm:blur-[110px]"
        animate={shouldReduceMotion ? {} : {
          x: [0, 60, 0],
          y: [0, -60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 30,
          ...baseAnimation,
        }}
      />
    </div>
  );
}

