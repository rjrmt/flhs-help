'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DebugPage() {
  const [studentId, setStudentId] = useState('');
  const [currentState, setCurrentState] = useState<'idle' | 'scanning' | 'identified'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setStudentId(value);
    
    if (value.length === 10) {
      setCurrentState('scanning');
      setTimeout(() => {
        setCurrentState('identified');
      }, 1000);
    } else if (value.length < 10) {
      setCurrentState('idle');
    }
  };

  const reset = () => {
    setStudentId('');
    setCurrentState('idle');
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6 bg-white/5 backdrop-blur-sm border border-white/20">
          <h1 className="text-2xl font-bold text-white mb-6">Debug Test</h1>
          
          <div className="space-y-6">
            {/* State Display */}
            <div className="text-center">
              <Badge 
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  currentState === 'idle' ? 'bg-gray-500/20 border-gray-400/50 text-gray-300' :
                  currentState === 'scanning' ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300' :
                  'bg-green-500/20 border-green-400/50 text-green-300'
                }`}
              >
                State: {currentState.toUpperCase()}
              </Badge>
            </div>

            {/* Input */}
            <div>
              <Input
                value={studentId}
                onChange={handleInputChange}
                placeholder="Enter 10-digit student ID..."
                className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 h-12 text-center text-lg"
              />
              <p className="text-slate-400 text-sm mt-2 text-center">
                {studentId.length}/10 digits
              </p>
            </div>

            {/* Identified State */}
            {currentState === 'identified' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    John Smith
                  </h2>
                  <Badge 
                    variant="outline" 
                    className="bg-blue-500/20 border-blue-400/50 text-blue-300"
                  >
                    Grade 12
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">ID: 1234567890</span>
                  <span className="text-slate-400">Homeroom: A-201</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-red-500/20 border-red-400/50 text-red-300">
                    Last: 1/15/2024
                  </Badge>
                  <Badge variant="outline" className="bg-orange-500/20 border-orange-400/50 text-orange-300">
                    TTS#3
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-500/20 border-yellow-400/50 text-yellow-300">
                    TTC#1
                  </Badge>
                </div>

                <Button 
                  onClick={reset}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                >
                  Log Tardy
                </Button>

                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Excuse
                  </Button>
                  <Button 
                    onClick={reset}
                    variant="outline"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Reset Button */}
            {currentState !== 'idle' && (
              <Button 
                onClick={reset}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Reset
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
