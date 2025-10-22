'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function TestPage() {
  const [studentId, setStudentId] = useState('');
  const [result, setResult] = useState<string>('');

  const handleTest = () => {
    setResult(`Testing with ID: ${studentId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 bg-white/5 backdrop-blur-sm border border-white/20">
          <h1 className="text-2xl font-bold text-white mb-4">Component Test</h1>
          
          <div className="space-y-4">
            <Input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter test ID..."
              className="bg-white/5 border-white/20 text-white placeholder:text-slate-400"
            />
            
            <Button 
              onClick={handleTest}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Test
            </Button>
            
            {result && (
              <div className="text-white p-3 bg-green-500/20 rounded">
                {result}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
