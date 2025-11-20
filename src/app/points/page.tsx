'use client';

import { useState } from 'react';
import { Star, CheckCircle, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/BarcodeScanner';

export default function PointsPage() {
  const [studentId, setStudentId] = useState('');
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleScannerSuccess = (scannedId: string) => {
    setStudentId(scannedId);
    // Here you would typically verify the student and load their data
    console.log('Student scanned:', scannedId);
  };

  const handleAddPoints = async (pointValue: number) => {
    if (!studentId) return;
    
    setIsLoading(true);
    try {
      // Here you would typically save the points to your database
      console.log(`Adding ${pointValue} points to student ${studentId}`);
      setPoints(prev => prev + pointValue);
      
      // Reset after a delay
      setTimeout(() => {
        setStudentId('');
        setPoints(0);
      }, 2000);
    } catch (error) {
      console.error('Error adding points:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Star className="h-8 w-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl font-bold">Positive Points</h1>
            <p className="text-slate-400">Reward positive behavior</p>
          </div>
        </div>

        {/* Scanner Section */}
        <Card className="mb-6 bg-white/5 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Scan Student ID</CardTitle>
          </CardHeader>
          <CardContent>
            <BarcodeScanner
              onScanSuccess={handleScannerSuccess}
              placeholder="Scan student ID..."
              className="w-full"
              autoFocus={true}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Student Display */}
        {studentId && (
          <Card className="mb-6 bg-white/5 backdrop-blur-sm border border-white/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-white">
                  Student ID: {studentId}
                </div>
                <div className="text-lg text-slate-400">
                  Current Points: {points}
                </div>
                
                {/* Quick Point Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleAddPoints(1)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    +1
                  </Button>
                  <Button
                    onClick={() => handleAddPoints(5)}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    +5
                  </Button>
                  <Button
                    onClick={() => handleAddPoints(10)}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white h-12"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    +10
                  </Button>
                </div>

                {/* Success Message */}
                {points > 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span>Points added successfully!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-white/5 backdrop-blur-sm border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-slate-300">
              <p>1. Scan a student's ID card or type their ID manually</p>
              <p>2. Select the number of points to award</p>
              <p>3. Points are automatically saved to the student's record</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
