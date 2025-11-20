'use client';
import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { db, initializeAuth, getStudentsCollection } from '@/lib/firebase';

// Import the enhanced Student interface
import { Student } from '@/lib/studentService';

// Utility function for conditional classes
const cx = (...classes: (string | undefined | null | false)[]): string => 
  classes.filter(Boolean).join(' ');

// Chip component for badges
function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm", className)}>
      {children}
    </span>
  );
}

// Stat card component
function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-content-center rounded-xl bg-white/10">
          {icon}
        </div>
        <div>
          <div className="text-xs text-white/60">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}

// Schedule row component
function ScheduleRow({ left, right, sub }: { left: string; right: React.ReactNode; sub: string }) {
  return (
    <div className="grid grid-cols-12 items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5">
      <div className="col-span-2 text-sm font-medium text-white/80">{left}</div>
      <div className="col-span-7 truncate text-sm">{right}</div>
      <div className="col-span-3 text-right text-xs text-white/60">{sub}</div>
    </div>
  );
}

// Header icon component
function HeaderIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-12 w-12 place-content-center rounded-2xl border border-white/10 bg-white/5">
      {children}
    </div>
  );
}

// Mock student data with enhanced structure based on Excel report
const mockStudents: Record<string, Student> = {
  '1234567890': {
    id: '1234567890',
    firstName: 'John',
    lastName: 'Smith',
    grade: '12',
    homeroom: 'A-201',
    email: 'john.smith@student.edu',
    phone: '555-1234',
    parentName: 'Jane Smith',
    parentPhone: '555-1234',
    parentEmail: 'jane.smith@email.com',
    gpa: 3.8,
    credits: 24,
    graduationYear: '2025',
    pbisPoints: 45,
    ttsCount: 3,
    ttcCount: 1,
    absences: 2,
    detentions: 0,
    suspensions: 0,
    photoUrl: '/images/default-student.jpg',
    lastTardy: '2025-01-15',
    lastAbsence: '2025-01-10',
    enrollmentDate: '2021-08-15',
    ruleTriggered: '5+ Tardies',
    alerts: [
      { type: 'tardy', level: 'warning', text: 'RULE TRIGGERED: 5+ Tardies', date: '2025-01-15' },
    ],
    schedule: [
      { period: '01', course: 'AICE ENG LANG AS', room: '17-1731', teacher: 'J. James', days: 'MTWThF', credits: 1 },
      { period: '02', course: 'NC STUDY HALL 1', room: '17-1744', teacher: 'S. Ripp', days: 'MTWThF', credits: 0 },
      { period: '03', course: 'MATH COLL ALGEBRA', room: '21-2146', teacher: 'T. Handverg', days: 'MTWThF', credits: 1 },
      { period: '04', course: 'AICE THINK SKLS 1 AS', room: '08-812', teacher: 'S. Dettholf', days: 'MTWThF', credits: 1 },
      { period: '05', course: 'HOPE-PE V', room: '04-254', teacher: 'A. Drucker', days: 'MTWThF', credits: 1 },
      { period: '06', course: 'GUITAR 1', room: '05-505', teacher: 'S. Martinez', days: 'MTWThF', credits: 1 },
      { period: '07', course: 'AICE MARINE SCI 1 AS', room: '21-2144', teacher: 'B. Montenegro', days: 'MTWThF', credits: 1 },
      { period: '08', course: 'AICE U.S. HIST 1 AS', room: '17-1751', teacher: 'J. Jiampetti', days: 'MTWThF', credits: 1 },
    ],
    notes: [
      'Parent contact 09/20, email on file confirmed.',
      'Prefers to be called "Johnny".',
      '504 plan — see accommodations.',
      'Excellent participation in class discussions.'
    ],
    lastUpdated: new Date().toISOString(),
  },
  '0987654321': {
    id: '0987654321',
    firstName: 'Sarah',
    lastName: 'Johnson',
    grade: '11',
    homeroom: 'B-105',
    email: 'sarah.johnson@student.edu',
    phone: '555-5678',
    parentName: 'Bob Johnson',
    parentPhone: '555-5678',
    parentEmail: 'bob.johnson@email.com',
    gpa: 4.0,
    credits: 18,
    graduationYear: '2026',
    pbisPoints: 78,
    ttsCount: 1,
    ttcCount: 0,
    absences: 0,
    detentions: 0,
    suspensions: 0,
    photoUrl: '/images/default-student.jpg',
    lastTardy: '2025-01-10',
    enrollmentDate: '2022-08-15',
    alerts: [],
    schedule: [
      { period: '01', course: 'AP ENGLISH LIT', room: '15-1501', teacher: 'M. Wilson', days: 'MTWThF', credits: 1 },
      { period: '02', course: 'AP CALCULUS AB', room: '22-2201', teacher: 'R. Chen', days: 'MTWThF', credits: 1 },
      { period: '03', course: 'AP CHEMISTRY', room: '23-2301', teacher: 'L. Rodriguez', days: 'MTWThF', credits: 1 },
      { period: '04', course: 'AP US HISTORY', room: '16-1601', teacher: 'K. Thompson', days: 'MTWThF', credits: 1 },
      { period: '05', course: 'SPANISH 3', room: '14-1401', teacher: 'A. Garcia', days: 'MTWThF', credits: 1 },
      { period: '06', course: 'ART STUDIO', room: '13-1301', teacher: 'P. Davis', days: 'MTWThF', credits: 1 },
      { period: '07', course: 'PHYSICS', room: '24-2401', teacher: 'J. Anderson', days: 'MTWThF', credits: 1 },
      { period: '08', course: 'STUDY HALL', room: '12-1201', teacher: 'T. Brown', days: 'MTWThF', credits: 0 },
    ],
    notes: [
      'Honor roll student.',
      'Active in debate club.',
      'College-bound, excellent grades.'
    ],
    lastUpdated: new Date().toISOString(),
  },
};


export default function HistoryPage() {
  // State management
  const [query, setQuery] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoized student data
  const currentStudent = useMemo(() => student, [student]);

  // Initialize Firebase auth
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user = await initializeAuth();
        setUserId(user);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsInitialized(true); // Still show UI even if auth fails
      }
    };
    
    initializeApp();
  }, []);

  // Handle scanner success
  const handleScannerSuccess = (scannedId: string) => {
    setQuery(scannedId);
    handleSearch(scannedId);
  };

  const handleSearch = async (searchQuery?: string) => {
    const searchTerm = searchQuery || query;
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Check if it's a 10-digit ID
      if (/^\d{10}$/.test(searchTerm)) {
        const result = await verifyStudent(searchTerm);
        if (result) {
          setStudent(result);
        } else {
          console.log('Student not found');
        }
      } else {
        // Handle name search (for future implementation)
        console.log('Name search not implemented yet');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const verifyStudent = async (id: string): Promise<Student | null> => {
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
          pbisPoints: data.pbisPoints || 0,
          photoUrl: data.photoUrl,
          lastTardy: data.lastTardy,
          ttsCount: data.ttsCount || 0,
          ttcCount: data.ttcCount || 0,
          ruleTriggered: data.ruleTriggered,
          alerts: data.alerts || [],
          schedule: data.schedule || [],
        } as Student;
      }
      return null;
    } catch (error) {
      console.error('Error verifying student:', error);
      return null;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setStudent(null);
    setIsLoading(false);
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
    <div className="min-h-screen bg-[#0b1020] text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1020]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#2e00df]" />
            <div className="text-lg font-semibold tracking-tight">FLHS Student Lookup</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={cx(
                "rounded-xl border px-3 py-1 text-sm transition",
                scanMode
                  ? "border-[#2e00df]/40 bg-[#2e00df]/20 text-[#bfc0ff]"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              )}
              onClick={() => setScanMode((v) => !v)}
              title="Toggle Scan Mode (auto-focus input, large text, sounds)"
            >
              {scanMode ? "Scan Mode: ON" : "Scan Mode"}
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10">Settings</button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="mx-auto max-w-6xl px-5 pt-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <BarcodeScanner
              onScanSuccess={handleScannerSuccess}
              placeholder="Scan ID or type name (e.g., 1234567890 or Smith, John)"
              className="flex-1"
              autoFocus={true}
              disabled={isLoading}
            />
            
            <button 
              onClick={() => handleSearch()}
              className="h-11 rounded-2xl bg-[#2e00df] px-5 text-sm font-medium shadow-[0_0_30px_#2e00df40] transition hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Student Card */}
      {currentStudent && (
        <div className="mx-auto mt-6 max-w-6xl px-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <HeaderIcon>
                  <div className="grid h-8 w-8 place-content-center rounded-full bg-white/10 text-sm font-semibold">
                    {currentStudent.firstName[0]}
                    {currentStudent.lastName[0]}
                  </div>
                </HeaderIcon>
                <div>
                  <div className="text-2xl font-semibold leading-tight">
                    {currentStudent.firstName} {currentStudent.lastName}
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    ID: {currentStudent.id} • Grade {currentStudent.grade}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip>Homeroom: {currentStudent.homeroom}</Chip>
                    {currentStudent.lastTardy && (
                      <Chip>Last Tardy: {new Date(currentStudent.lastTardy).toLocaleDateString()}</Chip>
                    )}
                    <Chip>TTS#{currentStudent.ttsCount}</Chip>
                    <Chip>TTC#{currentStudent.ttcCount}</Chip>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard label="PBIS Points" value={currentStudent.pbisPoints} icon={<span>⭐</span>} />
                <StatCard label="Tardy to School" value={currentStudent.ttsCount} icon={<span>⏰</span>} />
                <StatCard label="Tardy to Class" value={currentStudent.ttcCount} icon={<span>🏫</span>} />
              </div>
            </div>

            {/* Alerts */}
            {currentStudent.alerts?.length ? (
              <div className="mt-4 space-y-2">
                {currentStudent.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm",
                      a.level === "warning"
                        ? "border-red-500/30 bg-red-500/10 text-red-200"
                        : "border-white/10 bg-white/5 text-white"
                    )}
                  >
                    <span>⚠️</span>
                    <span className="font-medium">{a.text}</span>
                    <div className="ml-auto text-xs opacity-80">Auto-rule</div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Log Tardy</button>
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Add PBIS</button>
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Email Teacher</button>
              <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">Print Pass</button>
              <button 
                onClick={clearSearch}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule & History */}
      {currentStudent && (
        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 px-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Today&apos;s Schedule</div>
              <div className="text-xs text-white/60">Rotation: Day A • Lunch A</div>
            </div>
            <div className="mt-2 divide-y divide-white/10">
              {currentStudent.schedule?.map((c) => (
                <ScheduleRow
                  key={c.period}
                  left={`P${c.period}`}
                  right={
                    <span className="truncate">
                      <span className="font-medium">{c.course}</span>
                      <span className="text-white/50"> • {c.teacher}</span>
                    </span>
                  }
                  sub={`${c.room} • ${c.days}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold">Notes</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                <li>Parent contact 09/20, email on file confirmed.</li>
                <li>Prefers to be called &quot;{currentStudent.firstName}&quot;.</li>
                <li>504 plan — see accommodations.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-lg font-semibold">History</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span>PBIS +5 — Respect</span>
                  <span className="text-white/60">2025-10-12</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span>Tardy to Class — P3</span>
                  <span className="text-white/60">2025-10-10</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                  <span>Detention assigned — Auto</span>
                  <span className="text-white/60">2025-10-10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mx-auto mt-10 max-w-6xl px-5 pb-10 text-center text-xs text-white/50">
        v0.1 • Built with Tailwind • Accent #2e00df
      </div>
    </div>
  );
}
