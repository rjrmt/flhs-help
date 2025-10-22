'use client';
import { LiveScanCard } from '@/components/LiveScanCard';

// Types
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  homeroom: string;
  lastTardy?: string;
  ttsCount: number;
  ttcCount: number;
  ruleTriggered?: string;
}

// Mock student data - in a real app this would come from an API
const mockStudents: Record<string, Student> = {
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

export default function TardyLogPage() {
  const handleVerify = async (id: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockStudents[id] || null;
  };

  const handleExcuse = async (id: string, reason: string) => {
    console.log('Excuse student:', id, 'Reason:', reason);
    // In a real app, this would save to a database
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleUndo = async (logId: string) => {
    console.log('Undo log:', logId);
    // In a real app, this would undo the tardy log
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleLogTardy = async (id: string) => {
    console.log('Log tardy for:', id);
    // In a real app, this would save to a database
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      logId: `log_${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      ttsNumber: mockStudents[id]?.ttsCount + 1 || 1,
    };
  };

  return (
    <LiveScanCard
      onVerify={handleVerify}
      onExcuse={handleExcuse}
      onUndo={handleUndo}
      onLogTardy={handleLogTardy}
    />
  );
}
