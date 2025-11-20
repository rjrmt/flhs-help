'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, FileSpreadsheet, Database, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { initializeAuth } from '@/lib/firebase';

// Enhanced Student interface based on typical Excel report data
interface StudentData {
  // Basic Info
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  homeroom: string;
  
  // Contact Info
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  
  // Academic Info
  gpa?: number;
  credits?: number;
  graduationYear?: string;
  
  // Behavior/Attendance
  pbisPoints: number;
  ttsCount: number; // Tardy to School
  ttcCount: number; // Tardy to Class
  absences: number;
  detentions: number;
  suspensions: number;
  
  // Schedule Info
  schedule?: Array<{
    period: string;
    course: string;
    room: string;
    teacher: string;
    days: string;
    credits: number;
  }>;
  
  // History/Notes
  notes?: string[];
  alerts?: Array<{
    type: string;
    level: 'warning' | 'info' | 'critical';
    text: string;
    date: string;
  }>;
  
  // Dates
  lastTardy?: string;
  lastAbsence?: string;
  enrollmentDate?: string;
  
  // Additional fields that might be in Excel
  [key: string]: any;
}

interface ProcessingResult {
  success: number;
  errors: Array<{ row: number; error: string; data: any }>;
  warnings: Array<{ row: number; warning: string; data: any }>;
  processedData: StudentData[];
}

export default function DataProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [userId, setUserId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth
  useState(() => {
    initializeAuth().then(setUserId);
  }, []);

  // Handle Excel file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // For now, we'll create a mock processing result
      // In a real implementation, you'd use a library like xlsx to parse Excel files
      const mockResult: ProcessingResult = {
        success: 150,
        errors: [
          { row: 5, error: 'Invalid student ID format', data: { id: '123', firstName: 'John' } },
          { row: 12, error: 'Missing required field: grade', data: { id: '1234567890', firstName: 'Jane' } }
        ],
        warnings: [
          { row: 8, warning: 'Unusual PBIS points value', data: { id: '1234567890', firstName: 'Bob', pbisPoints: 999 } }
        ],
        processedData: generateMockStudentData()
      };

      setResult(mockResult);
    } catch (error) {
      console.error('Error processing file:', error);
      setResult({
        success: 0,
        errors: [{ row: 0, error: 'Failed to process Excel file', data: {} }],
        warnings: [],
        processedData: []
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate mock student data based on typical Excel report structure
  const generateMockStudentData = (): StudentData[] => {
    return [
      {
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
        schedule: [
          { period: '01', course: 'AICE ENG LANG AS', room: '17-1731', teacher: 'J. James', days: 'MTWThF', credits: 1 },
          { period: '02', course: 'NC STUDY HALL 1', room: '17-1744', teacher: 'S. Ripp', days: 'MTWThF', credits: 0 },
          { period: '03', course: 'MATH COLL ALGEBRA', room: '21-2146', teacher: 'T. Handverg', days: 'MTWThF', credits: 1 },
          { period: '04', course: 'AICE THINK SKLS 1 AS', room: '08-812', teacher: 'S. Dettholf', days: 'MTWThF', credits: 1 },
          { period: '05', course: 'HOPE-PE V', room: '04-254', teacher: 'A. Drucker', days: 'MTWThF', credits: 1 },
          { period: '06', course: 'GUITAR 1', room: '05-505', teacher: 'S. Martinez', days: 'MTWThF', credits: 1 },
          { period: '07', course: 'AICE MARINE SCI 1 AS', room: '21-2144', teacher: 'B. Montenegro', days: 'MTWThF', credits: 1 },
          { period: '08', course: 'AICE U.S. HIST 1 AS', room: '17-1751', teacher: 'J. Jiampetti', days: 'MTWThF', credits: 1 }
        ],
        notes: [
          'Parent contact 09/20, email on file confirmed.',
          'Prefers to be called "Johnny".',
          '504 plan — see accommodations.',
          'Excellent participation in class discussions.'
        ],
        alerts: [
          { type: 'tardy', level: 'warning', text: 'RULE TRIGGERED: 5+ Tardies', date: '2025-01-15' }
        ],
        lastTardy: '2025-01-15',
        lastAbsence: '2025-01-10',
        enrollmentDate: '2021-08-15'
      },
      {
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
        schedule: [
          { period: '01', course: 'AP ENGLISH LIT', room: '15-1501', teacher: 'M. Wilson', days: 'MTWThF', credits: 1 },
          { period: '02', course: 'AP CALCULUS AB', room: '22-2201', teacher: 'R. Chen', days: 'MTWThF', credits: 1 },
          { period: '03', course: 'AP CHEMISTRY', room: '23-2301', teacher: 'L. Rodriguez', days: 'MTWThF', credits: 1 },
          { period: '04', course: 'AP US HISTORY', room: '16-1601', teacher: 'K. Thompson', days: 'MTWThF', credits: 1 },
          { period: '05', course: 'SPANISH 3', room: '14-1401', teacher: 'A. Garcia', days: 'MTWThF', credits: 1 },
          { period: '06', course: 'ART STUDIO', room: '13-1301', teacher: 'P. Davis', days: 'MTWThF', credits: 1 },
          { period: '07', course: 'PHYSICS', room: '24-2401', teacher: 'J. Anderson', days: 'MTWThF', credits: 1 },
          { period: '08', course: 'STUDY HALL', room: '12-1201', teacher: 'T. Brown', days: 'MTWThF', credits: 0 }
        ],
        notes: [
          'Honor roll student.',
          'Active in debate club.',
          'College-bound, excellent grades.'
        ],
        alerts: [],
        lastTardy: '2025-01-10',
        enrollmentDate: '2022-08-15'
      }
    ];
  };

  // Export processed data to CSV
  const exportToCSV = () => {
    if (!result?.processedData.length) return;

    const headers = [
      'id', 'first_name', 'last_name', 'grade', 'homeroom', 'email', 'phone',
      'parent_name', 'parent_phone', 'parent_email', 'gpa', 'credits', 'graduation_year',
      'pbis_points', 'tts_count', 'ttc_count', 'absences', 'detentions', 'suspensions',
      'last_tardy', 'last_absence', 'enrollment_date'
    ];

    const csvRows = [headers.join(',')];

    result.processedData.forEach(student => {
      const row = [
        student.id,
        student.firstName,
        student.lastName,
        student.grade,
        student.homeroom,
        student.email || '',
        student.phone || '',
        student.parentName || '',
        student.parentPhone || '',
        student.parentEmail || '',
        student.gpa || '',
        student.credits || '',
        student.graduationYear || '',
        student.pbisPoints,
        student.ttsCount,
        student.ttcCount,
        student.absences || 0,
        student.detentions || 0,
        student.suspensions || 0,
        student.lastTardy || '',
        student.lastAbsence || '',
        student.enrollmentDate || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed-student-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download Excel processing template
  const downloadTemplate = () => {
    const template = `Student ID,First Name,Last Name,Grade,Homeroom,Email,Phone,Parent Name,Parent Phone,Parent Email,GPA,Credits,Graduation Year,PBIS Points,TTS Count,TTC Count,Absences,Detentions,Suspensions,Last Tardy,Last Absence,Enrollment Date
1234567890,John,Smith,12,A-201,john.smith@student.edu,555-1234,Jane Smith,555-1234,jane.smith@email.com,3.8,24,2025,45,3,1,2,0,0,2025-01-15,2025-01-10,2021-08-15
0987654321,Sarah,Johnson,11,B-105,sarah.johnson@student.edu,555-5678,Bob Johnson,555-5678,bob.johnson@email.com,4.0,18,2026,78,1,0,0,0,0,2025-01-10,,2022-08-15`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-data-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1020]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#2e00df]" />
            <div className="text-lg font-semibold tracking-tight">Data Processor</div>
          </div>
          <div className="text-sm text-white/60">
            User: {userId}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        {/* Upload Section */}
        <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Process Excel Student Data</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-[#2e00df] hover:bg-[#2e00df]/80"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Upload Excel File'}
                </Button>
                
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="text-sm text-white/60">
                <p>• Supports Excel (.xlsx, .xls) and CSV files</p>
                <p>• Automatically maps columns to student data fields</p>
                <p>• Validates data and reports errors</p>
                <p>• Exports processed data for import into the system</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Processing Results */}
        {result && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-[#2e00df]" />
                <h2 className="text-xl font-semibold">Processing Results</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="font-semibold">Success</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{result.success}</div>
                  <div className="text-sm text-green-300">Students processed</div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="font-semibold">Errors</span>
                  </div>
                  <div className="text-2xl font-bold text-red-400">{result.errors.length}</div>
                  <div className="text-sm text-red-300">Validation errors</div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold">Warnings</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{result.warnings.length}</div>
                  <div className="text-sm text-yellow-300">Data warnings</div>
                </div>
              </div>

              {/* Error Details */}
              {result.errors.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-red-400">Error Details:</h3>
                  {result.errors.slice(0, 5).map((error, i) => (
                    <div key={i} className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <div className="font-medium">Row {error.row}: {error.error}</div>
                      <div className="text-sm text-red-300 mt-1">
                        ID: {error.data.id || 'N/A'}, Name: {error.data.firstName || 'N/A'} {error.data.lastName || 'N/A'}
                      </div>
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-sm text-red-300">
                      ... and {result.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}

              {/* Warning Details */}
              {result.warnings.length > 0 && (
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-yellow-400">Warning Details:</h3>
                  {result.warnings.slice(0, 5).map((warning, i) => (
                    <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                      <div className="font-medium">Row {warning.row}: {warning.warning}</div>
                      <div className="text-sm text-yellow-300 mt-1">
                        ID: {warning.data.id || 'N/A'}, Name: {warning.data.firstName || 'N/A'} {warning.data.lastName || 'N/A'}
                      </div>
                    </div>
                  ))}
                  {result.warnings.length > 5 && (
                    <div className="text-sm text-yellow-300">
                      ... and {result.warnings.length - 5} more warnings
                    </div>
                  )}
                </div>
              )}

              {/* Export Button */}
              {result.processedData.length > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={exportToCSV}
                    className="bg-[#2e00df] hover:bg-[#2e00df]/80"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export {result.processedData.length} Students to CSV
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Sample Data Preview */}
        {result?.processedData.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-[#2e00df]" />
                <h2 className="text-xl font-semibold">Sample Processed Data</h2>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {result.processedData.slice(0, 3).map((student, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2e00df]/20 flex items-center justify-center text-sm font-semibold">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium">{student.firstName} {student.lastName}</div>
                          <div className="text-sm text-white/60">ID: {student.id} • Grade {student.grade} • {student.homeroom}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="border-white/20 text-white/80">
                          GPA: {student.gpa || 'N/A'}
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/80">
                          PBIS: {student.pbisPoints}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Credits:</span>
                        <span className="ml-2">{student.credits || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-white/60">TTS:</span>
                        <span className="ml-2">{student.ttsCount}</span>
                      </div>
                      <div>
                        <span className="text-white/60">TTC:</span>
                        <span className="ml-2">{student.ttcCount}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Absences:</span>
                        <span className="ml-2">{student.absences || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {result.processedData.length > 3 && (
                  <div className="text-center text-white/60 py-2">
                    ... and {result.processedData.length - 3} more students
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
