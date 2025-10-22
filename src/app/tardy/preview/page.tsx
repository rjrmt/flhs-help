'use client';

import { useState } from 'react';
import { LiveScanCard } from '@/components/LiveScanCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { tokens, glassEffect } from '@/lib/tokens';

// Mock student data for preview
const mockStudents = {
  '1234567890': {
    id: '1234567890',
    firstName: 'John',
    lastName: 'Smith',
    grade: '12',
    homeroom: 'A-201',
    lastTardy: '2024-01-15T08:15:00Z',
    ttsCount: 3,
    ttcCount: 1,
    ruleTriggered: '5+ Tardies',
  },
  '0987654321': {
    id: '0987654321',
    firstName: 'Sarah',
    lastName: 'Johnson',
    grade: '11',
    homeroom: 'B-105',
    lastTardy: '2024-01-10T08:20:00Z',
    ttsCount: 1,
    ttcCount: 0,
  },
};

export default function PreviewPage() {
  const [currentDemo, setCurrentDemo] = useState<'live-scan' | 'components'>('live-scan');

  const handleVerify = async (id: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockStudents[id as keyof typeof mockStudents] || null;
  };

  const handleExcuse = async (id: string, reason: string) => {
    console.log('Excuse student:', id, 'Reason:', reason);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleUndo = async (logId: string) => {
    console.log('Undo log:', logId);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleLogTardy = async (id: string) => {
    console.log('Log tardy for:', id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      logId: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      ttsNumber: mockStudents[id as keyof typeof mockStudents]?.ttsCount + 1 || 1,
    };
  };

  return (
    <div style={{ backgroundColor: tokens.colors.canvas }}>
      {/* Demo Navigation */}
      <div className="fixed top-4 left-4 right-4 z-50">
        <Card 
          className="p-3"
          style={{
            background: glassEffect.background,
            backdropFilter: glassEffect.backdropFilter,
            border: `1px solid ${tokens.colors.glass.border}`,
          }}
        >
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={currentDemo === 'live-scan' ? 'default' : 'outline'}
              onClick={() => setCurrentDemo('live-scan')}
              className="flex-1"
            >
              Live Scan Card
            </Button>
            <Button
              size="sm"
              variant={currentDemo === 'components' ? 'default' : 'outline'}
              onClick={() => setCurrentDemo('components')}
              className="flex-1"
            >
              Components
            </Button>
          </div>
        </Card>
      </div>

      {/* Demo Content */}
      <div className="pt-20">
        {currentDemo === 'live-scan' && (
          <LiveScanCard
            onVerify={handleVerify}
            onExcuse={handleExcuse}
            onUndo={handleUndo}
            onLogTardy={handleLogTardy}
          />
        )}

        {currentDemo === 'components' && (
          <div className="max-w-md mx-auto px-4 py-6 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Component Demo</h1>
              <p className="text-slate-400">Interactive preview of all components</p>
            </div>

            {/* Test IDs */}
            <Card 
              className="p-4"
              style={{
                background: glassEffect.background,
                backdropFilter: glassEffect.backdropFilter,
                border: `1px solid ${tokens.colors.glass.border}`,
              }}
            >
              <h3 className="text-white font-medium mb-3">Test Student IDs</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">John Smith (Grade 12)</span>
                  <code className="text-blue-400 text-sm">1234567890</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Sarah Johnson (Grade 11)</span>
                  <code className="text-blue-400 text-sm">0987654321</code>
                </div>
              </div>
            </Card>

            {/* Feature List */}
            <Card 
              className="p-4"
              style={{
                background: glassEffect.background,
                backdropFilter: glassEffect.backdropFilter,
                border: `1px solid ${tokens.colors.glass.border}`,
              }}
            >
              <h3 className="text-white font-medium mb-3">Features Demo</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• Auto-verify on 10 digits + Enter</li>
                <li>• Success pulse animation</li>
                <li>• Undo toast (10s duration)</li>
                <li>• Excuse reasons sheet</li>
                <li>• Student details disclosure</li>
                <li>• Red highlight for overdue tardies</li>
                <li>• Print pass generation</li>
                <li>• Reduced motion support</li>
              </ul>
            </Card>

            {/* Print Pass Link */}
            <Card 
              className="p-4"
              style={{
                background: glassEffect.background,
                backdropFilter: glassEffect.backdropFilter,
                border: `1px solid ${tokens.colors.glass.border}`,
              }}
            >
              <h3 className="text-white font-medium mb-3">Print Pass Demo</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => window.open('/pass/12345', '_blank')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  View John Smith Pass
                </Button>
                <Button
                  onClick={() => window.open('/pass/67890', '_blank')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  View Sarah Johnson Pass
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
