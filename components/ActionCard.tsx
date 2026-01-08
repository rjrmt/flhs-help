'use client';

import { Card } from './ui/Card';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { IconType } from 'lucide-react';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: IconType;
  href: string;
  delay?: number;
}

export function ActionCard({ title, subtitle, icon: Icon, href, delay = 0 }: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={href}>
        <Card hover glass>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">{title}</h3>
              <p className="text-text-secondary text-sm">{subtitle}</p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

