'use client';
import { notFound } from 'next/navigation';

interface PassPageProps {
  params: {
    id: string;
  };
}

// Mock data - in a real app this would come from an API
const mockPassData = {
  '12345': {
    studentId: '12345',
    firstName: 'John',
    lastName: 'Smith',
    grade: '12',
    homeroom: 'A-201',
    timestamp: new Date().toLocaleString(),
    ttsNumber: 3,
    reason: 'Unexcused Tardy',
    location: 'Main Entrance',
  },
  '67890': {
    studentId: '67890',
    firstName: 'Sarah',
    lastName: 'Johnson',
    grade: '11',
    homeroom: 'B-105',
    timestamp: new Date().toLocaleString(),
    ttsNumber: 1,
    reason: 'Unexcused Tardy',
    location: 'Main Entrance',
  },
};

export default function PassPage({ params }: PassPageProps) {
  const passData = mockPassData[params.id as keyof typeof mockPassData];
  
  if (!passData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="max-w-md mx-auto p-6 print:p-4">
        {/* Header */}
        <div className="text-center mb-6 print:mb-4">
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl">
            Forest Lake High School
          </h1>
          <p className="text-gray-600 print:text-sm">Tardy Pass</p>
        </div>

        {/* Student Info */}
        <div className="bg-gray-50 p-4 rounded-lg print:bg-gray-100 print:p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 print:gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700 print:text-xs">Student ID</label>
              <p className="text-lg font-bold text-gray-900 print:text-base">{passData.studentId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 print:text-xs">Grade</label>
              <p className="text-lg font-bold text-gray-900 print:text-base">{passData.grade}</p>
            </div>
          </div>
          
          <div className="mt-3 print:mt-2">
            <label className="text-sm font-medium text-gray-700 print:text-xs">Student Name</label>
            <p className="text-xl font-bold text-gray-900 print:text-lg">
              {passData.firstName} {passData.lastName}
            </p>
          </div>

          <div className="mt-3 print:mt-2">
            <label className="text-sm font-medium text-gray-700 print:text-xs">Homeroom</label>
            <p className="text-lg font-bold text-gray-900 print:text-base">{passData.homeroom}</p>
          </div>
        </div>

        {/* Tardy Info */}
        <div className="bg-blue-50 p-4 rounded-lg print:bg-blue-100 print:p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 print:gap-2">
            <div>
              <label className="text-sm font-medium text-blue-700 print:text-xs">TTS Number</label>
              <p className="text-2xl font-bold text-blue-900 print:text-xl">#{passData.ttsNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-blue-700 print:text-xs">Location</label>
              <p className="text-lg font-bold text-blue-900 print:text-base">{passData.location}</p>
            </div>
          </div>

          <div className="mt-3 print:mt-2">
            <label className="text-sm font-medium text-blue-700 print:text-xs">Reason</label>
            <p className="text-lg font-bold text-blue-900 print:text-base">{passData.reason}</p>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-center">
          <label className="text-sm font-medium text-gray-700 print:text-xs">Timestamp</label>
          <p className="text-lg font-bold text-gray-900 print:text-base">{passData.timestamp}</p>
        </div>

        {/* Footer */}
        <div className="mt-8 print:mt-4 text-center">
          <div className="border-t border-gray-300 pt-4 print:pt-2">
            <p className="text-sm text-gray-600 print:text-xs">
              This pass must be presented to the teacher upon entering class.
            </p>
            <p className="text-sm text-gray-600 print:text-xs mt-1">
              Forest Lake High School • Tardy Management System
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .no-print {
              display: none !important;
            }
            
            @page {
              margin: 0.5in;
              size: 4in 6in;
            }
          }
        `
      }} />
    </div>
  );
}
