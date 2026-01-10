'use client';

import { useEffect, useState } from 'react';

interface CalendarEntry {
  date: string;
  day_code: string;
  school_status: string;
  notes: string;
}

function makeLocalDate(isoDate: string): Date {
  if (!isoDate) return new Date(NaN);
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  if (isNaN(date.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, opts);
}

function getTodayDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getTodayDateString(): string {
  const today = getTodayDate();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
}

function getTomorrowDateString(): string {
  const tomorrow = getTomorrowDate();
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isAfter245PM(): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return hours > 14 || (hours === 14 && minutes >= 45);
}

export function DaySchedule() {
  const [loading, setLoading] = useState(true);
  const [dayCode, setDayCode] = useState('—');
  const [dayName, setDayName] = useState('Loading...');
  const [dayPeriods, setDayPeriods] = useState('—');
  const [dayStatus, setDayStatus] = useState('');
  const [dayLabel, setDayLabel] = useState('Today');
  const [scheduleClass, setScheduleClass] = useState('day-schedule loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedule() {
      try {
        const response = await fetch('/api/calendar', {
          credentials: 'include',
        }).catch(() => null);
        
        if (!response || !response.ok) {
          throw new Error(`HTTP ${response?.status || 'Network Error'}`);
        }
        
        const result = await response.json().catch(() => ({ success: false }));
        
        if (!result.success || !result.data) {
          throw new Error('Failed to load calendar');
        }

        const calendarRows: CalendarEntry[] = result.data;
        
        // Check if it's after 2:45 PM - if so, show tomorrow's schedule
        const shouldShowTomorrow = isAfter245PM();
        const targetDate = shouldShowTomorrow ? getTomorrowDate() : getTodayDate();
        const targetDateStr = shouldShowTomorrow ? getTomorrowDateString() : getTodayDateString();
        const dayOfWeek = targetDate.getDay();
        
        // Check if it's a weekend
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          setScheduleClass('day-schedule no-day');
          setDayCode('—');
          setDayLabel(shouldShowTomorrow ? 'Tomorrow' : 'Today');
          setDayName(dayOfWeek === 0 ? 'Sunday' : 'Saturday');
          setDayPeriods('');
          setDayStatus('Have a good day');
          setLoading(false);
          return;
        }

        const parsedRows = calendarRows
          .map(row => ({
            ...row,
            dateObj: makeLocalDate(row.date || '')
          }))
          .filter(row => row.date && !isNaN((row as any).dateObj?.getTime()))
          .sort((a, b) => (a as any).dateObj.getTime() - (b as any).dateObj.getTime());

        // Find today's entry
        let targetEntry = parsedRows.find(row => (row.date || '').trim() === targetDateStr);
        
        if (!targetEntry) {
          // Try finding by date object comparison
          const targetTime = targetDate.getTime();
          targetEntry = parsedRows.find(row => {
            const dateObj = (row as any).dateObj;
            if (!dateObj || isNaN(dateObj.getTime())) return false;
            const rowTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
            return rowTime === targetTime;
          });
        }

        if (!targetEntry) {
          setScheduleClass('day-schedule no-day');
          setDayCode('—');
          setDayLabel(shouldShowTomorrow ? 'Tomorrow' : 'Today');
          setDayName('No schedule available');
          setDayPeriods('');
          setDayStatus('Unable to load calendar');
          setLoading(false);
          return;
        }

        const dayCodeValue = (targetEntry?.day_code || '').trim();
        const status = (targetEntry?.school_status || '').trim();
        const notes = (targetEntry?.notes || '').trim();
        const statusLower = status.toLowerCase();

        setDayLabel(shouldShowTomorrow ? 'Tomorrow' : 'Today');

        // Handle exam days
        const isExam = statusLower === 'exams' || statusLower === 'exam' || statusLower === 'midterm' || statusLower === 'final' || statusLower === 'finals';
        
        if (isExam) {
          let examType = 'EXAM';
          let examTypeName = 'Exam';
          
          if (statusLower === 'midterm') {
            examType = 'MIDTERM';
            examTypeName = 'Midterm';
            setScheduleClass('day-schedule midterm');
          } else if (statusLower === 'final' || statusLower === 'finals') {
            examType = 'FINALS';
            examTypeName = 'Finals';
            setScheduleClass('day-schedule finals');
          } else {
            setScheduleClass('day-schedule exam');
          }
          
          setDayCode(examType);
          
          // Parse exam periods from notes
          let examPeriods: number[] = [];
          if (notes) {
            const pPattern = /P(\d+)/gi;
            const pMatches = notes.match(pPattern);
            if (pMatches) {
              examPeriods = pMatches.map(m => parseInt(m.replace('P', ''), 10)).sort((a, b) => a - b);
            } else {
              const numPattern = /\b(\d+)\b/g;
              const numMatches = notes.match(numPattern);
              if (numMatches) {
                examPeriods = numMatches.map(m => parseInt(m, 10)).filter(n => n >= 1 && n <= 8).sort((a, b) => a - b);
              }
            }
          }
          
          if (examPeriods.length > 0) {
            if (examPeriods.length === 1) {
              setDayName(`Period ${examPeriods[0]}`);
            } else if (examPeriods.length === 2) {
              setDayName(`Periods ${examPeriods[0]} & ${examPeriods[1]}`);
            } else {
              const lastPeriod = examPeriods.pop()!;
              setDayName(`Periods ${examPeriods.join(', ')}, & ${lastPeriod}`);
            }
          } else {
            setDayName(`${examTypeName} Day`);
          }
          
          setDayPeriods('');
          setDayStatus('');
        } else if (dayCodeValue === 'A') {
          setScheduleClass('day-schedule a-day');
          setDayCode('A');
          setDayName('White Day');
          setDayPeriods('Periods 1-4');
          setDayStatus(statusLower === 'erd' ? 'Early Release' : '');
        } else if (dayCodeValue === 'B') {
          setScheduleClass('day-schedule b-day');
          setDayCode('B');
          setDayName('Blue Day');
          setDayPeriods('Periods 5-8');
          setDayStatus(statusLower === 'erd' ? 'Early Release' : '');
        } else if (statusLower === 'planning' || statusLower === 'psd') {
          setScheduleClass('day-schedule planning');
          setDayCode('—');
          setDayName('Professional Study Day');
          setDayPeriods('');
          setDayStatus('');
        } else if (statusLower === 'closes' || statusLower === 'closed') {
          setScheduleClass('day-schedule closed');
          setDayCode('—');
          setDayName('No School');
          setDayPeriods('');
          setDayStatus(notes || 'Have a good day');
        } else {
          setScheduleClass('day-schedule no-day');
          setDayCode('—');
          const dateObj = (targetEntry as any).dateObj;
          setDayName(dateObj && !isNaN(dateObj.getTime()) 
            ? `No School (${formatDate(dateObj)})` 
            : 'No School');
          setDayPeriods('');
          setDayStatus(notes || 'Have a good day');
        }

        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error loading schedule:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setScheduleClass('day-schedule no-day');
        setDayCode('—');
        setDayName('Error');
        setDayPeriods('');
        setDayStatus('Unable to load schedule');
        setLoading(false);
      }
    }

    loadSchedule();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine background style based on schedule class
  let backgroundStyle = 'rgba(15, 23, 42, 0.55)';
  let boxShadowStyle = `
    0 6px 20px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset,
    0 2px 0 rgba(255, 255, 255, 0.25) inset
  `;

  if (scheduleClass.includes('a-day')) {
    backgroundStyle = 'rgba(15, 23, 42, 0.75)';
  } else if (scheduleClass.includes('b-day')) {
    backgroundStyle = 'rgba(30, 58, 138, 0.75)';
    boxShadowStyle = `
      0 6px 20px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.18) inset,
      0 2px 0 rgba(255, 255, 255, 0.25) inset,
      0 0 30px rgba(59, 130, 246, 0.2)
    `;
  } else if (scheduleClass.includes('planning')) {
    backgroundStyle = 'rgba(251, 146, 60, 0.75)';
  } else if (scheduleClass.includes('closed')) {
    backgroundStyle = 'rgba(99, 102, 241, 0.75)';
  } else if (scheduleClass.includes('exam') || scheduleClass.includes('midterm') || scheduleClass.includes('finals')) {
    backgroundStyle = 'rgba(234, 179, 8, 0.75)';
  } else if (scheduleClass.includes('no-day')) {
    backgroundStyle = 'rgba(15, 23, 42, 0.55)';
  }

  return (
    <div
      className={`${scheduleClass} mx-auto mb-3 px-4 py-3.5 rounded-2xl text-center relative z-[2] w-full backdrop-blur-[35px] border transition-all duration-300`}
      style={{
        boxShadow: boxShadowStyle,
        WebkitBackdropFilter: 'blur(35px) saturate(200%)',
        borderColor: 'rgba(255, 255, 255, 0.25)',
        background: backgroundStyle,
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-75">
        {dayLabel}
      </div>
      <div 
        className="text-3xl font-black leading-none mb-1 tracking-tighter"
        style={{
          textShadow: '0 3px 10px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.15)',
          color: (scheduleClass.includes('exam') || scheduleClass.includes('midterm') || scheduleClass.includes('finals')) ? '#000000' : '#ffffff',
        }}
      >
        {dayCode}
      </div>
      <div 
        className="text-xs font-bold mb-1"
        style={{
          color: (scheduleClass.includes('exam') || scheduleClass.includes('midterm') || scheduleClass.includes('finals')) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.98)',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        {dayName}
      </div>
      {dayPeriods && (
        <div 
          className="text-[11px] font-semibold opacity-90 mt-0.5"
          style={{
            color: (scheduleClass.includes('exam') || scheduleClass.includes('midterm') || scheduleClass.includes('finals')) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          {dayPeriods}
        </div>
      )}
      {dayStatus && (
        <div 
          className="mt-2 text-[10px] font-semibold opacity-80 uppercase tracking-wider"
          style={{
            color: (scheduleClass.includes('exam') || scheduleClass.includes('midterm') || scheduleClass.includes('finals')) ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
          }}
        >
          {dayStatus}
        </div>
      )}
    </div>
  );
}
