'use client';
import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Users, AlertCircle, CheckCircle, Database, FileSpreadsheet } from 'lucide-react';
import { db, initializeAuth, getStudentsCollection } from '@/lib/firebase';

// Types
interface StudentImport {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  homeroom: string;
  pbisPoints?: number;
  photoUrl?: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string; data: any }>;
  duplicates: number;
}

export default function AdminPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [students, setStudents] = useState<StudentImport[]>([]);
  const [userId, setUserId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth
  useEffect(() => {
    initializeAuth().then(setUserId);
  }, []);

  // CSV to JSON converter
  const csvToJson = (csv: string): StudentImport[] => {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const student: any = { row: index + 2 };
      
      headers.forEach((header, i) => {
        const value = values[i] || '';
        switch (header) {
          case 'id':
          case 'student_id':
            student.id = value;
            break;
          case 'first_name':
          case 'firstname':
            student.firstName = value;
            break;
          case 'last_name':
          case 'lastname':
            student.lastName = value;
            break;
          case 'grade':
            student.grade = value;
            break;
          case 'homeroom':
          case 'home_room':
            student.homeroom = value;
            break;
          case 'pbis':
          case 'pbis_points':
            student.pbisPoints = parseInt(value) || 0;
            break;
          case 'email':
            student.email = value;
            break;
          case 'phone':
            student.phone = value;
            break;
          case 'parent_name':
            student.parentName = value;
            break;
          case 'parent_phone':
            student.parentPhone = value;
            break;
          case 'parent_email':
            student.parentEmail = value;
            break;
          case 'photo_url':
            student.photoUrl = value;
            break;
        }
      });
      
      return student;
    });
  };

  // Validate student data
  const validateStudent = (student: any): string | null => {
    if (!student.id || student.id.length !== 10) {
      return 'Invalid student ID (must be 10 digits)';
    }
    if (!student.firstName) {
      return 'First name is required';
    }
    if (!student.lastName) {
      return 'Last name is required';
    }
    if (!student.grade) {
      return 'Grade is required';
    }
    if (!student.homeroom) {
      return 'Homeroom is required';
    }
    return null;
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const importedStudents = csvToJson(text);
      
      // Validate all students
      const errors: Array<{ row: number; error: string; data: any }> = [];
      const validStudents: StudentImport[] = [];
      const seenIds = new Set<string>();
      let duplicates = 0;

      importedStudents.forEach((student) => {
        const error = validateStudent(student);
        if (error) {
          errors.push({ row: student.row, error, data: student });
        } else if (seenIds.has(student.id)) {
          duplicates++;
        } else {
          seenIds.add(student.id);
          validStudents.push(student);
        }
      });

      setStudents(validStudents);
      setImportResult({
        success: validStudents.length,
        errors,
        duplicates
      });

    } catch (error) {
      console.error('Error processing file:', error);
      setImportResult({
        success: 0,
        errors: [{ row: 0, error: 'Failed to process CSV file', data: {} }],
        duplicates: 0
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Import to Firebase
  const importToFirebase = async () => {
    if (!students.length || userId === 'demo-user-123') {
      console.log('Demo mode: Would import', students.length, 'students');
      setImportResult(prev => prev ? { ...prev, success: students.length } : null);
      return;
    }

    setIsUploading(true);
    
    try {
      const batch = writeBatch(db);
      const studentsCollection = getStudentsCollection();

      students.forEach((student) => {
        const docRef = doc(db, studentsCollection, student.id);
        batch.set(docRef, {
          firstName: student.firstName,
          lastName: student.lastName,
          grade: student.grade,
          homeroom: student.homeroom,
          pbisPoints: student.pbisPoints || 0,
          photoUrl: student.photoUrl || '',
          email: student.email || '',
          phone: student.phone || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          parentEmail: student.parentEmail || '',
          ttsCount: 0,
          ttcCount: 0,
          lastUpdated: new Date().toISOString(),
        });
      });

      await batch.commit();
      
      setImportResult(prev => prev ? { ...prev, success: students.length } : null);
      setStudents([]);
      
    } catch (error) {
      console.error('Error importing to Firebase:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = `id,first_name,last_name,grade,homeroom,pbis_points,email,phone,parent_name,parent_phone,parent_email,photo_url
1234567890,John,Smith,12,A-201,45,john.smith@student.edu,555-1234,Jane Smith,555-1234,jane.smith@email.com,/images/john-smith.jpg
0987654321,Sarah,Johnson,11,B-105,78,sarah.johnson@student.edu,555-5678,Bob Johnson,555-5678,bob.johnson@email.com,/images/sarah-johnson.jpg`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-roster-template.csv';
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
            <div className="text-lg font-semibold tracking-tight">FLHS Admin - Student Roster</div>
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
              <Upload className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Import Student Roster</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-[#2e00df] hover:bg-[#2e00df]/80"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose CSV File
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
                <p>• CSV format with headers: id, first_name, last_name, grade, homeroom, pbis_points</p>
                <p>• Student ID must be exactly 10 digits</p>
                <p>• All required fields must be filled</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Import Results */}
        {importResult && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-6 w-6 text-[#2e00df]" />
                <h2 className="text-xl font-semibold">Import Results</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="font-semibold">Success</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{importResult.success}</div>
                  <div className="text-sm text-green-300">Students imported</div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="font-semibold">Errors</span>
                  </div>
                  <div className="text-2xl font-bold text-red-400">{importResult.errors.length}</div>
                  <div className="text-sm text-red-300">Validation errors</div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-400" />
                    <span className="font-semibold">Duplicates</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{importResult.duplicates}</div>
                  <div className="text-sm text-yellow-300">Skipped duplicates</div>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-red-400">Error Details:</h3>
                  {importResult.errors.slice(0, 5).map((error, i) => (
                    <div key={i} className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <div className="font-medium">Row {error.row}: {error.error}</div>
                      <div className="text-sm text-red-300 mt-1">
                        ID: {error.data.id || 'N/A'}, Name: {error.data.firstName || 'N/A'} {error.data.lastName || 'N/A'}
                      </div>
                    </div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div className="text-sm text-red-300">
                      ... and {importResult.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}

              {/* Import Button */}
              {students.length > 0 && (
                <div className="mt-4">
                  <Button
                    onClick={importToFirebase}
                    disabled={isUploading}
                    className="bg-[#2e00df] hover:bg-[#2e00df]/80"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Import {students.length} Students to Database
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Preview Students */}
        {students.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-[#2e00df]" />
                <h2 className="text-xl font-semibold">Preview ({students.length} students)</h2>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {students.slice(0, 10).map((student, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2e00df]/20 flex items-center justify-center text-sm font-semibold">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-sm text-white/60">ID: {student.id} • Grade {student.grade} • {student.homeroom}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="border-white/20 text-white/80">
                        PBIS: {student.pbisPoints || 0}
                      </Badge>
                    </div>
                  </div>
                ))}
                {students.length > 10 && (
                  <div className="text-center text-white/60 py-2">
                    ... and {students.length - 10} more students
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
