'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Database } from 'lucide-react';
import { initializeAuth } from '@/lib/firebase';

export default function AdminPage() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    initializeAuth().then(setUserId);
  }, []);

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
        <Card className="bg-white/5 backdrop-blur-sm border border-white/20 mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Import Student Roster</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => alert('CSV upload functionality coming soon!')}
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

        <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-[#2e00df]" />
              <h2 className="text-xl font-semibold">Coming Soon</h2>
            </div>
            
            <div className="text-white/80">
              <p className="mb-4">The full CSV import functionality is being finalized. For now, you can:</p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>Download the CSV template</li>
                <li>Prepare your student data</li>
                <li>Test with the demo students (IDs: 1234567890, 0987654321)</li>
              </ul>
              <p className="text-sm text-white/60">
                Full import functionality will be available in the next update.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}



