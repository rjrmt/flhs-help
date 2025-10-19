'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubHeader } from '@/components/SubHeader';
import { QuickBar } from '@/components/QuickBar';
import { Clock, User, School, GraduationCap, CheckCircle, XCircle, Search } from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  class: string;
  tardyCount: number;
  lastTardy?: string;
}

// Mock student data - in a real app this would come from an API
const mockStudents: Student[] = [
  {
    id: '12345',
    firstName: 'John',
    lastName: 'Smith',
    school: 'FLHS',
    class: '2025',
    tardyCount: 3,
    lastTardy: '2024-01-15 08:15'
  },
  {
    id: '67890',
    firstName: 'Sarah',
    lastName: 'Johnson',
    school: 'FLHS',
    class: '2024',
    tardyCount: 1,
    lastTardy: '2024-01-10 08:20'
  }
];

export default function TardyLogPage() {
  const [studentId, setStudentId] = useState('');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [recentTardies, setRecentTardies] = useState<Student[]>([]);

  // Auto-focus input on mount
  useEffect(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }, []);

  // Handle numeric input only
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setStudentId(value);
  };

  const handleVerify = () => {
    const student = mockStudents.find(s => s.id === studentId);
    if (student) {
      setCurrentStudent(student);
      setIsVerified(true);
      // Add to recent tardies
      setRecentTardies(prev => [student, ...prev.slice(0, 4)]);
    } else {
      setCurrentStudent(null);
      setIsVerified(false);
    }
  };

  const handleReport = () => {
    if (currentStudent && isVerified) {
      // In a real app, this would save to a database
      const updatedStudent = {
        ...currentStudent,
        tardyCount: currentStudent.tardyCount + 1,
        lastTardy: new Date().toLocaleString()
      };
      
      // Update the student in our mock data
      const studentIndex = mockStudents.findIndex(s => s.id === currentStudent.id);
      if (studentIndex !== -1) {
        mockStudents[studentIndex] = updatedStudent;
        setCurrentStudent(updatedStudent);
        setRecentTardies(prev => [updatedStudent, ...prev.slice(0, 4)]);
      }
    }
  };

  const clearForm = () => {
    setStudentId('');
    setCurrentStudent(null);
    setIsVerified(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-safe">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-900/20 to-blue-700/20 rounded-full blur-xl floating-element"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-600/20 to-blue-400/20 rounded-full blur-xl floating-element" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-1/3 w-28 h-28 bg-gradient-to-r from-blue-500/20 to-blue-300/20 rounded-full blur-xl floating-element" style={{animationDelay: '4s'}}></div>
      </div>

      <main className="max-w-4xl mx-auto relative z-10 min-h-screen flex flex-col">
        <SubHeader title="Tardy Log" />
        <QuickBar />

        <div className="flex-1 px-4 pb-4">
          {/* Student Lookup Card */}
          <Card className="mb-4 bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-blue-400" />
              <h2 className="text-[15px] font-semibold text-white">Student Lookup</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate-300 mb-1">
                  Enter Student ID
                </label>
                <Input
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="Enter student ID..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 h-12 text-base focus-ring"
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                />
              </div>
              
              {/* Mobile-first button grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button 
                  onClick={handleVerify}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 text-sm font-medium transition-all duration-200 ease-out focus-ring"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verify
                </Button>
                <Button 
                  onClick={handleReport}
                  disabled={!isVerified}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-50 h-12 text-sm font-medium transition-all duration-200 ease-out focus-ring"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Report
                </Button>
                <Button 
                  onClick={clearForm}
                  variant="outline"
                  className="col-span-2 sm:col-span-1 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:text-white h-12 text-sm font-medium transition-all duration-200 ease-out focus-ring"
                >
                  Clear
                </Button>
              </div>

              {/* Compact Status Message */}
              {isVerified === false && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 text-sm">
                  <XCircle className="h-3 w-3" />
                  <span>Student not found</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Compact Student Info Section */}
        {currentStudent && isVerified && (
          <Card className="mb-4 bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-blue-400" />
                <h2 className="text-[15px] font-semibold text-white">Student Info</h2>
              </div>
              
              {/* Compact Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[12px] text-slate-400 mb-1">ID</div>
                  <div className="text-sm font-semibold text-white">{currentStudent.id}</div>
                </div>
                
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[12px] text-slate-400 mb-1">Name</div>
                  <div className="text-sm font-semibold text-white">
                    {currentStudent.firstName} {currentStudent.lastName}
                  </div>
                </div>
                
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <School className="h-3 w-3 text-blue-400" />
                    <div className="text-[12px] text-slate-400">School</div>
                  </div>
                  <div className="text-sm font-semibold text-white">{currentStudent.school}</div>
                </div>
                
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="flex items-center gap-1 mb-1">
                    <GraduationCap className="h-3 w-3 text-blue-400" />
                    <div className="text-[12px] text-slate-400">Class</div>
                  </div>
                  <div className="text-sm font-semibold text-white">{currentStudent.class}</div>
                </div>
              </div>

              {/* Tardy Count and Last Tardy */}
              <div className="mt-3 flex items-center justify-between">
                <div className="bg-white/5 p-2 rounded border border-white/10 flex-1 mr-2">
                  <div className="text-[12px] text-slate-400 mb-1">Last Tardy</div>
                  <div className="text-sm font-semibold text-white">
                    {currentStudent.lastTardy || 'None'}
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded border border-white/10">
                  <div className="text-[12px] text-slate-400 mb-1">Count</div>
                  <Badge 
                    variant="outline" 
                    className="text-sm px-2 py-1 bg-blue-500/20 border-blue-400/50 text-blue-300"
                  >
                    {currentStudent.tardyCount}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Compact Recent Tardies */}
        {recentTardies.length > 0 && (
          <Card className="bg-white/10 dark:bg-slate-800/10 backdrop-blur-sm border border-white/20 dark:border-white/10">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-400" />
                <h2 className="text-[15px] font-semibold text-white">Recent</h2>
              </div>
              
              <div className="space-y-2">
                {recentTardies.slice(0, 3).map((student, index) => (
                  <div key={student.id} className="bg-white/5 p-2 rounded border border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-xs text-slate-400">ID: {student.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{student.lastTardy}</div>
                        <Badge variant="outline" className="bg-blue-500/20 border-blue-400/50 text-blue-300 text-xs">
                          {student.tardyCount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
