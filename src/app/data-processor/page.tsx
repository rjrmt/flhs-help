'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, FileSpreadsheet, Database, CheckCircle, Users } from 'lucide-react';
import { initializeAuth } from '@/lib/firebase';

export default function DataProcessor() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    initializeAuth().then(setUserId);
  }, []);

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

  const handleFileUpload = () => {
    alert('Excel processing functionality coming soon! For now, please use the CSV template and import through the Admin panel.');
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-white">
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
        <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Process Excel Student Data</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleFileUpload}
                  className="bg-[#2e00df] hover:bg-[#2e00df]/80"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel File
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

        <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Instructions</h2>
            </div>
            
            <div className="text-white/80 space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Step 1: Prepare Your Data</h3>
                <p>Download the CSV template above and format your Excel data to match the structure.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Step 2: Convert Excel to CSV</h3>
                <p>Save your Excel file as CSV format (.csv) to ensure compatibility.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Step 3: Import via Admin Panel</h3>
                <p>Go to the Admin panel (/admin) and use the CSV import functionality to upload your data.</p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-400" />
                  <span className="font-semibold text-blue-300">Quick Start</span>
                </div>
                <p className="text-blue-200 text-sm">
                  For immediate testing, use the demo students: ID 1234567890 (John Smith) or 0987654321 (Sarah Johnson)
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Expected Data Fields</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Basic Information</h3>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Student ID (10 digits)</li>
                  <li>• First Name, Last Name</li>
                  <li>• Grade, Homeroom</li>
                  <li>• Email, Phone</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Academic Data</h3>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• GPA, Credits</li>
                  <li>• Graduation Year</li>
                  <li>• PBIS Points</li>
                  <li>• Attendance Records</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Parent Information</h3>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• Parent Name</li>
                  <li>• Parent Phone</li>
                  <li>• Parent Email</li>
                  <li>• Emergency Contacts</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">Behavior Tracking</h3>
                <ul className="text-sm text-white/80 space-y-1">
                  <li>• TTS/TTC Counts</li>
                  <li>• Absences, Detentions</li>
                  <li>• Suspensions</li>
                  <li>• Last Incident Dates</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
