'use client';
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { LiveScanCard } from '@/components/LiveScanCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { BatchLogScanner } from '@/components/BatchLogScanner';
import { DailyReviewList } from '@/components/DailyReviewList';
import { db, initializeAuth, getStudentsCollection, getTardyLogsCollection } from '@/lib/firebase';

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

interface LogEntry {
  logId: string;
  studentId: string;
  studentName: string; // Stored for easier display
  timestamp: string;
  status: 'LOGGED' | 'EXCUSED';
}

type AppMode = 'SINGLE_SCAN' | 'BATCH_LOG' | 'DAILY_REVIEW';

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
  // State management
  const [appMode, setAppMode] = useState<AppMode>('SINGLE_SCAN');
  const [dailyLogs, setDailyLogs] = useState<LogEntry[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Firebase auth and set up real-time listeners
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user = await initializeAuth();
        setUserId(user);
        
        // Check if we're in demo mode
        const isDemoMode = user === 'demo-user-123';
        
        if (isDemoMode) {
          console.log('Running in demo mode - using mock data');
          setIsInitialized(true);
          return;
        }
        
        // Set up real-time listener for daily logs
        const logsCollection = collection(db, getTardyLogsCollection(user));
        const unsubscribe = onSnapshot(logsCollection, (snapshot) => {
          const logs: LogEntry[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
              logId: doc.id,
              studentId: data.studentId,
              studentName: data.studentName,
              timestamp: data.timestamp,
              status: data.status,
            });
          });
          
          // Sort by timestamp in memory (newest first)
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setDailyLogs(logs);
        });
        
        setIsInitialized(true);
        
        // Cleanup listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsInitialized(true); // Still show UI even if auth fails
      }
    };
    
    initializeApp();
  }, []);

  const handleVerify = async (id: string) => {
    // Check if we're in demo mode
    if (userId === 'demo-user-123') {
      // Use mock data for demo
      return mockStudents[id] || null;
    }

    try {
      // Query Firestore for student data
      const studentDoc = await getDoc(doc(db, getStudentsCollection(), id));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return {
          id: studentDoc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          grade: data.grade,
          homeroom: data.homeroom,
          lastTardy: data.lastTardy,
          ttsCount: data.ttsCount || 0,
          ttcCount: data.ttcCount || 0,
          ruleTriggered: data.ruleTriggered,
        } as Student;
      }
      return null;
    } catch (error) {
      console.error('Error verifying student:', error);
      return null;
    }
  };

  const handleExcuse = async (id: string, reason: string) => {
    // Check if we're in demo mode
    if (userId === 'demo-user-123') {
      console.log('Demo mode: Excuse student:', id, 'Reason:', reason);
      return;
    }

    try {
      // Find the log to excuse
      const logToExcuse = dailyLogs.find(log => log.studentId === id && log.status === 'LOGGED');
      if (logToExcuse) {
        // Update the log status to EXCUSED
        await addDoc(collection(db, getTardyLogsCollection(userId)), {
          ...logToExcuse,
          status: 'EXCUSED',
          excuseReason: reason,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error excusing student:', error);
    }
  };

  const handleUndo = async (logId: string) => {
    // Check if we're in demo mode
    if (userId === 'demo-user-123') {
      console.log('Demo mode: Undo log:', logId);
      // Remove from daily logs in demo mode
      setDailyLogs(prev => prev.filter(log => log.logId !== logId));
      return;
    }

    try {
      // Delete the log from Firestore
      const logRef = doc(db, getTardyLogsCollection(userId), logId);
      await deleteDoc(logRef);
    } catch (error) {
      console.error('Error undoing log:', error);
    }
  };

  const handleLogTardy = async (id: string) => {
    // Check if we're in demo mode
    if (userId === 'demo-user-123') {
      // Use mock data for demo
      const student = mockStudents[id];
      if (!student) throw new Error('Student not found');
      
      const logEntry: LogEntry = {
        logId: `log_${Date.now()}`,
        studentId: id,
        studentName: `${student.firstName} ${student.lastName}`,
        timestamp: new Date().toISOString(),
        status: 'LOGGED',
      };
      
      // Add to daily logs in demo mode
      setDailyLogs(prev => [logEntry, ...prev]);
      
      return {
        logId: logEntry.logId,
        timestamp: logEntry.timestamp,
        ttsNumber: student.ttsCount + 1,
      };
    }

    try {
      // Get student data
      const student = await handleVerify(id);
      if (!student) throw new Error('Student not found');
      
      // Create log entry in Firestore
      const logData = {
        studentId: id,
        studentName: `${student.firstName} ${student.lastName}`,
        timestamp: new Date().toISOString(),
        status: 'LOGGED',
        grade: student.grade,
        homeroom: student.homeroom,
        ttsNumber: student.ttsCount + 1,
      };
      
      const docRef = await addDoc(collection(db, getTardyLogsCollection(userId)), logData);
      
      return {
        logId: docRef.id,
        timestamp: logData.timestamp,
        ttsNumber: logData.ttsNumber,
      };
    } catch (error) {
      console.error('Error logging tardy:', error);
      throw error;
    }
  };

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <DashboardHeader 
        currentMode={appMode} 
        onModeChange={handleModeChange}
        userId={userId}
      />
      
      <main className="max-w-md mx-auto px-4 py-6">
        {appMode === 'SINGLE_SCAN' && (
          <LiveScanCard
            onVerify={handleVerify}
            onExcuse={handleExcuse}
            onUndo={handleUndo}
            onLogTardy={handleLogTardy}
          />
        )}
        
        {appMode === 'BATCH_LOG' && (
          <BatchLogScanner
            onLogTardy={handleLogTardy}
            dailyLogs={dailyLogs}
            onExitBatch={() => setAppMode('SINGLE_SCAN')}
          />
        )}
        
        {appMode === 'DAILY_REVIEW' && (
          <DailyReviewList
            dailyLogs={dailyLogs}
            onUndo={handleUndo}
            onExcuse={handleExcuse}
          />
        )}
      </main>
    </div>
  );
}
