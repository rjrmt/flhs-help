'use client';

import { LiquidBackground } from '@/components/LiquidBackground';
import { ActionCard } from '@/components/ActionCard';
import { Ticket, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <main className="min-h-screen relative">
      <LiquidBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-surface-light rounded-full flex items-center justify-center border-2 border-primary/50">
              <span className="text-4xl font-bold text-primary">L</span>
            </div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-primary-light bg-clip-text text-transparent"
          >
            FLHS IT Help Desk Hub
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-text-secondary text-lg mb-2"
          >
            Need help? We&apos;re here for you.
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-primary font-medium"
          >
            RJ: (954) 804-6428
          </motion.p>
        </div>

        {/* Action Cards */}
        <div className="max-w-2xl mx-auto space-y-4 mb-16">
          <ActionCard
            title="Submit an IT Ticket"
            subtitle="Tech Trouble?"
            icon={Ticket}
            href="/submit-ticket"
            delay={0.4}
          />
          <ActionCard
            title="Report a Detention"
            subtitle="Submit detention information"
            icon={AlertCircle}
            href="/report-detention"
            delay={0.5}
          />
          <ActionCard
            title="Check Status"
            subtitle="View ticket or detention status"
            icon={FileText}
            href="/status"
            delay={0.6}
          />
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-text-secondary text-sm"
        >
          <p>Fort Lauderdale High School IT Department</p>
        </motion.footer>
      </div>
    </main>
  );
}

